# Training Pipeline - Execution Checklist

Use this checklist to ensure successful pipeline execution.

---

## Pre-Execution Checklist

### Environment Setup

- [ ] Python 3.11+ installed
- [ ] Virtual environment activated
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] GPU drivers installed (optional, but recommended)
- [ ] Sufficient disk space (~5 GB)

### Database Setup

- [ ] QuestDB running on port 8812
- [ ] MongoDB running (for audit logs)
- [ ] Redis running (for event bus)

**Check:**

```powershell
Test-NetConnection -ComputerName localhost -Port 8812  # QuestDB
Test-NetConnection -ComputerName localhost -Port 27017 # MongoDB
Test-NetConnection -ComputerName localhost -Port 6379  # Redis
```

### Data Availability

- [ ] `market_state_1m` table exists with 33 features
- [ ] `market_candles` table exists (for close_price)
- [ ] `training_labels_1m` table exists with labels (5min, 15min, 30min)

**Verify:**

```bash
cd services/training-pipeline
python scripts/check_features.py
```

**Expected Output:**

```
✅ market_state_1m table exists
✅ 33 features found
✅ 245,000 rows found (last 30 days)
```

---

## Execution Steps

### Step 1: Run Full Pipeline

```bash
cd services/training-pipeline
python scripts/run_full_pipeline.py
```

**Expected Time**: 30-40 minutes

**Watch For**:

- Loading messages for features and labels
- Training progress (Fold 1/12, 2/12, etc.)
- ONNX export success messages
- Validation report generation

---

### Step 2: Verify Outputs

#### Models Created

```powershell
Get-ChildItem -Path "data\06_models\" -Filter "lightgbm_*.txt"
```

**Expected**:

```
lightgbm_5min.txt   (~500 KB)
lightgbm_15min.txt  (~500 KB)
lightgbm_30min.txt  (~500 KB)
```

#### OOF Predictions

```powershell
Get-ChildItem -Path "data\06_models\" -Filter "oof_*.parquet"
```

**Expected**:

```
oof_lightgbm_5min.parquet   (~2 MB)
oof_lightgbm_15min.parquet  (~2 MB)
oof_lightgbm_30min.parquet  (~2 MB)
```

#### ONNX Models

```powershell
Get-ChildItem -Path "..\..\apps\algo-worker\models\" -Filter "lightgbm_*.onnx"
```

**Expected**:

```
lightgbm_5min.onnx   (~250 KB)
lightgbm_15min.onnx  (~250 KB)
lightgbm_30min.onnx  (~250 KB)
```

#### Validation Reports

```powershell
Get-ChildItem -Path "data\08_reporting\validation\5min\" -Filter "*.png"
```

**Expected**:

```
confusion_matrix.png
confidence_calibration.png
temporal_stability.png
equity_curve.png
feature_importance.png
```

---

### Step 3: Check Metrics

```python
import pandas as pd
import numpy as np

# Load OOF predictions
oof = pd.read_parquet('data/06_models/oof_lightgbm_5min.parquet')

# Calculate accuracy
y_true = oof['label'].values
y_pred = oof[['pred_class_0', 'pred_class_1', 'pred_class_2']].values.argmax(axis=1)
accuracy = (y_true == y_pred).mean()

print(f"OOF Accuracy: {accuracy:.4f}")
# Expected: 0.42-0.48 (random = 0.33 for 3-class)

# Check label distribution
print("\nLabel Distribution:")
print(oof['label'].value_counts().sort_index())
# Expected:
#   0 (DOWN):    ~80,000
#   1 (NEUTRAL): ~85,000
#   2 (UP):      ~80,000
```

---

## Quality Gate Validation

### Dimension 1: Predictive ✅

- [ ] Accuracy > 40% (random = 33%)
- [ ] Mean AUC > 0.55
- [ ] Log Loss < 1.1

### Dimension 2: Selective ✅

- [ ] High-confidence (>0.6) accuracy > 50%
- [ ] Expected Calibration Error (ECE) < 0.10
- [ ] Confidence distribution reasonable (not all low/high)

### Dimension 3: Stable ✅

- [ ] Rolling accuracy CV < 0.20
- [ ] Rolling accuracy std < 0.05
- [ ] No sudden drops in temporal stability chart

### Dimension 4: Profitable ✅

- [ ] Sharpe ratio > 1.0
- [ ] Max drawdown < 30%
- [ ] Win rate > 50%

### Dimension 5: Explainable ✅

- [ ] Top 10 features cover >70% importance
- [ ] No single feature dominates (>30%)
- [ ] Feature importance makes sense (IV, volatility high)

---

## Post-Execution Tasks

### Deployment

- [ ] ONNX models copied to `apps/algo-worker/models/`
- [ ] algo-worker configuration updated with horizons
- [ ] Model version tagged in Git

### Testing

- [ ] Backtest on historical data
- [ ] Paper trading for 1 week
- [ ] Monitor prediction accuracy

### Documentation

- [ ] Update `docs/MODEL_INVENTORY.md` with new models
- [ ] Document hyperparameters in `data/06_models/config.yaml`
- [ ] Add training date to model metadata

---

## Troubleshooting

### Issue 1: "No data after merge"

**Symptom**: `Merged dataset: 0 rows`

**Diagnosis**:

```python
from training_pipeline.utils.sql_loader import QuestDBLoader

loader = QuestDBLoader('postgresql://admin:quest@localhost:8812/qdb')
features = loader.load_lightgbm_features(...)
labels = loader.load_training_labels(...)

print(f"Features: {len(features)} rows")
print(f"Labels: {len(labels)} rows")
print(f"Feature timestamps: {features.timestamp.min()} to {features.timestamp.max()}")
print(f"Label timestamps: {labels.timestamp.min()} to {labels.timestamp.max()}")
```

**Solution**:

- Ensure timestamps overlap
- Check if labels are computed for correct date range
- Verify both tables use same timestamp resolution (1-minute)

---

### Issue 2: GPU Not Available

**Symptom**: `RuntimeError: GPU not available`

**Solution**:
Edit `scripts/train_multihorizon.py`:

```python
params={
    'device': 'cpu',  # Change from 'gpu'
    # Remove gpu_platform_id and gpu_device_id
}
```

---

### Issue 3: ONNX Export Fails

**Symptom**: `ModuleNotFoundError: No module named 'onnxmltools'`

**Solution**:

```bash
pip install onnxmltools onnxruntime onnxconverter-common
```

---

### Issue 4: Accuracy < 35%

**Symptom**: Model performs worse than random

**Diagnosis**:

```python
# Check feature statistics
features = pd.read_sql('SELECT * FROM market_state_1m LIMIT 1000', ...)
print(features.describe())

# Look for:
# - NaN values
# - Constant columns (std = 0)
# - Extreme outliers (mean ± 5*std)
```

**Solution**:

- Fix feature computation in compute-engine
- Apply feature scaling/normalization
- Remove constant or highly correlated features

---

### Issue 5: Training Takes Too Long

**Symptom**: Training >1 hour per horizon

**Solutions**:

1. Reduce data size:

   ```python
   --start-date 2024-01-01  # Use recent data only
   ```

2. Reduce model complexity:

   ```python
   params={
       'max_depth': 4,        # Reduce from 6
       'num_leaves': 15,      # Reduce from 31
       'n_estimators': 100,   # Reduce from default
   }
   ```

3. Enable GPU:
   ```python
   params={'device': 'gpu'}  # 3-5x faster
   ```

---

## Performance Monitoring

### During Training

**Watch Terminal Output:**

```
[LightGBM] [Info] Start training from score -1.098612
[LightGBM] [Info] Start training from score -1.098612
[LightGBM] [Info] Start training from score -1.098612

Fold 1/12: Train Log Loss = 0.98, Val Log Loss = 1.02, Val Accuracy = 0.45
Fold 2/12: Train Log Loss = 0.97, Val Log Loss = 1.01, Val Accuracy = 0.46
...
```

**Red Flags:**

- ⚠️ Val Log Loss increasing (overfitting)
- ⚠️ Val Accuracy < 0.35 (worse than random)
- ⚠️ Training taking >2 hours

---

### After Training

**Check Logs:**

```powershell
Get-Content logs/training.log -Tail 100
```

**Look For:**

- ✅ "Training complete"
- ✅ "Saved model: ..."
- ✅ "Exported to ONNX: ..."
- ⚠️ Any ERROR or WARNING messages

---

## Final Verification

### Smoke Test (Quick)

```bash
# Test ONNX inference
python -c "
import onnxruntime as ort
import numpy as np

# Load model
session = ort.InferenceSession('../../apps/algo-worker/models/lightgbm_5min.onnx')

# Test inference
X = np.random.randn(1, 33).astype(np.float32)
preds = session.run(None, {session.get_inputs()[0].name: X})

print(f'Prediction shape: {preds[1].shape}')  # Should be (1, 3)
print(f'Probabilities: {preds[1]}')           # Should sum to 1.0
print(f'Sum: {preds[1].sum():.4f}')          # Should be 1.0000
"
```

**Expected Output:**

```
Prediction shape: (1, 3)
Probabilities: [[0.15 0.70 0.15]]
Sum: 1.0000
```

---

### Integration Test (Full)

```bash
# Run algo-worker with trained models
cd ../../apps/algo-worker
npm run dev

# Check logs for model loading
# Expected:
# "Loaded model: lightgbm_5min.onnx"
# "Model inference time: 0.5ms"
```

---

## Success Criteria

✅ **All checks passed if:**

1. All 3 models trained without errors
2. All 3 ONNX models exported and validated
3. All 5 validation dimensions passed quality gates
4. Model accuracy > 40% (better than random)
5. ONNX inference time < 1ms
6. No data leakage (walk-forward validation used)
7. Models loaded successfully in algo-worker

---

## Support Resources

- **Quick Start**: `QUICKSTART.md`
- **Script Docs**: `scripts/README.md`
- **Status**: `IMPLEMENTATION_STATUS.md`
- **Architecture**: `docs/AI_MODEL_TRAINING.md`
- **Issues**: Check logs in `logs/training.log`

---

**Last Updated**: January 16, 2026  
**Status**: Production-Ready ✅
