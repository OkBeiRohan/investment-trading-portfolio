# Training Pipeline Folder Structure

**Last Updated**: 2026-01-13  
**Architecture Principle**: ZERO feature engineering in training-pipeline

---

## 📁 Directory Breakdown

### **Essential Folders (KEEP)**

#### `conf/`
Kedro configuration files
- `conf/base/catalog.yml` - Data sources (QuestDB SQL queries for pre-computed features)
- `conf/base/parameters.yml` - Hyperparameters for all models
- `conf/local/credentials.yml` - Database credentials (gitignored)

**Purpose**: Configure data I/O and model hyperparameters

---

#### `src/training_pipeline/pipelines/train_ensemble/`
Level-0 model training (8 models)
```
train_ensemble/
├── nodes.py              # Training orchestration
├── pipeline.py           # Kedro pipeline definition
└── models/
    ├── lightgbm_trainer.py     ✅ Implemented
    ├── xgboost_trainer.py      ⏳ Placeholder
    ├── cnn_lstm_trainer.py     ⏳ Placeholder
    ├── ginn_trainer.py         ⏳ Placeholder
    ├── svm_trainer.py          ⏳ Placeholder
    ├── transformer_trainer.py  ⏳ Placeholder
    ├── tft_trainer.py          ⏳ Placeholder
    └── lit_trainer.py          ⏳ Placeholder
```

**Purpose**: Train ensemble models on pre-computed features from QuestDB

**Key Point**: Models do NOT compute features. They ONLY load features via `sql_loader.py`.

---

#### `src/training_pipeline/pipelines/train_meta_learner/`
Level-1 stacking model
```
train_meta_learner/
├── nodes.py              # Meta-learner training logic
└── pipeline.py           # Pipeline definition
```

**Purpose**: Train meta-learner on out-of-fold predictions from Level-0 models

**Input**: OOF predictions from all 8 ensemble models  
**Output**: Final prediction (weighted ensemble)

---

#### `src/training_pipeline/pipelines/export_onnx/`
Model export for production
```
export_onnx/
├── nodes.py              # ONNX conversion logic
└── pipeline.py           # Export pipeline
```

**Purpose**: Export trained models to ONNX format with FP16 quantization

**Output**: `.onnx` files in `data/06_models/` for algo-worker deployment

---

#### `src/training_pipeline/pipelines/train_rl_agent/`
Reinforcement learning execution agent
```
train_rl_agent/
├── nodes.py              # RL training logic
├── pipeline.py           # RL pipeline
└── environments/         # Trading environment
```

**Purpose**: Train PPO agent for optimal order execution (VWAP, TWAP, Sniper)

**Scope**: NOT for volatility prediction. For execution optimization only.

---

#### `src/training_pipeline/utils/`
Shared utilities
- `sql_loader.py` - QuestDB data loader (loads pre-computed features)
- `metrics.py` - Evaluation metrics (Sharpe, Sortino, win rate)
- `validation.py` - Walk-forward validation logic
- `backtesting.py` - Strategy backtesting

**Purpose**: Reusable components across pipelines

---

#### `src/training_pipeline/types/`
Shared type definitions
- `model_types.py` - TrainingConfig, TrainingResult, FoldMetrics, ValidationMetrics

**Purpose**: Type safety across all pipelines

---

#### `docs/`
Project documentation
- `ARCHITECTURE_UPDATE.md` - Architecture changes log
- `DOCUMENTATION_UPDATE_SUMMARY.md` - Documentation changelog
- `ADVANCED_VALIDATION.md` - Walk-forward validation guide
- `TRAIN_ADVANCED_MODELS.md` - Advanced model training guide
- `pipelines/` - Pipeline-specific docs

**Purpose**: Comprehensive project documentation

---

#### `notebooks/`
Exploratory analysis (Jupyter notebooks)
- `01_data_exploration.ipynb` - Explore QuestDB data
- `03_model_prototyping.ipynb` - Prototype new models
- `04_results_analysis.ipynb` - Analyze training results

**Purpose**: Research and prototyping (not production code)

**Note**: Removed `02_feature_analysis.ipynb` (features analyzed in compute-engine)

---

#### `scripts/`
Utility scripts
- `verify_pipeline.py` - Validate pipeline configuration

**Purpose**: Development utilities

---

## 🗑️ Removed Folders (Violated Architecture)

### ❌ `src/training_pipeline/pipelines/feature_engineering/`
**Why Removed**: Training-pipeline does ZERO feature engineering  
**Replacement**: compute-engine (Rust) computes features → QuestDB stores them

### ❌ `src/training_pipeline/pipelines/data_ingestion/`
**Why Removed**: Redundant - `sql_loader.py` handles data loading  
**Replacement**: Kedro catalog + `sql_loader.py`

### ❌ `src/training_pipeline/pipelines/train_feature_extractor/`
**Why Removed**: No feature extraction in training-pipeline  
**Replacement**: compute-engine Market State Encoder

### ❌ `src/models/`
**Why Removed**: Duplicate model definitions  
**Replacement**: `train_ensemble/models/` (single source of truth)

### ❌ `notebooks/02_feature_analysis.ipynb`
**Why Removed**: Features analyzed in compute-engine, not training-pipeline

### ❌ `conf/base/parameters/data_processing.yml`
**Why Removed**: No data processing in training-pipeline

---

## 🔄 Data Flow Architecture

```
┌─────────────────┐
│ compute-engine  │  Rust NAPI module
│  (Market State  │  Computes 33 features
│   Encoder)      │  <1ms latency
└────────┬────────┘
         │ Real-time feature computation
         ▼
┌─────────────────┐
│    QuestDB      │  Time-series database
│ (Pre-computed   │  Stores historical + real-time features
│   Features)     │
└────────┬────────┘
         │ SQL query (sql_loader.py)
         ▼
┌─────────────────┐
│ training-pipeline│  Python Kedro project
│   (Model         │  ONLY trains models
│    Training)     │  ZERO feature computation
└─────────────────┘
```

**Key Insight**: Training-pipeline is a **pure model training** system.

---

## 📊 Feature Schema (33 Features)

Training-pipeline loads these 33 features from QuestDB:

### Index Breadth (6 features)
Aggregated from 50 NIFTY constituents
- `pct_stocks_above_vwap`
- `pct_stocks_above_ema20`
- `weighted_return_top10`
- `advance_decline_ratio`
- `breadth_momentum_5m`
- `breadth_volatility`

### NIFTY FUTURE (9 features)
Primary price discovery instrument
- `fut_price_vs_vwap`
- `fut_range_position`
- `fut_return_1m`
- `fut_return_5m`
- `fut_atr_percent`
- `fut_volume_zscore`
- `fut_oi_change`
- `fut_rsi_14`
- `fut_macd`

### Options Aggregate (11 features)
NOT per-strike, only ATM + aggregates
- `atm_iv`
- `atm_iv_change`
- `iv_skew`
- `gamma_atm`
- `vega_atm`
- `theta_atm`
- `pcr_oi`
- `pcr_volume`
- `max_pain_distance`
- `charm_atm`
- `vanna_atm`

### Volatility (4 features)
Regime context
- `india_vix`
- `realized_vol_5m`
- `realized_vol_15m`
- `vol_expansion_ratio`

### Time Context (3 features)
Market timing
- `minutes_from_open`
- `minutes_to_close`
- `day_of_week`

**Source**: `conf/base/catalog.yml` → `lightgbm_features` dataset

---

## 🚀 Quick Start

### 1. Load Pre-Computed Features
```python
# Kedro auto-loads from catalog.yml
features = catalog.load('lightgbm_features')
# Returns DataFrame with 33 columns
```

### 2. Train Model
```bash
# Train LightGBM
kedro run --node train_lightgbm

# Train all ensemble models
kedro run --pipeline train_ensemble

# Train meta-learner
kedro run --pipeline train_meta_learner
```

### 3. Export to ONNX
```bash
kedro run --pipeline export_onnx
```

---

## 📝 Development Guidelines

### Adding a New Model

1. Create trainer in `train_ensemble/models/`
```python
class NewModelTrainer:
    def train(self, features: pd.DataFrame, labels: pd.Series) -> TrainingResult:
        # Use same 33 features
        # Implement walk-forward validation
        # Export OOF predictions
        pass
```

2. Add training node in `train_ensemble/nodes.py`
```python
def train_new_model(features: pd.DataFrame, prices: pd.Series) -> dict:
    trainer = NewModelTrainer()
    labels = create_labels(features, prices)
    result = trainer.train(features, labels)
    return result.model_dump()
```

3. Register in `train_ensemble/pipeline.py`
```python
Pipeline([
    node(
        func=train_new_model,
        inputs=["lightgbm_features", "prices"],
        outputs="new_model_result",
        name="train_new_model",
    ),
])
```

4. Test end-to-end
```bash
kedro run --node train_new_model
```

---

## 🔍 Debugging

### Data Loading Issues
```bash
# Verify QuestDB connection
kedro run --node load_training_data

# Check feature schema
python -c "from training_pipeline.utils.sql_loader import QuestDBLoader; \
           loader = QuestDBLoader(); \
           df = loader.load_lightgbm_features('2023-01-01', '2023-12-31'); \
           print(df.columns)"
```

### Training Issues
```bash
# Verify pipeline
python scripts/verify_pipeline.py

# Check Pyright errors
pyright src/
```

---

## 🎯 Next Steps

**IMMEDIATE PRIORITY**: Implement compute-engine Market State Encoder

Without pre-computed features in QuestDB, training-pipeline CANNOT run.

See implementation roadmap in conversation history for details.
