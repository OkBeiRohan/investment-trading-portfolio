# Running LightGBM Training

## Prerequisites

1. **QuestDB must be running** with features already computed:
   ```powershell
   # Check if QuestDB is running
   curl http://localhost:9000
   ```

2. **Features must exist** in the `lightgbm_features` table (33 features computed by compute-engine)

3. **Python environment** must be set up:
   ```powershell
   cd services/training-pipeline
   poetry install
   poetry shell
   ```

## Quick Start (Standalone Script)

Run the simplified training script:

```powershell
cd services/training-pipeline
poetry shell
python scripts/train_lightgbm.py
```

This will:
- Load 2 years of features from QuestDB
- Train LightGBM with 12-fold walk-forward validation
- Use GPU acceleration (RTX)
- Display validation metrics and feature importance

## Configuration

Edit the script or use Kedro config files:

### 1. Training Period
```python
training_period_days = 730  # 2 years (default)
```

### 2. Walk-Forward Validation
```python
training_config = TrainingConfig(
    n_splits=12,        # Number of folds
    purge_window=375,   # 1 day in minutes
    embargo_window=375, # Embargo period
)
```

### 3. LightGBM Hyperparameters
```python
lightgbm_config = LightGBMConfig(
    num_leaves=31,
    learning_rate=0.05,
    n_estimators=400,
    device="gpu",  # Use "cpu" if no GPU
    # ... see script for full config
)
```

### 4. GPU vs CPU
```python
# For GPU (RTX)
device="gpu"

# For CPU only
device="cpu"
```

## Full Kedro Pipeline (Advanced)

For production use, run the full Kedro pipeline:

```powershell
# 1. Configure credentials
cp conf/local/credentials.yml.example conf/local/credentials.yml

# 2. Edit parameters (optional)
# conf/base/parameters.yml

# 3. Run complete pipeline
kedro run

# Or run specific pipeline
kedro run --pipeline train_ensemble
```

## Expected Output

```
================================================================================
LightGBM Training Pipeline
================================================================================

Configuration:
  - Training period: 730 days
  - Symbol: NIFTY
  - Walk-forward splits: 12
  - LightGBM n_estimators: 400
  - Device: gpu

Loading training data from QuestDB...
Loaded 187500 rows, 35 columns

Feature matrix shape: (187500, 33)

Starting LightGBM training with walk-forward validation...

[Fold 1/12] Training samples: 15625, Test samples: 15625
  Accuracy: 0.4523, Precision: 0.4321, Recall: 0.4523, F1: 0.4145
[Fold 2/12] Training samples: 31250, Test samples: 15625
  Accuracy: 0.4687, Precision: 0.4512, Recall: 0.4687, F1: 0.4312
...

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
   4. fut_atr_percent               - 1432.56
   ...
```

## Troubleshooting

### No features in QuestDB

```
ERROR: No data returned from QuestDB
```

**Solution**: Run compute-engine to compute features first:
```powershell
cd packages/compute-engine
pnpm install
pnpm build
pnpm test:compute-features
```

### GPU not available

```
ERROR: LightGBM GPU not available
```

**Solution**: Change to CPU mode in the script:
```python
device="cpu"
```

### Connection refused to QuestDB

```
ERROR: Connection refused to localhost:8812
```

**Solution**: Start QuestDB:
```powershell
# In root directory
pnpm run db:start
```

## Next Steps

After training completes:

1. **Review metrics** - Check if accuracy > 0.45 and ROC-AUC > 0.65
2. **Tune hyperparameters** - Edit `conf/base/parameters.yml`
3. **Export to ONNX** - Run export pipeline (TODO)
4. **Deploy to algo-worker** - Copy model to production

## MLflow Tracking (Optional)

To track experiments in MLflow:

1. Start MLflow server:
   ```powershell
   mlflow ui --host 0.0.0.0 --port 5000
   ```

2. Enable in script:
   ```python
   result = trainer.train(
       features=features,
       prices=prices,
       mlflow_enabled=True,  # Enable tracking
   )
   ```

3. View at http://localhost:5000
