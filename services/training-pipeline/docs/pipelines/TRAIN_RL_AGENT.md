# Train RL Agent Pipeline - **EXPERIMENTAL**

Train reinforcement learning agent (TD3 or SAC) for dynamic position sizing and portfolio allocation.

---

## ⚠️ WARNING: EXPERIMENTAL FEATURE

**This pipeline is experimental and requires**:

- Significant computational resources (GPU recommended)
- Deep understanding of RL algorithms
- Careful reward engineering
- Extensive backtesting before live trading

**Start with fixed position sizing (5% per trade) before attempting RL.**

---

## Purpose

Train a reinforcement learning agent that learns optimal position sizing, leverage, and portfolio allocation decisions based on market state and ensemble predictions. The agent aims to maximize Sharpe ratio while minimizing drawdown.

---

## Algorithms

### **1. TD3 (Twin Delayed Deep Deterministic Policy Gradient)**

**Paper**: "Addressing Function Approximation Error in Actor-Critic Methods" (Fujimoto et al., 2018)

**Key Features**:

- **Twin Critics**: Two Q-networks to reduce overestimation
- **Delayed Policy Updates**: Update actor less frequently than critic
- **Target Policy Smoothing**: Add noise to target actions
- **Deterministic**: Outputs continuous actions directly

**Best For**: High-frequency trading, continuous action spaces

---

### **2. SAC (Soft Actor-Critic)**

**Paper**: "Soft Actor-Critic: Off-Policy Maximum Entropy Deep Reinforcement Learning" (Haarnoja et al., 2018)

**Key Features**:

- **Entropy Regularization**: Encourages exploration
- **Automatic Temperature Tuning**: Adapts exploration/exploitation
- **Twin Critics**: Like TD3
- **Stochastic**: Samples from Gaussian policy

**Best For**: More stable training, better exploration

**Recommended**: Use SAC for initial experiments

---

## Environment Design

### **State Space** (56 dimensions)

```python
state = {
    # Market features (50D)
    'features': [rsi_14, macd, bb_upper, ..., vol_skew],  # From feature engineering

    # Ensemble prediction (1D)
    'ensemble_pred': probability,  # Meta-learner output (0-1)

    # Portfolio state (5D)
    'cash': normalized_cash,           # Available cash (0-1)
    'position': current_position,       # -1 (short) to +1 (long)
    'pnl': normalized_pnl,             # Current PnL (-1 to +1)
    'drawdown': current_drawdown,       # Current drawdown (0-1)
    'days_in_position': days / 30,     # Normalized (0-1)
}
```

---

### **Action Space** (2 dimensions - Continuous)

```python
action = {
    'position_size': float,  # 0.0 (no position) to 1.0 (max position)
    'leverage': float,       # 1.0 (no leverage) to 3.0 (3x leverage)
}
```

**Example Actions**:

- `[0.0, 1.0]` → No position
- `[0.5, 1.0]` → 50% position, no leverage
- `[1.0, 2.0]` → Full position, 2x leverage
- `[0.2, 1.5]` → 20% position, 1.5x leverage

---

### **Reward Function**

**Sharpe-Based Reward with Penalties**:

```python
def calculate_reward(state, action, next_state):
    # Base reward: Daily return
    daily_return = (next_state['pnl'] - state['pnl']) / state['cash']

    # Sharpe-based reward (annualized)
    returns_history = get_last_n_returns(252)  # 1 year
    sharpe = np.mean(returns_history) / (np.std(returns_history) + 1e-8) * np.sqrt(252)

    # Drawdown penalty
    max_drawdown = get_max_drawdown()
    drawdown_penalty = -10.0 if max_drawdown > 0.20 else 0.0

    # Excessive leverage penalty
    leverage_penalty = -5.0 if action['leverage'] > 2.5 else 0.0

    # Transaction cost penalty
    position_change = abs(action['position_size'] - state['position'])
    txn_cost = -0.001 * position_change  # 0.1% per trade

    # Final reward
    reward = (
        daily_return * 100 +           # Scale up returns
        sharpe * 0.5 +                 # Bonus for high Sharpe
        drawdown_penalty +
        leverage_penalty +
        txn_cost
    )

    return reward
```

**Alternative: Self-Rewarding (SRDRL)**

```python
class SelfRewardingNetwork(nn.Module):
    """Learn reward function from data"""
    def __init__(self):
        super().__init__()
        self.reward_net = nn.Sequential(
            nn.Linear(56, 128),
            nn.ReLU(),
            nn.Linear(128, 1)
        )

    def forward(self, state, action, next_state):
        x = torch.cat([state, action, next_state], dim=-1)
        return self.reward_net(x)

# Train reward network with expert labels (Sharpe ratio)
# Then use learned reward for RL training
```

---

## Training Environment

```python
import gym
from gym import spaces
import numpy as np

class TradingEnv(gym.Env):
    """Custom Trading Environment for RL"""

    def __init__(self, data, ensemble_predictions):
        super().__init__()

        self.data = data  # Historical market data
        self.predictions = ensemble_predictions
        self.current_step = 0

        # State: 56D (50 features + 1 pred + 5 portfolio)
        self.observation_space = spaces.Box(
            low=-np.inf, high=np.inf, shape=(56,), dtype=np.float32
        )

        # Action: 2D continuous (position_size, leverage)
        self.action_space = spaces.Box(
            low=np.array([0.0, 1.0]),
            high=np.array([1.0, 3.0]),
            dtype=np.float32
        )

        # Portfolio state
        self.cash = 100000  # Starting capital
        self.position = 0.0
        self.pnl = 0.0
        self.max_equity = self.cash

    def reset(self):
        self.current_step = 0
        self.cash = 100000
        self.position = 0.0
        self.pnl = 0.0
        return self._get_state()

    def _get_state(self):
        # Market features (50D)
        features = self.data.iloc[self.current_step].values[:50]

        # Ensemble prediction (1D)
        pred = self.predictions.iloc[self.current_step]

        # Portfolio state (5D)
        portfolio = np.array([
            self.cash / 100000,                    # Normalized cash
            self.position,                          # Current position
            self.pnl / 100000,                     # Normalized PnL
            1 - (self.cash + self.pnl) / self.max_equity,  # Drawdown
            0.0,                                    # Days in position (placeholder)
        ])

        state = np.concatenate([features, [pred], portfolio])
        return state.astype(np.float32)

    def step(self, action):
        position_size, leverage = action

        # Get current price
        current_price = self.data.iloc[self.current_step]['close']

        # Calculate position change
        target_position = position_size * leverage
        position_change = target_position - self.position

        # Execute trade with transaction costs
        txn_cost = abs(position_change) * current_price * 0.001  # 0.1%
        self.cash -= txn_cost

        # Update position
        self.position = target_position

        # Move to next step
        self.current_step += 1

        # Calculate PnL
        next_price = self.data.iloc[self.current_step]['close']
        price_change = (next_price - current_price) / current_price
        position_pnl = self.position * self.cash * price_change
        self.pnl += position_pnl

        # Update max equity
        current_equity = self.cash + self.pnl
        self.max_equity = max(self.max_equity, current_equity)

        # Get next state
        next_state = self._get_state()

        # Calculate reward
        reward = self._calculate_reward(action)

        # Check if done
        done = (
            self.current_step >= len(self.data) - 1 or  # End of data
            self.cash + self.pnl <= 0.5 * 100000        # 50% drawdown
        )

        return next_state, reward, done, {}

    def _calculate_reward(self, action):
        # Use the reward function defined above
        return calculate_reward(self._get_state(), action, self._get_state())
```

---

## Training with Stable-Baselines3

```python
from stable_baselines3 import SAC, TD3
from stable_baselines3.common.vec_env import DummyVecEnv
from stable_baselines3.common.callbacks import EvalCallback

def train_rl_agent(data, ensemble_predictions, algorithm='SAC'):
    # Create environment
    env = TradingEnv(data, ensemble_predictions)
    env = DummyVecEnv([lambda: env])

    # Create evaluation environment
    eval_env = TradingEnv(data, ensemble_predictions)
    eval_env = DummyVecEnv([lambda: eval_env])

    # Callbacks
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path='./models/rl_agent/',
        log_path='./logs/',
        eval_freq=10000,
        deterministic=True,
        render=False
    )

    # Initialize agent
    if algorithm == 'SAC':
        agent = SAC(
            'MlpPolicy',
            env,
            learning_rate=3e-4,
            buffer_size=100000,
            learning_starts=10000,
            batch_size=256,
            tau=0.005,
            gamma=0.99,
            train_freq=1,
            gradient_steps=1,
            ent_coef='auto',  # Automatic entropy tuning
            verbose=1,
            tensorboard_log='./tensorboard/'
        )
    else:  # TD3
        agent = TD3(
            'MlpPolicy',
            env,
            learning_rate=3e-4,
            buffer_size=100000,
            learning_starts=10000,
            batch_size=256,
            tau=0.005,
            gamma=0.99,
            train_freq=(1, 'step'),
            gradient_steps=1,
            policy_delay=2,  # Delayed policy updates
            verbose=1,
            tensorboard_log='./tensorboard/'
        )

    # Train
    agent.learn(
        total_timesteps=1000000,  # 1M steps
        callback=eval_callback,
        log_interval=10
    )

    # Save final model
    agent.save('models/rl_agent_final')

    return agent
```

---

## Nodes

### **1. prepare_rl_data**

**Function**: `prepare_rl_training_data(features, ensemble_predictions, trades)`

Combine market features, predictions, and historical trades into RL environment format.

---

### **2. train_sac_agent**

**Function**: `train_sac(env, timesteps=1000000)`

Train SAC agent.

---

### **3. train_td3_agent**

**Function**: `train_td3(env, timesteps=1000000)`

Train TD3 agent.

---

### **4. evaluate_rl_agent**

**Function**: `evaluate_rl_performance(agent, test_env)`

Backtest RL agent on test set and compare to fixed sizing.

---

## Parameters

**File**: `conf/base/parameters/rl_agent.yml`

```yaml
rl_agent:
  algorithm: "SAC" # 'SAC' or 'TD3'

  environment:
    initial_capital: 100000
    max_leverage: 3.0
    transaction_cost: 0.001 # 0.1%

  training:
    total_timesteps: 1000000
    learning_rate: 3e-4
    buffer_size: 100000
    learning_starts: 10000
    batch_size: 256
    gamma: 0.99
    tau: 0.005

  sac:
    ent_coef: "auto"
    target_entropy: "auto"

  td3:
    policy_delay: 2
    target_noise: 0.2
    noise_clip: 0.5
```

---

## Run

```bash
# Train SAC agent
kedro run --pipeline train_rl_agent --params algorithm:SAC

# Train TD3 agent
kedro run --pipeline train_rl_agent --params algorithm:TD3

# Evaluate RL agent on test set
kedro run --pipeline evaluate_rl_agent

# Backtest with RL agent
kedro run --pipeline backtesting --params use_rl_agent:true
```

---

## Output

**Trained Agent**: `data/06_models/rl_agent_final.pkl`

**TensorBoard Logs**: `tensorboard/` (view with `tensorboard --logdir tensorboard/`)

---

## Expected Performance

| Metric            | Fixed Sizing | RL Agent (SAC) | Improvement |
| ----------------- | ------------ | -------------- | ----------- |
| Sharpe Ratio      | 1.5          | 1.8            | +20%        |
| Sortino Ratio     | 2.0          | 2.3            | +15%        |
| Max Drawdown      | 20%          | 18%            | -10%        |
| Win Rate          | 50%          | 55%            | +10%        |
| Avg Position Size | 5% (fixed)   | 3-8% (dynamic) | Adaptive    |

---

## Integration with algo-worker

After training, export RL agent to ONNX and integrate into Cognition layer:

```typescript
// apps/algo-worker/src/cognition/rl-position-sizer.service.ts
import * as ort from "onnxruntime-node";

@Injectable()
export class RLPositionSizerService {
  private session: ort.InferenceSession;

  async onModuleInit() {
    this.session = await ort.InferenceSession.create("models/rl_agent.onnx");
  }

  async getPositionSize(
    state: Float32Array
  ): Promise<{ size: number; leverage: number }> {
    const tensor = new ort.Tensor("float32", state, [1, 56]);
    const output = await this.session.run({ state: tensor });

    const action = output.action.data as Float32Array;
    return {
      size: action[0], // 0.0 - 1.0
      leverage: action[1], // 1.0 - 3.0
    };
  }
}
```

---

## Challenges & Mitigation

### **1. Overfitting to Training Period**

**Problem**: Agent learns to exploit specific historical patterns

**Solution**:

- Walk-forward validation (train on rolling windows)
- Evaluate on out-of-sample data
- Regularize with entropy (SAC)

---

### **2. Reward Engineering**

**Problem**: Hard to design reward that aligns with trading goals

**Solution**:

- Use Sharpe ratio as expert label
- Implement self-rewarding (learn reward from data)
- Test multiple reward formulations

---

### **3. Sample Efficiency**

**Problem**: RL requires lots of data (1M+ timesteps)

**Solution**:

- Use off-policy algorithms (SAC, TD3)
- Pre-train on historical data
- Data augmentation (add noise, bootstrap)

---

### **4. Non-Stationarity**

**Problem**: Market regime changes over time

**Solution**:

- Retrain periodically (monthly)
- Use adaptive learning rate
- Domain randomization

---

## When to Use RL Agent?

**Use if**:

- Baseline ensemble Sharpe >1.5
- 2+ years of training data
- GPU available for training
- Resources for monthly retraining
- Risk tolerance for experimentation

**Skip if**:

- Baseline ensemble Sharpe <1.2
- Limited data (<1 year)
- CPU-only environment
- Need explainability
- Low risk tolerance

---

## Testing

**Unit Tests**:

```python
def test_trading_env():
    env = TradingEnv(data, predictions)
    state = env.reset()
    assert state.shape == (56,)

    action = np.array([0.5, 1.5])  # 50% position, 1.5x leverage
    next_state, reward, done, info = env.step(action)
    assert next_state.shape == (56,)

def test_rl_agent_inference():
    agent = SAC.load('models/rl_agent_final')
    state = np.random.randn(56)
    action, _ = agent.predict(state, deterministic=True)
    assert action.shape == (2,)
    assert 0 <= action[0] <= 1  # Position size
    assert 1 <= action[1] <= 3  # Leverage
```

---

## See Also

- [Backtesting Pipeline](./BACKTESTING.md) - Test RL agent performance
- [Export ONNX Pipeline](./EXPORT_ONNX.md) - Deploy RL agent
- **TD3 Paper**: https://arxiv.org/abs/1802.09477
- **SAC Paper**: https://arxiv.org/abs/1801.01290
- **Stable-Baselines3**: https://stable-baselines3.readthedocs.io/
