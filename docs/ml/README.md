# Machine Learning Documentation

> **Complete AI/ML architecture for 2026 state-of-the-art algorithmic trading.**

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [AI_TRADING_ARCHITECTURE.md](./AI_TRADING_ARCHITECTURE.md) | **Start here** - Overview of 4-tier hierarchical model architecture |
| [TIER1_MODELS.md](./TIER1_MODELS.md) | Base prediction models (TFT, Mamba, PatchTST, TimeMixer, LiT) |
| [META_LEARNER_EXECUTION.md](./META_LEARNER_EXECUTION.md) | Tier 2-4: Signal fusion, strategy selection, PPO execution |
| [TRAINING_PIPELINE.md](./TRAINING_PIPELINE.md) | CPCV validation, Kedro orchestration, model registry |
| [FEATURE_STORE.md](./FEATURE_STORE.md) | Feast + Redis for training/serving consistency |

---

## Architecture Summary

### 4-Tier Hierarchical Model Architecture

```
TIER 4: Execution Optimization
  └── PPO Agent, Exit Manager, Position Sizing
       ▲
TIER 3: Strategy & Decision
  └── Strike Selector, Strategy Selector, Risk Manager
       ▲
TIER 2: Meta-Learner
  └── Attention-Based Signal Fusion, Regime-Aware Weighting
       ▲
TIER 1: Base Prediction Models
  ├── MICRO (10s-1min): LiT, TLOB, OFI-CNN
  ├── MACRO (5min-1hr): LightGBM, XGBoost, PatchTST
  ├── REGIME: TFT, Mamba, TimeMixer, HMM
  └── OPTIONS: IV Predictor, Greeks Forecaster
```

### Multi-Horizon Predictions

| Horizon | Target | Primary Models |
|---------|--------|----------------|
| H1: 10s | Direction | LiT, TLOB |
| H2: 1min | Direction + magnitude | LightGBM, Mamba |
| H3: 5min | Trend continuation | TFT, PatchTST |
| H4: 15min | Trend reversal | TFT, TimeMixer |
| H5: 1hr | Session direction | PatchTST, HMM |
| H6: EOD | Daily move | TFT Ensemble |

---

## Key Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| Time-Series Forecasting | TFT, PatchTST, TimeMixer | Multi-horizon prediction |
| Sequence Modeling | Mamba (State Space) | Efficient regime detection |
| Microstructure | LiT Transformer | LOB pattern recognition |
| Gradient Boosting | LightGBM, XGBoost | Fast feature-based prediction |
| Meta-Learning | Attention Networks | Regime-aware model fusion |
| Execution | PPO (RL) | Slippage optimization |
| Validation | CPCV | Robust model evaluation |
| Feature Store | Feast + Redis | Training/serving consistency |
| Drift Detection | ADWIN | Online model adaptation |

---

## Data Assets

| Data Type | Source | Resolution | Timeframe |
|-----------|--------|------------|-----------|
| NIFTY 50 Index | Upstox | 1min OHLCV | 2022-2026 |
| NIFTY 50 Index | Upstox | Daily OHLCV | 2000-2026 |
| 50 Constituents | Upstox | 1min OHLCV | 2022-2026 |
| NIFTY Futures | Upstox | 1min OHLCV+OI | 2022-2026 |
| NIFTY Options | Upstox | 1min OHLCV+OI | 2022-2026 |
| Live LOB | Upstox WS | Depth-30 | Real-time |
| India VIX | Upstox | 1min | 2022-2026 |

---

## Quick Start

### 1. Feature Computation

```python
from feature_computation import FeatureComputer

computer = FeatureComputer()
features = computer.compute_all(ohlcv_df, options_chain_df, lob_df)
```

### 2. Multi-Horizon Labels

```python
from labeling import MultiHorizonLabeler

labeler = MultiHorizonLabeler()
labeled_data = labeler.generate_labels(features)
```

### 3. Train with CPCV

```bash
cd services/training-pipeline
kedro run --pipeline=training
```

### 4. Inference

```python
from inference import TradingOrchestrator

orchestrator = TradingOrchestrator.load('models/')
result = orchestrator.process_tick(market_state)
```

---

## Research References

| Topic | Paper | Year |
|-------|-------|------|
| Temporal Fusion Transformer | [Bryan et al., Google](https://arxiv.org/abs/1912.09363) | 2019 |
| Mamba (State Space) | [Gu & Dao](https://arxiv.org/abs/2312.00752) | 2023 |
| PatchTST | [Nie et al.](https://arxiv.org/abs/2211.14730) | 2022 |
| LiT (LOB Transformer) | [Frontiers AI](https://www.frontiersin.org/journals/artificial-intelligence) | 2025 |
| CPCV | [López de Prado](https://www.cambridge.org/core/books/advances-in-financial-machine-learning) | 2018 |
| PPO for Execution | [OpenAI](https://arxiv.org/abs/1707.06347) | 2017 |

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Tick-to-Trade Latency (p95) | <150ms | - |
| ML Inference (GPU) | <50ms | - |
| Feature Computation | <5ms | - |
| Model AUC (H3) | >0.70 | - |
| Sharpe Ratio (Backtest) | >2.0 | - |

---

## Related Documentation

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [DEPLOYMENT_ARCHITECTURE.md](../DEPLOYMENT_ARCHITECTURE.md) - Deployment strategy
- [algo-worker README](../../apps/algo-worker/README.md) - Trading engine
- [training-pipeline README](../../services/training-pipeline/README.md) - Training infrastructure
