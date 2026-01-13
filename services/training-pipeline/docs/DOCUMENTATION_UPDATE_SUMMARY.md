# Training Pipeline Documentation Update Summary

**Date**: January 13, 2026  
**Status**: Complete ✅

---

## What Was Updated

All documentation across the repository has been updated to reflect the **new architecture** where compute-engine (Rust/NAPI) handles feature engineering and training-pipeline ONLY loads pre-computed features and trains models.

### Files Updated

1. **`services/training-pipeline/README.md`**
   - Updated architecture diagram showing compute-engine → QuestDB → training-pipeline flow
   - Emphasized "ZERO Feature Engineering" principle
   - Updated Quick Start to require pre-computed features in QuestDB
   - Clarified implementation status (LightGBM ✅, others ⏳)

2. **`.github/instructions/training-pipeline.instructions.md`**
   - Updated Project Overview to emphasize no feature engineering
   - Added CRITICAL warnings about feature computation
   - Updated Kedro project structure (removed feature engineering folders)
   - Updated data sources section to show QuestDB-only with pre-computed features
   - Added feature schema documentation (33 features for LightGBM)
   - Added link to MARKET_STATE_ENCODER.md

3. **`docs/AI_MODEL_TRAINING.md`**
   - Split into two sections: (A) Algo Trading Models, (B) Wealth Management Models
   - Added complete model inventory for algo trading (8 models)
   - Added training infrastructure details
   - Added reference to training-pipeline README

4. **`docs/HIERARCHICAL_INTELLIGENCE_ARCHITECTURE.md`**
   - Updated "Training Pipeline Updates" section
   - Added architecture diagram showing compute-engine integration
   - Updated implementation status for all models
   - Clarified that placeholders exist for all future models
   - Added references to training-pipeline docs

5. **`services/training-pipeline/docs/DOCUMENTATION_UPDATE_SUMMARY.md`** (this file)
   - Created comprehensive summary of all updates

---

## Key Architectural Messages

### 1. **Zero Feature Engineering** ⚠️ CRITICAL

Training-pipeline does **NOT** compute features. All feature computation happens in compute-engine (Rust/NAPI):

```
❌ OLD: training-pipeline computes features from raw ticks
✅ NEW: training-pipeline loads pre-computed features from QuestDB
```

### 2. **Zero Train-Serve Skew** 🎯

Models train on the EXACT same features that algo-worker uses in production:

```
compute-engine → QuestDB → {training-pipeline, algo-worker}
                            (same features)
```

### 3. **Type Safety** 🔒

Feature schemas defined in Rust, auto-generated to TypeScript via ts-rs:

```rust
// compute-engine (Rust)
#[napi(object)]
#[derive(TS)]
#[ts(export)]
pub struct LightGBMFeatures {
    pub pct_stocks_above_vwap: f64,
    // ... 32 more fields
}
```

```typescript
// Auto-generated TypeScript (packages/schema/src/market-data/generated/)
export interface LightGBMFeatures {
  pct_stocks_above_vwap: number;
  // ... matches Rust exactly
}
```

### 4. **Implementation Status** 📊

| Model        | Status         | Notes                                                 |
| ------------ | -------------- | ----------------------------------------------------- |
| LightGBM     | ✅ IMPLEMENTED | 33 features, walk-forward validation, MLflow tracking |
| XGBoost      | ⏳ PLACEHOLDER | Trainer class created, needs implementation           |
| CNN-LSTM     | ⏳ PLACEHOLDER | Trainer class created, needs implementation           |
| GINN         | ⏳ PLACEHOLDER | Trainer class created, needs implementation           |
| SVM          | ⏳ PLACEHOLDER | Trainer class created, needs implementation           |
| Transformer  | ⏳ PLACEHOLDER | Trainer class created, needs implementation           |
| TFT          | ⏳ BLOCKED     | Needs TFT feature schema in compute-engine first      |
| LiT          | ⏳ BLOCKED     | Needs LOB tensor schema in compute-engine first       |
| Meta-Learner | ⏳ PLACEHOLDER | Pipeline created, needs implementation                |

---

## Feature Schema (LightGBM v2)

### 33 Features from Market State Encoder

**Index Breadth (6)** - Aggregated from 50 NIFTY constituents:

- `pct_stocks_above_vwap`
- `pct_stocks_above_ema20`
- `weighted_return_top10`
- `advance_decline_ratio`
- `breadth_momentum_5m`
- `breadth_volatility`

**NIFTY FUTURE (9)** - Primary price discovery:

- `fut_price_vs_vwap`
- `fut_range_position`
- `fut_return_1m`
- `fut_return_5m`
- `fut_atr_percent`
- `fut_volume_zscore`
- `fut_oi_change`
- `fut_rsi_14` ⭐ NEW
- `fut_macd` ⭐ NEW

**Options Aggregate (11)**:

- `atm_iv`
- `atm_iv_change`
- `iv_skew`
- `gamma_atm`
- `vega_atm`
- `theta_atm`
- `pcr_oi`
- `pcr_volume`
- `max_pain_distance`
- `charm_atm` ⭐ NEW
- `vanna_atm` ⭐ NEW

**Volatility (4)**:

- `india_vix`
- `realized_vol_5m`
- `realized_vol_15m`
- `vol_expansion_ratio`

**Time Context (3)**:

- `minutes_from_open`
- `minutes_to_close`
- `day_of_week`

**Target** (for labeling):

- `close_price` (NIFTY FUTURE close)

**See**: [MARKET_STATE_ENCODER.md](../../../docs/MARKET_STATE_ENCODER.md) for full feature documentation.

---

## Data Flow (Complete System)

```mermaid
graph TD
    subgraph "Real-Time Production"
        A[Upstox Plus] -->|Raw Ticks| B[market-feeder]
        B -->|NIFTY 50 + Futures + Options| C[compute-engine]
        C -->|33 Features| D[QuestDB]
        D -->|Real-Time Inference| E[algo-worker]
    end

    subgraph "Offline Training"
        D -->|Historical Features| F[training-pipeline]
        F -->|Trained Models| G[ONNX Files]
        G -->|Deploy| E
    end

    subgraph "Feature Engineering (Rust)"
        C -->|Market State Encoder| C1[Index Breadth]
        C -->|Market State Encoder| C2[NIFTY FUTURE]
        C -->|Market State Encoder| C3[Options Aggregate]
        C -->|Market State Encoder| C4[Volatility]
        C -->|Market State Encoder| C5[Time Context]
    end
```

---

## Prerequisites for Training

### 1. QuestDB Must Contain Pre-Computed Features

**Table**: `market_state_encoder_output`

**Schema**: 33 features + timestamp + close_price

**Populated By**: market-feeder + compute-engine

**Minimum Data**: 2+ years (730 days) for proper walk-forward validation

### 2. Compute-Engine Must Be Running

Training-pipeline does NOT compute features. If QuestDB doesn't have pre-computed features, training will fail.

**Check Data Availability**:

```python
from training_pipeline.utils.sql_loader import QuestDBLoader

loader = QuestDBLoader("postgresql://admin:quest@localhost:8812/qdb")
min_date, max_date = loader.get_available_date_range()
print(f"Features available from {min_date} to {max_date}")

# Should show at least 2 years of data
```

### 3. MLflow Server (Optional)

For experiment tracking:

```bash
mlflow ui --backend-store-uri sqlite:///mlflow.db
# Open http://localhost:5000
```

---

## Usage Examples

### Train LightGBM Only

```bash
cd services/training-pipeline
poetry shell
kedro run --node train_lightgbm
```

### Train All Models (Placeholders Will Log Warnings)

```bash
kedro run --pipeline train_ensemble
```

### View Results in MLflow

```bash
mlflow ui
# Open http://localhost:5000
# Navigate to "lightgbm_v2_mse" experiment
```

---

## Next Steps for Implementation

### Phase 2: Implement Remaining TIER 1 Models

**Priority**: High  
**Timeline**: 2-4 weeks

1. **XGBoost Trainer** (1 week)
   - Same 33 features as LightGBM
   - Walk-forward validation
   - MLflow tracking
   - OOF predictions for meta-learner

2. **CNN-LSTM Trainer** (1 week)
   - Reshape 33 features as sequences (T=60, F=33)
   - Convolutional layers for feature extraction
   - LSTM layers for temporal dependencies
   - Same validation/tracking as LightGBM

3. **GINN Trainer** (1 week)
   - Graph-based relationships between features
   - Non-linear dynamics modeling
   - Same validation/tracking

4. **SVM Trainer** (3 days)
   - RBF kernel
   - Grid search for C and gamma
   - Same validation/tracking

5. **Transformer Trainer** (1 week)
   - Attention-based sequence modeling
   - Multi-head attention
   - Same validation/tracking

### Phase 3: Implement TIER 2 Models (Blocked)

**Prerequisites**: Define TFT/LiT feature schemas in compute-engine first

1. **compute-engine**: Define TFT feature schema (120×15 temporal)
2. **compute-engine**: Define LiT LOB tensor schema (60×80 levels)
3. **market-feeder**: Store TFT/LiT data to QuestDB
4. **training-pipeline**: Implement TFT/LiT trainers

### Phase 4: Meta-Learner & ONNX Export

**Priority**: Medium  
**Timeline**: 1-2 weeks

1. **Meta-Learner** (Level-1 stacking)
   - Load all Level-0 OOF predictions
   - Train contextual gating network
   - Adaptive model weighting based on market state

2. **ONNX Export Pipeline**
   - Convert all trained models to ONNX
   - Validate inference parity (Python vs ONNX)
   - Copy to algo-worker/models/

3. **Backtesting Pipeline**
   - Walk-forward backtest with realistic costs
   - Transaction costs + slippage simulation
   - Generate performance reports

---

## Documentation Cross-References

### Primary Documentation

- **[training-pipeline/README.md](../README.md)** - Main training pipeline documentation
- **[training-pipeline/docs/ARCHITECTURE_UPDATE.md](./ARCHITECTURE_UPDATE.md)** - Architecture change details
- **[.github/instructions/training-pipeline.instructions.md](../../../.github/instructions/training-pipeline.instructions.md)** - GitHub Copilot instructions

### Architecture Documentation

- **[docs/MARKET_STATE_ENCODER.md](../../../docs/MARKET_STATE_ENCODER.md)** - Feature engineering (MSE) documentation
- **[docs/HIERARCHICAL_INTELLIGENCE_ARCHITECTURE.md](../../../docs/HIERARCHICAL_INTELLIGENCE_ARCHITECTURE.md)** - Multi-scale model architecture
- **[docs/COMPUTE_ENGINE_INTEGRATION.md](../../../docs/COMPUTE_ENGINE_INTEGRATION.md)** - Compute-engine integration guide
- **[docs/AI_MODEL_TRAINING.md](../../../docs/AI_MODEL_TRAINING.md)** - Complete AI/ML training guide

### Implementation Guides

- **[training-pipeline/docs/pipelines/TRAIN_ENSEMBLE.md](./pipelines/TRAIN_ENSEMBLE.md)** - Ensemble training pipeline
- **[training-pipeline/docs/ADVANCED_VALIDATION.md](./ADVANCED_VALIDATION.md)** - CPCV, OFI, RL patterns

---

## Summary

✅ **All training-pipeline documentation updated** to reflect:

1. Zero feature engineering in training-pipeline
2. Compute-engine handles all feature computation
3. QuestDB stores pre-computed features
4. Training-pipeline ONLY loads features and trains models
5. LightGBM fully implemented, others are placeholders
6. TFT/LiT blocked pending compute-engine schemas

🎯 **Key Takeaway**: Training-pipeline is a **pure model training** system. Feature engineering is completely decoupled and handled by compute-engine (Rust/NAPI).
