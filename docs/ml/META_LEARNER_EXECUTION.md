# Meta-Learner & Execution Optimization

> For specification and design, see [TIER4_MODELS.md](TIER4_MODELS.md)

> **Tier 4 Meta-Learner + Execution Layer: Signal fusion, strategy selection, and execution optimization.**

**Last Updated**: March 11, 2026

---

## Overview

This document covers the **fusion and execution** components of the 5-tier architecture:

- **Tier 4**: Contextual Meta-Learner (attention-based fusion of Tier 0-3 predictions)
- **Execution Layer**: Strategy & Decision (strike selection, risk management)
- **Execution Layer**: PPO Agent (order execution optimization for slippage minimization)

> Note: In the previous 3-tier architecture, these were labeled Tier 2-4. In the finalized
> 5-tier Data-Bound Hierarchical Architecture, the Meta-Learner is **Tier 4**, and the
> PPO agent is part of the **Execution Layer** (not a prediction tier).

---

## Tier 4: Contextual Meta-Learner

### Purpose

The Meta-Learner combines predictions from **Tier 0-3 models** with **regime-aware weighting**. It learns when to trust each model based on current market conditions, using the Regime-Conditioned Temporal Loss to prevent whipsawing.

### Architecture

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, Tuple

class ContextualMetaLearner(nn.Module):
    """
    Attention-based meta-learner that fuses base model predictions
    with regime-aware weighting.
    
    Key Innovation:
    - Uses market regime features as "context" to weight models
    - Provides interpretable model importance scores
    - Calibrates confidence using temperature scaling
    """
    
    def __init__(
        self,
        n_base_models: int = 12,
        n_horizons: int = 6,
        n_classes: int = 3,
        context_dim: int = 20,  # Regime features
        hidden_dim: int = 64
    ):
        super().__init__()
        
        self.n_base_models = n_base_models
        self.n_horizons = n_horizons
        self.n_classes = n_classes
        
        # Context encoder (regime features → context vector)
        self.context_encoder = nn.Sequential(
            nn.Linear(context_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, hidden_dim)
        )
        
        # Model embedding (learnable representation per model)
        self.model_embed = nn.Embedding(n_base_models, hidden_dim)
        
        # Cross-attention: context attends to model predictions
        self.cross_attention = nn.MultiheadAttention(
            embed_dim=hidden_dim,
            num_heads=4,
            dropout=0.1,
            batch_first=True
        )
        
        # Horizon-specific output heads
        self.horizon_heads = nn.ModuleList([
            nn.Sequential(
                nn.Linear(hidden_dim, hidden_dim // 2),
                nn.ReLU(),
                nn.Linear(hidden_dim // 2, n_classes)
            )
            for _ in range(n_horizons)
        ])
        
        # Temperature for confidence calibration (learnable)
        self.temperature = nn.Parameter(torch.ones(n_horizons))
        
        # Model importance scorer (for interpretability)
        self.importance_scorer = nn.Linear(hidden_dim, n_base_models)
    
    def forward(
        self,
        base_predictions: torch.Tensor,  # [B, n_models, n_horizons, n_classes]
        regime_features: torch.Tensor     # [B, context_dim]
    ) -> Tuple[torch.Tensor, Dict]:
        """
        Fuse base model predictions using regime-aware attention.
        
        Returns:
            fused_logits: [B, n_horizons, n_classes]
            interpretability: {
                'model_weights': [B, n_models],
                'attention_weights': [B, n_horizons, n_models]
            }
        """
        B = base_predictions.shape[0]
        
        # Encode current market context
        context = self.context_encoder(regime_features)  # [B, hidden_dim]
        
        # Get model embeddings
        model_ids = torch.arange(self.n_base_models, device=base_predictions.device)
        model_embeds = self.model_embed(model_ids)  # [n_models, hidden_dim]
        model_embeds = model_embeds.unsqueeze(0).expand(B, -1, -1)
        
        # Compute model importance based on context
        model_importance = torch.softmax(
            self.importance_scorer(context), dim=-1
        )  # [B, n_models]
        
        # Cross-attention: context queries attend to model representations
        context_expanded = context.unsqueeze(1)  # [B, 1, hidden_dim]
        attended, attn_weights = self.cross_attention(
            query=context_expanded,
            key=model_embeds,
            value=model_embeds
        )  # attended: [B, 1, hidden_dim]
        
        # Fuse predictions per horizon
        fused_logits = []
        horizon_attention = []
        
        for h in range(self.n_horizons):
            # Weight base predictions by model importance
            # base_predictions[:, :, h, :] is [B, n_models, n_classes]
            weighted_preds = (
                base_predictions[:, :, h, :] * 
                model_importance.unsqueeze(-1)
            ).sum(dim=1)  # [B, n_classes]
            
            # Combine with attended context
            combined = attended.squeeze(1) + weighted_preds
            
            # Apply horizon-specific head
            logits = self.horizon_heads[h](combined)
            
            # Temperature scaling for calibration
            logits = logits / self.temperature[h].clamp(min=0.1)
            
            fused_logits.append(logits)
            horizon_attention.append(attn_weights.squeeze(1))
        
        fused_logits = torch.stack(fused_logits, dim=1)  # [B, n_horizons, n_classes]
        
        return fused_logits, {
            'model_weights': model_importance,
            'attention_weights': torch.stack(horizon_attention, dim=1)
        }
    
    def calibrate_temperature(
        self,
        val_loader,
        criterion=nn.CrossEntropyLoss()
    ):
        """
        Optimize temperature on validation set for calibration.
        """
        self.eval()
        
        # Collect logits and labels
        all_logits = []
        all_labels = []
        
        with torch.no_grad():
            for batch in val_loader:
                base_preds, regime, labels = batch
                logits, _ = self(base_preds, regime)
                all_logits.append(logits)
                all_labels.append(labels)
        
        all_logits = torch.cat(all_logits)
        all_labels = torch.cat(all_labels)
        
        # Optimize temperature per horizon
        optimizer = torch.optim.LBFGS([self.temperature], max_iter=50)
        
        def closure():
            optimizer.zero_grad()
            scaled_logits = all_logits / self.temperature.unsqueeze(0).unsqueeze(-1)
            loss = criterion(
                scaled_logits.view(-1, self.n_classes),
                all_labels.view(-1)
            )
            loss.backward()
            return loss
        
        optimizer.step(closure)
        
        print(f"Calibrated temperatures: {self.temperature.data}")


class RegimeFeatureExtractor:
    """
    Extract regime features from market data for the meta-learner.
    """
    
    REGIME_FEATURES = [
        # Volatility regime
        'india_vix',
        'realized_vol_5d',
        'realized_vol_20d',
        'iv_rv_ratio',
        
        # Trend regime
        'trend_strength_adx',
        'trend_direction',  # EMA ratio
        'price_vs_sma50',
        'price_vs_sma200',
        
        # Market structure
        'new_highs_lows_ratio',
        'advance_decline_ratio',
        'sector_dispersion',
        
        # Options regime
        'pcr_oi_zscore',
        'iv_skew_zscore',
        'gamma_exposure_net',
        
        # Time context
        'minutes_from_open',
        'is_expiry_day',
        'is_rbi_day',
        'is_fed_day',
        
        # Recent model performance
        'lgb_recent_accuracy',
        'mamba_recent_accuracy'
    ]
    
    def extract(self, market_state: dict) -> torch.Tensor:
        """Extract regime features as tensor."""
        features = []
        for name in self.REGIME_FEATURES:
            features.append(market_state.get(name, 0.0))
        return torch.tensor(features, dtype=torch.float32)
```

### Training the Meta-Learner

```python
def train_meta_learner(
    base_models: list,
    train_data: pd.DataFrame,
    val_data: pd.DataFrame,
    epochs: int = 50
):
    """
    Train meta-learner on base model predictions.
    """
    # Generate base model predictions
    def get_base_predictions(data, models):
        predictions = []
        for model in models:
            pred = model.predict_proba(data)
            predictions.append(pred)
        return np.stack(predictions, axis=1)
    
    train_preds = get_base_predictions(train_data['features'], base_models)
    val_preds = get_base_predictions(val_data['features'], base_models)
    
    # Extract regime features
    regime_extractor = RegimeFeatureExtractor()
    train_regime = torch.stack([
        regime_extractor.extract(row) for _, row in train_data.iterrows()
    ])
    
    # Initialize meta-learner
    meta_learner = ContextualMetaLearner(
        n_base_models=len(base_models),
        n_horizons=6,
        n_classes=3,
        context_dim=20
    )
    
    optimizer = torch.optim.AdamW(meta_learner.parameters(), lr=1e-3)
    criterion = nn.CrossEntropyLoss()
    
    # Training loop
    for epoch in range(epochs):
        meta_learner.train()
        
        for batch in DataLoader(train_dataset, batch_size=64, shuffle=True):
            base_preds, regime, labels = batch
            
            fused_logits, _ = meta_learner(base_preds, regime)
            
            # Loss across all horizons
            loss = sum(
                criterion(fused_logits[:, h, :], labels[:, h])
                for h in range(6)
            ) / 6
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
        
        # Validation
        meta_learner.eval()
        with torch.no_grad():
            val_logits, interpretability = meta_learner(val_preds, val_regime)
            val_acc = (val_logits.argmax(-1) == val_labels).float().mean()
        
        print(f"Epoch {epoch}: Val Acc = {val_acc:.4f}")
        print(f"  Model weights: {interpretability['model_weights'].mean(0)}")
    
    # Calibrate temperature
    meta_learner.calibrate_temperature(val_loader)
    
    return meta_learner
```

---

## Execution Layer: Strategy & Decision

### Strike Selection Neural Network

```python
class StrikeSelector(nn.Module):
    """
    Select optimal option strikes based on:
    - Predicted direction and magnitude
    - Current IV surface
    - Greeks exposure constraints
    - Liquidity (bid-ask spread)
    
    Output: Probability distribution over ATM ± N strikes
    """
    
    def __init__(
        self,
        n_strikes: int = 21,  # ATM ± 10
        iv_seq_len: int = 20,  # Historical IV snapshots
        hidden_dim: int = 128
    ):
        super().__init__()
        
        self.n_strikes = n_strikes
        
        # IV surface encoder (LSTM over time)
        self.iv_encoder = nn.LSTM(
            input_size=n_strikes * 2,  # Call + Put IVs
            hidden_size=hidden_dim,
            num_layers=2,
            batch_first=True,
            dropout=0.1
        )
        
        # Direction embedding (UP/NEUTRAL/DOWN + confidence)
        self.direction_embed = nn.Sequential(
            nn.Linear(4, hidden_dim // 2),  # 3 classes + confidence
            nn.ReLU()
        )
        
        # Greeks constraint encoder
        self.greeks_encoder = nn.Sequential(
            nn.Linear(5, hidden_dim // 4),  # Delta, Gamma, Vega, Theta limits + current
            nn.ReLU()
        )
        
        # Liquidity encoder (bid-ask spreads)
        self.liquidity_encoder = nn.Sequential(
            nn.Linear(n_strikes, hidden_dim // 4),
            nn.ReLU()
        )
        
        # Fusion layer
        fusion_dim = hidden_dim + hidden_dim // 2 + hidden_dim // 4 + hidden_dim // 4
        self.fusion = nn.Sequential(
            nn.Linear(fusion_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU()
        )
        
        # Output heads
        self.strike_head = nn.Linear(hidden_dim // 2, n_strikes)
        self.option_type_head = nn.Linear(hidden_dim // 2, 2)  # Call vs Put
        self.strategy_head = nn.Linear(hidden_dim // 2, 4)  # Naked, Spread, Straddle, Strangle
    
    def forward(
        self,
        iv_surface: torch.Tensor,     # [B, seq_len, n_strikes * 2]
        direction_pred: torch.Tensor,  # [B, 4] (3 probs + confidence)
        greeks_budget: torch.Tensor,   # [B, 5]
        bid_ask_spreads: torch.Tensor  # [B, n_strikes]
    ) -> Dict[str, torch.Tensor]:
        """
        Select optimal strike(s) for the trade.
        """
        # Encode IV surface
        iv_features, _ = self.iv_encoder(iv_surface)
        iv_features = iv_features[:, -1, :]  # Last timestep
        
        # Encode other inputs
        dir_features = self.direction_embed(direction_pred)
        greeks_features = self.greeks_encoder(greeks_budget)
        liquidity_features = self.liquidity_encoder(bid_ask_spreads)
        
        # Fuse all features
        fused = torch.cat([
            iv_features, dir_features, greeks_features, liquidity_features
        ], dim=-1)
        fused = self.fusion(fused)
        
        # Output probabilities
        strike_logits = self.strike_head(fused)
        option_type_logits = self.option_type_head(fused)
        strategy_logits = self.strategy_head(fused)
        
        return {
            'strike_probs': F.softmax(strike_logits, dim=-1),
            'option_type_probs': F.softmax(option_type_logits, dim=-1),
            'strategy_probs': F.softmax(strategy_logits, dim=-1),
            'selected_strike_idx': strike_logits.argmax(dim=-1)
        }


class RiskManager:
    """
    Real-time risk management with Greeks and VaR limits.
    """
    
    def __init__(self, config: dict):
        self.max_delta = config.get('max_delta', 100)
        self.max_gamma = config.get('max_gamma', 50)
        self.max_vega = config.get('max_vega', 10000)
        self.max_loss_per_trade = config.get('max_loss_per_trade', 5000)
        self.max_daily_loss = config.get('max_daily_loss', 25000)
        self.current_positions = {}
        self.daily_pnl = 0
    
    def validate_trade(
        self,
        proposed_trade: dict,
        current_portfolio: dict
    ) -> Tuple[bool, str]:
        """
        Validate if proposed trade passes risk checks.
        
        Returns:
            (is_valid, reason)
        """
        # Check daily loss limit
        if self.daily_pnl < -self.max_daily_loss:
            return False, "Daily loss limit reached"
        
        # Calculate new portfolio Greeks
        new_delta = current_portfolio['delta'] + proposed_trade['delta']
        new_gamma = current_portfolio['gamma'] + proposed_trade['gamma']
        new_vega = current_portfolio['vega'] + proposed_trade['vega']
        
        # Check Greeks limits
        if abs(new_delta) > self.max_delta:
            return False, f"Delta limit exceeded: {new_delta:.2f}"
        
        if abs(new_gamma) > self.max_gamma:
            return False, f"Gamma limit exceeded: {new_gamma:.2f}"
        
        if abs(new_vega) > self.max_vega:
            return False, f"Vega limit exceeded: {new_vega:.2f}"
        
        # Check max loss per trade
        max_loss = self._calculate_max_loss(proposed_trade)
        if max_loss > self.max_loss_per_trade:
            return False, f"Max loss per trade exceeded: {max_loss:.2f}"
        
        return True, "Trade validated"
    
    def _calculate_max_loss(self, trade: dict) -> float:
        """Calculate maximum potential loss for the trade."""
        if trade['strategy'] == 'naked_buy':
            return trade['premium'] * trade['quantity'] * trade['lot_size']
        elif trade['strategy'] == 'credit_spread':
            return (trade['strike_width'] - trade['premium']) * trade['quantity'] * trade['lot_size']
        else:
            return trade['premium'] * trade['quantity'] * trade['lot_size']
```

---

## Execution Layer: PPO Execution Agent

> **Note (March 2026)**: PPO execution has been replaced with Smart TWAP/VWAP execution with Tier 3 slippage-aware limit pricing. PPO was evaluated but deemed over-engineered for NIFTY options which have reasonable ATM liquidity. The code below is retained for reference but is not used in production. See TIER4_MODELS.md for the current execution strategy.

### Purpose

Optimize order execution to minimize slippage and market impact. The PPO agent is **not a prediction tier** — it operates in the execution layer and focuses purely on order execution quality.

```python
import torch
import torch.nn as nn
from torch.distributions import Normal
import numpy as np

class PPOExecutionAgent(nn.Module):
    """
    Proximal Policy Optimization agent for optimal order execution.
    
    State: [remaining_qty, current_spread, volatility, time_remaining,
            lob_imbalance, recent_price_move, avg_fill_price]
    
    Action: [limit_offset, slice_fraction, wait_time]
    
    Reward: -slippage - market_impact + fill_rate_bonus
    """
    
    STATE_DIM = 10
    ACTION_DIM = 3
    
    def __init__(
        self,
        hidden_dim: int = 64,
        init_std: float = 0.5
    ):
        super().__init__()
        
        # Shared feature extractor
        self.shared = nn.Sequential(
            nn.Linear(self.STATE_DIM, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.Tanh()
        )
        
        # Actor (policy) network
        self.actor_mean = nn.Linear(hidden_dim, self.ACTION_DIM)
        self.actor_log_std = nn.Parameter(
            torch.ones(self.ACTION_DIM) * np.log(init_std)
        )
        
        # Critic (value) network
        self.critic = nn.Linear(hidden_dim, 1)
    
    def forward(self, state: torch.Tensor) -> tuple:
        """
        Get action distribution and value estimate.
        """
        features = self.shared(state)
        
        # Actor
        action_mean = self.actor_mean(features)
        action_std = self.actor_log_std.exp().expand_as(action_mean)
        
        # Critic
        value = self.critic(features)
        
        return Normal(action_mean, action_std), value
    
    def get_action(
        self, 
        state: torch.Tensor, 
        deterministic: bool = False
    ) -> tuple:
        """
        Sample action from policy.
        
        Returns:
            action, log_prob, value
        """
        dist, value = self(state)
        
        if deterministic:
            action = dist.mean
        else:
            action = dist.sample()
        
        log_prob = dist.log_prob(action).sum(dim=-1)
        
        # Clamp actions to valid ranges
        action = torch.clamp(action, -1, 1)
        
        return action, log_prob, value.squeeze(-1)
    
    def evaluate_actions(
        self,
        states: torch.Tensor,
        actions: torch.Tensor
    ) -> tuple:
        """
        Evaluate actions for PPO update.
        
        Returns:
            log_probs, values, entropy
        """
        dist, values = self(states)
        
        log_probs = dist.log_prob(actions).sum(dim=-1)
        entropy = dist.entropy().sum(dim=-1)
        
        return log_probs, values.squeeze(-1), entropy


class PPOTrainer:
    """
    PPO training loop for execution agent.
    """
    
    def __init__(
        self,
        agent: PPOExecutionAgent,
        lr: float = 3e-4,
        gamma: float = 0.99,
        gae_lambda: float = 0.95,
        clip_epsilon: float = 0.2,
        entropy_coef: float = 0.01,
        value_coef: float = 0.5,
        max_grad_norm: float = 0.5
    ):
        self.agent = agent
        self.optimizer = torch.optim.Adam(agent.parameters(), lr=lr)
        
        self.gamma = gamma
        self.gae_lambda = gae_lambda
        self.clip_epsilon = clip_epsilon
        self.entropy_coef = entropy_coef
        self.value_coef = value_coef
        self.max_grad_norm = max_grad_norm
    
    def compute_gae(
        self,
        rewards: list,
        values: list,
        dones: list,
        next_value: float
    ) -> tuple:
        """
        Compute Generalized Advantage Estimation.
        """
        advantages = []
        returns = []
        gae = 0
        
        values = values + [next_value]
        
        for t in reversed(range(len(rewards))):
            delta = rewards[t] + self.gamma * values[t + 1] * (1 - dones[t]) - values[t]
            gae = delta + self.gamma * self.gae_lambda * (1 - dones[t]) * gae
            advantages.insert(0, gae)
            returns.insert(0, gae + values[t])
        
        return torch.tensor(advantages), torch.tensor(returns)
    
    def update(
        self,
        states: torch.Tensor,
        actions: torch.Tensor,
        old_log_probs: torch.Tensor,
        returns: torch.Tensor,
        advantages: torch.Tensor,
        n_epochs: int = 10
    ):
        """
        Perform PPO update.
        """
        # Normalize advantages
        advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)
        
        for _ in range(n_epochs):
            log_probs, values, entropy = self.agent.evaluate_actions(states, actions)
            
            # Ratio for clipping
            ratio = torch.exp(log_probs - old_log_probs)
            
            # Clipped surrogate loss
            surr1 = ratio * advantages
            surr2 = torch.clamp(ratio, 1 - self.clip_epsilon, 1 + self.clip_epsilon) * advantages
            policy_loss = -torch.min(surr1, surr2).mean()
            
            # Value loss
            value_loss = F.mse_loss(values, returns)
            
            # Entropy bonus
            entropy_loss = -entropy.mean()
            
            # Total loss
            loss = (
                policy_loss + 
                self.value_coef * value_loss + 
                self.entropy_coef * entropy_loss
            )
            
            self.optimizer.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(self.agent.parameters(), self.max_grad_norm)
            self.optimizer.step()


class ExecutionEnvironment:
    """
    Simulated environment for training execution agent.
    """
    
    def __init__(
        self,
        historical_lob: pd.DataFrame,
        lot_size: int = 50,
        tick_size: float = 0.05
    ):
        self.lob_data = historical_lob
        self.lot_size = lot_size
        self.tick_size = tick_size
        self.reset()
    
    def reset(self, target_qty: int = 5):
        """Reset environment for new episode."""
        self.target_qty = target_qty * self.lot_size
        self.remaining_qty = self.target_qty
        self.filled_qty = 0
        self.total_cost = 0
        self.start_idx = np.random.randint(0, len(self.lob_data) - 100)
        self.current_idx = self.start_idx
        self.start_price = self.lob_data.iloc[self.start_idx]['mid_price']
        self.time_limit = 60  # 60 steps = 1 minute
        self.steps = 0
        
        return self._get_state()
    
    def _get_state(self) -> np.ndarray:
        """Get current state."""
        row = self.lob_data.iloc[self.current_idx]
        
        return np.array([
            self.remaining_qty / self.target_qty,  # Remaining fraction
            row['spread'] / self.tick_size,         # Spread in ticks
            row['volatility'],                       # Recent volatility
            (self.time_limit - self.steps) / self.time_limit,  # Time remaining
            row['order_imbalance'],                  # LOB imbalance
            row['price_change_1s'],                  # Recent price move
            self.total_cost / max(self.filled_qty, 1) if self.filled_qty > 0 else 0,  # Avg fill
            row['bid_depth'],                        # Bid depth
            row['ask_depth'],                        # Ask depth
            row['trade_flow']                        # Recent trade flow
        ], dtype=np.float32)
    
    def step(self, action: np.ndarray) -> tuple:
        """
        Execute action and return (next_state, reward, done, info).
        
        Action interpretation:
        - action[0]: Limit offset from mid (-1 to 1 → -5 to +5 ticks)
        - action[1]: Slice fraction (0.1 to 1.0 of remaining)
        - action[2]: Wait time (0 to 5 seconds)
        """
        row = self.lob_data.iloc[self.current_idx]
        mid_price = row['mid_price']
        
        # Interpret actions
        limit_offset = action[0] * 5 * self.tick_size
        slice_frac = 0.1 + (action[1] + 1) * 0.45  # Map -1,1 to 0.1,1.0
        wait_steps = int((action[2] + 1) * 2.5)     # Map -1,1 to 0,5
        
        # Calculate order
        order_qty = int(self.remaining_qty * slice_frac)
        order_price = mid_price + limit_offset
        
        # Simulate fill (simplified)
        if order_price >= row['best_ask']:
            # Aggressive buy - immediate fill with slippage
            fill_price = row['best_ask'] + self._simulate_impact(order_qty)
            fill_qty = order_qty
        elif order_price >= row['best_bid']:
            # Passive - partial fill based on probability
            fill_prob = self._fill_probability(order_price, row)
            if np.random.random() < fill_prob:
                fill_price = order_price
                fill_qty = int(order_qty * np.random.uniform(0.3, 1.0))
            else:
                fill_price = 0
                fill_qty = 0
        else:
            # Too passive - no fill
            fill_price = 0
            fill_qty = 0
        
        # Update state
        if fill_qty > 0:
            self.filled_qty += fill_qty
            self.remaining_qty -= fill_qty
            self.total_cost += fill_qty * fill_price
        
        self.current_idx += wait_steps + 1
        self.steps += wait_steps + 1
        
        # Calculate reward
        if fill_qty > 0:
            slippage = (fill_price - self.start_price) / self.start_price
            reward = -slippage * fill_qty / self.lot_size  # Negative slippage = good
            reward += 0.1 * (fill_qty / self.lot_size)     # Fill bonus
        else:
            reward = -0.05  # Penalty for no fill
        
        # Check if done
        done = (
            self.remaining_qty <= 0 or 
            self.steps >= self.time_limit or
            self.current_idx >= len(self.lob_data) - 1
        )
        
        # Final reward adjustments
        if done:
            if self.remaining_qty > 0:
                # Penalty for unfilled quantity
                reward -= 0.5 * (self.remaining_qty / self.target_qty)
        
        return self._get_state(), reward, done, {
            'filled_qty': fill_qty,
            'fill_price': fill_price,
            'remaining': self.remaining_qty
        }
    
    def _simulate_impact(self, qty: int) -> float:
        """Simulate market impact."""
        return self.tick_size * np.sqrt(qty / self.lot_size) * 0.5
    
    def _fill_probability(self, price: float, row: dict) -> float:
        """Probability of passive fill."""
        distance = (row['best_ask'] - price) / self.tick_size
        return np.exp(-0.5 * distance)
```

---

## Integration Example

```python
class TradingOrchestrator:
    """
    Orchestrate the complete prediction → decision → execution flow.
    """
    
    def __init__(
        self,
        base_models: list,
        meta_learner: ContextualMetaLearner,
        strike_selector: StrikeSelector,
        risk_manager: RiskManager,
        execution_agent: PPOExecutionAgent
    ):
        self.base_models = base_models
        self.meta_learner = meta_learner
        self.strike_selector = strike_selector
        self.risk_manager = risk_manager
        self.execution_agent = execution_agent
    
    async def process_tick(self, market_state: dict) -> dict:
        """
        Process a market tick through the full pipeline.
        """
        # 1. Get base model predictions
        base_preds = self._get_base_predictions(market_state)
        
        # 2. Get regime features
        regime = self._extract_regime_features(market_state)
        
        # 3. Meta-learner fusion
        fused_logits, interpretability = self.meta_learner(base_preds, regime)
        direction_probs = F.softmax(fused_logits[:, 1, :], dim=-1)  # H2 (1min)
        confidence = direction_probs.max()
        
        # 4. Check if signal is strong enough
        if confidence < 0.6:
            return {'action': 'HOLD', 'reason': 'Low confidence'}
        
        predicted_direction = direction_probs.argmax()  # 0=DOWN, 1=NEUTRAL, 2=UP
        
        # 5. Select strike if directional signal
        if predicted_direction != 1:  # Not NEUTRAL
            strike_output = self.strike_selector(
                iv_surface=market_state['iv_surface'],
                direction_pred=torch.cat([direction_probs, confidence.unsqueeze(-1)]),
                greeks_budget=self._get_greeks_budget(),
                bid_ask_spreads=market_state['bid_ask_spreads']
            )
            
            selected_strike = strike_output['selected_strike_idx']
            option_type = 'CE' if predicted_direction == 2 else 'PE'
            
            # 6. Construct trade proposal
            trade = self._construct_trade(
                strike_idx=selected_strike,
                option_type=option_type,
                market_state=market_state
            )
            
            # 7. Risk validation
            is_valid, reason = self.risk_manager.validate_trade(
                trade, 
                self.current_portfolio
            )
            
            if not is_valid:
                return {'action': 'BLOCKED', 'reason': reason}
            
            # 8. Execute with PPO agent
            execution_result = await self._execute_trade(trade)
            
            return {
                'action': 'TRADE',
                'trade': trade,
                'execution': execution_result,
                'model_weights': interpretability['model_weights']
            }
        
        return {'action': 'HOLD', 'reason': 'Neutral prediction'}
```

---

See [AI_TRADING_ARCHITECTURE.md](./AI_TRADING_ARCHITECTURE.md) for the complete system overview.

See [TIER1_MODELS.md](./TIER1_MODELS.md) for base model specifications.
