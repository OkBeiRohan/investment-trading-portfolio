# Model Architecture: 3-Tier Ensemble System

**Last Updated**: January 18, 2026  
**Architecture Version**: 2026 Institutional-Grade

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     3-TIER MODEL ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ TIER 1: MACRO REGIME MODELS                                             ││
│  │ Data: 26yr Daily + 12yr VIX | Purpose: Long-term regime classification ││
│  │ ├── Regime HMM (4 states)                                               ││
│  │ ├── Trend Classifier (UP/DOWN/RANGE)                                    ││
│  │ └── Volatility Regime (HIGH/NORMAL/LOW)                                 ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                          ↓ Regime Context                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ TIER 2: INTRADAY DIRECTION MODELS                                       ││
│  │ Data: 4yr 1-Min | Purpose: 5-15 minute directional forecast             ││
│  │ ├── LightGBM (46 features) → Primary                                    ││
│  │ ├── XGBoost (46 features) → Secondary                                   ││
│  │ └── TFT (46×120 sequence) → Multi-horizon                               ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                          ↓ Direction Signal                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ TIER 3: MICROSTRUCTURE MODELS (Progressive Development)                 ││
│  │ Data: Live Tick (from today) | Purpose: 10s-1min order flow signals     ││
│  │ ├── LiT (14 Order Flow features) → Buy/Sell pressure                    ││
│  │ └── DRL Execution Agent → Optimal order execution                       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                          ↓                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ META-LEARNER: ADAPTIVE SIGNAL FUSION                                    ││
│  │ Combines all tiers with regime-adaptive weighting                       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tier 1: Macro Regime Models

### Purpose
Long-term market regime classification using 26 years of daily data to provide context for intraday models.

### Models

| Model | Input Features | Output | Training Data |
|-------|----------------|--------|---------------|
| **Regime HMM** | Returns, VIX, Volatility | 4 states | 26yr daily |
| **Trend Classifier** | MA crossovers, Higher Highs | UP/DOWN/RANGE | 26yr daily |
| **Vol Regime** | Realized vol, VIX percentile | HIGH/NORMAL/LOW | 12yr VIX |

### Regime States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ REGIME CLASSIFICATION                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STATE 1: BULL TRENDING           STATE 2: BEAR TRENDING                    │
│  ├── VIX < 18                     ├── VIX 18-25                             │
│  ├── 50 DMA > 200 DMA             ├── 50 DMA < 200 DMA                       │
│  ├── Higher highs                 ├── Lower lows                            │
│  └── Breadth > 60%                └── Breadth < 40%                         │
│                                                                              │
│  STATE 3: VOLATILE                STATE 4: RANGING                          │
│  ├── VIX > 25                     ├── VIX 15-20                             │
│  ├── ATR spike > 2x               ├── ATR normal                            │
│  └── Sector rotation high         └── Breadth 40-60%                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Features (Daily)

```python
REGIME_FEATURES = [
    # Returns
    'return_1d', 'return_5d', 'return_10d', 'return_20d', 'return_60d',
    # Moving Averages
    'sma_20', 'sma_50', 'sma_100', 'sma_200',
    'ema_20', 'price_vs_sma200',
    # Volatility
    'realized_vol_10d', 'realized_vol_20d', 'realized_vol_60d',
    'india_vix', 'vix_percentile_1yr',
    # Trend
    'higher_high_count_20d', 'lower_low_count_20d',
    'adx_14', 'trend_strength',
    # Breadth
    'pct_above_200sma', 'advance_decline_20d',
    # Seasonality
    'month', 'day_of_week', 'days_to_expiry'
]
```

---

## Tier 2: Intraday Direction Models

### Purpose
5-15 minute directional forecast using 4 years of 1-minute data with 46 of the 54 features (excludes order flow).

### Models

| Model | Architecture | Input | Output | Latency |
|-------|--------------|-------|--------|---------|
| **LightGBM** | Gradient Boosting | 46 features | 3-class probs | ~20ms |
| **XGBoost** | Gradient Boosting | 46 features | 3-class probs | ~25ms |
| **TFT** | Temporal Fusion | 46×120 sequence | Multi-horizon | ~35ms |

### LightGBM (Primary Model)

```yaml
model:
  type: lightgbm.LGBMClassifier
  params:
    objective: multiclass
    num_class: 3
    n_estimators: 1000
    max_depth: 8
    num_leaves: 64
    learning_rate: 0.01
    feature_fraction: 0.8
    bagging_fraction: 0.8
    bagging_freq: 5
    min_child_samples: 20
    class_weight: balanced
    early_stopping_rounds: 50
    
features:
  count: 46
  categories:
    - index_breadth: 8
    - nifty_future: 12
    - options: 14
    - volatility: 6
    - time_context: 6
    
output:
  classes: ['VOL_DOWN', 'NEUTRAL', 'VOL_UP']
  threshold: 0.002  # 0.2% move threshold
  horizon: 15  # bars (15 minutes)
```

### TFT (Temporal Fusion Transformer)

```yaml
model:
  type: pytorch_forecasting.TemporalFusionTransformer
  params:
    hidden_size: 64
    attention_head_size: 4
    dropout: 0.1
    hidden_continuous_size: 32
    output_size: 3  # horizons: 5min, 15min, 30min
    learning_rate: 0.001
    reduce_on_plateau_patience: 4
    
input:
  sequence_length: 120  # 2 hours of 1-min bars
  features: 46
  
output:
  horizons: [5, 15, 30]  # minutes
  type: quantile_regression
  quantiles: [0.1, 0.5, 0.9]
```

### Feature Set (46 Features)

| Category | Count | Features |
|----------|-------|----------|
| **Index Breadth** | 8 | pct_above_vwap, breadth_thrust, etc. |
| **NIFTY Future** | 12 | RSI, MACD, ATR, Bollinger, etc. |
| **Options** | 14 | ATM IV, PCR, skew, GEX, etc. |
| **Volatility** | 6 | India VIX, IV/RV ratio, etc. |
| **Time Context** | 6 | minutes_from_open, is_expiry_day, etc. |

---

## Tier 3: Microstructure Models

### Purpose
10 second to 1 minute order flow signals using live tick-by-tick data with depth-30.

### Challenge: No Historical Tick Data

**Solution: Progressive Development**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PROGRESSIVE MICROSTRUCTURE MODEL DEVELOPMENT                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1 (Day 0): Pre-training                                              │
│  ├── Synthetic LOB generation using GAN                                     │
│  ├── Transfer learning from 1-min bid/ask spread                            │
│  └── Model weights initialized                                              │
│                                                                              │
│  PHASE 2 (Day 1-30): Online Calibration                                     │
│  ├── Collect real tick data                                                 │
│  ├── Fine-tune pre-trained model                                            │
│  └── Validate against Tier 2 signals                                        │
│                                                                              │
│  PHASE 3 (Day 30+): Full Microstructure                                     │
│  ├── LiT trained on real data                                               │
│  ├── DRL execution agent                                                    │
│  └── Continuous online learning                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### LiT (Limit Order Book Transformer)

```yaml
model:
  type: custom.LiTTransformer
  params:
    d_model: 64
    n_heads: 4
    n_layers: 3
    dropout: 0.1
    
input:
  features: 14  # Order flow only
  sequence_length: 60  # 60 seconds
  
features:
  - ofi_1s
  - ofi_5s
  - ofi_30s
  - trade_imbalance
  - depth_imbalance_5
  - depth_imbalance_10
  - volume_at_bid_pct
  - large_trade_indicator
  - bid_ask_slope
  - spread_normalized
  - mid_price_change
  - order_arrival_rate
  - cancellation_rate
  - sweep_detector

output:
  classes: ['SELL_PRESSURE', 'NEUTRAL', 'BUY_PRESSURE']
  horizon: 10  # seconds
```

### DRL Execution Agent

```yaml
model:
  type: stable_baselines3.PPO
  environment: OrderExecutionEnv
  
state:
  - remaining_quantity
  - time_remaining
  - lob_state (depth-30)
  - spread
  - volatility
  - order_imbalance

actions:
  - limit_price_offset: [-10, -5, 0, +5, +10] ticks
  - order_size: [0.1, 0.25, 0.5, 1.0] of remaining
  - wait_time: [0, 1, 5, 10] seconds

reward:
  - -slippage_cost
  - -delay_penalty
  - -adverse_selection_cost
  
training:
  method: offline_rl  # Pre-train on historical order data
  fine_tune: online   # Fine-tune on live executions
```

---

## Meta-Learner: Adaptive Signal Fusion

### Purpose
Combine signals from all tiers with regime-adaptive weighting.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ META-LEARNER: CONTEXTUAL GATING NETWORK                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INPUTS:                                                                     │
│  ├── Tier 1 Regime: [regime_state, trend, vol_regime]                       │
│  ├── Tier 2 Direction: [lgbm_prob, xgb_prob, tft_prob]                      │
│  └── Tier 3 Microstructure: [lit_prob] (when available)                     │
│                                                                              │
│  GATING MECHANISM:                                                           │
│  ├── Context vector = f(regime, vix, time_of_day)                           │
│  ├── Weights = softmax(W @ context + b)                                     │
│  └── Final signal = sum(weights * model_probs)                              │
│                                                                              │
│  REGIME-ADAPTIVE WEIGHTS:                                                   │
│  ├── BULL TRENDING:  LightGBM=0.5, TFT=0.3, LiT=0.2                         │
│  ├── BEAR TRENDING:  LightGBM=0.5, TFT=0.3, LiT=0.2                         │
│  ├── VOLATILE:       LightGBM=0.3, TFT=0.3, LiT=0.4                         │
│  └── RANGING:        LightGBM=0.4, TFT=0.4, LiT=0.2                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementation

```python
class MetaLearner:
    def __init__(self):
        self.base_weights = {
            'BULL_TRENDING':  {'lgbm': 0.5, 'tft': 0.3, 'lit': 0.2},
            'BEAR_TRENDING':  {'lgbm': 0.5, 'tft': 0.3, 'lit': 0.2},
            'VOLATILE':       {'lgbm': 0.3, 'tft': 0.3, 'lit': 0.4},
            'RANGING':        {'lgbm': 0.4, 'tft': 0.4, 'lit': 0.2},
        }
    
    def predict(self, regime: str, model_probs: dict) -> TradingSignal:
        weights = self.base_weights[regime]
        
        # Weighted average
        final_probs = np.zeros(3)
        for model, prob in model_probs.items():
            if model in weights:
                final_probs += weights[model] * np.array(prob)
        
        # Generate signal
        direction = ['VOL_DOWN', 'NEUTRAL', 'VOL_UP'][np.argmax(final_probs)]
        confidence = np.max(final_probs)
        
        return TradingSignal(
            direction=direction,
            confidence=confidence,
            regime=regime,
            model_weights=weights
        )
```

---

## Model Performance Targets

| Model | Metric | Target | Validation |
|-------|--------|--------|------------|
| **Regime HMM** | State persistence | >5 days avg | Walk-forward |
| **LightGBM** | AUC-ROC | >0.68 | CPCV |
| **XGBoost** | AUC-ROC | >0.67 | CPCV |
| **TFT** | MAE (returns) | <0.3% | CPCV |
| **LiT** | AUC-ROC | >0.65 | Rolling window |
| **Meta-Learner** | AUC-ROC | >0.72 | CPCV |
| **Ensemble** | Sharpe Ratio | >1.5 | Backtest |

---

## Hardware Requirements

### Training (RTX 3050 - 4GB VRAM)

| Model | Memory | Training Time |
|-------|--------|---------------|
| LightGBM | <1GB | ~30 min |
| XGBoost | <1GB | ~45 min |
| TFT | ~2GB | ~4 hours |
| LiT | ~2GB | ~2 hours |
| Meta-Learner | <0.5GB | ~5 min |

### Inference (Production)

| Model | Latency | Memory |
|-------|---------|--------|
| LightGBM | ~20ms | ~50MB |
| XGBoost | ~25ms | ~60MB |
| TFT | ~35ms | ~200MB |
| LiT | ~10ms | ~100MB |
| **Total (parallel)** | **~50ms** | **~500MB** |

---

## Related Documentation

- [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) - Data sources
- [TRAINING_STRATEGY.md](./TRAINING_STRATEGY.md) - Validation methods
- [FEATURE_SPECIFICATION.md](./FEATURE_SPECIFICATION.md) - 54 features
- [INFERENCE_ENGINE.md](../../apps/algo-worker/docs/INFERENCE_ENGINE.md) - Live inference
