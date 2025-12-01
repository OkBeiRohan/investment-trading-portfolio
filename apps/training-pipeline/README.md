# Training Pipeline - Offline ML Model Training

> **Kedro-based ML training pipeline for NSE options volatility prediction using walk-forward validation and ensemble stacking.**

Built with Python 3.11+, Kedro, XGBoost, TensorFlow, scikit-learn, and ONNX.

---

## 🎯 System Overview

Training Pipeline is a **scheduled offline process** that trains ML models for the algo-worker trading engine. It fetches historical market data from QuestDB, performs feature engineering, trains an ensemble of models using walk-forward validation, and exports them to ONNX format for production deployment.

### **Design Principles**

1. **Kedro Framework**: Reproducible, modular ML pipelines with data catalog
2. **Walk-Forward Validation**: Expanding window to prevent lookahead bias
3. **Ensemble Stacking**: Level-0 base models + Level-1 meta-learner
4. **ONNX Export**: Hardware-agnostic inference for algo-worker
5. **MLflow Tracking**: Experiment versioning and model registry

### **Data Flow**

```
QuestDB (Historical Data)
        ↓
[Pipeline 1: Data Ingestion]
        ↓
[Pipeline 2: Feature Engineering]
        ↓
[Pipeline 3: Train Feature Extractor] (TimesNet)
        ↓
[Pipeline 4: Train Ensemble] (Level-0: XGBoost, CNN-LSTM, GINN, SVM, Transformer)
        ↓
[Pipeline 5: Train Meta-Learner] (Level-1: Logistic Regression)
        ↓
[Pipeline 6: Export ONNX]
        ↓
[Pipeline 7: Backtesting]
        ↓
Copy to algo-worker/models/ → Production
```

---

## 🚀 Quick Start

### **Prerequisites**

- Python 3.11+
- Poetry (dependency management)
- QuestDB running with historical data (2+ years)
- MongoDB (for training labels)

### **Installation**

```bash
# 1. Navigate to training-pipeline
cd apps/training-pipeline

# 2. Install dependencies
poetry install

# 3. Activate environment
poetry shell

# 4. Configure credentials
cp conf/local/credentials.yml.example conf/local/credentials.yml
# Edit credentials.yml with QuestDB/MongoDB connection strings

# 5. Run complete pipeline
kedro run
```

### **Step-by-Step Execution**

```bash
# 1. Feature engineering
kedro run --pipeline feature_engineering

# 2. Train feature extractor (optional)
kedro run --pipeline train_feature_extractor

# 3. Train ensemble models (Level-0)
kedro run --pipeline train_ensemble

# 4. Train meta-learner (Level-1)
kedro run --pipeline train_meta_learner

# 5. Export to ONNX
kedro run --pipeline export_onnx

# 6. Backtesting
kedro run --pipeline backtesting

# 7. View results in MLflow
mlflow ui

# 8. Copy models to algo-worker
cp onnx/*.onnx ../algo-worker/models/
```

---

## 📊 ML Model Stack

### **Level-0 Base Models** (Train Independently)

1. **XGBoost Classifier**
   - Gradient boosting for heterogeneous features
   - Feature importance tracking
   - Early stopping (50 rounds)
   - Target: AUC >0.75

2. **CNN-LSTM Hybrid**
   - 1D-CNN for local pattern detection
   - LSTM for temporal dependencies
   - Sequence length: 60 timesteps
   - Target: AUC >0.72

3. **GINN (GARCH-Informed Neural Network)**
   - Two-stage: GARCH(1,1) + LSTM
   - Models volatility clustering + residuals
   - Combines linear & non-linear patterns
   - Target: AUC >0.73

4. **SVM (Support Vector Machine)**
   - RBF kernel with grid search
   - High economic gains (research-backed)
   - Class weight balancing
   - Target: AUC >0.71

5. **Transformer Encoder**
   - Multi-head self-attention (8 heads)
   - 4 layers, d_model=256
   - Position encodings for sequences
   - Target: AUC >0.74

### **Level-1 Meta-Model** (Train After Level-0)

- **Logistic Regression Stacker**
  - Blends Level-0 probabilities
  - Out-of-fold predictions (no leakage)
  - 5-fold TimeSeriesSplit cross-validation
  - Target: **Ensemble AUC >0.78**

---

## 🏗️ Kedro Pipelines

### **1. Data Ingestion** (`data_ingestion`)

**Purpose**: Fetch historical market data from QuestDB

**Nodes**:
- `fetch_tick_data` - Query 2 years of Nifty/Bank Nifty ticks
- `aggregate_candles` - Compute OHLCV (1m, 5m, 15m, 1h)

**Output**: `data/01_raw/tick_data.parquet`

**Run**:
```bash
kedro run --pipeline data_ingestion
```

**Documentation**: [docs/pipelines/DATA_INGESTION.md](./docs/pipelines/DATA_INGESTION.md)

---

### **2. Feature Engineering** (`feature_engineering`)

**Purpose**: Compute 50+ features from raw market data

**Features**:
- **Technical**: RSI, MACD, Bollinger Bands, SMA, EMA, ATR, OBV, ADX
- **Volatility**: Realized Vol (5d/10d/20d), India VIX, Parkinson estimator
- **Options**: ATM IV, skew, term structure, PCR (volume/OI), Max Pain
- **Sentiment**: FinBERT scores (future)

**Output**: `data/04_feature/features.parquet`

**Run**:
```bash
kedro run --pipeline feature_engineering
```

**Documentation**: [docs/pipelines/FEATURE_ENGINEERING.md](./docs/pipelines/FEATURE_ENGINEERING.md)

---

### **3. Train Feature Extractor** (`train_feature_extractor`)

**Purpose**: Train TimesNet for feature compression (optional)

**Model**: TimesNet (2D-Variation Temporal Modeling)

**Output**: `data/06_models/timesnet.pkl`

**Run**:
```bash
kedro run --pipeline train_feature_extractor
```

**Documentation**: [docs/pipelines/TRAIN_FEATURE_EXTRACTOR.md](./docs/pipelines/TRAIN_FEATURE_EXTRACTOR.md)

---

### **4. Train Ensemble** (`train_ensemble`)

**Purpose**: Train Level-0 base models with walk-forward validation

**Walk-Forward Settings**:
- Train Window: 6 months (expanding)
- Test Window: 1 month (rolling)
- Total Folds: 12 (for 2-year dataset)

**Models**: XGBoost, CNN-LSTM, GINN, SVM, Transformer

**Output**: 5 trained models in `data/06_models/`

**Run**:
```bash
kedro run --pipeline train_ensemble
```

**Documentation**: [docs/pipelines/TRAIN_ENSEMBLE.md](./docs/pipelines/TRAIN_ENSEMBLE.md)

---

### **5. Train Meta-Learner** (`train_meta_learner`)

**Purpose**: Train Level-1 stacking model

**Model**: Logistic Regression

**Input**: Out-of-fold probabilities from Level-0 models

**Training Strategy**:
- Use OOF predictions to avoid data leakage
- 5-fold TimeSeriesSplit

**Output**: `data/06_models/meta_learner.pkl`

**Run**:
```bash
kedro run --pipeline train_meta_learner
```

**Documentation**: [docs/pipelines/TRAIN_META_LEARNER.md](./docs/pipelines/TRAIN_META_LEARNER.md)

---

### **6. Export ONNX** (`export_onnx`)

**Purpose**: Convert all models to ONNX format

**Exports**:
- `xgboost.onnx` (FP16 quantization)
- `cnn_lstm.onnx` (FP16 quantization)
- `ginn.onnx` (FP16 quantization)
- `svm.onnx` (FP32 - SVM doesn't quantize well)
- `transformer.onnx` (FP16 quantization)
- `meta_learner.onnx` (FP32)

**Validation**: Test ONNX inference vs. original models

**Output**: `onnx/*.onnx`

**Run**:
```bash
kedro run --pipeline export_onnx
```

**Documentation**: [docs/pipelines/EXPORT_ONNX.md](./docs/pipelines/EXPORT_ONNX.md)

---

### **7. Backtesting** (`backtesting`)

**Purpose**: Simulate trading with realistic transaction costs

**Metrics**:
- Sharpe Ratio (target: >1.5)
- Sortino Ratio (target: >2.0)
- Maximum Drawdown (target: <20%)
- Win Rate
- Profit Factor

**Transaction Costs** (NSE Options):
- Brokerage: ₹20 per order
- STT: 0.0625% on sell side
- Exchange fees: 0.053%
- GST: 18% on (brokerage + exchange fees)
- Slippage: 0.05%

**Output**: `data/08_reporting/backtest_results.csv`

**Run**:
```bash
kedro run --pipeline backtesting
```

**Documentation**: [docs/pipelines/BACKTESTING.md](./docs/pipelines/BACKTESTING.md)

---

## 📁 Project Structure

```
apps/training-pipeline/
├── conf/
│   ├── base/
│   │   ├── catalog.yml                # Data sources
│   │   ├── parameters.yml             # Hyperparameters
│   │   ├── logging.yml
│   │   └── parameters/
│   │       ├── data_processing.yml
│   │       ├── ensemble.yml
│   │       ├── timesnet.yml
│   │       └── rl_agent.yml
│   └── local/
│       ├── catalog_local.yml          # Local overrides
│       └── credentials.yml            # DB credentials (gitignored)
│
├── src/
│   └── training_pipeline/
│       ├── pipelines/
│       │   ├── data_ingestion/
│       │   │   ├── nodes.py
│       │   │   └── pipeline.py
│       │   ├── feature_engineering/
│       │   │   ├── nodes.py
│       │   │   ├── pipeline.py
│       │   │   └── indicators/
│       │   │       ├── technical.py
│       │   │       ├── options.py
│       │   │       └── sentiment.py
│       │   ├── train_ensemble/
│       │   │   ├── nodes.py
│       │   │   ├── pipeline.py
│       │   │   └── models/
│       │   │       ├── xgboost_trainer.py
│       │   │       ├── cnn_lstm_trainer.py
│       │   │       ├── ginn_trainer.py
│       │   │       ├── svm_trainer.py
│       │   │       └── transformer_trainer.py
│       │   ├── train_meta_learner/
│       │   │   ├── nodes.py
│       │   │   └── pipeline.py
│       │   ├── export_onnx/
│       │   │   ├── nodes.py
│       │   │   └── pipeline.py
│       │   └── backtesting/
│       │       ├── nodes.py
│       │       └── pipeline.py
│       └── utils/
│           ├── validation.py           # Walk-forward validation
│           ├── metrics.py              # Performance metrics
│           └── backtesting.py          # Backtesting engine
│
├── data/                                # Data layers (Kedro convention)
│   ├── 01_raw/                         # Raw tick data
│   ├── 02_intermediate/                # Processed candles
│   ├── 03_primary/                     # Cleaned data
│   ├── 04_feature/                     # Engineered features
│   ├── 05_model_input/                 # Train/test splits
│   ├── 06_models/                      # Trained .pkl models
│   ├── 07_model_output/                # Predictions
│   └── 08_reporting/                   # Backtest reports
│
├── onnx/                                # ONNX exports (copy to algo-worker)
│   ├── xgboost.onnx
│   ├── cnn_lstm.onnx
│   ├── ginn.onnx
│   ├── svm.onnx
│   ├── transformer.onnx
│   └── meta_learner.onnx
│
├── mlruns/                              # MLflow experiment tracking
├── notebooks/                           # Jupyter notebooks for EDA
│   ├── 01_data_exploration.ipynb
│   ├── 02_feature_analysis.ipynb
│   ├── 03_model_prototyping.ipynb
│   └── 04_results_analysis.ipynb
│
├── docs/
│   ├── ARCHITECTURE.md
│   └── pipelines/                       # Pipeline-specific documentation
│       ├── DATA_INGESTION.md
│       ├── FEATURE_ENGINEERING.md
│       ├── TRAIN_ENSEMBLE.md
│       ├── TRAIN_META_LEARNER.md
│       ├── EXPORT_ONNX.md
│       └── BACKTESTING.md
│
├── .github/
│   └── copilot-instructions.md
├── pyproject.toml
├── kedro_cli.py
├── requirements.txt
└── README.md
```

---

## 📈 Model Performance Targets

| Model | Train AUC | Test AUC | Inference Time |
|-------|-----------|----------|----------------|
| XGBoost | >0.75 | >0.70 | <10ms |
| CNN-LSTM | >0.72 | >0.68 | <30ms |
| GINN | >0.73 | >0.69 | <25ms |
| SVM | >0.71 | >0.67 | <15ms |
| Transformer | >0.74 | >0.70 | <40ms |
| **Meta-Learner** | **>0.78** | **>0.73** | **<5ms** |

**Ensemble Target**: Test AUC >0.75, Sharpe Ratio >1.5

---

## 🔄 Scheduled Runs

**Recommended Schedule**:

```bash
# Daily (2 AM IST) - Fast retraining
0 2 * * * cd /path/to/training-pipeline && poetry run kedro run --pipeline feature_engineering,train_ensemble,export_onnx

# Weekly (Sunday 2 AM IST) - Full retraining
0 2 * * 0 cd /path/to/training-pipeline && poetry run kedro run

# Monthly - Hyperparameter tuning
0 2 1 * * cd /path/to/training-pipeline && poetry run kedro run --params hyperparameter_search:true
```

---

## 📊 MLflow Tracking

Start MLflow UI to view experiment results:

```bash
mlflow ui
# Opens at http://localhost:5000
```

**Logged Metrics**:
- Model AUC, precision, recall, F1
- Sharpe ratio, Sortino ratio
- Maximum drawdown, Calmar ratio
- Training time, model size
- Hyperparameters

---

## 🔗 Integration with algo-worker

After training completes:

```bash
# 1. Copy ONNX models
cp onnx/*.onnx ../algo-worker/models/

# 2. Restart algo-worker to load new models
cd ../algo-worker
pm2 restart algo-worker

# 3. Verify models loaded
curl http://localhost:3001/health
```

---

## 🧪 Testing

```bash
# Run pytest
poetry run pytest

# With coverage
poetry run pytest --cov=src

# Specific test file
poetry run pytest tests/test_feature_engineering.py
```

---

## 🛠️ Tech Stack

### **Framework**
- **Kedro** - ML pipeline framework
- **MLflow** - Experiment tracking
- **Poetry** - Dependency management

### **ML Libraries**
- **XGBoost** - Gradient boosting
- **TensorFlow/Keras** - Deep learning (CNN-LSTM, Transformer)
- **scikit-learn** - SVM, preprocessing, meta-learner
- **ONNX Runtime** - Model validation

### **Data Processing**
- **pandas** - DataFrames
- **NumPy** - Numerical operations
- **TA-Lib** - Technical indicators (optional)

### **Databases**
- **QuestDB** - Historical tick data (via psycopg2)
- **MongoDB** - Training labels (via pymongo)

---

## 📚 Documentation

- **[Copilot Instructions](./.github/copilot-instructions.md)** - Coding standards
- **[Pipeline Docs](./docs/pipelines/)** - Detailed pipeline documentation
- **[Kedro Documentation](https://kedro.readthedocs.io/)** - Framework reference

---

## 🤝 Development Workflow

1. **Add new feature** → Update `feature_engineering/nodes.py`
2. **Add new model** → Create trainer in `train_ensemble/models/`
3. **Register in pipeline** → Update `train_ensemble/pipeline.py`
4. **Run pipeline** → `kedro run --pipeline train_ensemble`
5. **Track in MLflow** → View results at `localhost:5000`
6. **Export ONNX** → `kedro run --pipeline export_onnx`
7. **Deploy** → Copy to algo-worker/models/

---

## 🎯 Current Status

### **Phase 1: Pipeline Structure** ✅ COMPLETE

- [x] Kedro project setup
- [x] Data catalog configuration
- [x] Pipeline definitions
- [x] Parameter management

### **Phase 2: Implementation** 🚧 IN PROGRESS

- [x] Data ingestion pipeline
- [x] Feature engineering pipeline
- [x] XGBoost trainer
- [x] CNN-LSTM trainer
- [x] GINN trainer
- [x] SVM trainer
- [x] Transformer trainer
- [x] Meta-learner trainer
- [x] ONNX export pipeline
- [ ] Backtesting pipeline (in progress)
- [ ] RL agent training (planned)

### **Phase 3: Integration & Testing** 📋 PLANNED

- [ ] End-to-end testing with historical data
- [ ] ONNX validation against original models
- [ ] Automated deployment to algo-worker
- [ ] Continuous integration (GitHub Actions)

---

## 📝 License

Part of the investment-trading-portfolio monorepo.

---

**Built for quantitative options trading on NSE** 🇮🇳
