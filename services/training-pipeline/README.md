# Training Pipeline

> **Kedro-based ML training pipeline with CPCV validation and MLflow model logging for 5-tier model architecture.**

[![Powered by Kedro](https://img.shields.io/badge/powered_by-kedro-ffc900?logo=kedro)](https://kedro.org)

**Last Updated**: March 17, 2026  
**Architecture**: 5-Tier Multi-Model Ensemble

---

## Overview

The training pipeline trains and logs **production-ready models** to the MLflow Model Registry for serving via MLflow Model Serving.

### Pipeline Responsibilities

| ✅ What This Service Does | ❌ What This Service Should NOT Do |
|---------------------------|-----------------------------------|
| Train ML models using historical data | Real-time inference |
| Validate with CPCV/Walk-Forward | Feature computation (use compute-engine) |
| Log models via native MLflow flavors | Live trading decisions |
| Track experiments with MLflow | Store raw market data |

### Models Trained

| Tier | Model | Features | Training Data | Output |
|------|-------|----------|---------------|--------|
| **1** | Regime HMM | 15 daily | 26 years daily | 4 regime states |
| **2** | LightGBM | 46 | 4 years 1-min | Direction + confidence |
| **2** | TFT | 46 × 120 | 4 years 1-min | Multi-horizon quantiles |
| **3** | LiT | 14 | Live tick | Order flow signal |
| **Meta** | Gating Network | Model outputs | OOF predictions | Weighted fusion |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TRAINING PIPELINE ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DATA SOURCES                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ QuestDB                                                                 ││
│  │ ├── training_features_54 (1M+ rows, 2022-2026)                          ││
│  │ ├── training_labels (multi-horizon)                                     ││
│  │ └── historical_ohlcv_daily (26 years)                                   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                           ↓                                                  │
│  KEDRO PIPELINE                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  [data_ingestion] → [feature_prep] → [label_gen]                        ││
│  │                           ↓                                              ││
│  │  ┌──────────────────────────────────────────────────────────┐           ││
│  │  │ PARALLEL MODEL TRAINING                                   │           ││
│  │  │ ├── train_regime (Tier 1, walk-forward)                   │           ││
│  │  │ ├── train_lightgbm (Tier 2, CPCV)                         │           ││
│  │  │ └── train_tft (Tier 2, CPCV)                              │           ││
│  │  └──────────────────────────────────────────────────────────┘           ││
│  │                           ↓                                              ││
│  │  [train_meta] → [log_models] → [backtest] → [validate]                  ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                           ↓                                                  │
│  OUTPUTS                                                                     │
│  ├── models → MLflow Model Registry → MLflow Serving                        │
│  ├── metrics → MLflow                                                        │
│  └── reports → Compliance                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# 1. Navigate to training pipeline
cd services/training-pipeline

# 2. Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run full training pipeline
kedro run

# 5. Run specific pipeline
kedro run --pipeline=data
kedro run --pipeline=training
kedro run --pipeline=register
kedro run --pipeline=backtest
```

---

## Pipelines

### 1. Data Pipeline

```bash
kedro run --pipeline=data
```

- Loads features from QuestDB `training_features_54`
- Filters valid samples (`is_valid = TRUE`)
- Creates train/validation/test splits

### 2. Training Pipeline

```bash
kedro run --pipeline=training
```

- Trains LightGBM with CPCV (10 folds)
- Trains TFT with CPCV
- Trains Regime HMM with walk-forward
- Generates OOF predictions for meta-learner
- Trains meta-learner on stacked predictions

### 3. Model Registration Pipeline

```bash
kedro run --pipeline=register
```

- Logs all models via native MLflow flavors (xgboost, pytorch, lightgbm, pyfunc)
- Registers models to MLflow Model Registry with `registered_model_name`
- Validates logged models with test samples
- Models served via MLflow Model Serving

### 4. Backtest Pipeline

```bash
kedro run --pipeline=backtest
```

- Runs backtest with realistic NSE F&O costs
- Calculates Sharpe, Sortino, max drawdown
- Generates trade statistics
- Compares new model vs production

---

## Validation Strategy

### CPCV: Combinatorial Purged Cross-Validation

For Tier 2 intraday models (LightGBM, TFT):

```
Timeline: ═══════════════════════════════════════════════════════════════

CPCV with K=5, M=2 → 10 combinations

Fold 1:  [═ TRAIN ═][P][═ TEST ═][E][═ TRAIN ═][P][═ TEST ═][E][═ TRAIN ═]
Fold 2:  [═ TRAIN ═][P][═ TEST ═][E][═ TRAIN ═][═ TRAIN ═][P][═ TEST ═]
...
Fold 10: [═ TEST ═][E][═ TRAIN ═][═ TRAIN ═][═ TRAIN ═][P][═ TEST ═]

[P] = Purge (removed)   [E] = Embargo (60 bars)
```

**Why CPCV?**
- Tests ALL time periods (not just recent)
- Prevents lookahead bias via purge + embargo
- Robust to regime changes

### Walk-Forward: Expanding Window

For Tier 1 regime models (26 years daily):

```
26 Years: 2000 ═══════════════════════════════════════════════════════> 2026

Fold 1:   [═══ 5yr Train ═══][6mo Test]
Fold 2:   [═════ 5.5yr Train ═════][6mo Test]
...
Fold 40:  [════════════════════ 24yr Train ════════════════════][6mo Test]
```

---

## Configuration

### Parameters (`conf/base/parameters.yml`)

```yaml
# Data configuration
data:
  start_date: "2022-01-01"
  end_date: "2026-01-18"
  train_end: "2025-06-30"
  val_end: "2025-09-30"

# Feature configuration
features:
  num_features: 54
  lightgbm_features: 46  # Excludes Order Flow (8)
  lit_features: 14       # Order Flow + returns
  sequence_length: 120   # For TFT

# CPCV configuration
cpcv:
  n_splits: 5
  n_test_splits: 2
  purge_pct: 0.01
  embargo_bars: 60

# LightGBM configuration
lightgbm:
  n_estimators: 1000
  max_depth: 8
  num_leaves: 64
  learning_rate: 0.01
  feature_fraction: 0.8
  early_stopping_rounds: 50

# TFT configuration
tft:
  hidden_size: 64
  attention_head_size: 4
  dropout: 0.1
  max_epochs: 100
  sequence_length: 120
  prediction_horizons: [5, 15, 30]

# MLflow model logging configuration
mlflow:
  tracking_uri: "http://localhost:5000"
  registry_uri: "http://localhost:5000"
  serving_endpoint: "http://localhost:5001"
```

---

## MLflow Model Logging

### Supported Models

| Model | Framework | MLflow Flavor | Registration |
|-------|-----------|---------------|--------------|
| LightGBM | LightGBM | `mlflow.lightgbm` | `registered_model_name="tier2-lightgbm"` |
| TFT | PyTorch | `mlflow.pytorch` | `registered_model_name="tier2-tft"` |
| Regime HMM | hmmlearn | `mlflow.pyfunc` | `registered_model_name="tier1-hmm"` |
| Meta-Learner | PyTorch | `mlflow.pytorch` | `registered_model_name="meta-learner"` |

### Logging Code

```python
import mlflow

# LightGBM — one-step log + register
mlflow.lightgbm.log_model(model, artifact_path="model",
                           registered_model_name="tier2-lightgbm")

# PyTorch (TFT, Meta-Learner)
mlflow.pytorch.log_model(model, artifact_path="model",
                          registered_model_name="tier2-tft")

# Custom models (HMM via pyfunc wrapper)
mlflow.pyfunc.log_model(artifact_path="model", python_model=hmm_wrapper,
                         registered_model_name="tier1-hmm")
```

---

## Outputs

| Output | Location | Consumer |
|--------|----------|----------|
| `tier2-lightgbm` | MLflow Model Registry | MLflow Model Serving |
| `tier2-tft` | MLflow Model Registry | MLflow Model Serving |
| `tier1-hmm` | MLflow Model Registry | MLflow Model Serving |
| `meta-learner` | MLflow Model Registry | MLflow Model Serving |
| Metrics | MLflow | Dashboard |
| SHAP plots | `reports/shap/` | Compliance |
| Backtest report | `reports/backtest/` | Review |

---

## Model Update Schedule

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WEEKLY UPDATE SCHEDULE                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SUNDAY 23:00   → Data refresh + drift detection                            │
│  MONDAY 00:00   → Retrain (if needed)                                       │
│  MONDAY 08:00   → Deploy (if improved by >0.5% Sharpe)                      │
│                                                                              │
│  RETRAIN FREQUENCY:                                                          │
│  ├── Tier 1 (Regime):  Monthly                                              │
│  ├── Tier 2 (LightGBM): Weekly                                              │
│  └── Tier 3 (LiT):     Daily (online fine-tune)                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Performance Targets

| Model | Metric | Target |
|-------|--------|--------|
| LightGBM | AUC-ROC | >0.68 |
| TFT | MAE (returns) | <0.3% |
| Ensemble | Sharpe Ratio | >1.5 |
| Ensemble | Max Drawdown | <15% |

---

## Project Structure

```
services/training-pipeline/
├── conf/
│   ├── base/
│   │   ├── catalog.yml         # Data catalog
│   │   └── parameters.yml      # Training params
│   └── local/                  # Local overrides
├── data/
│   ├── 01_raw/                 # Raw data from QuestDB
│   ├── 02_intermediate/        # Processed features
│   ├── 03_primary/             # Training datasets
│   └── 06_models/              # Trained models (logged to MLflow)
├── docs/
│   ├── TRAINING_DATA_GUIDE.md  # Data access guide
│   └── source/                 # API docs
├── notebooks/                  # Exploration notebooks
├── src/
│   └── training_pipeline/
│       ├── pipelines/
│       │   ├── data/           # Data ingestion
│       │   ├── training/       # Model training
│       │   ├── register/       # MLflow model registration
│       │   └── backtest/       # Backtesting
│       └── utils/              # Shared utilities
├── tests/                      # Unit & integration tests
├── pyproject.toml              # Dependencies
└── README.md                   # This file
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [TRAINING_STRATEGY.md](../../docs/ml/TRAINING_STRATEGY.md) | In-depth validation guide |
| [TRAINING_DATA_GUIDE.md](./docs/TRAINING_DATA_GUIDE.md) | QuestDB queries |
| [MODEL_ARCHITECTURE.md](../../docs/ml/MODEL_ARCHITECTURE.md) | 5-tier model design |
| [DATA_ARCHITECTURE.md](../../docs/ml/DATA_ARCHITECTURE.md) | Data sources |

---

## Related Services

| Service | Relationship |
|---------|--------------|
| `compute-engine` | Provides features (historical and live) |
| `algo-worker` | Consumes models via MLflow Model Serving |
| `market-feeder` | Stores raw market data to QuestDB |

---

**Status**: Active Development  
**Technology**: Python 3.11+, Kedro, PyTorch, LightGBM, MLflow  
**Last Updated**: March 17, 2026
