# Training Pipeline - Complete Workflow

This guide shows the complete end-to-end workflow from features in QuestDB to a trained LightGBM model.

## Current Status ✅

You have already:
- ✅ Computed features using compute-engine
- ✅ Saved features to QuestDB `lightgbm_features` table
- ✅ 33 features ready for training

## Next: Train LightGBM Model

### Step 1: Verify Features

```powershell
cd services/training-pipeline
poetry shell
python scripts/check_features.py
```

**Expected Output:**
```
✅ Connected to QuestDB
✅ Table exists with 187,500 rows
✅ Date range: 2024-01-01 to 2026-01-16 (746 days)
✅ All 33 expected features present
✅ Ready to train!
```

### Step 2: Run Training

```powershell
python scripts/train_lightgbm.py
```

This will:
1. Load 2 years of features from QuestDB (33 features + close_price)
2. Apply volatility-adjusted labeling (UP/NEUTRAL/DOWN)
3. Run 12-fold walk-forward validation (expanding window)
4. Train LightGBM with GPU acceleration
5. Generate out-of-fold predictions
6. Display validation metrics and feature importance

**Training Time:** ~5-15 minutes depending on data size and GPU

### Step 3: Review Results

The script will output:

```
================================================================================
Training Complete!
================================================================================

Validation Metrics (Cross-Validation Averages):
  - Accuracy:   0.4756 ± 0.0234
  - Precision:  0.4589 ± 0.0198
  - Recall:     0.4756 ± 0.0234
  - F1 Score:   0.4423 ± 0.0267
  - ROC-AUC:    0.6834 ± 0.0156

Top 10 Most Important Features:
   1. atm_iv                        - 2456.78
   2. fut_return_5m                 - 1987.23
   3. iv_skew                       - 1654.32
   ...
```

### Quality Gates

For production deployment, ensure:
- ✅ **Accuracy > 0.45** (better than random for 3-class)
- ✅ **ROC-AUC > 0.65** (decent discrimination)
- ✅ **Consistent across folds** (low std deviation)

## Understanding the Metrics

### Walk-Forward Validation

The training uses **12-fold expanding window** validation:

```
Fold 1:  [----Train----][Purge][--Test--][Embargo]
Fold 2:  [------Train------][Purge][--Test--][Embargo]
Fold 3:  [--------Train--------][Purge][--Test--][Embargo]
...
```

- **Purge**: 375 minutes (1 trading day) between train/test
- **Embargo**: 375 minutes after test to prevent lookahead bias
- **Expanding window**: Train size grows each fold (realistic deployment)

### Label Generation (Volatility-Adjusted)

```python
# 5-minute forward return
forward_return = (future_price - current_price) / current_price

# ATR-normalized threshold
threshold = k * ATR_percent  # k=1.0 default

# 3-class labels
if forward_return > threshold:
    label = UP (2)
elif forward_return < -threshold:
    label = DOWN (0)
else:
    label = NEUTRAL (1)
```

This adapts to market volatility - higher ATR = wider neutral zone.

### Out-of-Fold (OOF) Predictions

OOF predictions are generated for **every sample**:
- Each sample is predicted using a model trained WITHOUT that sample
- No lookahead bias (true out-of-sample)
- Used for meta-learner training (Level-1 stacking)

## Hyperparameter Tuning

If metrics are poor, tune parameters in [scripts/train_lightgbm.py](scripts/train_lightgbm.py):

```python
lightgbm_config = LightGBMConfig(
    num_leaves=31,        # ↑ for more complex patterns, ↓ to reduce overfitting
    learning_rate=0.05,   # ↓ for better convergence (increase n_estimators)
    n_estimators=400,     # ↑ for better performance (with early stopping)
    min_data_in_leaf=80,  # ↑ to reduce overfitting, ↓ for more flexibility
    feature_fraction=0.8, # ↓ to reduce overfitting
    lambda_l1=0.5,        # ↑ for more regularization
    lambda_l2=1.0,        # ↑ for more regularization
)
```

Or edit the full Kedro config: [conf/base/parameters.yml](conf/base/parameters.yml)

## Next Steps After Training

### 1. Export to ONNX (TODO)

```powershell
kedro run --pipeline export_onnx
```

This will:
- Convert LightGBM model to ONNX format
- Apply FP16 quantization (2x faster inference)
- Validate predictions match original model
- Save to `apps/algo-worker/models/lightgbm.onnx`

### 2. Train Other Models (TODO)

```bash
# Level-0 models
kedro run --pipeline train_xgboost
kedro run --pipeline train_cnn_lstm
kedro run --pipeline train_ginn
kedro run --pipeline train_svm
kedro run --pipeline train_transformer

# Level-1 meta-learner (requires Level-0 OOF predictions)
kedro run --pipeline train_meta_learner
```

### 3. Backtest (TODO)

```powershell
kedro run --pipeline backtest
```

Simulates algo-worker execution with trained models.

### 4. Deploy to Production

```powershell
# Copy ONNX model
cp models/lightgbm.onnx ../../apps/algo-worker/models/

# Restart algo-worker
cd ../../apps/algo-worker
pnpm start
```

## MLflow Tracking (Optional)

Track experiments for hyperparameter comparison:

```powershell
# Start MLflow UI
mlflow ui --host 0.0.0.0 --port 5000

# Enable in training script
mlflow_enabled=True
```

View experiments at http://localhost:5000

Compare:
- Hyperparameter combinations
- Validation metrics across runs
- Feature importance evolution
- Model artifacts

## Troubleshooting

### Issue: `No data in QuestDB`

**Solution:** Run compute-engine to populate features:
```powershell
cd packages/compute-engine
pnpm test:compute-features
```

### Issue: `GPU not available`

**Solution:** Switch to CPU mode:
```python
device="cpu"
```

### Issue: `Poor accuracy (<0.40)`

**Possible causes:**
1. Insufficient training data (need 2+ years)
2. Features have too many NULLs
3. Labels are imbalanced (check class distribution)
4. Overfitting (increase regularization)

**Debug steps:**
1. Check feature NULL counts: `python scripts/check_features.py`
2. Analyze label distribution in training logs
3. Reduce `num_leaves` or increase `min_data_in_leaf`
4. Increase `lambda_l1` and `lambda_l2`

### Issue: `High variance across folds`

**Possible causes:**
1. Data distribution changes over time (regime shifts)
2. Small test sets
3. Overfitting

**Solutions:**
1. Use ensemble of models (reduces variance)
2. Increase training data
3. Stronger regularization

## Architecture Reminder

```
┌─────────────────────────────────────────────────────────────────┐
│                         OFFLINE TRAINING                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  QuestDB (Pre-computed Features)                               │
│         ↓                                                       │
│  Load Features (33 features + close_price)                     │
│         ↓                                                       │
│  Volatility-Adjusted Labeling (UP/NEUTRAL/DOWN)               │
│         ↓                                                       │
│  Walk-Forward Validation (12 folds)                            │
│         ↓                                                       │
│  Train LightGBM (GPU-accelerated)                              │
│         ↓                                                       │
│  Generate OOF Predictions (for meta-learner)                   │
│         ↓                                                       │
│  Export to ONNX (FP16 quantized)                               │
│         ↓                                                       │
│  Deploy to algo-worker                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Zero Train-Serve Skew**: Features computed identically in training (compute-engine) and production (algo-worker).

## References

- [Training Pipeline Architecture](docs/ARCHITECTURE.md)
- [Walk-Forward Validation](docs/ADVANCED_VALIDATION.md)
- [Root DEPLOYMENT_ARCHITECTURE.md](../../docs/DEPLOYMENT_ARCHITECTURE.md)
- [Copilot Instructions](.github/copilot-instructions.md)
