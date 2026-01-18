# Machine Learning Documentation

**Last Updated**: January 18, 2026  
**Architecture**: 3-Tier Multi-Model Ensemble

---

## Overview

This directory contains documentation for the **AI trading system** that powers the algo-worker. The system uses a 3-tier model architecture trained on multi-timeframe data spanning 26 years.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ML ARCHITECTURE OVERVIEW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DATA (26 years)                                                            │
│  ├── Daily OHLCV: 2000-2026 (6,500 trading days)                            │
│  ├── 1-Min OHLCV: 2022-2026 (~1M candles/instrument)                        │
│  ├── India VIX: Feb 2014-2026                                               │
│  ├── Expired F&O: Full chain with strikes, OI                               │
│  └── Live Tick: Depth-30, Greeks, IV (from today)                           │
│                                                                              │
│  MODELS (3-Tier)                                                            │
│  ├── Tier 1: Regime HMM (26yr daily) → Macro regime                         │
│  ├── Tier 2: LightGBM + TFT (4yr 1-min) → Direction                         │
│  └── Tier 3: LiT (live tick) → Microstructure                               │
│                                                                              │
│  INFERENCE (<80ms E2E)                                                       │
│  ├── 54 features via Rust compute-engine (<5ms)                             │
│  ├── ONNX ensemble inference (<50ms)                                        │
│  └── Meta-learner signal fusion                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Documentation Index

### Core Architecture

| Document | Description |
|----------|-------------|
| [**DATA_ARCHITECTURE.md**](./DATA_ARCHITECTURE.md) | Data sources, QuestDB schemas, Upstox API integration |
| [**MODEL_ARCHITECTURE.md**](./MODEL_ARCHITECTURE.md) | 3-tier model design: Regime → Direction → Microstructure |
| [**TRAINING_STRATEGY.md**](./TRAINING_STRATEGY.md) | CPCV validation, walk-forward, ONNX export |

### Features & Inference

| Document | Description |
|----------|-------------|
| [**FEATURE_SPECIFICATION.md**](./FEATURE_SPECIFICATION.md) | 54 feature definitions and formulas |
| [**INFERENCE_PIPELINE.md**](./INFERENCE_PIPELINE.md) | ONNX Runtime inference architecture |
| [**FEATURE_STORE.md**](./FEATURE_STORE.md) | Feast feature store setup (optional) |

### Models & Training

| Document | Description |
|----------|-------------|
| [**TIER1_MODELS.md**](./TIER1_MODELS.md) | Regime, TFT, Mamba model specifications |
| [**META_LEARNER_EXECUTION.md**](./META_LEARNER_EXECUTION.md) | Signal fusion and adaptive weighting |
| [**TRAINING_PIPELINE.md**](./TRAINING_PIPELINE.md) | Kedro pipeline details |

### Data Storage

| Document | Description |
|----------|-------------|
| [**QUESTDB_TRAINING_DATA.md**](./QUESTDB_TRAINING_DATA.md) | QuestDB schema for training data |
| [**AI_TRADING_ARCHITECTURE.md**](./AI_TRADING_ARCHITECTURE.md) | High-level architecture overview |

---

## Quick Reference

### Available Data

| Data Type | Coverage | Volume |
|-----------|----------|--------|
| Daily OHLCV | 26 years (2000-2026) | ~6,500 days |
| 1-Min OHLCV | 4 years (2022-2026) | ~1M candles |
| India VIX | 12 years (2014-2026) | ~3,000 days |
| Expired F&O | Full chain | All strikes |
| Live Tick | Today onwards | Continuous |

### Model Stack

| Layer | Model | Input | Latency |
|-------|-------|-------|---------|
| Tier 1 | Regime HMM | Daily data | Batch |
| Tier 2 | LightGBM | 46 features | ~20ms |
| Tier 2 | TFT | 46×120 sequence | ~35ms |
| Tier 3 | LiT | 14 OFI features | ~10ms |
| Meta | Weighted Fusion | Model outputs | ~2ms |

### 54 Features

| Category | Count | Examples |
|----------|-------|----------|
| Index Breadth | 8 | pct_above_vwap, breadth_thrust |
| NIFTY Future | 12 | RSI, MACD, ATR, Bollinger |
| Options | 14 | ATM IV, PCR, GEX, skew |
| Volatility | 6 | India VIX, IV/RV ratio |
| Order Flow | 8 | OFI, depth imbalance |
| Time Context | 6 | minutes_from_open, is_expiry |

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Feature Computation | <5ms (Rust) |
| ML Inference | <50ms (ONNX) |
| E2E Latency | <80ms |
| LightGBM AUC | >0.68 |
| Ensemble Sharpe | >1.5 |

---

## Related Documentation

- [algo-worker docs](../../apps/algo-worker/docs/) - Live inference
- [training-pipeline](../../services/training-pipeline/) - Kedro training
- [compute-engine](../../packages/compute-engine/) - Rust features
