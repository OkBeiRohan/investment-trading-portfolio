# Machine Learning Documentation

> **Complete AI/ML architecture for 2026 state-of-the-art algorithmic trading with 54 real-time features.**

**Last Updated**: January 18, 2026

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TRAINING (Python/Kedro)                            │
│                                                                              │
│  QuestDB (26 years) ─→ Feature Eng. ─→ CPCV Training ─→ ONNX Export         │
│  (2000-2026)            (54 features)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ ONNX Models
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INFERENCE (NestJS + Rust)                          │
│                                                                              │
│  Upstox WS ─→ compute-engine (Rust) ─→ algo-worker (ONNX Runtime)           │
│                 54 features, <5ms        <50ms inference                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Reason |
|-----------|------------|--------|
| **Feature Computation** | Rust (NAPI-RS) | <5ms, type-safe, 54 features parallel |
| **Model Training** | Python (Kedro) | ML ecosystem, CPCV validation |
| **Training Data** | QuestDB | 26 years daily + 2 years tick-by-tick |
| **Model Export** | ONNX | Cross-platform, optimized inference |
| **Live Inference** | NestJS + onnxruntime-node | Type-safe, Worker Threads, GPU |
| **Feature Store** | Feast + Redis | Training-serving consistency |

---

## Documentation Index

### Core Architecture

| Document | Description |
|----------|-------------|
| [AI_TRADING_ARCHITECTURE.md](./AI_TRADING_ARCHITECTURE.md) | 4-tier hierarchical model architecture |
| [TIER1_MODELS.md](./TIER1_MODELS.md) | Base prediction models (TFT, Mamba, LiT, LightGBM) |
| [META_LEARNER_EXECUTION.md](./META_LEARNER_EXECUTION.md) | Signal fusion, PPO execution agent |

### Feature Engineering

| Document | Description |
|----------|-------------|
| [**FEATURE_SPECIFICATION.md**](./FEATURE_SPECIFICATION.md) | **NEW** - Complete 54 feature definitions with formulas |
| [FEATURE_STORE.md](./FEATURE_STORE.md) | Feast + Redis for training/serving consistency |

### Training & Inference

| Document | Description |
|----------|-------------|
| [TRAINING_PIPELINE.md](./TRAINING_PIPELINE.md) | CPCV validation, Kedro orchestration, ONNX export |
| [INFERENCE_PIPELINE.md](./INFERENCE_PIPELINE.md) | ONNX Runtime in NestJS, GPU acceleration |
| [**QUESTDB_TRAINING_DATA.md**](./QUESTDB_TRAINING_DATA.md) | **NEW** - 26 years of data, tick-by-tick storage |

---

## 54 Features Summary

Features computed by `compute-engine` (Rust) in <5ms:

| Category | Count | Examples |
|----------|-------|----------|
| **Index Breadth** | 8 | `pct_stocks_above_vwap`, `breadth_thrust` |
| **NIFTY Future** | 12 | `fut_rsi_14`, `fut_macd_signal`, `fut_return_15m` |
| **Options** | 14 | `atm_iv`, `pcr_oi`, `total_gamma_exposure` |
| **Volatility** | 6 | `india_vix`, `iv_rv_ratio`, `realized_vol_5m` |
| **Order Flow** | 8 | `ofi_1s`, `depth_imbalance_5`, `bid_slope` |
| **Time Context** | 6 | `minutes_from_open`, `is_expiry_day` |
| **Total** | **54** | |

See [FEATURE_SPECIFICATION.md](./FEATURE_SPECIFICATION.md) for complete formulas and ranges.

---

## 4-Tier Hierarchical Model Architecture

```
TIER 4: Execution Optimization
  └── PPO Agent (ONNX), Exit Manager, Position Sizing
       ▲
TIER 3: Strategy & Decision
  └── Strike Selector, Strategy Selector, Risk Manager
       ▲
TIER 2: Meta-Learner (ONNX)
  └── Attention-Based Signal Fusion, Regime-Aware Weighting
       ▲
TIER 1: Base Prediction Models (ONNX)
  ├── MICRO (10s-1min): LiT, TLOB
  ├── MACRO (5min-1hr): LightGBM, XGBoost, PatchTST
  ├── REGIME: TFT, Mamba, TimeMixer
  └── OPTIONS: IV Predictor, Greeks Forecaster
```

---

## Data Flow

### Training Flow (Offline)

```
1. Historical Data (QuestDB - 26 years)
   ↓
2. Feature Engineering (compute-engine → QuestDB)
   ↓
3. Label Generation (Multi-horizon: 10s → EOD)
   ↓
4. Validity Filtering (is_valid = TRUE)
   ↓
5. CPCV Cross-Validation
   ↓
6. Model Training (PyTorch/LightGBM)
   ↓
7. ONNX Export + Quantization
   ↓
8. Model Registry (MLflow/MinIO)
```

### Inference Flow (Live)

```
1. Upstox WebSocket (market-feeder)
   ↓
2. Feature Computation (compute-engine, Rust, 54 features, <5ms)
   ↓
3. Redis Pub/Sub (features:live)
   ↓
4. algo-worker receives features
   ↓
5. ONNX Inference (onnxruntime-node, <50ms)
   ↓
6. Risk Validation
   ↓
7. Order Execution (Upstox API)
```

---

## Quick Start

### 1. Feature Computation (Rust)

```typescript
import { computeFeatures } from '@repo/compute-engine';

const result = computeFeatures(marketTick);
console.log(result.features);  // 54 features
console.log(result.totalDurationMicros);  // ~2000-4000 µs
```

### 2. Training with Kedro

```bash
cd services/training-pipeline
kedro run --pipeline=training
kedro run --pipeline=export  # ONNX export
```

### 3. Inference in NestJS

```typescript
import * as ort from 'onnxruntime-node';

const session = await ort.InferenceSession.create('models/model.onnx');
const tensor = new ort.Tensor('float32', features, [1, 54]);
const results = await session.run({ input: tensor });
```

---

## QuestDB Data Architecture

| Table | Records | Time Range | Purpose |
|-------|---------|------------|---------|
| `historical_ohlcv` | ~100M | 2000-2026 | Long-term patterns |
| `tick_data` | ~25B | 2024-2026 | Tick-by-tick training |
| `market_depth_20` | ~50B | 2024-2026 | LOB microstructure |
| `training_features_54` | ~500M | 2020-2026 | Pre-computed features |
| `training_labels` | ~500M | 2020-2026 | Multi-horizon targets |

All tables include `is_valid` and `invalid_reason` columns for data quality filtering.

See [QUESTDB_TRAINING_DATA.md](./QUESTDB_TRAINING_DATA.md) for complete schema.

---

## Performance Targets

| Component | Target | Typical |
|-----------|--------|---------|
| Feature Computation (Rust) | <5ms | 2-4ms |
| ONNX Inference (GPU) | <50ms | 30-40ms |
| Total Tick-to-Decision | <100ms | 50-70ms |
| Model AUC (H3: 5min) | >0.70 | 0.72 |

---

## Related Documentation

- [compute-engine README](../../packages/compute-engine/README.md) - Rust feature computation
- [algo-worker README](../../apps/algo-worker/README.md) - Trading engine with ONNX
- [training-pipeline README](../../services/training-pipeline/README.md) - Kedro ML training
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
