# Training Pipeline - Offline ML Model Training

> **Kedro-based ML training pipeline for NSE options volatility prediction using walk-forward validation and ensemble stacking.**

Built with Python 3.11+, Kedro, XGBoost, TensorFlow, scikit-learn, and ONNX.

---

## 🎯 System Overview

Training Pipeline is a **scheduled offline process** that trains ML models for the algo-worker trading engine. It fetches historical market data from QuestDB, performs feature engineering, trains an ensemble of models using walk-forward validation, and exports them to ONNX format for production deployment.

### **Design Principles**

1. **Configuration-Aware Training**: Models must generalize across diverse user preferences (instruments, strategies, permissions)
2. **Kedro Framework**: Reproducible, modular ML pipelines with data catalog
3. **Walk-Forward Validation**: Expanding window to prevent lookahead bias
4. **Ensemble Stacking**: Level-0 base models + Level-1 meta-learner
5. **ONNX Export**: Hardware-agnostic inference for algo-worker
6. **MLflow Tracking**: Experiment versioning and model registry

**Why Configuration-Aware?** In production, algo-worker only analyzes what users enable. If no user enables FINNIFTY, the model won't predict for it. Models must be robust enough to handle any combination of user preferences without retraining.

### **Data Flow**

```
QuestDB (Historical Data)
        ↓
[Pipeline 1: Data Ingestion]
        ↓
[Pipeline 2: Feature Engineering]
        ↓
[Pipeline 3: Train Feature Extractor] (TimesNet, WFTNet)
        ↓
[Pipeline 4: Train Ensemble] (Level-0: 6 Core + 4 Optional)
        ↓
        Core: XGBoost, LightGBM, CNN-LSTM, GINN, SVM, Transformer
        Optional: TimesNet-MLP, WFTNet-MLP, PatchTST, KAN
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

### **Advanced Features**

This pipeline includes cutting-edge validation and features:

- **Combinatorial Purged Cross-Validation (CPCV)**: Eliminate overfitting and lookahead bias
- **Order Flow Imbalance (OFI)**: Microstructure features for sub-second signals
- **RL Execution Agent**: Reinforcement learning for optimal order placement

**See [docs/ADVANCED_VALIDATION.md](docs/ADVANCED_VALIDATION.md) for implementation details.**

---

### **Prerequisites**

- Python 3.11+
- Poetry (dependency management)
- QuestDB running with historical data (2+ years)
- MongoDB (for training labels)

### **Installation**

```bash
# 1. Navigate to training-pipeline
cd services/training-pipeline

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

### **Feature Extraction Models** (Optional Pre-Training)

1. **TimesNet** (ICML 2023)
   - Multi-scale temporal pattern recognition
   - Converts 1D time series to 2D tensors
   - Inception-style architecture
   - Target: Feature compression 50→128 dimensions

2. **WFTNet** (2024)
   - Wavelet Feature Transform Network
   - Captures multi-resolution frequency patterns
   - Combines DWT with neural networks
   - Target: Feature compression 50→128 dimensions

**Usage**: Pre-train for feature extraction, then freeze and use as input layer for Level-0 models

---

### **Level-0 Base Models** (Train Independently)

1. **XGBoost Classifier**
   - Gradient boosting for heterogeneous features
   - Feature importance tracking
   - Early stopping (50 rounds)
   - Target: AUC >0.75

2. **LightGBM Classifier**
   - Faster gradient boosting variant
   - Histogram-based tree learning
   - Better handling of categorical features
   - Target: AUC >0.74

3. **Mamba (State Space Model)**
   - Linear-time sequence modeling (O(L)) vs Quadratic Transformer (O(L^2))
   - Selectivity mechanism to filter noise
   - 5x faster inference than LSTM/Transformer
   - Target: AUC >0.74

4. **PatchTST (Patch Time Series Transformer)**
   - Segment time-series into patches (sub-series)
   - Channel-independent processing to prevent overfitting
   - Best-in-class for volatility forecasting
   - Target: AUC >0.75

5. **GINN (GARCH-Informed Neural Network)**
   - Two-stage: GARCH(1,1) + LSTM
   - Models volatility clustering + residuals
   - Combines linear & non-linear patterns
   - Target: AUC >0.73

6. **SVM (Support Vector Machine)**
   - RBF kernel with grid search
   - High economic gains (research-backed)
   - Class weight balancing
   - Target: AUC >0.71

7. **TimesNet-Enhanced MLP** (Optional)
   - Pre-trained TimesNet feature extractor
   - MLP classifier on compressed features
   - Target: AUC >0.73

8. **Vision Transformer (ViT)** (Optional)
   - IV Surface image analysis
   - Target: AUC >0.72

9. **PatchTST (Patch Time Series Transformer)** (Optional)
   - Patching mechanism: Groups 16 timesteps into patches
   - Channel-independent processing (reduces overfitting)
   - Extended look-back window (120+ timesteps)
   - Captures long-term trends + local patterns
   - Target: AUC >0.75

10. **KAN (Kolmogorov-Arnold Network)** (Optional)
    - Learnable activation functions on edges (not nodes)
    - B-spline parameterization for smooth non-linearity
    - Fewer parameters than MLPs for same capacity
    - Inherently more interpretable (visualize splines)
    - Fast inference (<10ms) with high accuracy
    - Target: AUC >0.74

---

### **Advanced Models (Research-Validated 2025)**

- **Informer Transformer**
  - **Purpose**: Long-sequence time-series forecasting (outperforms LSTM in option pricing)
  - **Architecture**: ProbSparse self-attention mechanism (O(L log L) complexity vs O(L²) for standard Transformer)
  - **Input**: 60-timestep sequences of price/IV/Greeks
  - **Research**: Demonstrated lowest MAE vs. Black-Scholes/Heston models in volatility prediction (Informer et al., 2025)
  - **Target**: AUC >0.76, inference <30ms

- **Vision Transformer (ViT) for IV Surface**
  - **Purpose**: Process Implied Volatility surface as 2D image (strike × expiry grid)
  - **Architecture**: Image patches (16×16) → Linear embedding → Multi-head self-attention
  - **Input**: 32×32 grayscale image (strikes: 0.8-1.2 ATM, expiries: 0-30 DTE)
  - **Research**: Captures volatility smile patterns better than MLP feature engineering
  - **Target**: AUC >0.75, inference <40ms

### **Level-1 Meta-Model** (Train After Level-0)

- **Logistic Regression Stacker**
  - Blends Level-0 probabilities (8-10 inputs from ensemble)
  - Out-of-fold predictions (no leakage)
  - 5-fold TimeSeriesSplit cross-validation
  - Target: **Ensemble AUC >0.78**

---

### **Reinforcement Learning Agent** (Optional - Advanced)

- **TD3 (Twin Delayed DDPG)** or **SAC (Soft Actor-Critic)**
  - **Purpose**: Dynamic position sizing, portfolio allocation, AND exit timing
  - **State**: Market features + ensemble predictions + portfolio state + position age
  - **Action Space**:
    - **Entry Action**: Continuous position size (0-1), leverage (1-3)
    - **Exit Action**: Hold vs. Exit decision, trailing stop adjustment
  - **Reward**: Risk-adjusted return (Sharpe) + penalty for premature exits
  - **Training**: Off-policy with replay buffer + prioritized experience replay
  - **Target**:
    - Entry accuracy: Sharpe Ratio >1.8 (vs >1.5 for fixed sizing)
    - Exit accuracy: Max drawdown <15% (vs <20% for fixed stops)

**Note**: RL agent is experimental. Start with fixed position sizing (5% per trade) before implementing RL.

---

## 🎯 Configuration-Aware Training Strategy

### **Why Train for Configurability?**

In production, **algo-worker operates based on user-specific configurations**. Each user can:

- Enable/disable specific instruments (NIFTY, BANKNIFTY, FINNIFTY)
- Allow/disallow specific permissions (buy calls, sell puts, naked positions)
- Enable/disable specific strategies (LONG_STRADDLE, IRON_CONDOR)
- Enable/disable specific models (XGBoost, LightGBM, etc.)

**Training Challenge**: Models must perform well across **all possible configuration combinations**, not just the most common ones.

### **Training Approach**

#### **1. Diverse Data Sampling**

```python
# ✅ GOOD: Train on all instrument/strategy combinations
instruments = ['NIFTY', 'BANKNIFTY', 'FINNIFTY']
strategies = ['LONG_STRADDLE', 'IRON_CONDOR', 'BULL_PUT_SPREAD', 'BEAR_CALL_SPREAD']

for symbol in instruments:
    for strategy in strategies:
        train_data = prepare_data(symbol, strategy)
        model.partial_fit(train_data)

# ❌ BAD: Train only on NIFTY LONG_STRADDLE
train_data = prepare_data('NIFTY', 'LONG_STRADDLE')
model.fit(train_data)
```

#### **2. Generic Feature Engineering**

```python
# ✅ GOOD: Instrument-agnostic features
features = [
    'realized_vol_5d',    # Works for all instruments
    'realized_vol_10d',
    'rsi_14',
    'macd',
    'atm_iv',             # At-the-money implied vol
    'pcr_volume',         # Put-call ratio
    'vol_skew',
    # ... 50 total generic features
]

# ❌ BAD: Instrument-specific features
features = [
    'nifty_50_pe_ratio',        # Only for NIFTY
    'bank_index_correlation',   # Only for BANKNIFTY
]
```

#### **3. Stratified Validation**

Validate model performance across different user configuration scenarios:

```python
# Simulate realistic user configurations
test_scenarios = [
    {'instrument': 'NIFTY', 'strategies': ['LONG_STRADDLE']},
    {'instrument': 'BANKNIFTY', 'strategies': ['IRON_CONDOR']},
    {'instrument': 'FINNIFTY', 'strategies': ['BULL_PUT_SPREAD', 'BEAR_CALL_SPREAD']},
    {'instrument': 'NIFTY', 'strategies': ['ALL']},  # Power user
]

for scenario in test_scenarios:
    test_data = filter_test_data(scenario)
    auc = evaluate_model(model, test_data)

    # Ensure model performs well in ALL scenarios
    assert auc > 0.70, f"Model fails for {scenario}: AUC={auc}"
```

#### **4. Model Robustness Requirements**

| Requirement                | Description                                                  | Validation                              |
| -------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| **Instrument Agnostic**    | Model works on NIFTY, BANKNIFTY, FINNIFTY without retraining | AUC >0.70 on each instrument separately |
| **Strategy Agnostic**      | Same features work for all option strategies                 | AUC >0.68 on each strategy separately   |
| **Confidence Calibration** | Confidence scores comparable across instruments              | Calibration plot with ECE <0.10         |
| **Ensemble Robustness**    | If user disables 2 models, remaining 4 still effective       | Subset AUC >0.72 (vs >0.75 full)        |

#### **5. Configuration Simulation Testing**

After training, simulate production scenarios:

```python
# Test: Only 1 user, only NIFTY, only buy calls
config = {
    'instruments': ['NIFTY'],
    'permissions': {'allowBuyCalls': True, 'allowSellCalls': False},
    'strategies': ['LONG_STRADDLE'],
    'enabledModels': ['xgboost', 'lightgbm']
}

# Filter test data to match config
filtered_data = apply_config_filter(X_test, config)

# Run only enabled models
predictions = run_ensemble(filtered_data, config['enabledModels'])

# Validate performance
auc = roc_auc_score(y_test_filtered, predictions)
assert auc > 0.70, "Model fails for single-user config"
```

### **Training Data Requirements**

To ensure configuration robustness:

| Data Type              | Minimum Requirement                | Recommended                             |
| ---------------------- | ---------------------------------- | --------------------------------------- |
| **Time Period**        | 2 years                            | 3-5 years                               |
| **Instruments**        | All 3 (NIFTY, BANKNIFTY, FINNIFTY) | Include historical delisted instruments |
| **Strategies**         | All 8 primary strategies           | Include custom strategy variations      |
| **Market Regimes**     | Bull, Bear, Sideways               | Include COVID crash, recovery periods   |
| **Volatility Regimes** | High (VIX >25), Low (VIX <15)      | Include regime transitions              |

### **Practical Example: Configuration Impact**

**Scenario**: 100 users, only 2 active

- **User A**: `{'instruments': ['NIFTY'], 'strategies': ['LONG_STRADDLE'], 'models': ['xgboost', 'lightgbm']}`
- **User B**: `{'instruments': ['BANKNIFTY'], 'strategies': ['IRON_CONDOR'], 'models': ['cnn_lstm', 'transformer']}`

**Production Behavior**:

1. algo-worker computes union: instruments={NIFTY, BANKNIFTY}, models={xgboost, lightgbm, cnn_lstm, transformer}
2. Only runs 4 models (not all 8-10)
3. Only analyzes 2 instruments (not all 50 symbols)
4. **Result**: 97% resource reduction vs. analyzing everything

**Training Requirement**: Models must perform well even if only subset of 8-10 models used.

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

### **3. Train Feature Extractors** (`train_feature_extractor`)

**Purpose**: Train TimesNet and WFTNet for feature compression (optional)

**Models**:

- **TimesNet** - Multi-scale temporal patterns (50→128 dimensions)
- **WFTNet** - Wavelet-based features (50→128 dimensions)

**Output**:

- `data/06_models/timesnet.pkl`
- `data/06_models/wftnet.pkl`

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

**Models**: XGBoost, LightGBM, CNN-LSTM, GINN, SVM, Transformer (core 6), TimesNet-MLP, WFTNet-MLP, PatchTST, KAN (optional 4)

**Output**: 8-10 trained models in `data/06_models/`

**Run**:

```bash
# Train core models (6 models)
kedro run --pipeline train_ensemble

# Train with feature extractors (8 models)
kedro run --pipeline train_ensemble --params use_feature_extractors:true
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

### **8. Train RL Agent** (`train_rl_agent`) - **EXPERIMENTAL**

**Purpose**: Train reinforcement learning agent for dynamic position sizing

**Algorithm**: TD3 (Twin Delayed DDPG) or SAC (Soft Actor-Critic)

**Environment**:

- **State**: Market features (50D) + Ensemble prediction (1D) + Portfolio state (5D)
- **Action**: Position size (continuous 0-1) + Leverage (continuous 1-3)
- **Reward**: Sharpe-ratio-based with penalty for drawdown

**Training**:

- 1M timesteps (off-policy)
- Replay buffer: 100k transitions
- Update frequency: Every 4 steps
- Target network update: Soft (τ=0.005)

**Output**: `data/06_models/rl_agent.pkl`

**Run**:

```bash
# Train RL agent (requires ensemble predictions)
kedro run --pipeline train_rl_agent

# Backtest with RL agent
kedro run --pipeline backtesting --params use_rl_agent:true
```

**Documentation**: [docs/pipelines/TRAIN_RL_AGENT.md](./docs/pipelines/TRAIN_RL_AGENT.md)

**⚠️ Warning**: RL agent is experimental. Requires significant computational resources and careful reward engineering. Start with fixed position sizing.

---

## 📁 Project Structure

```
services/training-pipeline/
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
│       │   ├── train_feature_extractor/
│       │   │   ├── nodes.py
│       │   │   ├── pipeline.py
│       │   │   └── models/
│       │   │       ├── timesnet.py
│       │   │       └── wftnet.py
│       │   ├── train_ensemble/
│       │   │   ├── nodes.py
│       │   │   ├── pipeline.py
│       │   │   └── models/
│       │   │       ├── xgboost_trainer.py
│       │   │       ├── lightgbm_trainer.py
│       │   │       ├── cnn_lstm_trainer.py
│       │   │       ├── ginn_trainer.py
│       │   │       ├── svm_trainer.py
│       │   │       ├── transformer_trainer.py
│       │   │       ├── timesnet_mlp_trainer.py  # Optional
│       │   │       └── wftnet_mlp_trainer.py    # Optional
│       │   ├── train_meta_learner/
│       │   │   ├── nodes.py
│       │   │   └── pipeline.py
│       │   ├── train_rl_agent/              # EXPERIMENTAL
│       │   │   ├── nodes.py
│       │   │   ├── pipeline.py
│       │   │   └── agents/
│       │   │       ├── td3_agent.py
│       │   │       ├── sac_agent.py
│       │   │       └── trading_env.py        # Gym environment
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
│       ├── TRAIN_FEATURE_EXTRACTOR.md  # TimesNet, WFTNet
│       ├── TRAIN_ENSEMBLE.md
│       ├── TRAIN_META_LEARNER.md
│       ├── TRAIN_RL_AGENT.md           # EXPERIMENTAL
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

### **Feature Extractors** (Optional)

| Model    | Feature Dim | Training Time | Benefit               |
| -------- | ----------- | ------------- | --------------------- |
| TimesNet | 50→128      | ~2 hours      | +2-3% AUC improvement |
| WFTNet   | 50→128      | ~1.5 hours    | +1-2% AUC improvement |

### **Level-0 Models**

| Model        | Train AUC | Test AUC  | Inference Time | Status   |
| ------------ | --------- | --------- | -------------- | -------- |
| XGBoost      | >0.75     | >0.70     | <10ms          | Core     |
| LightGBM     | >0.74     | >0.69     | <8ms           | Core     |
| **Mamba**    | **>0.76** | **>0.74** | **<12ms**      | **Core** |
| **PatchTST** | **>0.77** | **>0.75** | **<20ms**      | **Core** |
| GINN         | >0.73     | >0.69     | <25ms          | Core     |
| SVM          | >0.71     | >0.67     | <15ms          | Core     |
| TimesNet-MLP | >0.73     | >0.69     | <20ms          | Optional |
| VisionTrans  | >0.75     | >0.72     | <30ms          | Optional |
| KAN          | >0.74     | >0.70     | <10ms          | Optional |

### **Meta-Learner**

| Model                           | Train AUC | Test AUC  | Inference Time |
| ------------------------------- | --------- | --------- | -------------- |
| **Logistic Regression Stacker** | **>0.78** | **>0.73** | **<5ms**       |

### **RL Agent** (Experimental)

| Metric        | Target | Baseline (Fixed Sizing) |
| ------------- | ------ | ----------------------- |
| Sharpe Ratio  | >1.8   | 1.5                     |
| Sortino Ratio | >2.3   | 2.0                     |
| Max Drawdown  | <18%   | 20%                     |
| Win Rate      | >55%   | 50%                     |

**Ensemble Target**: Test AUC >0.75, Sharpe Ratio >1.5 (without RL) / >1.8 (with RL)

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
