# Quick Start Guide - Training Pipeline

## Prerequisites

### 1. QuestDB Running

```powershell
# Check QuestDB is running
Test-NetConnection -ComputerName localhost -Port 8812

# If not running, start Docker containers
docker-compose -f infrastructure/docker/docker-compose.yml up -d questdb
```

### 2. Features Computed

Make sure compute-engine has computed features and saved to QuestDB:

```bash
# Check if market_state_1m table exists
python scripts/check_features.py
```

Expected output:

```
✅ market_state_1m table exists
✅ 33 features found
✅ 245,000 rows found (last 30 days)
```

### 3. Labels Computed

Make sure labels exist in `training_labels_1m` table:

```sql
-- Check labels
SELECT COUNT(*), horizon_minutes
FROM training_labels_1m
GROUP BY horizon_minutes;

-- Expected output:
-- 245000, 5
-- 245000, 15
-- 245000, 30
```

---

## Running the Pipeline

### Option 1: Full Pipeline (RECOMMENDED) ⭐

```bash
cd services/training-pipeline

# Run everything (train + export + validate)
python scripts/run_full_pipeline.py

# Expected time: ~30 minutes
```

**What happens:**

1. Loads features from QuestDB (33 features)
2. Loads labels for each horizon (5min, 15min, 30min)
3. Trains LightGBM with walk-forward validation (12 folds)
4. Saves models to `data/06_models/`
5. Exports to ONNX format in `apps/algo-worker/models/`
6. Validates across 5 dimensions
7. Generates reports in `data/08_reporting/validation/`

**Output files:**

```
data/06_models/
  ├── lightgbm_5min.txt           # 500 KB
  ├── lightgbm_15min.txt          # 500 KB
  ├── lightgbm_30min.txt          # 500 KB
  ├── oof_lightgbm_5min.parquet   # 2 MB
  └── feature_importance_5min.csv # 5 KB

apps/algo-worker/models/
  ├── lightgbm_5min.onnx          # 250 KB (2x smaller!)
  ├── lightgbm_15min.onnx
  └── lightgbm_30min.onnx

data/08_reporting/validation/
  └── 5min/
      ├── confusion_matrix.png
      ├── confidence_calibration.png
      ├── temporal_stability.png
      ├── equity_curve.png
      └── feature_importance.png
```

---

### Option 2: Step-by-Step

#### Step 1: Train Models

```bash
python scripts/train_multihorizon.py
```

#### Step 2: Export to ONNX

```bash
python scripts/export_onnx.py
```

#### Step 3: Validate

```bash
python scripts/validate_models.py
```

---

### Option 3: Single Horizon (Quick Test)

```bash
# Train only 5min model
python scripts/train_lightgbm.py
```

---

## Verifying Results

### 1. Check Model Files

```powershell
# PowerShell
Get-ChildItem -Path "data\06_models\" -Filter "lightgbm_*.txt"

# Expected output:
# lightgbm_5min.txt  (500 KB)
# lightgbm_15min.txt (500 KB)
# lightgbm_30min.txt (500 KB)
```

### 2. Check ONNX Files

```powershell
Get-ChildItem -Path "..\..\apps\algo-worker\models\" -Filter "lightgbm_*.onnx"

# Expected output:
# lightgbm_5min.onnx  (250 KB)
# lightgbm_15min.onnx (250 KB)
# lightgbm_30min.onnx (250 KB)
```

### 3. Check Validation Reports

```powershell
Get-ChildItem -Path "data\08_reporting\validation\5min\" -Filter "*.png"

# Expected output:
# confusion_matrix.png
# confidence_calibration.png
# temporal_stability.png
# equity_curve.png
# feature_importance.png
```

### 4. Check Metrics

```python
import pandas as pd

# Load OOF predictions
oof = pd.read_parquet('data/06_models/oof_lightgbm_5min.parquet')

# Calculate accuracy
y_true = oof['label']
y_pred = oof[['pred_class_0', 'pred_class_1', 'pred_class_2']].values.argmax(axis=1)
accuracy = (y_true == y_pred).mean()

print(f"OOF Accuracy: {accuracy:.4f}")
# Expected: 0.42-0.48 (random = 0.33 for 3-class)
```

---

## Common Issues

### Issue 1: "No data after merge"

**Problem:** Features and labels timestamps don't align

**Solution:**

```bash
# Check timestamp alignment
python -c "
import pandas as pd
from training_pipeline.utils.sql_loader import QuestDBLoader

loader = QuestDBLoader('postgresql://admin:quest@localhost:8812/qdb')
features = loader.load_lightgbm_features(start_date='2024-01-01', end_date='2024-01-02')
labels = loader.load_training_labels(start_date='2024-01-01', end_date='2024-01-02', horizon_minutes=5)

print(f'Features: {len(features)} rows, first={features.timestamp.iloc[0]}, last={features.timestamp.iloc[-1]}')
print(f'Labels: {len(labels)} rows, first={labels.timestamp.iloc[0]}, last={labels.timestamp.iloc[-1]}')
"
```

### Issue 2: "GPU not available"

**Problem:** LightGBM can't find GPU

**Solution:**

```python
# Edit train_multihorizon.py, change:
'device': 'gpu',  # Change to 'cpu'
'gpu_platform_id': 0,  # Remove these lines
'gpu_device_id': 0,    # Remove these lines
```

### Issue 3: "ONNX export failed"

**Problem:** Missing dependencies

**Solution:**

```bash
pip install onnxmltools onnxruntime onnxconverter-common
```

### Issue 4: Accuracy < 35%

**Problem:** Bad features or labels

**Solution:**

```bash
# Check feature distribution
python -c "
import pandas as pd
features = pd.read_sql('SELECT * FROM market_state_1m LIMIT 1000', 'postgresql://admin:quest@localhost:8812/qdb')
print(features.describe())
"

# Check label distribution
python -c "
import pandas as pd
labels = pd.read_sql('SELECT label, COUNT(*) as count FROM training_labels_1m WHERE horizon_minutes=5 GROUP BY label', 'postgresql://admin:quest@localhost:8812/qdb')
print(labels)
"

# Expected label distribution (balanced):
# label | count
#   0   | ~80,000 (DOWN)
#   1   | ~85,000 (NEUTRAL)
#   2   | ~80,000 (UP)
```

---

## Next Steps

After successful training:

1. **Deploy to algo-worker**: ONNX models are already in `apps/algo-worker/models/`
2. **Backtest**: Use `apps/algo-worker/scripts/backtest.sh` to test on historical data
3. **Paper Trading**: Enable algo-worker with paper trading mode
4. **Live Trading**: After successful paper trading, enable live mode

---

## Performance Expectations

### Training Time (RTX 3060 GPU)

- 5min horizon: ~8 minutes
- 15min horizon: ~10 minutes
- 30min horizon: ~12 minutes
- **Total: ~30 minutes**

### Memory Usage

- Peak: ~4 GB RAM
- Average: ~2 GB RAM

### Model Performance (Expected)

- **Accuracy**: 42-48% (random = 33%)
- **Mean AUC**: 0.58-0.65
- **Sharpe Ratio**: 1.2-1.8
- **Max Drawdown**: 15-25%

### ONNX Inference (Production)

- **Latency**: 0.3-0.8 ms per sample
- **Throughput**: 1000-3000 predictions/sec

---

## Monitoring Training

```bash
# Watch training progress (Linux/Mac)
tail -f logs/training.log

# PowerShell
Get-Content logs/training.log -Wait -Tail 50
```

**Look for:**

```
Training LightGBM for 5-minute horizon
Loaded 245000 feature rows
Loaded 245000 labels for 5min horizon
Merged dataset: 245000 rows
Training model with walk-forward validation...
Fold 1/12: Train Log Loss = 0.98, Val Log Loss = 1.02, Val Accuracy = 0.45
Fold 2/12: Train Log Loss = 0.97, Val Log Loss = 1.01, Val Accuracy = 0.46
...
✅ Saved model: data/06_models/lightgbm_5min.txt
```

---

## Troubleshooting Checklist

- [ ] QuestDB running on port 8812
- [ ] `market_state_1m` table exists with 33 features
- [ ] `training_labels_1m` table exists with labels
- [ ] Python dependencies installed (`pip install -r requirements.txt`)
- [ ] GPU drivers installed (optional, but recommended)
- [ ] Sufficient disk space (~5 GB for models + reports)

---

**Need Help?** Check:

- `scripts/README.md` - Detailed script documentation
- `IMPLEMENTATION_TODO.md` - Remaining tasks
- `docs/AI_MODEL_TRAINING.md` - Training architecture
- `.github/instructions/training-pipeline.instructions.md` - Coding guidelines

---

**Last Updated**: 2025-11-29
**Status**: Production-Ready ✅
