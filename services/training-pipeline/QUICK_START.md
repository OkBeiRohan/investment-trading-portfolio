# 🚀 Quick Start - Train LightGBM Model

Your features are ready in QuestDB! Here's how to train the model in **3 commands**:

## TL;DR - Run This Now

```powershell
cd services/training-pipeline
poetry shell
python scripts/train_lightgbm.py
```

## What Will Happen

1. **Loads features** from QuestDB (2 years of data, 33 features)
2. **Creates labels** using volatility-adjusted thresholds (UP/NEUTRAL/DOWN)
3. **Trains LightGBM** using 12-fold walk-forward validation
4. **Outputs metrics** and feature importance
5. **Saves model** for ONNX export

**Time:** ~5-15 minutes (depending on GPU)

## Before You Start (Optional Check)

Verify your features are ready:

```powershell
cd services/training-pipeline
poetry shell
python scripts/check_features.py
```

Expected output:
```
✅ Connected to QuestDB
✅ Table exists with 187,500 rows
✅ All 33 features present
✅ Ready to train!
```

## Expected Training Output

```
================================================================================
LightGBM Training Pipeline
================================================================================

Configuration:
  - Training period: 730 days
  - Symbol: NIFTY
  - Walk-forward splits: 12
  - Device: gpu

Loaded 187,500 rows, 35 columns
Feature matrix shape: (187500, 33)

Starting LightGBM training...

[Fold 1/12] Accuracy: 0.45, F1: 0.42, ROC-AUC: 0.67
[Fold 2/12] Accuracy: 0.47, F1: 0.44, ROC-AUC: 0.68
...
[Fold 12/12] Accuracy: 0.48, F1: 0.45, ROC-AUC: 0.69

================================================================================
Training Complete!
================================================================================

Validation Metrics:
  - Accuracy:   0.4756 ± 0.0234  ✅
  - ROC-AUC:    0.6834 ± 0.0156  ✅
  - F1 Score:   0.4423 ± 0.0267

Top 10 Features:
   1. atm_iv
   2. fut_return_5m
   3. iv_skew
   ...
```

## Success Criteria

Your model is ready for production if:
- ✅ Accuracy > 0.45 (better than random for 3-class)
- ✅ ROC-AUC > 0.65 (decent discrimination)
- ✅ Low std deviation (consistent across folds)

## Next Steps After Training

1. **Export to ONNX** (enables fast inference in algo-worker)
   ```powershell
   kedro run --pipeline export_onnx  # TODO
   ```

2. **Deploy to algo-worker**
   ```powershell
   cp models/lightgbm.onnx ../../apps/algo-worker/models/
   ```

3. **Train other models** (XGBoost, CNN-LSTM, etc.) - see [WORKFLOW.md](WORKFLOW.md)

## Configuration

Edit `scripts/train_lightgbm.py` to adjust:

```python
# Training period
training_period_days = 730  # 2 years

# GPU/CPU
device="gpu"  # or "cpu"

# Walk-forward validation
n_splits=12

# LightGBM hyperparameters
num_leaves=31
learning_rate=0.05
n_estimators=400
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `No data in QuestDB` | Run compute-engine: `cd packages/compute-engine && pnpm test:compute-features` |
| `GPU not available` | Change `device="cpu"` in script |
| `Poor accuracy (<0.40)` | Increase training data or tune hyperparameters |
| `QuestDB connection refused` | Start QuestDB: `pnpm run db:start` |

## Files Created

```
services/training-pipeline/
├── scripts/
│   ├── train_lightgbm.py      ✅ Standalone training script
│   ├── check_features.py      ✅ Verify features in QuestDB
│   └── train.bat              ✅ Windows launcher
├── RUN_TRAINING.md            ✅ Detailed guide
├── WORKFLOW.md                ✅ Complete workflow
└── QUICK_START.md             ✅ This file
```

## Architecture

```
QuestDB (Features) → Load Data → Label Generation → 
Walk-Forward Validation → LightGBM Training → 
OOF Predictions → Model Export (ONNX) → algo-worker
```

---

**Ready? Run this now:**

```powershell
cd services/training-pipeline
poetry shell
python scripts/train_lightgbm.py
```

Good luck! 🚀
