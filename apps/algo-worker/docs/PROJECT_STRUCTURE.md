## 🏗️ **ARCHITECTURAL ANALYSIS & REDESIGN**

Based on my analysis, here's the **correct architecture** for your trading system:

### **Current State Assessment:**

- ✅ Good foundation: Monorepo, shared packages, research-backed tech stack
- ❌ **Critical Gap**: algo-worker has only scaffolding (5 files), no 7-layer implementation
- ❌ **Confusion**: Mixing data ingestion, training, and inference responsibilities
- ❌ **Missing**: Clear separation between market-feeder → training-pipeline → algo-worker

### **Redesigned 7-Layer Architecture:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PROJECT QUANTUM ARCHITECTURE                     │
│              Event-Driven AI Trading for NSE Options                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌────────────────────┐    ┌──────────────────┐
│ MARKET-FEEDER   │───>│ TRAINING-PIPELINE  │───>│  ALGO-WORKER     │
│ (Data Collection)│    │ (Model Training)   │    │ (Live Trading)   │
└─────────────────┘    └────────────────────┘    └──────────────────┘
        │                       │                         │
        ▼                       ▼                         ▼
    QuestDB ◄──────────────────┴────────────────────> QuestDB
 (Time-series)                                       (Features)
        │                                                 │
        ▼                                                 ▼
    MongoDB ◄─────────────────────────────────────> MongoDB
  (Training                                        (Signals,
    Labels)                                        Orders)
        │                                                 │
        ▼                                                 ▼
     Redis  ◄─────────────────────────────────────>  Redis
  (Event Bus)                                      (Event Bus,
                                                    Hot State)
```

## 📋 **SYSTEM RESPONSIBILITIES**

### **1. market-feeder (Data Collection Layer)**

**Purpose**: Real-time market data ingestion to QuestDB  
**Runs**: 24/7 scheduled collection

- WebSocket streaming from Upstox (Nifty/Bank Nifty options chain)
- Batch writes to QuestDB (10K rows/sec)
- Technical indicator calculation on-the-fly
- Event publishing to Redis Streams

### **2. training-pipeline (Offline ML Training)**

**Purpose**: Train & export ONNX models  
**Runs**: Scheduled (daily/weekly)

- Fetch historical data from QuestDB
- Walk-forward validation
- Train Level-0 models (XGBoost, CNN-LSTM, GINN, SVM, Transformer)
- Train Level-1 meta-learner (Logistic Regression stacker)
- Export to ONNX → Copy to algo-worker/models/
- MLflow experiment tracking

### **3. algo-worker (Live Trading Engine)**

**Purpose**: Real-time signal generation & order execution  
**Runs**: Market hours (9:15 AM - 3:30 PM IST)

**7-Layer Implementation**:

1. **Perception**: Subscribe to Redis market data events
2. **Cortex**: Feature engineering from cached data
3. **Prediction**: ONNX model inference (ensemble)
4. **Cognition**: Strategy selection via RL agent
5. **Execution**: Order placement with smart routing
6. **Memory**: Redis hot state + QuestDB persistence
7. **Control**: Metrics, health checks, circuit breakers

Now I'll generate the complete documentation. Given the scope, I'll provide the restructured content as code blocks you can copy:

## **ALGO-WORKER ARCHITECTURE** (Complete Rebuild)

# Algo Worker - 7-Layer Cognitive Trading Engine

> **Real-time algorithmic trading engine for NSE Nifty/Bank Nifty options using event-driven architecture and ML ensemble models.**

## 🎯 System Overview

Algo Worker is the **live trading execution engine** that implements the 7-Layer Cognitive Architecture. It consumes pre-trained ONNX models from `training-pipeline` and real-time market data from `market-feeder` to generate trading signals and execute orders.

### **Design Principles**

1. **Event-Driven**: All components communicate via Redis Streams (sub-millisecond latency)
2. **Stateless Inference**: Models loaded once at startup, zero cold-start
3. **SEBI Compliant**: Every order has unique `algoId`, pre-trade risk checks mandatory
4. **Fail-Safe**: Circuit breakers halt trading on data staleness, risk breaches, or latency degradation

## 🏗️ 7-Layer Architecture

### **Layer 1: Perception (Data Ingestion)**

**Purpose**: Subscribe to real-time market data events from Redis Streams

**Components**:

- `MarketDataConsumer` - Subscribes to `market-data` stream
- `NewsConsumer` - Subscribes to `news-sentiment` stream (FinBERT scores)

**Data Flow**:

```
market-feeder → Redis Stream → MarketDataConsumer → Layer 2 (Cortex)
```

**Latency Target**: <5ms event consumption

**Location**: `src/layers/perception/`

### **Layer 2: Cortex (Feature Engineering)**

**Purpose**: Transform raw market data into ML-ready features

**Components**:

- `FeatureEngineService` - Computes technical indicators in real-time
- `FeatureCacheService` - Maintains sliding window of features in Redis

**Features Computed**:

- Technical: RSI(14), MACD(12,26,9), Bollinger Bands(20,2), ATR(14)
- Volatility: Realized Vol (5d, 10d, 20d), India VIX
- Greeks: Delta, Gamma, Vega, Theta (from Upstox API)
- Sentiment: FinBERT score (from news-sentiment stream)

**Latency Target**: <10ms feature computation

**Location**: `src/layers/cortex/`

### **Layer 3: Prediction (Alpha Generation)**

**Purpose**: Run ML ensemble inference to generate trading signals

**Components**:

- `ModelLoaderService` - Load ONNX models at startup
- `EnsembleInferenceService` - Run Level-0 + Level-1 models

**Model Stack** (from training-pipeline):

1. **Level-0 Base Models**:
   - XGBoost Classifier (`xgboost.onnx`)
   - CNN-LSTM Hybrid (`cnn_lstm.onnx`)
   - GINN (GARCH-LSTM) (`ginn.onnx`)
   - SVM RBF (`svm.onnx`)
   - Transformer (`transformer.onnx`)

2. **Level-1 Meta-Model**:
   - Logistic Regression Stacker (`meta_learner.onnx`)

**Output**: `TradingSignal` with direction (LONG/SHORT), confidence (0-1), and horizon (5m/15m/1h)

**Latency Target**: <50ms (GPU), <100ms (CPU)

**Location**: `src/layers/prediction/`

### **Layer 4: Cognition (Strategy & Risk)**

**Purpose**: Convert signals into actionable strategies with risk management

**Components**:

- `StrategySelectionService` - Maps signals to options strategies
- `RiskManagerService` - Pre-trade risk validation (SEBI mandatory)
- `RLAgentService` - Dynamic position sizing via DQN (future)

**Strategies** (Research-backed for NSE):

- **LONG_STRADDLE**: High confidence VOL_UP signal + ATM options
- **IRON_CONDOR**: Low volatility + range-bound market
- **BULL_PUT_SPREAD**: Moderate bullish signal + credit spread
- **BEAR_CALL_SPREAD**: Moderate bearish signal + credit spread

**Risk Checks** (RiskManager):

```typescript
interface PreTradeChecks {
  positionLimitOK: boolean; // Max 5 positions
  marginSufficient: boolean; // Min 100K cash reserve
  leverageWithinBounds: boolean; // Max 3x leverage
  greeksAcceptable: boolean; // Portfolio Delta < 0.5, Gamma < 0.1
  dailyLossNotExceeded: boolean; // Max -50K daily loss
}
```

**Output**: `ValidatedStrategy` with target allocation

**Latency Target**: <20ms

**Location**: `src/layers/cognition/`

### **Layer 5: Execution (Action)**

**Purpose**: Place orders via Upstox API with smart order routing

**Components**:

- `OrderPlacementService` - Multi-leg order execution
- `ExecutionMonitorService` - Track fills via Upstox WebSocket
- `PositionManagerService` - Maintain position ledger

**Execution Algorithms**:

- **TWAP** (Time-Weighted Average Price) - Split large orders
- **VWAP** (Volume-Weighted Average Price) - Minimize market impact
- **Immediate** - Market orders for urgent signals

**SEBI Compliance** (Algo ID):

```typescript
const order = {
  algoId: `PROJ_QUANTUM_v${VERSION}_USER_${userId}`,
  timestamp: new Date(),
  preTradeChecksPassed: true, // From RiskManager
  symbol: 'NIFTY2451018000CE',
  quantity: 50,
  orderType: 'MARKET',
  product: 'INTRADAY',
};
```

**Latency Target**: <50ms order placement

**Location**: `src/layers/execution/`

### **Layer 6: Memory (Storage)**

**Purpose**: Persist trading data across hot/warm/cold storage tiers

**Components**:

- `RedisStateService` - Hot state (active positions, circuit breaker status)
- `QuestDBWriterService` - Warm storage (feature snapshots for debugging)
- `MongoDBSyncService` - Cold storage (signals, orders, performance metrics)

**Data Retention**:

- Redis: Current session only
- QuestDB: 30 days (features for backtesting)
- MongoDB: 5 years (SEBI audit requirement)

**Location**: `src/layers/memory/`

### **Layer 7: Control (Observability)**

**Purpose**: Monitoring, metrics, and circuit breakers

**Components**:

- `MetricsService` - Prometheus metrics export
- `HealthCheckService` - Liveness/readiness probes
- `CircuitBreakerService` - Auto-halt trading on failures

**Metrics Tracked**:

- Latency per layer (p50, p95, p99)
- Event processing throughput
- Model inference time
- Order fill rate
- P&L (real-time)

**Circuit Breaker Triggers**:

- Market data stale >5 seconds
- Inference latency >200ms (p95)
- Daily loss exceeds -50K
- Risk check failures >10 in 1 minute

**Location**: `src/layers/control/`

## 📊 Data Flow (Complete Pipeline)

```
┌──────────────────────────────────────────────────────────────────────┐
│                     REAL-TIME TRADING PIPELINE                        │
└──────────────────────────────────────────────────────────────────────┘

[market-feeder]
      │
      │ Upstox WebSocket (Tick Data)
      ▼
  QuestDB ──────> Batch Insert (10K/sec)
      │
      │ Redis Pub/Sub
      ▼
[Layer 1: Perception] - MarketDataConsumer
      │
      │ Event → Feature Extraction
      ▼
[Layer 2: Cortex] - FeatureEngineService
      │
      │ Features (25+ indicators)
      ▼
[Layer 3: Prediction] - EnsembleInferenceService
      │
      │ Level-0 Models → Level-1 Meta → Signal
      ▼
[Layer 4: Cognition] - StrategySelectionService
      │                    │
      │                    ├──> RiskManagerService (Pre-Trade Checks)
      │                    │
      │ ValidatedStrategy  │
      ▼                    ▼
[Layer 5: Execution] - OrderPlacementService ──> Upstox API
      │
      │ Order Confirmation
      ▼
[Layer 6: Memory] - MongoDB (Orders) + QuestDB (Features) + Redis (State)
      │
      │ Metrics Export
      ▼
[Layer 7: Control] - Prometheus + Grafana + Circuit Breakers
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- MongoDB 8.0+
- QuestDB 8.0+
- Redis 7.0+
- Pre-trained ONNX models (from training-pipeline)
- Upstox API credentials

### Installation

```bash
# 1. Install dependencies
cd apps/algo-worker
pnpm install

# 2. Copy ONNX models from training-pipeline
cp ../training-pipeline/onnx/*.onnx models/

# 3. Configure environment
cp .env.example .env
# Edit .env with database URLs and Upstox credentials

# 4. Start development server
pnpm dev
```

Server starts at `http://localhost:3001`

## 📁 Directory Structure

```
apps/algo-worker/
├── src/
│   ├── layers/                          # 7-Layer Architecture
│   │   ├── perception/
│   │   │   ├── perception.module.ts
│   │   │   ├── market-data.consumer.ts
│   │   │   └── news.consumer.ts
│   │   ├── cortex/
│   │   │   ├── cortex.module.ts
│   │   │   ├── feature-engine.service.ts
│   │   │   └── feature-cache.service.ts
│   │   ├── prediction/
│   │   │   ├── prediction.module.ts
│   │   │   ├── model-loader.service.ts
│   │   │   └── ensemble-inference.service.ts
│   │   ├── cognition/
│   │   │   ├── cognition.module.ts
│   │   │   ├── strategy-selection.service.ts
│   │   │   ├── risk-manager.service.ts
│   │   │   └── rl-agent.service.ts
│   │   ├── execution/
│   │   │   ├── execution.module.ts
│   │   │   ├── order-placement.service.ts
│   │   │   ├── execution-monitor.service.ts
│   │   │   └── position-manager.service.ts
│   │   ├── memory/
│   │   │   ├── memory.module.ts
│   │   │   ├── redis-state.service.ts
│   │   │   ├── questdb-writer.service.ts
│   │   │   └── mongodb-sync.service.ts
│   │   └── control/
│   │       ├── control.module.ts
│   │       ├── metrics.service.ts
│   │       ├── health-check.service.ts
│   │       └── circuit-breaker.service.ts
│   │
│   ├── events/                          # Event Definitions
│   │   ├── market-data.event.ts
│   │   ├── trading-signal.event.ts
│   │   ├── order.event.ts
│   │   └── position.event.ts
│   │
│   ├── orchestrator/                    # Trading Pipeline Orchestrator
│   │   ├── orchestrator.module.ts
│   │   └── trading-orchestrator.service.ts
│   │
│   ├── config/
│   │   └── trading.config.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── models/                               # ONNX Models (from training-pipeline)
│   ├── xgboost.onnx
│   ├── cnn_lstm.onnx
│   ├── ginn.onnx
│   ├── svm.onnx
│   ├── transformer.onnx
│   └── meta_learner.onnx
│
├── docs/                                 # Layer-specific documentation
│   ├── ARCHITECTURE.md
│   ├── layers/
│   │   ├── 01-PERCEPTION.md
│   │   ├── 02-CORTEX.md
│   │   ├── 03-PREDICTION.md
│   │   ├── 04-COGNITION.md
│   │   ├── 05-EXECUTION.md
│   │   ├── 06-MEMORY.md
│   │   └── 07-CONTROL.md
│   └── DEPLOYMENT.md
│
├── .env.example
├── .github/
│   └── copilot-instructions.md
├── package.json
├── tsconfig.json
└── README.md
```

## 🧪 Testing

```bash
# Unit tests (per layer)
pnpm test

# Integration tests (full pipeline)
pnpm test:e2e

# Load testing (latency benchmarks)
pnpm test:load

# Test coverage
pnpm test:cov
```

## 📈 Performance Targets

| Metric                        | Target           | Current |
| ----------------------------- | ---------------- | ------- |
| Event Consumption (Layer 1)   | <5ms             | TBD     |
| Feature Engineering (Layer 2) | <10ms            | TBD     |
| Model Inference (Layer 3)     | <50ms (GPU)      | TBD     |
| Strategy Selection (Layer 4)  | <20ms            | TBD     |
| Order Placement (Layer 5)     | <50ms            | TBD     |
| **End-to-End Latency**        | **<150ms (p95)** | **TBD** |

## 🛡️ SEBI 2024-2025 Compliance

- ✅ Unique Algo ID on every order
- ✅ Pre-trade risk checks (mandatory validation)
- ✅ Audit trail (5-year retention in MongoDB)
- ✅ Broker anomaly detection integration
- ✅ Circuit breakers (auto-halt on violations)

## 🔗 Related Services

- **market-feeder**: Real-time data collection to QuestDB
- **training-pipeline**: Offline model training (Kedro)
- **@repo/schema**: Shared Zod schemas
- **@repo/database**: Database clients (QuestDB, MongoDB, Redis)
- **@repo/market-sdk**: Upstox API wrapper

## 📚 Documentation

- 7-Layer Architecture Details
- Layer-by-Layer Breakdown
- Deployment Guide
- SEBI Compliance

## 🤝 Development Workflow

1. **market-feeder** collects data → QuestDB
2. **training-pipeline** trains models → Exports ONNX
3. **algo-worker** loads ONNX → Generates signals → Executes trades
4. Monitor via Grafana dashboards

# Training Pipeline - Offline ML Model Training

> **Kedro-based ML training pipeline for NSE options volatility prediction using walk-forward validation and ensemble stacking.**

## 🎯 System Overview

Training Pipeline is a **scheduled offline process** that:

1. Fetches historical market data from **QuestDB**
2. Engineers features and labels
3. Trains ensemble ML models using walk-forward validation
4. Exports models to **ONNX format**
5. Copies ONNX files to `algo-worker/models/` for live trading

### **Design Principles**

1. **Kedro Framework**: Reproducible, modular ML pipelines
2. **Walk-Forward Validation**: No lookahead bias (expanding window)
3. **MLflow Tracking**: Experiment versioning and model registry
4. **ONNX Export**: Hardware-agnostic inference (GPU/CPU)

---

## 🏗️ Pipeline Architecture

### **Data Flow**

```
QuestDB (Historical Ticks/Candles)
      │
      ▼
[1. Data Ingestion Pipeline]
      │
      ├──> Raw tick data (2 years)
      │
      ▼
[2. Feature Engineering Pipeline]
      │
      ├──> Technical indicators (RSI, MACD, etc.)
      ├──> Volatility metrics (Realized Vol, India VIX)
      ├──> Options features (ATM IV, skew, Greeks)
      ├──> Sentiment (FinBERT scores from news)
      │
      ▼
[3. Labeling Pipeline]
      │
      ├──> Target: Next 4H Realized Volatility
      ├──> Binary: 1 = VOL_UP, 0 = VOL_DOWN
      │
      ▼
[4. Train Feature Extractor Pipeline]
      │
      ├──> TimesNet (Temporal 2D-Variation modeling)
      │
      ▼
[5. Train Ensemble Pipeline] (Walk-Forward)
      │
      ├──> XGBoost Classifier
      ├──> CNN-LSTM Hybrid
      ├──> GINN (GARCH + LSTM)
      ├──> SVM RBF Kernel
      ├──> Transformer Encoder
      │
      ├──> Out-of-fold predictions for each model
      │
      ▼
[6. Train Meta-Learner Pipeline]
      │
      ├──> Logistic Regression Stacker
      ├──> Inputs: L0 model probabilities
      ├──> Output: Final signal probability
      │
      ▼
[7. Export ONNX Pipeline]
      │
      ├──> xgboost.onnx
      ├──> cnn_lstm.onnx
      ├──> ginn.onnx
      ├──> svm.onnx
      ├──> transformer.onnx
      ├──> meta_learner.onnx
      │
      ▼
[8. Backtesting Pipeline]
      │
      ├──> Simulate trades with transaction costs
      ├──> Calculate Sharpe, Sortino, Max Drawdown
      │
      ▼
MLflow Registry (Model versioning + metrics)
      │
      ▼
Copy to algo-worker/models/ → Production deployment
```

---

## 📋 Kedro Pipelines

### **1. Data Ingestion** (`data_ingestion`)

**Purpose**: Fetch historical market data from QuestDB

**Nodes**:

- `fetch_tick_data`: Query QuestDB for Nifty/Bank Nifty ticks (2 years)
- `aggregate_candles`: Compute OHLCV candles (1m, 5m, 15m, 1h)

**Output**: `data/01_raw/tick_data.parquet`

**Run**:

```bash
kedro run --pipeline data_ingestion
```

---

### **2. Feature Engineering** (`feature_engineering`)

**Purpose**: Compute 50+ features for ML training

**Features Computed**:

- **Technical Indicators**:
  - RSI(14), MACD(12,26,9), Bollinger Bands(20,2)
  - SMA(20, 50), EMA(20), ATR(14), OBV, ADX(14)
- **Volatility Metrics**:
  - Realized Volatility (5d, 10d, 20d windows)
  - India VIX (fetched from NSE)
  - Parkinson volatility estimator
- **Options Features**:
  - ATM Implied Volatility
  - Volatility Skew (25-delta call - put)
  - Term Structure (near-month vs. next-month IV)
  - Put-Call Ratio (volume & open interest)
  - Max Pain strike price
- **Sentiment Features** (future):
  - FinBERT score (Positive/Negative/Neutral from news)

**Output**: `data/04_feature/features.parquet`

**Run**:

```bash
kedro run --pipeline feature_engineering
```

---

### **3. Train Feature Extractor** (`train_feature_extractor`)

**Purpose**: Train TimesNet for feature compression (optional)

**Model**: TimesNet (2D-Variation Temporal Modeling)

**Output**: `data/06_models/timesnet.pkl`

**Run**:

```bash
kedro run --pipeline train_feature_extractor
```

---

### **4. Train Ensemble** (`train_ensemble`)

**Purpose**: Train Level-0 base models using walk-forward validation

**Walk-Forward Settings**:

- Train Window: 6 months expanding
- Test Window: 1 month rolling
- Total Folds: 12 (for 2-year dataset)

**Models Trained**:

1. **XGBoost Classifier**
   - Max Depth: 8
   - Learning Rate: 0.01
   - N Estimators: 500
   - Early Stopping: 50 rounds
2. **CNN-LSTM Hybrid**
   - Conv Filters: [64, 128]
   - LSTM Units: 50
   - Sequence Length: 60 timesteps
3. **GINN (GARCH-Informed Neural Network)**
   - GARCH(1,1) for volatility modeling
   - LSTM for residuals
4. **SVM (RBF Kernel)**
   - Grid Search: C=[0.1, 1, 10], gamma=[scale, auto]
   - Class Weight: Balanced
5. **Transformer Encoder**
   - Layers: 4
   - Attention Heads: 8
   - d_model: 256

**Output**: 5 trained models in `data/06_models/`

**Run**:

```bash
kedro run --pipeline train_ensemble
```

---

### **5. Train Meta-Learner** (`train_meta_learner`)

**Purpose**: Train Level-1 stacking model to blend L0 predictions

**Model**: Logistic Regression

**Input**: Out-of-fold probabilities from L0 models (5 features)

**Training Strategy**:

- Use out-of-fold predictions to avoid data leakage
- 5-fold TimeSeriesSplit for cross-validation

**Output**: `data/06_models/meta_learner.pkl`

**Run**:

```bash
kedro run --pipeline train_meta_learner
```

---

### **6. Export ONNX** (`export_onnx`)

**Purpose**: Convert all models to ONNX format for production

**Exports**:

- `xgboost.onnx` (FP16 quantization)
- `cnn_lstm.onnx` (FP16 quantization)
- `ginn.onnx` (FP16 quantization)
- `svm.onnx` (FP32 - SVM doesn't quantize well)
- `transformer.onnx` (FP16 quantization)
- `meta_learner.onnx` (FP32)

**Validation**: Test ONNX inference against original models

**Output**: `onnx/*.onnx`

**Run**:

```bash
kedro run --pipeline export_onnx
```

---

### **7. Backtesting** (`backtesting`)

**Purpose**: Simulate trading with transaction costs

**Metrics Calculated**:

- Sharpe Ratio (target: >1.5)
- Sortino Ratio (target: >2.0)
- Maximum Drawdown (target: <20%)
- Win Rate
- Profit Factor

**Transaction Costs**:

- Brokerage: ₹20 per order
- STT: 0.0625% on sell side
- Slippage: 0.05% of order value

**Output**: `data/08_reporting/backtest_results.csv`

**Run**:

```bash
kedro run --pipeline backtesting
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Poetry (dependency management)
- QuestDB running with historical data
- MongoDB (for storing training labels)

### Installation

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

---

## 📊 Model Performance Targets

| Model            | Train AUC | Test AUC  | Inference Time |
| ---------------- | --------- | --------- | -------------- |
| XGBoost          | >0.75     | >0.70     | <10ms          |
| CNN-LSTM         | >0.72     | >0.68     | <30ms          |
| GINN             | >0.73     | >0.69     | <25ms          |
| SVM              | >0.71     | >0.67     | <15ms          |
| Transformer      | >0.74     | >0.70     | <40ms          |
| **Meta-Learner** | **>0.78** | **>0.73** | **<5ms**       |

**Ensemble Target**: Test AUC >0.75, Sharpe Ratio >1.5

---

## 📁 Directory Structure

```
apps/training-pipeline/
├── conf/
│   ├── base/
│   │   ├── catalog.yml                # Data sources configuration
│   │   ├── parameters.yml             # Hyperparameters for all models
│   │   └── parameters/
│   │       ├── data_processing.yml
│   │       ├── ensemble.yml
│   │       ├── rl_agent.yml
│   │       └── timesnet.yml
│   └── local/
│       ├── catalog_local.yml          # Local data paths
│       └── credentials.yml            # DB credentials (gitignored)
│
├── src/
│   └── training_pipeline/
│       ├── pipelines/
│       │   ├── data_ingestion/
│       │   │   ├── __init__.py
│       │   │   ├── nodes.py           # Data fetching logic
│       │   │   └── pipeline.py
│       │   ├── feature_engineering/
│       │   │   ├── nodes.py           # Feature computation
│       │   │   └── indicators/
│       │   │       ├── technical.py
│       │   │       ├── options.py
│       │   │       └── sentiment.py
│       │   ├── train_ensemble/
│       │   │   ├── nodes.py
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
│       │   │   ├── nodes.py           # ONNX conversion
│       │   │   └── pipeline.py
│       │   └── backtesting/
│       │       ├── nodes.py
│       │       └── metrics.py
│       └── utils/
│           ├── validation.py           # Walk-forward validation
│           ├── metrics.py              # Performance metrics
│           └── backtesting.py          # Backtesting engine
│
├── data/
│   ├── 01_raw/                         # Raw tick data from QuestDB
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
│   ├── PIPELINES.md                    # Detailed pipeline documentation
│   ├── MODELS.md                       # Model architecture details
│   └── DEPLOYMENT.md                   # Production deployment guide
│
├── .github/
│   └── copilot-instructions.md
├── pyproject.toml
├── kedro_cli.py
├── requirements.txt
└── README.md
```

---

## 🔄 Scheduled Runs

**Recommended Schedule**:

- **Daily**: Feature engineering + incremental training (fast models only)
- **Weekly**: Full ensemble retraining with walk-forward validation
- **Monthly**: Hyperparameter tuning + architecture search

**Cron Example** (daily at 2 AM IST):

```bash
0 2 * * * cd /path/to/training-pipeline && poetry run kedro run --pipeline feature_engineering,train_ensemble,export_onnx
```

---

## 📈 MLflow Tracking

Start MLflow UI to view experiment results:

```bash
mlflow ui
```

Navigate to `http://localhost:5000` to see:

- Model metrics (AUC, precision, recall, F1)
- Hyperparameters logged
- Model artifacts (ONNX files)
- Comparison across runs

---

## 🔗 Integration with algo-worker

After training completes:

```bash
# 1. Copy ONNX models to algo-worker
cp onnx/*.onnx ../algo-worker/models/

# 2. Restart algo-worker to load new models
cd ../algo-worker
pm2 restart algo-worker

# 3. Verify models loaded
curl http://localhost:3001/health
```

---

## 🤝 Development Workflow

1. **Add new feature** → Update nodes.py
2. **Add new model** → Create trainer in `train_ensemble/models/`
3. **Register in pipeline** → Update `train_ensemble/pipeline.py`
4. **Run pipeline** → `kedro run --pipeline train_ensemble`
5. **Track in MLflow** → View results at `localhost:5000`
6. **Export ONNX** → `kedro run --pipeline export_onnx`
7. **Deploy** → Copy to algo-worker

---

## 📚 Documentation

- Pipeline Details
- Model Architectures
- Walk-Forward Validation
- ONNX Export Guide

---

## **SUMMARY: COMPLETE ARCHITECTURAL REDESIGN**

I've designed a **production-grade 7-layer architecture** specifically for NSE Nifty options trading based on 2024-2025 research. Here's what makes it optimal:

### **Key Innovations:**

1. **Clear Separation of Concerns**:
   - **market-feeder**: Data collection (not yet implemented, but specified)
   - **training-pipeline**: Offline model training (Kedro-based)
   - **algo-worker**: Live trading (7-layer event-driven)

2. **Event-Driven Core**:
   - Redis Streams for sub-millisecond communication
   - No blocking operations on hot path
   - Circuit breakers for fault tolerance

3. **Research-Backed Stack**:
   - QuestDB (22x faster than ClickHouse for OHLCV)
   - ONNX Runtime (hardware-agnostic inference)
   - Walk-forward validation (no lookahead bias)

4. **SEBI 2024-2025 Compliant**:
   - Unique Algo IDs on every order
   - Mandatory pre-trade risk checks
   - 5-year audit trail retention

### **Next Steps**:

Would you like me to:

1. **Generate complete code** for one layer (e.g., Perception or Prediction)?
2. **Create detailed README files** for each layer's folder?
3. **Write the market-feeder architecture** (the missing piece)?
4. **Generate copilot-instructions.md** for algo-worker and training-pipeline?

Please confirm which deliverables you'd like me to create as actual files/code!---

## **SUMMARY: COMPLETE ARCHITECTURAL REDESIGN**

I've designed a **production-grade 7-layer architecture** specifically for NSE Nifty options trading based on 2024-2025 research. Here's what makes it optimal:

### **Key Innovations:**

1. **Clear Separation of Concerns**:
   - **market-feeder**: Data collection (not yet implemented, but specified)
   - **training-pipeline**: Offline model training (Kedro-based)
   - **algo-worker**: Live trading (7-layer event-driven)

2. **Event-Driven Core**:
   - Redis Streams for sub-millisecond communication
   - No blocking operations on hot path
   - Circuit breakers for fault tolerance

3. **Research-Backed Stack**:
   - QuestDB (22x faster than ClickHouse for OHLCV)
   - ONNX Runtime (hardware-agnostic inference)
   - Walk-forward validation (no lookahead bias)

4. **SEBI 2024-2025 Compliant**:
   - Unique Algo IDs on every order
   - Mandatory pre-trade risk checks
   - 5-year audit trail retention

### **Next Steps**:

Would you like me to:

1. **Generate complete code** for one layer (e.g., Perception or Prediction)?
2. **Create detailed README files** for each layer's folder?
3. **Write the market-feeder architecture** (the missing piece)?
4. **Generate copilot-instructions.md** for algo-worker and training-pipeline?
