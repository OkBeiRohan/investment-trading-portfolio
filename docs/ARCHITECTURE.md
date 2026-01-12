# Project Quantum: Production-Grade Architecture for Indian Index Options

> **Institutional-grade algorithmic trading system optimized for NSE Nifty 50 & Bank Nifty Options.**
> Built on latest 2024-2026 research and SEBI compliance standards.

## Overview

Project Quantum is an **Event-Driven, Neuro-Symbolic Trading Architecture** specifically engineered for ultra-low latency Indian index options trading. It combines deterministic event processing with advanced AI/ML models while maintaining strict SEBI 2024-2026 compliance.

**📚 Comprehensive Architecture**: For the complete algo-trading architecture with detailed system design, see [ALGO_TRADING_ARCHITECTURE.md](./ALGO_TRADING_ARCHITECTURE.md). This document provides implementation-specific details for Project Quantum.

---

## Architecture Overview

**Key Design**: Event-driven microservices with adaptive ML and regime detection.

### The 9-Layer Architecture

1. **Data Ingestion Layer** → Upstox API feeds, real-time Greeks
2. **Feature & Technical Engine** → Moving averages, ATR, order flow imbalance
3. **Market Structure & Regime Detector** → HMMs/Kalman filters (trending/ranging/volatile)
4. **Signal/Prediction Engine** → Transformers, CNNs, LSTMs, KANs
5. **Strategy Manager** → Regime-based strategy selection (momentum/mean-reversion/event-detection)
6. **Risk & Portfolio Manager** → Kelly criterion, VIX-scaled stop-loss, Greeks limits
7. **Order Management & Execution** → Smart routing (NSE/BSE), IOC orders
8. **Logging/Monitoring** → Prometheus, Grafana, real-time dashboards
9. **Offline Training & Deployment** → Walk-forward validation, drift detection

See [ALGO_TRADING_ARCHITECTURE.md](./ALGO_TRADING_ARCHITECTURE.md) for detailed design patterns, ML model selection strategies, and performance benchmarks.

---

## Architecture Philosophy

### 1. Event-Driven Core (Not Microservices-First)

Based on industry research, we use an **Event-Driven Architecture with Microservices**, not microservices alone:

- **Deterministic Event Sequencer**: Single-threaded event processing eliminates context switching and lock contention for sub-millisecond latency[1][2]
- **Redis Streams**: Low-latency event bus (microsecond delivery) for market data distribution
- **Asynchronous Processing**: Prevents blocking on the critical path (Tick → Signal → Order)

**Why**: Microservices alone introduce inter-service latency. Event-driven architectures achieve the <100ms latency required for options trading[3].

### 2. Database Strategy (Research-Validated)

```
┌─────────────────────────────────────────────────────┐
│  QuestDB (Time-Series - PRIMARY)                    │
│  ─────────────────────────────                      │
│  • Tick Data (nanosecond timestamps)                │
│  • OHLCV Candles (1m, 5m, 15m, 1h, 1d)              │
│  • Features (Technical Indicators)                  │
│  • Option Greeks Snapshots                          │
│                                                     │
│  Performance: 22x faster than ClickHouse,           │
│  41x faster than TimescaleDB for OHLCV computation  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  MongoDB (Document Store - SECONDARY)               │
│  ──────────────────────────────────                 │
│  • Trading Signals (ML predictions)                 │
│  • Orders & Positions                               │
│  • User Profiles & Auth Data                        │
│  • Performance Metrics                              │
│  • RL Agent States                                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Redis (In-Memory State - HOT PATH)                 │
│  ────────────────────────────────                   │
│  • Active Positions (Real-time)                     │
│  • Order Book Snapshots                             │
│  • Pub/Sub Event Bus                                │
│  • Rate Limiting & Circuit Breakers                 │
└─────────────────────────────────────────────────────┘
```

```mermaid
graph LR
  subgraph Storage
    QDB[(QuestDB)]
    MDB[(MongoDB)]
    REDIS[(Redis)]
  end

  MarketData-->QDB
  FeatureEngine-->QDB
  QDB-->MLEnsemble[8-10 Model Ensemble]
  MLEnsemble-->SignalEngine
  SignalEngine-->MDB
  ExecutionEngine-->MDB
  ExecutionEngine-->REDIS
  Orch(Orchestrator)-->REDIS

  QDB---|Time-series|FeatureStore
  MDB---|Documents|RepoLayer
  REDIS---|Hot state & Pub/Sub|EventBus

  classDef db fill:#f3f4f6,stroke:#111827,stroke-width:1px;
  class QDB,MDB,REDIS db;
```

**Decision Rationale**: QuestDB's 2025 benchmark showed superior performance for financial tick data processing. Its ASOF joins and nanosecond timestamps are purpose-built for options trading[4].

### **Academic Benchmarks (2024-2025 Research)**

| System/Study                | Focus                   | Models                      | Data Frequency | Sharpe Ratio | Notes                          |
| --------------------------- | ----------------------- | --------------------------- | -------------- | ------------ | ------------------------------ |
| **Proposed (Ours)**         | NIFTY/BANKNIFTY options | Ensemble (8-10 models) + RL | Tick/real-time | Target: >1.5 | Ultra-low latency, CPCV, GPU   |
| **Sherasiya et al. (2025)** | NIFTY options           | XGBoost, LSTM (Greeks+IV)   | Daily EOD      | **1.78**     | ₹1.96L profit from ₹1L capital |
| **Mishra et al. (2025)**    | NIFTY futures           | Dueling DDQN (RL)           | 15-min bars    | **1.228**    | Volatility-adjusted returns    |
| **Informer (2025)**         | Option pricing          | Informer Transformer        | Intraday tick  | N/A          | Lowest MAE vs BS/Heston/LSTM   |
| **Zerodha Streak (2018)**   | Retail NSE algos        | Rule-based (no ML)          | Tick/daily     | N/A          | 40% of NSE orders via algos    |

**Validation**: Our ensemble approach aligns with academic findings showing XGBoost/LSTM achieve Sharpe >1.7 with Greeks+IV features. Our target of >1.5 Sharpe is conservative and achievable.

### 3. ML Inference Stack (Latency-Optimized)

**Ensemble Architecture**:

- **Level-0 Core (6 models)**: XGBoost, LightGBM, CNN-LSTM, GINN, SVM, Transformer
- **Level-0 Optional (4 models)**: TimesNet-MLP, WFTNet-MLP, PatchTST, KAN
- **Level-1 Meta-Learner**: Logistic Regression stacker
- **Target**: AUC >0.75 (Level-0), >0.77 (Level-1)

```
ONNX Runtime (Cross-Platform Base)
    ├── TensorRT Execution Provider (NVIDIA GPU)
    ├── OpenVINO Execution Provider (Intel CPU)
    └── CPU Execution Provider (Fallback)
```

**Why ONNX Runtime**: Provides abstraction over hardware while achieving near-native performance through Execution Providers. More flexible than standalone TensorRT[5].

**Quantization**: FP16 for all models (2x speedup with minimal accuracy loss).

---

## The 7-Layer Architecture

### Layer 1: Perception (Data Ingestion)

**Components**:

- `MarketFeeder`: Upstox WebSocket V3 in `option_greeks` mode (receives pre-calculated Delta/Gamma)
- `NewsImpactScorer`: RAG-based impact analyzer using local LLM (Phi-3 + ONNX)

**Latency Optimizations**:

- **Pre-calculated Greeks**: Subscribe to `option_greeks` to eliminate Spot-Option sync latency
- **Kernel Bypass (DPDK/Solarflare ef_vi)**: Direct NIC → Application data flow, bypassing kernel network stack (-30% latency)[6]
- **Co-location**: NSE proximity hosting for tick data (<500μs network latency)
- **Protobuf Decoding**: Zero-copy deserialization from Upstox WebSocket

**SEBI 2025-2026 Compliance**:

- Every API order tagged with unique `algoId`
- Real-time monitoring for anomaly detection
- Mandatory pre-trade risk checks
- **Deadline: January 1, 2026** for retail algo safeguards (broker approval workflows, limits, tagging)
- Audit trail: 5-year retention for all trades
- Explainability: SHAP analysis for model transparency

### Layer 2: Cortex (Feature Engineering)

**Components**:

- `RustComputeEngine`: NAPI-RS native module for heavy technical indicators (RSI, ATR, Bollinger)
- `FeatureEngine`: Drift-adaptive normalization using Online Welford’s Algorithm
- `QuestDB Writer`: Batch inserts (10K features/sec)

**Features**:

- Technical: RSI, MACD, Realized Vol (5d/10d/20d), Bollinger Bands
- Sentiment: LLM-scored News Impact (High/Low/Noise)
- Greeks: Delta, Gamma, Vega, Theta (streamed from Upstox)
- Market Microstructure: Order Flow Imbalance, Bid-Ask Spread

### Layer 3: Prediction (Alpha Generation)

**Model Stack**:

1. **Level-0 Ensemble (8-10 models)**:
   - Core (6): XGBoost, LightGBM, Mamba (SSM), GINN, SVM, PatchTST
   - Optional (4): TimesNet-MLP, WFTNet-MLP, KAN, VisionTransformer
2. **Level-1 Meta-Learner**: Logistic Regression stacker
3. **Target**: Ensemble AUC >0.77 (Level-1)

**Inference Latency Target**: <15ms (TensorRT), <50ms (CPU)

### Layer 4: Cognition (Strategy & Risk Management)

**Components**:

- `StrategySelector`: Choose appropriate option strategy based on market regime
- `RiskManager`: Symbolic rules with STT Trap protection and Dynamic VIX scaling
- `RL Agent` (Optional): Reinforcement Learning for optimal execution timing (PPO)

**Risk Rules**:

- **STT Trap Guard**: Force close ITM Buy options on Expiry @ 3:15 PM
- **Dynamic VIX Scaling**: Adjust Stop Loss = BaseSL \* (CurrentVIX / 15)

**Strategies** (Based on 2024 Indian Market Research):

- LONG_STRADDLE - High volatility expected
- IRON_CONDOR - Range-bound markets
- BULL_PUT_SPREAD - Bullish bias with defined risk
- BEAR_CALL_SPREAD - Bearish bias with defined risk

### Layer 5: Execution (Action)

**Components**:

- `AtomicExecutionService`: Upstox Multi-Order API for atomic spread execution
- `SniperExecutor`: IOC (Immediate or Cancel) logic for entries
- `ExecutionMonitor`: Fill tracking via Upstox Portfolio WebSocket

**Optimizations**:

- **Atomic Multi-Leg**: Send all 4 legs of Iron Condor in single API call (No legging-in risk)
- **Sniper Logic**: Use IOC orders to avoid chasing price
- **Slippage Tracking**: Real-time vs. expected price monitoring

### Layer 6: Memory (Storage)

**Components**:

- `RedisCache`: Hot state (positions, orders)
- `QuestDBWriter`: Time-series persistence
- `MongoDBSync`: Async document writes

### Layer 7: Control (Ops & Monitoring)

**Components**:

- `eBPFTracer`: Network vs App latency breakdown (micro-burst detection)
- `PrometheusExporter`: Metrics (latency, order fill rate, P&L)
- `MLflowTracker`: Model performance tracking
- `GrafanaDashboard`: Real-time UI

**Key Metrics**:

- Tick-to-Trade Latency (p50, p95, p99)
- Signal Confidence Distribution
- Strategy Win Rate
- Daily Sharpe Ratio

---

## Production-Grade Enhancements

### 1. Latency Optimization Techniques

| Technique                 | Impact                 | Implementation                                            |
| ------------------------- | ---------------------- | --------------------------------------------------------- |
| Kernel Bypass (DPDK)      | -30% network latency   | Use Solarflare ef_vi for Upstox WebSocket                 |
| CPU Pinning               | -15% jitter            | Pin critical threads to isolated cores (PREEMPT-RT Linux) |
| Lock-Free Data Structures | -20% contention        | Use Disruptor pattern for event queue                     |
| FPGA Acceleration         | -50% inference latency | Future: Market data decoding + feature calc on FPGA       |

### 2. SEBI 2024-2025 Compliance

**Regulatory Deadline**: **January 1, 2026** (SEBI guidelines for retail algorithmic trading safeguards)

**Requirements**:

1. **Unique Algo ID**: Every order tagged with `algoId` (format: `PROJ_QUANTUM_v1.2.3_USER_{userId}`)
2. **Exchange Approval**: Register strategy with NSE (if order frequency >10 orders/sec)
3. **Broker Monitoring**: Real-time anomaly detection (Upstox API)
4. **Audit Trail**: All orders logged to MongoDB with full context (5-year retention)
5. **Model Explainability**: SHAP values for ML predictions (transparency requirement)

**Implementation**:

```typescript
interface SEBICompliantOrder {
  algoId: string; // PROJ_QUANTUM_v1.2.3_USER_123
  userId: string;
  timestamp: Date;
  strategyType: string; // IRON_CONDOR, LONG_STRADDLE
  preTradeChecksPassed: boolean;
  riskLimitsValidated: boolean;
  modelExplanation?: {
    // NEW: SEBI 2026 requirement
    topFeatures: Array<{ feature: string; importance: number }>;
    shapValues: Record<string, number>;
  };
}
```

**SHAP Explainability** (Control Layer):

- Weekly SHAP value computation for all predictions
- Feature importance drift detection (alert if >30% change)
- Stored in MongoDB audit trail for regulatory inspection
- See [07-CONTROL.md](apps/algo-worker/docs/layers/07-CONTROL.md#explainability--sebi-compliance-monitoring) for implementation

### 3. Disaster Recovery & Circuit Breakers

**Automatic Shutdown Conditions**:

- Daily loss > ₹50,000
- Drawdown > 20%
- Latency > 500ms (system degraded)
- Data feed stale > 5 seconds

**Recovery**:

- Automatic position liquidation (Market Orders)
- Slack/Email alerts
- Manual override required to resume trading

---

## Tech Stack (2024-2025 Recommended)

| Layer          | Technology                                                 | Rationale                               |
| -------------- | ---------------------------------------------------------- | --------------------------------------- |
| **Languages**  | TypeScript (Core), Python (ML), Rust (NAPI-RS Calculation) | Rust for ultra-low latency components   |
| **Frameworks** | NestJS, Next.js 16, PyTorch 2.5                            | Production battle-tested                |
| **Databases**  | QuestDB, MongoDB, Redis                                    | Research-validated for trading          |
| **AI/ML**      | ONNX (TensorRT), Mamba (SSM), PatchTST                     | Hardware-agnostic with GPU acceleration |
| **Event Bus**  | Redis Streams, Apache Kafka (future scaling)               | Proven for HFT                          |
| **Monitoring** | Prometheus, Grafana, eBPF                                  | Industry standard                       |
| **Deployment** | Docker + Kubernetes (optional), PM2                        | Flexibility for ArchLinux server        |

---

## References

1. _Event-Driven Architecture for HFT_ - Medium, 2024
2. _Deterministic Event Sequencer_ - Trading Systems Architecture
3. _Latency Optimization for Options Trading_ - Quantitative Finance Journal
4. _QuestDB vs TimescaleDB Benchmark 2025_ - Database Performance Study
5. _ONNX Runtime Execution Providers_ - Microsoft AI, 2024
6. _Kernel Bypass Techniques_ - High-Performance Networking

---

**Last Updated**: November 29, 2025
**Status**: Production-Ready Architecture
