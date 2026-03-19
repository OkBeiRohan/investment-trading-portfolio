# TIER 4: Meta-Learner & Strategy — Signal Fusion Core

> For implementation details and code, see [META_LEARNER_EXECUTION.md](META_LEARNER_EXECUTION.md)

> **Contextual Gating Network that fuses all tier outputs using Regime-Conditioned Temporal Loss. Produces the final trading signal, selects the optimal strategy and strike, validates risk, and sizes the position.**

**Last Updated**: March 13, 2026
**Tier**: 4 — Meta-Learner & Strategy
**Runs**: Every 60 seconds during market hours (09:16 – 15:25 IST)
**Input**: All upstream tier outputs (Tier 0/1/2/3)

---

## Purpose

Tier 4 is the **decision core**. It answers four questions simultaneously:

1. **What direction?** Fuses all tier outputs into a single directional signal
2. **What strategy?** Maps signal + regime to an options strategy (LONG_CALL, STRADDLE, etc.)
3. **What strike?** Selects optimal strike(s) based on delta, IV surface, and liquidity
4. **How much?** Sizes the position based on Kelly criterion, regime, and risk limits

Without Tier 4, the system would have 4 independent opinions (one per tier) with no coherent way to act.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TIER 4: META-LEARNER & STRATEGY DECISION ENGINE                         │
│                                                                         │
│  INPUTS (from Redis cache):                                             │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────┐              │
│  │ Tier 0   │ │ Tier 1   │ │ Tier 2     │ │ Tier 3       │              │
│  │ Gap pred │ │ Regime   │ │ Direction  │ │ Microstr.    │              │
│  │ (cached) │ │ (cached) │ │ (fresh)    │ │ (latest)     │              │
│  └────┬─────┘ └────┬─────┘ └─────┬──────┘ └──────┬───────┘              │
│       │            │             │               │                      │
│       └────────────┼─────────────┼───────────────┘                      │
│                    ▼             ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ CONTEXTUAL GATING NETWORK                                           ││
│  │                                                                     ││
│  │  ┌────────────────────┐   ┌──────────────────────────────────────┐  ││
│  │  │ Regime Feature     │   │ Attention-Based Fusion               │  ││
│  │  │ Extractor (20 feat)│──>│ • Query = regime context             │  ││
│  │  │                    │   │ • Keys/Values = tier outputs         │  ││
│  │  └────────────────────┘   │ • Regime-adaptive model weights      │  ││
│  │                           │ • Temperature-calibrated confidence  │  ││
│  │                           └─────────────┬────────────────────────┘  ││
│  │                                         │                           ││
│  │                              ┌──────────▼──────────┐                ││
│  │                              │ Final Signal:       │                ││
│  │                              │ direction, conf,    │                ││
│  │                              │ position_action     │                ││
│  │                              └──────────┬──────────┘                ││
│  └─────────────────────────────────────────┼───────────────────────────┘│
│                                            │                            │
│  ┌─────────────────┐  ┌──────────────┐  ┌──▼─────────────┐              │
│  │ STRIKE SELECTOR │  │ RISK MANAGER │  │ POSITION SIZER │              │
│  │ (Deterministic) │  │ (Rule-based) │  │ (Fractional    │              │
│  │                 │  │              │  │  Kelly)        │              │
│  │ Black-Scholes   │  │ Greeks: ✓/✗ │  │ f* = (p·b -    │              │
│  │ payoff scan     │  │ MaxLoss: ✓/✗│  │  q) / b        │              │
│  │                 │  │Leverage: ✓/✗│  │ scaled by VIX  │              │
│  └────────┬────────┘  └──────┬───────┘  └──────┬─────────┘              │
│           │                  │                  │                       │
│           └──────────────────┼──────────────────┘                       │
│                              ▼                                          │
│                    ┌──────────────────┐                                 │
│                    │ VALIDATED ORDER  │                                 │
│                    │ → Execution Layer│                                 │
│                    └──────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component 1: Contextual Gating Network (Meta-Learner)

### Why Not Simple Averaging?

Simple averaging of tier outputs ignores regime context:

- In **BULL_TRENDING**, Tier 2 (direction models) should dominate
- In **VOLATILE**, Tier 3 (microstructure) becomes more important
- In **RANGING**, Tier 1 (regime boundaries) matters more
- Tier 0's gap prediction is most valuable in the first hour, then decays

The Contextual Gating Network learns these regime-dependent weights.

### Architecture

```python
class ContextualMetaLearner(nn.Module):
    """
    Attention-based meta-learner that fuses tier outputs
    conditioned on the current market regime.
    """

    def __init__(
        self,
        n_tier_outputs: int = 12,   # Total predictions from all tiers
        n_regime_features: int = 20, # Regime + market context
        d_model: int = 64,
        n_heads: int = 4
    ):
        super().__init__()

        # Project each tier's output to d_model
        self.tier_projections = nn.ModuleDict({
            'tier0': nn.Linear(4, d_model),   # gap_pct, vol, bias, conf
            'tier1': nn.Linear(6, d_model),   # regime probs (4) + trend + conf
            'tier2': nn.Linear(9, d_model),   # P(up/flat/down) × 3 horizons
            'tier3': nn.Linear(5, d_model),   # buy/sell pressure, slippage, dir, strength
        })

        # Regime feature extractor
        self.regime_encoder = nn.Sequential(
            nn.Linear(n_regime_features, d_model),
            nn.GELU(),
            nn.Linear(d_model, d_model)
        )

        # Cross-attention: regime queries, tier outputs as keys/values
        self.cross_attention = nn.MultiheadAttention(
            d_model, n_heads, batch_first=True, dropout=0.1
        )

        # Learnable temperature for calibration
        self.temperature = nn.Parameter(torch.ones(1) * 1.5)

        # Output heads
        self.direction_head = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Linear(d_model // 2, 3)  # P(down), P(flat), P(up)
        )

        self.confidence_head = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Linear(d_model // 2, 1),
            nn.Sigmoid()
        )

        self.model_weights_head = nn.Linear(d_model, 4)  # Weight per tier

    def forward(self, tier_outputs: dict, regime_features: torch.Tensor) -> dict:
        """
        Args:
            tier_outputs: dict of tier output tensors
            regime_features: [B, 20] regime + market context
        Returns:
            final signal with direction, confidence, model weights
        """
        B = regime_features.shape[0]

        # Project tier outputs: each [B, d_model]
        tier_embeddings = torch.stack([
            self.tier_projections['tier0'](tier_outputs['tier0']),
            self.tier_projections['tier1'](tier_outputs['tier1']),
            self.tier_projections['tier2'](tier_outputs['tier2']),
            self.tier_projections['tier3'](tier_outputs['tier3']),
        ], dim=1)  # [B, 4, d_model]

        # Regime as query
        regime_query = self.regime_encoder(regime_features).unsqueeze(1)  # [B, 1, d_model]

        # Cross-attention: regime attends to tier outputs
        fused, attn_weights = self.cross_attention(
            regime_query, tier_embeddings, tier_embeddings
        )  # fused: [B, 1, d_model]
        fused = fused.squeeze(1)  # [B, d_model]

        # Outputs
        direction_logits = self.direction_head(fused) / self.temperature
        direction_probs = torch.softmax(direction_logits, dim=-1)
        confidence = self.confidence_head(fused).squeeze(-1)
        model_weights = torch.softmax(self.model_weights_head(fused), dim=-1)

        return {
            'direction': direction_probs,      # [B, 3] P(down, flat, up)
            'confidence': confidence,           # [B] calibrated confidence
            'model_weights': model_weights,     # [B, 4] per-tier importance
            'attention_weights': attn_weights,  # [B, 1, 4] interpretability
        }
```

### Regime Feature Extractor (20 Features)

```python
REGIME_CONTEXT_FEATURES = [
    # Volatility context (5)
    'india_vix', 'realized_vol_5m', 'realized_vol_15m', 'iv_rv_ratio', 'vix_percentile_30d',
    # Trend context (5)
    'return_5m', 'return_15m', 'return_1h', 'adx_14', 'trend_strength',
    # Market structure (4)
    'pcr_oi', 'total_gex', 'breadth_thrust', 'advance_decline_ratio',
    # Time context (3)
    'minutes_from_open', 'session_phase', 'is_expiry_day',
    # Recent model performance (3)
    'tier2_accuracy_last_20', 'tier3_accuracy_last_50', 'meta_hit_rate_last_10'
]
```

### Tier Disagreement as Uncertainty Signal

When all tiers agree (e.g., Tier 0 bullish gap, Tier 1 bull regime, Tier 2 high P(up), Tier 3 buy pressure), the system may become overconfident. Conversely, high disagreement between tiers is a strong uncertainty signal.

**Implementation**: Add 3 disagreement features to the regime context:

```python
DISAGREEMENT_FEATURES = [
    'tier_direction_entropy',     # Shannon entropy of tier directional signals
    'tier_agreement_score',       # Cosine similarity between tier output vectors
    'tier2_tier3_divergence',     # |P_tier2(up) - P_tier3(up)| — intraday vs micro conflict
]
```

**Usage in position sizing**: When `tier_direction_entropy > 0.8` (high disagreement), reduce position size by 50% regardless of confidence. This prevents overcommitting when the evidence is contradictory.

### Regime-Conditioned Temporal Loss

```python
def regime_conditioned_loss(
    y_true: torch.Tensor,           # [B, 3] true direction
    y_pred: torch.Tensor,           # [B, 3] predicted direction
    y_pred_prev: torch.Tensor,      # [B, 3] previous prediction
    tier1_confidence: torch.Tensor, # [B] regime confidence
    tier3_weight: torch.Tensor,     # [B] Tier 3 model weight
    gamma: float = 0.1,            # Flip penalty strength
    alpha: float = 0.05            # Tier 3 regularization
) -> torch.Tensor:
    """
    L_meta = L_CE + γ·||Δŷ||²·C_T1 + α·R(W_T3)

    - L_CE: standard cross-entropy
    - γ term: penalizes rapid prediction flipping, scaled by Tier 1 confidence
    - α term: regularizes over-reliance on data-poor Tier 3
    """
    # Standard CE loss
    ce_loss = F.cross_entropy(y_pred, y_true.argmax(dim=-1))

    # Flip penalty: penalize changing direction when regime is strong
    flip_penalty = gamma * (
        (y_pred - y_pred_prev).pow(2).sum(dim=-1) * tier1_confidence
    ).mean()

    # Tier 3 regularization: penalize high weight on Tier 3 (limited data)
    tier3_reg = alpha * tier3_weight.pow(2).mean()

    return ce_loss + flip_penalty + tier3_reg
```

### Regime-Adaptive Default Weights

When the Meta-Learner is not yet trained (cold start), use these fixed weights:

| Regime            | Tier 0 | Tier 1 | Tier 2 (LightGBM+Mamba) | Tier 3 (LiT) |
| ----------------- | ------ | ------ | --------------------------- | ------------ |
| **BULL_TRENDING** | 0.05   | 0.15   | 0.60                        | 0.20         |
| **BEAR_TRENDING** | 0.05   | 0.15   | 0.60                        | 0.20         |
| **VOLATILE**      | 0.10   | 0.10   | 0.40                        | 0.40         |
| **RANGING**       | 0.05   | 0.20   | 0.55                        | 0.20         |

---

## Component 2: Strike Selector (Underlying-First + Deterministic Pricing)

### Why Not a Neural Network?

Training a neural network to pick the "Strike that maximized risk-adjusted PnL (hindsight)" introduces severe target leakage. The historically "perfect" strike depends on the *entire future path* of the underlying asset until expiry, which the model cannot know. This leads to overfitting to specific historical volatility realizations.

Instead, we use an **Underlying-First + Deterministic Pricing** approach:
1. The Meta-Learner predicts the underlying's expected move and volatility.
2. We use a deterministic options pricing model (e.g., Black-Scholes) to simulate the payoff of all available strikes.
3. We select the strike with the best asymmetric payoff (highest expected return/risk ratio).

### Architecture

```python
class DeterministicStrikeSelector:
    """
    Selects optimal option strike using deterministic pricing models.
    Input: predicted underlying move, predicted volatility, current IV surface
    Output: recommended strike, option type, strategy
    """

    def __init__(self, pricing_model="black_scholes"):
        self.pricing_model = pricing_model

    def select_strike(self, current_spot, expected_move, expected_vol, iv_surface, days_to_expiry):
        """
        Simulate payoffs for all strikes and select the best one.
        """
        best_strike = None
        best_score = -float('inf')
        best_type = None
        
        # Scan available strikes
        for strike in iv_surface.strikes:
            # Simulate CE and PE payoffs based on expected move and vol
            ce_payoff = self._simulate_payoff(current_spot, expected_move, expected_vol, strike, 'CE', days_to_expiry, iv_surface)
            pe_payoff = self._simulate_payoff(current_spot, expected_move, expected_vol, strike, 'PE', days_to_expiry, iv_surface)
            
            # Score based on reward/risk
            if ce_payoff.score > best_score:
                best_score = ce_payoff.score
                best_strike = strike
                best_type = 'CE'
            if pe_payoff.score > best_score:
                best_score = pe_payoff.score
                best_strike = strike
                best_type = 'PE'
                
        return {
            'strike': best_strike,
            'option_type': best_type,
            'strategy': self._determine_strategy(expected_move, expected_vol)
        }
        
    def _simulate_payoff(self, spot, move, vol, strike, opt_type, dte, iv_surface):
        # Implementation of Black-Scholes pricing for the expected future state
        pass
```

### Strategy Menu

| ID  | Strategy         | When Selected             | Options Structure                 |
| --- | ---------------- | ------------------------- | --------------------------------- |
| 0   | LONG_CALL        | Bullish + low IV          | Buy ATM/OTM CE                    |
| 1   | LONG_PUT         | Bearish + low IV          | Buy ATM/OTM PE                    |
| 2   | BULL_CALL_SPREAD | Mildly bullish            | Buy CE, sell higher CE            |
| 3   | BEAR_PUT_SPREAD  | Mildly bearish            | Buy PE, sell lower PE             |
| 4   | LONG_STRADDLE    | High volatility expected  | Buy ATM CE + ATM PE               |
| 5   | IRON_CONDOR      | Range-bound, high IV      | Sell OTM CE + PE, buy further OTM |
| 6   | SHORT_STRANGLE   | Range-bound, very high IV | Sell OTM CE + OTM PE              |

---

## Component 3: Risk Manager (Rule-Based)

```python
class RiskManager:
    """
    Rule-based risk validation. Has VETO power over all AI decisions.
    """

    def validate(self, order: ProposedOrder, portfolio: Portfolio, config: UserConfig) -> ValidationResult:
        checks = []

        # Position limits
        checks.append(self._check_max_positions(portfolio, config))
        checks.append(self._check_single_trade_size(order, config))
        checks.append(self._check_total_exposure(order, portfolio, config))

        # Greeks limits
        checks.append(self._check_delta_limit(order, portfolio, config))
        checks.append(self._check_gamma_limit(order, portfolio, config))
        checks.append(self._check_vega_limit(order, portfolio, config))
        checks.append(self._check_theta_limit(order, portfolio, config))

        # Loss limits
        checks.append(self._check_daily_drawdown(portfolio, config))
        checks.append(self._check_max_single_loss(order, config))

        # Leverage
        checks.append(self._check_leverage(order, portfolio, config))

        all_passed = all(c.passed for c in checks)
        return ValidationResult(valid=all_passed, checks=checks)
```

---

## Component 4: Position Sizer (Calibrated Fractional Kelly)

### Why Probability Calibration?

Deep learning models (especially attention-based gating networks) are notoriously uncalibrated—they are often overconfident. If the model outputs a 70% confidence but the true historical accuracy is 55%, plugging 70% directly into the Kelly formula leads to massive **overbetting**. Overbetting mathematically guarantees long-term ruin, even if the strategy has a positive expected value (MacLean et al., 1992).

The Meta-Learner's raw confidence must pass through a **Probability Calibration** layer (e.g., Isotonic Regression or Beta Calibration) before Kelly sizing. We also enforce a strict **Fractional Kelly** (e.g., Half-Kelly) to account for parameter uncertainty.

```python
class KellyPositionSizer:
    """
<<<<<<< Current (Your changes)
    Modified Kelly position sizing for options with VIX-scaled dynamic leverage.

    For binary outcomes: f* = (p · b - q) / b
    For options (asymmetric payoffs): f* = E[R] / E[R²]

    The binary Kelly formula is an approximation. Options have non-linear,
    asymmetric payoffs (a long call can lose 100% of premium but gain multiples).
    Per Thorp (2006), the continuous Kelly analog E[R]/E[R²] is more appropriate.

    IMPORTANT: Model confidence must be calibrated (Platt scaling / temperature
    scaling) before use as win probability. Raw softmax outputs are NOT
    calibrated probabilities.

    The 0.25x fractional Kelly partially mitigates both estimation error
    and the binary approximation error.

    where:
        p = calibrated win probability (from Meta-Learner, post Platt scaling)
        q = 1 - p
        b = win/loss ratio (from rolling 60-day backtest window)
=======
    Fractional Kelly criterion position sizing with calibrated probabilities
    and VIX-scaled dynamic leverage.

    f* = (p_calibrated · b - q_calibrated) / b
>>>>>>> Incoming (Background Agent changes)
    """

    def __init__(self, kelly_fraction: float = 0.5, max_position_pct: float = 0.10):
        self.kelly_fraction = kelly_fraction  # e.g., Half-Kelly
        self.max_position_pct = max_position_pct

    def compute_position_size(
        self,
        raw_confidence: float,
        calibrator: ProbabilityCalibrator,
        win_loss_ratio: float,
        regime: str,
        vix: float,
        account_equity: float
    ) -> float:
        # 1. Calibrate probability
        p = calibrator.calibrate(raw_confidence)
        q = 1 - p
        b = win_loss_ratio

        # 2. Full Kelly
        full_kelly = (p * b - q) / b if b > 0 else 0
        full_kelly = max(0, full_kelly)

        # 3. Fractional Kelly
        fractional_kelly = full_kelly * self.kelly_fraction
        
        # 4. Cap at max position size
        safe_fraction = min(fractional_kelly, self.max_position_pct)

        # 5. VIX scaling: reduce size in high-vol environments
        vix_scale = 1.0
        if vix > 25:
            vix_scale = 0.5
        elif vix > 20:
            vix_scale = 0.7

        # 6. Regime scaling
        regime_scale = {
            'BULL_TRENDING': 1.0,
            'BEAR_TRENDING': 0.7,
            'VOLATILE': 0.4,
            'RANGING': 0.8
        }.get(regime, 0.5)

        position_value = account_equity * safe_fraction * vix_scale * regime_scale
        return position_value
```

---

## Output Schema

```json
{
  "tier": 4,
  "timestamp": "2026-03-13T10:15:01.050+05:30",
  "meta_learner": {
    "direction": { "down": 0.12, "flat": 0.23, "up": 0.65 },
    "confidence": 0.78,
    "model_weights": {
      "tier0": 0.05,
      "tier1": 0.12,
      "tier2": 0.58,
      "tier3": 0.25
    },
    "position_action": "ENTER_LONG"
  },
  "strategy": {
    "selected": "LONG_CALL",
    "strike": 23500,
    "option_type": "CE",
    "expiry": "2026-03-19",
    "entry_price_estimate": 145.5
  },
  "risk_check": {
    "passed": true,
    "checks": {
      "delta_limit": "PASS",
      "gamma_limit": "PASS",
      "daily_drawdown": "PASS",
      "max_positions": "PASS"
    }
  },
  "position_size": {
    "lots": 2,
    "notional_value": 29100,
    "kelly_fraction": 0.18,
    "regime_scale": 1.0,
    "vix_scale": 0.85
  }
}
```

---

## Training Specification

### Meta-Learner Training

```python
TIER4_META_CONFIG = {
    'architecture': 'ContextualGatingNetwork',
    'input': 'OOF predictions from Tier 0/1/2/3 training',
    'hidden_size': 64,
    'attention_heads': 4,
    'training_data': 'Out-of-fold predictions from CPCV (NOT training set predictions)',
    'loss': 'regime_conditioned_temporal_loss',
    'optimizer': 'AdamW',
    'lr': 1e-4,
    'weight_decay': 0.01,
    'epochs': 50,
    'batch_size': 256,
    'retraining': 'weekly',
}
```

### Why Out-of-Fold Predictions?

Training the Meta-Learner on in-sample predictions from Tier 2 would cause massive overfitting — the Meta-Learner would learn that Tier 2 is "always right" because its training predictions are near-perfect. Instead, we use the **out-of-fold predictions** from CPCV, which have realistic accuracy (~68-72%).

### Strike Selector Training

```python
STRIKE_SELECTOR_CONFIG = {
    'training_data': 'Historical option chain + entry-time features + realized PnL',
    'target': 'Strike with best risk-adjusted PnL using CAUSAL features only',
    'causal_target_note': (
        'The target is NOT the hindsight-optimal strike (which creates circular '
        'reasoning). Instead, strikes are ranked by PnL conditioned on features '
        'available at entry time: delta bucket, IV percentile vs 30-day realized '
        'vol, bid-ask spread, OI concentration, and time-to-expiry. This breaks '
        'the circularity of predicting the realized move to select the strike.'
    ),
    'architecture': 'LSTM(IV surface) + MLP(context)',
    'retraining': 'monthly',
}
```

---

## Performance Targets

| Component                | Metric                        | Target    |
| ------------------------ | ----------------------------- | --------- |
| Meta-Learner             | AUC-ROC                       | >0.72     |
| Meta-Learner             | Sharpe Ratio (backtest)       | >1.5      |
| Strike Selector          | Strike PnL rank (top 3 of 21) | >60%      |
| Risk Manager             | False rejection rate          | <5%       |
| Position Sizer           | Realized drawdown vs target   | <15%      |
| **Total Tier 4 latency** | End-to-end                    | **<12ms** |

---

## Related Documentation

- [TIER0_MODELS.md](./TIER0_MODELS.md) — Gap prediction input
- [TIER1_MODELS.md](./TIER1_MODELS.md) — Regime state input
- [TIER2_MODELS.md](./TIER2_MODELS.md) — Direction predictions input
- [TIER3_MODELS.md](./TIER3_MODELS.md) — Microstructure input
- [META_LEARNER_EXECUTION.md](./META_LEARNER_EXECUTION.md) — Detailed PyTorch implementations
- [MODEL_PIPELINE_WORKFLOW.md](./MODEL_PIPELINE_WORKFLOW.md) — Full trading loop timing
