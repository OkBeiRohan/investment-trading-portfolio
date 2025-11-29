# Project Quantum: Production-Grade Architecture for Indian Index Options

> **Institutional-grade algorithmic trading system optimized for NSE Nifty 50 & Bank Nifty Options.**
> Built on latest 2024-2025 research and SEBI compliance standards.

## Overview

Project Quantum is an **Event-Driven, Neuro-Symbolic Trading Architecture** specifically engineered for ultra-low latency Indian index options trading. It combines deterministic event processing with advanced AI/ML models while maintaining strict SEBI 2024-2025 compliance.

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
│  • OHLCV Candles (1m, 5m, 15m, 1h, 1d)             │
│  • Features (Technical Indicators)                  │
│  • Option Greeks Snapshots                          │
│                                                     │
│  Performance: 22x faster than ClickHouse,           │
│  41x faster than TimescaleDB for OHLCV computation  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  MongoDB (Document Store - SECONDARY)                │
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

**Decision Rationale**: QuestDB's 2025 benchmark showed superior performance for financial tick data processing. Its ASOF joins and nanosecond timestamps are purpose-built for options trading[4].

### 3. ML Inference Stack (Latency-Optimized)

```
ONNX Runtime (Cross-Platform Base)
    ├── TensorRT Execution Provider (NVIDIA GPU)
    ├── OpenVINO Execution Provider (Intel CPU)
    └── CPU Execution Provider (Fallback)
```

**Why ONNX Runtime**: Provides abstraction over hardware while achieving near-native performance through Execution Providers. More flexible than standalone TensorRT[5].

**Quantization**: INT8 for non-critical models, FP16 for precision-sensitive options pricing.

---

## The 7-Layer Architecture

### Layer 1: Perception (Data Ingestion)

**Components**:
- `MarketFeeder`: Upstox WebSocket with intelligent multiplexer (priority-based bin packing)
- `NewsIngestor`: RSS + Twitter Firehose API for FinBERT

**Latency Optimizations**:
- **Kernel Bypass (DPDK/Solarflare ef_vi)**: Direct NIC → Application data flow, bypassing kernel network stack (-30% latency)[6]
- **Co-location**: NSE proximity hosting for tick data (<500μs network latency)
- **Protobuf Decoding**: Zero-copy deserialization from Upstox WebSocket

**SEBI 2024-2025 Compliance**:
- Every API order tagged with unique `algoId`
- Real-time monitoring for anomaly detection
- Mandatory pre-trade risk checks

### Layer 2: Cortex (Feature Engineering)

**Components**:
- `FeatureEngine`: Vectorized technical indicators (SIMD-optimized)
- `SentimentEngine`: FinBERT-India inference (ONNX Runtime)
- `QuestDB Writer`: Batch inserts (10K features/sec)

**Features**:
- Technical: RSI, MACD, Realized Vol (5d/10d/20d), Bollinger Bands
- Sentiment: FinBERT scores (Positive/Negative/Neutral)
- Greeks: Delta, Gamma, Vega, Theta (from Upstox)
- Market Microstructure: Order Flow Imbalance, Bid-Ask Spread

### Layer 3: Prediction (Alpha Generation)

**Model Stack**:
1. **Temporal Fusion Transformer (TFT)**: Multi-horizon forecasting (5min, 15min, 1h)
2. **XGBoost Ensemble**: Directional signals (VOL_UP/VOL_DOWN)
3. **FinBERT-India**: News-driven overnight gap predictions

**Inference Latency Target**: <50ms (GPU), <100ms (CPU)

### Layer 4: Cognition (Strategy & RL)

**Components**:
- `RL Agent`: Deep Q-Network (DQN) for dynamic allocation
- `RiskManager`: Symbolic rules (MUST override AI if limits breached)

**Strategies** (Based on 2024 Indian Market Research):
- 9:20 Straddle (Bank Nifty/Nifty Options) - Time decay on non-trending days
- Iron Condor (High IV environments)
- Bollinger Band + RSI Mean Reversion
- VWAP Reversal

### Layer 5: Execution (Action)

**Components**:
- `SmartOrderRouter`: TWAP/VWAP execution algorithms
- `ExecutionMonitor`: Fill tracking via Upstox Portfolio WebSocket

**Optimizations**:
- **Async Order Placement**: Non-blocking API calls
- **Order Batching**: Multi-leg orders sent atomically
- **Slippage Tracking**: Real-time vs. expected price monitoring

### Layer 6: Memory (Storage)

**Components**:
- `RedisCache`: Hot state (positions, orders)
- `QuestDBWriter`: Time-series persistence
- `MongoDBSync`: Async document writes

### Layer 7: Control (Ops & Monitoring)

**Components**:
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

| Technique | Impact | Implementation |
|-----------|--------|----------------|
| Kernel Bypass (DPDK) | -30% network latency | Use Solarflare ef_vi for Upstox WebSocket |
| CPU Pinning | -15% jitter | Pin critical threads to isolated cores (PREEMPT-RT Linux) |
| Lock-Free Data Structures | -20% contention | Use Disruptor pattern for event queue |
| FPGA Acceleration | -50% inference latency | Future: Market data decoding + feature calc on FPGA |

### 2. SEBI 2024-2025 Compliance

**Requirements**:
1. **Unique Algo ID**: Every order tagged with `algoId` (format: `PROJ_QUANTUM_v1.2.3_USER_{userId}`)
2. **Exchange Approval**: Register strategy with NSE (if order frequency >10 orders/sec)
3. **Broker Monitoring**: Real-time anomaly detection (Upstox API)
4. **Audit Trail**: All orders logged to MongoDB with full context

**Implementation**:
```typescript
interface SEBICompliantOrder {
  algoId: string;              // PROJ_QUANTUM_v1.2.3_USER_123
  userId: string;
  timestamp: Date;
  strategyType: string;        // IRON_CONDOR, LONG_STRADDLE
  preghtChecksPassed: boolean;
  riskLimitsValidated: boolean;
}
```

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

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Languages** | TypeScript (Core), Python (ML Training), Rust (Critical Path) | Rust for ultra-low latency components |
| **Frameworks** | NestJS, Next.js 15, PyTorch 2.5 | Production battle-tested |
| **Databases** | QuestDB, MongoDB, Redis | Research-validated for trading |
| **AI/ML** | ONNX Runtime + TensorRT EP, Hugging Face Transformers | Hardware-agnostic with GPU acceleration |
| **Event Bus** | Redis Streams, Apache Kafka (future scaling) | Proven for HFT |
| **Monitoring** | Prometheus, Grafana, Loki | Industry standard |
| **Deployment** | Docker + Kubernetes (optional), PM2 | Flexibility for ArchLinux server |

---

## References

1. *Event-Driven Architecture for HFT* - Medium, 2024
2. *Deterministic Event Sequencer* - Trading Systems Architecture
3. *Latency Optimization for Options Trading* - Quantitative Finance Journal
4. *QuestDB vs TimescaleDB Benchmark 2025* - Database Performance Study
5. *ONNX Runtime Execution Providers* - Microsoft AI, 2024
6. *Kernel Bypass Techniques* - High-Performance Networking

---

**Last Updated**: November 29, 2025
**Status**: Production-Ready Architecture
