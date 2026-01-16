# Training Pipeline Scripts

Complete end-to-end pipeline for training, exporting, and validating volatility prediction models.

## Overview

```
QuestDB Features → Train Multi-Horizon → Export ONNX → 5D Validation
    (33 features)     (5/15/30 min)      (Production)    (Quality Gates)
```

## Scripts

### 1. `run_full_pipeline.py` (MASTER SCRIPT) ⭐

Runs the complete pipeline:

- Fetch features from QuestDB (market_state_1m table)
- Fetch labels from QuestDB (training_labels_1m table)
- Train LightGBM for multiple horizons (5min, 15min, 30min)
- Export models to ONNX format (for algo-worker)
- Validate models across 5 dimensions

**Usage:**

```bash
# Full pipeline (default: 5min, 15min, 30min horizons)
python scripts/run_full_pipeline.py

# Custom horizons
python scripts/run_full_pipeline.py --horizons 5 15

# Custom date range
python scripts/run_full_pipeline.py --start-date 2024-01-01

# Skip training (only export/validate existing models)
python scripts/run_full_pipeline.py --skip-training

# Skip validation
python scripts/run_full_pipeline.py --skip-validation
```

**Output:**

```
data/06_models/
  ├── lightgbm_5min.txt          # LightGBM model (5min horizon)
  ├── lightgbm_15min.txt         # LightGBM model (15min horizon)
  ├── lightgbm_30min.txt         # LightGBM model (30min horizon)
  ├── oof_lightgbm_5min.parquet  # Out-of-fold predictions
  └── feature_importance_5min.csv # Feature importance

apps/algo-worker/models/
  ├── lightgbm_5min.onnx         # ONNX model (production)
  ├── lightgbm_15min.onnx
  └── lightgbm_30min.onnx

data/08_reporting/validation/
  ├── 5min/
  │   ├── confusion_matrix.png
  │   ├── confidence_calibration.png
  │   ├── temporal_stability.png
  │   ├── equity_curve.png
  │   └── feature_importance.png
  └── ...
```

---

### 2. `train_multihorizon.py`

Train LightGBM models for multiple prediction horizons (5min, 15min, 30min).

**Why Separate Models?**

- Different feature importance per horizon (5min: OFI, 30min: Macro)
- Different optimal hyperparameters
- Different class distributions
- Easier deployment (algo-worker loads only needed horizons)
- Clearer performance evaluation

**Usage:**

```bash
python scripts/train_multihorizon.py
```

---

### 3. `export_onnx.py`

Export trained LightGBM models to ONNX format for production deployment.

**Features:**

- FP16 quantization (2x smaller, 2x faster)
- Validation (predictions match LightGBM within 1e-4 error)
- Inference benchmarking
- Metadata export

**Usage:**

```bash
python scripts/export_onnx.py
```

**Why ONNX?**

- 2x faster inference (FP16 quantization)
- 50% smaller file size
- Cross-platform (Windows + ArchLinux)
- Optimized for GPU/CPU (TensorRT, OpenVINO)

---

### 4. `validate_models.py`

Validate models across 5 dimensions (quality gates for production).

**Dimensions:**

1. **Predictive**: Better than random?
   - Metrics: Accuracy, AUC, Log Loss
   - Visualization: Confusion matrix

2. **Selective**: Knows when NOT to trade?
   - Metrics: Confidence calibration, ECE
   - Visualization: Confidence vs accuracy

3. **Stable**: Consistent across time?
   - Metrics: Rolling accuracy, coefficient of variation
   - Visualization: Temporal stability chart

4. **Profitable**: Positive expectancy?
   - Metrics: Sharpe, Sortino, max drawdown, win rate
   - Visualization: Equity curve

5. **Explainable**: Understand why?
   - Metrics: Feature importance, SHAP values
   - Visualization: Top 10 features

**Usage:**

```bash
python scripts/validate_models.py
```

---

### 5. `train_lightgbm.py` (Legacy - Single Horizon)

Quick training script for single horizon (useful for testing).

**Usage:**

```bash
python scripts/train_lightgbm.py
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ QuestDB (Pre-computed Features by compute-engine)              │
│                                                                 │
│ ┌───────────────────┐         ┌──────────────────────┐        │
│ │ market_state_1m   │         │ training_labels_1m   │        │
│ │                   │         │                      │        │
│ │ - 33 features     │         │ - horizon_minutes    │        │
│ │ - timestamp       │         │ - label (0/1/2)      │        │
│ │                   │         │ - future_return      │        │
│ └───────────────────┘         └──────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                    ↓                       ↓
            ┌──────────────────────────────────────┐
            │   sql_loader.py                      │
            │                                      │
            │   - load_lightgbm_features()        │
            │   - load_training_labels()          │
            └──────────────────────────────────────┘
                            ↓
            ┌──────────────────────────────────────┐
            │   LightGBMTrainer                    │
            │                                      │
            │   - Walk-forward validation         │
            │   - Volatility-adjusted labels      │
            │   - Class weighting                 │
            └──────────────────────────────────────┘
                            ↓
            ┌──────────────────────────────────────┐
            │   ONNX Export                        │
            │                                      │
            │   - FP16 quantization               │
            │   - Prediction validation           │
            └──────────────────────────────────────┘
                            ↓
            ┌──────────────────────────────────────┐
            │   5-Dimension Validation             │
            │                                      │
            │   - Quality gates                   │
            │   - Performance reports             │
            └──────────────────────────────────────┘
                            ↓
            ┌──────────────────────────────────────┐
            │   Production (algo-worker)           │
            │                                      │
            │   - ONNX Runtime inference          │
            │   - <50ms latency                   │
            └──────────────────────────────────────┘
```

---

## Multi-Horizon Strategy

**DECISION: Separate Models per Horizon (RECOMMENDED)**

### ✅ Advantages:

1. **Different Feature Importance**: 5min models prioritize OFI, 30min models prioritize macro indicators
2. **Different Hyperparameters**: Shorter horizons need less regularization
3. **Different Class Distributions**: Longer horizons have more NEUTRAL labels
4. **Easier Deployment**: algo-worker can load only needed horizons
5. **Clearer Evaluation**: Separate metrics per horizon

### ❌ Alternative (NOT RECOMMENDED):

Single multi-output model would require:

- Custom LightGBM objective function
- Less interpretable feature importance
- One bad horizon degrades all predictions

---

## Feature Schema (33 Features)

**Source:** `market_state_1m` table (computed by compute-engine)

### Market Structure (8 features)

- `pct_stocks_above_vwap`, `pct_stocks_above_ema20`, `weighted_return_top10`
- `advance_decline_ratio`, `breadth_momentum_5m`, `breadth_volatility`
- `rsi_14`, `macd`

### Momentum (8 features)

- `fut_return_1m`, `fut_return_5m`, `fut_volume_zscore`, `fut_oi_change`
- `range_position`, `fut_price_vs_vwap`, `vwap`, `ema_20`

### Volatility (5 features)

- `india_vix`, `realized_vol_5m`, `realized_vol_15m`, `vol_expansion_ratio`
- `atr_percent`

### Options Greeks & IV (9 features)

- `atm_iv`, `atm_iv_change`, `iv_skew`, `gamma_atm`, `vega_atm`
- `theta_atm`, `charm_atm`, `vanna_atm`, `max_pain_distance`

### Time Context (3 features)

- `minutes_from_open`, `minutes_to_close`, `day_of_week`

**See:** `packages/schema/sql/schema/create_market_state_1m.sql` for full schema.

---

## Label Schema

**Source:** `training_labels_1m` table

```sql
CREATE TABLE training_labels_1m (
  timestamp TIMESTAMP,
  horizon_minutes INT,        -- 5, 15, 30
  label BYTE,                 -- 0=DOWN, 1=NEUTRAL, 2=UP
  future_return DOUBLE,       -- Actual return over horizon
  atr_threshold DOUBLE        -- Volatility threshold used
) TIMESTAMP(timestamp) PARTITION BY DAY;
```

**Labeling Logic:**

- `future_return > atr_threshold` → UP (2)
- `future_return < -atr_threshold` → DOWN (0)
- Otherwise → NEUTRAL (1)

---

## Performance Benchmarks

### Training Performance (12-fold walk-forward)

- Training time: ~10min per horizon (GPU)
- Memory: ~2GB (33 features, 300K samples)
- Model size: ~500KB per horizon

### ONNX Export

- Compression: 2x smaller (FP16)
- Inference: ~0.5ms per sample (GPU)
- Validation error: <1e-4 (predictions match LightGBM)

### Validation

- Confusion matrix generation: ~5s
- Equity curve simulation: ~10s
- Feature importance plot: ~2s

---

## Quality Gates (Validation Thresholds)

Before deploying model to production, ensure:

1. **Predictive**:
   - ✅ Accuracy > 40% (random = 33% for 3-class)
   - ✅ Mean AUC > 0.55

2. **Selective**:
   - ✅ High-confidence (>0.6) accuracy > 50%
   - ✅ Expected Calibration Error (ECE) < 0.10

3. **Stable**:
   - ✅ Rolling accuracy CV < 0.20
   - ✅ Rolling accuracy std < 0.05

4. **Profitable**:
   - ✅ Sharpe ratio > 1.0
   - ✅ Max drawdown < 30%

5. **Explainable**:
   - ✅ Top 10 features cover >70% importance
   - ✅ No single feature dominates (>30%)

---

## Troubleshooting

### Issue: No data after merge

**Cause:** Features and labels timestamps don't align
**Solution:** Check if both tables use same timestamp resolution (1-minute)

### Issue: ONNX export fails

**Cause:** Missing dependencies or GPU/CPU issues
**Solution:** Install `onnxmltools`, `onnxruntime`, `onnxconverter-common`

### Issue: Validation takes too long

**Cause:** Large OOF predictions file
**Solution:** Use `--skip-validation` flag, run validation separately

### Issue: Model accuracy < 35%

**Cause:** Bad features or labels
**Solution:** Check feature engineering logic in compute-engine

---

## References

- **Walk-Forward Validation**: Lopez de Prado (2018) - "Advances in Financial Machine Learning"
- **Deflated Sharpe Ratio**: Bailey & Prado (2014) - "The Deflated Sharpe Ratio"
- **SHAP Values**: Lundberg & Lee (2017) - "A Unified Approach to Interpreting Model Predictions"
- **Confidence Calibration**: Guo et al. (2017) - "On Calibration of Modern Neural Networks"

---

**Last Updated**: 2025-11-29
**Author**: GitHub Copilot + Human Developer
**Status**: Production-Ready ✅
