# Machine Learning Documentation

> **Complete AI/ML architecture for 2026 state-of-the-art algorithmic trading.**

**Last Updated**: January 18, 2026

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TRAINING (Python/Kedro)                            │
│                                                                              │
│   QuestDB ──→ Feature Engineering ──→ CPCV Training ──→ ONNX Export         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ ONNX Models
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INFERENCE (NestJS + Rust)                          │
│                                                                              │
│   Upstox WS ──→ compute-engine (Rust) ──→ algo-worker (ONNX Runtime)        │
│                    <5ms features              <50ms inference                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Reason |
|-----------|------------|--------|
| **Feature Computation** | Rust (NAPI-RS) | <5ms, type-safe, parallel via Rayon |
| **Model Training** | Python (Kedro) | ML ecosystem, CPCV validation |
| **Model Export** | ONNX | Cross-platform, optimized inference |
| **Live Inference** | NestJS + onnxruntime-node | Type-safe, Worker Threads, GPU |
| **Feature Store** | Feast + Redis | Training-serving consistency |

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [AI_TRADING_ARCHITECTURE.md](./AI_TRADING_ARCHITECTURE.md) | 4-tier hierarchical model architecture |
| [TIER1_MODELS.md](./TIER1_MODELS.md) | Base prediction models (TFT, Mamba, PatchTST, LiT) |
| [META_LEARNER_EXECUTION.md](./META_LEARNER_EXECUTION.md) | Signal fusion, PPO execution agent |
| [TRAINING_PIPELINE.md](./TRAINING_PIPELINE.md) | CPCV validation, Kedro orchestration, ONNX export |
| [FEATURE_STORE.md](./FEATURE_STORE.md) | Feast + Redis for training/serving consistency |
| [INFERENCE_PIPELINE.md](./INFERENCE_PIPELINE.md) | **NEW** - ONNX Runtime in NestJS, GPU acceleration |

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
1. Historical Data (QuestDB)
   ↓
2. Feature Engineering (compute-engine → QuestDB)
   ↓
3. Label Generation (Multi-horizon)
   ↓
4. CPCV Cross-Validation
   ↓
5. Model Training (PyTorch/LightGBM)
   ↓
6. ONNX Export + Quantization
   ↓
7. Model Registry (MLflow/MinIO)
```

### Inference Flow (Live)

```
1. Upstox WebSocket (market-feeder)
   ↓
2. Feature Computation (compute-engine, Rust, <5ms)
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
console.log(result.features);  // 33 features
console.log(result.totalDurationMicros);  // ~2000-3000 µs
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
const tensor = new ort.Tensor('float32', features, [1, 33]);
const results = await session.run({ input: tensor });
```

---

## Performance Targets

| Component | Target | Typical |
|-----------|--------|---------|
| Feature Computation (Rust) | <5ms | 2-3ms |
| ONNX Inference (GPU) | <50ms | 30-40ms |
| Total Tick-to-Decision | <100ms | 50-70ms |
| Model AUC (H3) | >0.70 | - |

---

## Related Documentation

- [compute-engine README](../../packages/compute-engine/README.md) - Rust feature computation
- [algo-worker README](../../apps/algo-worker/README.md) - Trading engine with ONNX
- [training-pipeline README](../../services/training-pipeline/README.md) - Kedro ML training
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
