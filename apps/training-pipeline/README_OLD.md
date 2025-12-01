# Training Pipeline

Kedro-based ML training pipeline for the algorithmic trading system.

## Overview

**Purpose**: Train and validate ML models for volatility prediction using walk-forward methodology

## Quick Start

```bash
# 1. Setup environment
poetry install

# 2. Activate environment
poetry shell

# 3. Fetch historical data (run data-processor)
cd ../data-processor
npm run job:export-training-data

# 4. Return to training pipeline
cd ../training-pipeline

# 5. Run feature engineering
kedro run --pipeline feature_engineering

# 6. Train feature extractors
kedro run --pipeline train_feature_extractor

# 7. Train ensemble models
kedro run --pipeline train_ensemble

# 8. Train meta-learner
kedro run --pipeline train_meta_learner

# 9. (Optional) Train RL agent
kedro run --pipeline train_rl_agent

# 10. Export all models to ONNX
kedro run --pipeline export_onnx

# 11. View results in MLflow
mlflow ui

# 12. Copy models to algo-worker
cp onnx/*.onnx ../algo-worker/models/

# 13. Test inference in algo-worker
cd ../algo-worker
npm run test:inference
```

## Features

- ✅ Walk-forward validation for time-series
- ✅ Multi-model training (XGBoost, CNN-LSTM, GINN, SVM)
- ✅ Stacking ensemble with meta-learner
- ✅ ONNX export for production deployment
- ✅ Backtesting with transaction costs
- ✅ Performance metrics (Sharpe, Sortino, MDD)
- ✅ MLflow experiment tracking

## Models

### Level-0 Base Models

1. **XGBoost Classifier**
   - High-performance gradient boosting
   - Feature importance tracking
   - Early stopping

2. **CNN-LSTM Hybrid**
   - 1D-CNN for local patterns
   - LSTM for temporal dependencies
   - Sequence length: 60 timesteps

3. **GARCH-Informed Neural Network (GINN)**
   - Two-stage hybrid: GARCH(1,1) + LSTM
   - Models GARCH residuals with LSTM
   - Combines linear and non-linear patterns

4. **Support Vector Machine (SVM)**
   - RBF kernel
   - High economic gains (research-backed)
   - Grid search hyperparameter tuning

### Level-1 Meta-Model

- **Logistic Regression Stacker**
  - Blends L0 model predictions
  - Out-of-fold training (no leakage)
  - Outputs final signal probability

## Kedro Project Structure

```
training-pipeline/
├── conf/
│   ├── base/                  # Base configuration
│   │   ├── catalog.yml        # Data catalog
│   │   ├── parameters.yml     # Model hyperparameters
│   │   └── logging.yml        # Logging config
│   └── local/                 # Local overrides (gitignored)
├── data/
│   ├── 01_raw/                # Raw market data
│   ├── 02_intermediate/       # Processed features
│   ├── 03_primary/            # Train/test splits
│   ├── 04_feature/            # Engineered features
│   ├── 05_model_input/        # Model-ready data
│   ├── 06_models/             # Trained models
│   ├── 07_model_output/       # Predictions
│   └── 08_reporting/          # Reports and metrics
├── src/
│   └── training_pipeline/
│       ├── pipelines/
│       │   ├── data_processing/
│       │   ├── feature_engineering/
│       │   ├── model_training/
│       │   ├── backtesting/
│       │   └── onnx_export/
│       └── nodes/             # Reusable node functions
├── notebooks/                 # Exploratory analysis
└── requirements.txt
```

## Pipelines

### 1. Feature Engineering Pipeline

```bash
kedro run --pipeline feature_engineering
```

- Compute technical indicators (RSI, MACD, volatility)
- Calculate sentiment features (VIX, PCR, Max Pain)
- Generate option features (ATM IV, skew, term structure)

### 2. Feature Extractor Training

```bash
kedro run --pipeline train_feature_extractor
```

- Train autoencoder for feature compression
- Extract latent representations

### 3. Ensemble Model Training

```bash
kedro run --pipeline train_ensemble
```

- Train all L0 models (XGBoost, CNN-LSTM, GINN, SVM)
- Generate out-of-fold predictions

### 4. Meta-Learner Training

```bash
kedro run --pipeline train_meta_learner
```

- Train L1 stacking model (Logistic Regression)
- Blend L0 predictions

### 5. RL Agent Training (Optional)

```bash
kedro run --pipeline train_rl_agent
```

- Train delta hedging RL agent
- Train optimal execution RL agent

### 6. ONNX Export

```bash
kedro run --pipeline export_onnx
```

- Convert all models to ONNX format
- Validate ONNX inference
- Export to algo-worker

### 7. Backtesting

```bash
kedro run --pipeline backtesting
```

- Simulate trades with transaction costs
- Calculate performance metrics
- Generate backtest reports

## Configuration

### Data Catalog (`conf/base/catalog.yml`)

Defines all data sources, intermediate datasets, and model artifacts.

### Parameters (`conf/base/parameters.yml`)

Model hyperparameters, training settings, and pipeline configurations.

Example:

```yaml
xgboost:
  max_depth: 8
  learning_rate: 0.01
  n_estimators: 500
  early_stopping_rounds: 50

walk_forward:
  train_months: 6
  test_months: 1

transaction_costs:
  brokerage: 20
  stt: 0.0625
  slippage: 0.0005
```

## Walk-Forward Validation

**Methodology**: Rolling window with expanding training set

```
[Train: 6 months] → [Test: 1 month] →
[Train: 6 months] → [Test: 1 month] →
[Train: 6 months] → [Test: 1 month] →
...
```

**Why**: Prevents look-ahead bias, simulates realistic deployment scenario.

## Performance Metrics

Primary metrics (optimize for these):

- **Sharpe Ratio**: Risk-adjusted returns (target > 1.5)
- **Sortino Ratio**: Downside risk-adjusted returns
- **Maximum Drawdown**: Worst peak-to-trough decline (target < 20%)
- **Calmar Ratio**: Return / Max Drawdown

Secondary metrics:

- Total return
- Win rate
- Profit factor
- Number of trades

## Transaction Cost Modeling

**CRITICAL**: All backtests include realistic costs:

- Brokerage: ₹20 per order or 0.05% (whichever lower)
- STT: 0.0625% of sell-side premium
- Exchange fees: 0.053% of turnover
- GST: 18% on (brokerage + exchange fees)
- SEBI charges: 0.0001% of turnover
- Stamp duty: 0.003% on buy-side
- Slippage: 0.05% (market orders)
- Bid-Ask spread: Modeled from historical data

## MLflow Tracking

View experiment results:

```bash
mlflow ui
# Opens at http://localhost:5000
```

Logged metrics:

- Model accuracy, precision, recall
- Sharpe ratio, Sortino ratio
- Max drawdown, Calmar ratio
- Training time, model size

## Jupyter Notebooks

```bash
# Start Jupyter with Kedro context
kedro jupyter notebook

# Convert notebook to Kedro pipeline
kedro jupyter convert notebooks/experiment.ipynb
```

## Visualization

```bash
# Visualize pipeline
kedro viz

# Opens interactive pipeline visualization at http://localhost:4141
```

## Running Specific Nodes

```bash
# Run specific node
kedro run --node train_xgboost

# Run from a specific node
kedro run --from-nodes train_xgboost

# Run up to a specific node
kedro run --to-nodes validate_models

# Run with specific parameters
kedro run --params xgboost.max_depth:10
```

## Model Deployment

After training, models are automatically exported to ONNX and copied to algo-worker:

```bash
# Models are saved to:
data/06_models/          # Original format
onnx/                    # ONNX format
../algo-worker/models/   # Production deployment
```

## Documentation

- [Copilot Instructions](.github/copilot-instructions.md)
- [Kedro Documentation](https://kedro.readthedocs.io/)
- [Walk-Forward Validation](docs/WALK_FORWARD.md) (TODO)
- [Model Architecture](docs/MODELS.md) (TODO)

## Stack

- Python 3.10+
- Kedro
- XGBoost
- TensorFlow/Keras
- scikit-learn
- pandas
- NumPy
- ONNX
- MLflow

## Contributing

Follow Kedro best practices and the coding standards in `.github/copilot-instructions.md`.
