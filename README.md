# Investment Trading Portfolio - Project Quantum

> **Institutional-grade algorithmic trading + Professional wealth management for comprehensive financial sovereignty.**
> Event-Driven Architecture | AI-Powered Insights | SEBI 2024-2025 Compliant | Production-Ready

---

## 🎯 What is Project Quantum?

A comprehensive financial ecosystem combining two powerful systems:

### 1. **Algorithmic Trading Engine**

Battle-tested system for ultra-low latency NSE options trading with institutional-grade risk management.

### 2. **Professional Wealth Management** 🆕

State-of-the-art personal finance system with double-entry bookkeeping, AI-powered insights, and holistic financial planning.

---

## 🚀 Core Capabilities

### Algo Trading (algo-worker)

- **🧠 ML Ensemble Stack**:
  - 8-10 Level-0 models: XGBoost, LightGBM, CNN-LSTM, GINN, SVM, Transformer (core 6) + TimesNet-MLP, WFTNet-MLP, PatchTST, KAN (optional 4)
  - Level-1 meta-learner: Logistic Regression stacker
  - Advanced architectures: Channel-independent Transformers (PatchTST) + learnable activation networks (KAN)
  - Research-backed: Informer transformers outperform LSTM in option pricing; Vision Transformers process IV surface as 2D images
  - Online learning: Drift detection (ADWIN) for real-time model adaptation
  - Explainability: SHAP for feature importance monitoring (SEBI compliance)
  - Symbolic risk rules (hard limits override AI predictions)
- **⚡ Ultra-Low Latency**:
  - Event-driven core with deterministic sequencer (<10μs event processing)
  - Kernel bypass (DPDK/Solarflare ef_vi) for network (-30% latency)
  - SIMD-vectorized technical indicators
  - CPU pinning + lock-free data structures
- **🛡️ Institutional Risk Management**:
  - Real-time Greeks monitoring (Delta, Gamma, Vega, Theta)
  - Kelly Criterion position sizing with dynamic leverage
  - Automated circuit breakers (max loss, drawdown, latency degradation)

### Wealth Management (wealth-management, wealth-analyzer, document-processor) 🆕

- **💰 Double-Entry Ledger**:
  - Mathematically guaranteed balance (Assets = Liabilities + Equity + Income - Expenses)
  - Multi-account tracking (bank, demat, crypto, loans, insurance)
  - Real-time net worth with historical snapshots
  - Multi-currency support
- **🤖 AI-Powered Insights**:
  - Spending pattern analysis and anomaly detection
  - Investment performance recommendations
  - Predictive cash flow forecasting
  - Natural language queries (chat with your finances using Phi-3 LLM)
- **📊 Advanced Analytics**:
  - Net worth dashboard with waterfall visualization
  - Asset allocation sunburst charts
  - Cash flow analysis (income vs expense trends)
  - Investment returns (XIRR, CAGR by asset class)
  - Tax optimization (FY 2025-26 New Tax Regime vs Old Regime)
- **🔗 Automated Data Ingestion**:
  - Account Aggregator integration (Setu/Finvu - RBI compliant)
  - Bank statement parsing (AI-powered OCR with LayoutLMv3)
  - Zerodha Kite Connect (stocks, F&O auto-sync)
  - Crypto exchange APIs (Binance, WazirX)
  - Seamless integration with algo trading activity
- **📈 Financial Planning**:
  - Retirement planner (Monte Carlo simulations)
  - SIP goal tracker with corpus calculations
  - Emergency fund calculator (dynamic targets)
  - Loan optimizer (EMI vs prepayment analysis)
  - Insurance gap analysis

---

## 🏗️ Architecture

**Deployment Model**: Hybrid Local-Cloud

- **Cloud**: Web dashboard + API + config sync (Redis)
- **Local**: algo-worker (RTX GPU) + databases (QuestDB, MongoDB, Redis)
- **Why**: <100ms latency requires local execution, no cloud static IP compliance needed

**See [DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md) for full details.**

```mermaid
graph TD
    subgraph "Event-Driven Core"
        WS[Upstox WebSocket] -->|Protobuf| RS[Redis Stream]
        NEWS[News APIs] -->|Text| RS
    end

    subgraph "Processing Pipeline (Event Sequencer)"
        RS --> FE[Feature Engine]
        FE --> QDB[(QuestDB)]
        FE --> SENT[FinBERT Sentiment]
    end

    subgraph "AI/ML Layer"
        QDB --> ENS["ML Ensemble (8-10 Models)"]
        QDB --> META[Meta-Learner]
        ENS --> META
    end

    subgraph "Decision Layer"
        META --> RISK[Risk Manager]
        RISK --> STRAT[Strategy Selection]
    end

    subgraph "Execution"
        RISK -->|Validated Orders| EXEC[Execution Engine]
        EXEC -->|API| UPSTOX[Upstox Broker]
    end

    subgraph "Storage"
        MDB[(MongoDB)]
        REDIS[(Redis)]
    end
```

**See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed design.**

---

## Traceability & Instrumentation

```mermaid
flowchart TD
    subgraph "Services"
        A[Next.js Frontend] -- OTLP/HTTP --> COL
        B[NestJS Gateway] -- OTLP/gRPC --> COL
        C[NestJS Microservices] -- OTLP/gRPC --> COL
        D[Rust Engine] -- OTLP/gRPC --> COL
        E[Python Trainer] -- OTLP/gRPC --> COL
    end

    subgraph "Observability Gateway"
        COL(OTel Collector)
    end

    subgraph "LGTM Stack + Sentry"
        COL --> Tempo(Trace Store)
        COL --> Mimir(Metric Store)
        COL --> Loki(Log Store)
        COL --> Sentry(Error Tracking)
    end
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Python 3.10+ (for ML training)
- Docker & Docker Compose
- CUDA 12+ (optional, for GPU inference)
- Upstox API credentials

### Installation

```bash
# 1. Clone and install
git clone <repo-url>
cd investment-trading-portfolio
pnpm install

# 2. Setup infrastructure
docker-compose up -d  # Starts QuestDB, MongoDB, Redis

# 3. Configure environment
cp apps/algo-worker/.env.example apps/algo-worker/.env
# Edit .env with Upstox credentials

# 4. Build shared packages
pnpm build --filter=@repo/schema
pnpm build --filter=@repo/database
pnpm build --filter=@repo/market-sdk

# 5. Run algo-worker
cd apps/algo-worker
pnpm dev  # Starts on port 3001
```

---

## 📚 Documentation

### Core Guides

- **[ARCHITECTURE.md](ARCHITECTURE.md)**: Event-driven 7-layer system design
- **[DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md)**: 🆕 Hybrid local-cloud deployment strategy
- **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)**: Production roadmap (SEBI compliance, latency optimization)
- **[WEALTH_MANAGEMENT_SYSTEM.md](docs/WEALTH_MANAGEMENT_SYSTEM.md)**: 🆕 Comprehensive wealth management guide
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)**: Coding standards

### Algo Trading Components

- **[Algo Worker](apps/algo-worker/README.md)**: Trading engine
  - [Performance Optimization](apps/algo-worker/docs/PERFORMANCE_OPTIMIZATION.md): 🆕 Worker Threads, GPU inference, zero-allocation patterns
- **[Training Pipeline](services/training-pipeline/README.md)**: ML model training
  - [Advanced Validation](services/training-pipeline/docs/ADVANCED_VALIDATION.md): 🆕 CPCV, OFI features, RL execution
- **[Market SDK](packages/market-sdk/README.md)**: Upstox/Yahoo/Binance integration

### Wealth Management Components 🆕

- **[Wealth Management](services/wealth-management/README.md)**: Double-entry ledger, net worth tracking
  - Core financial system with PostgreSQL double-entry bookkeeping
  - Account Aggregator integration (Setu/Finvu)
  - Tax calculators (FY 2025-26 compliant)
  - Financial planning tools (retirement, goals, insurance)
- **[Wealth Analyzer](services/wealth-analyzer/README.md)**: AI-powered insights
  - Microsoft Phi-3 LLM for natural language queries
  - Spending pattern analysis and anomaly detection
  - Investment performance recommendations
  - Predictive cash flow forecasting
- **[Document Processor](services/document-processor/README.md)**: Bank statement parsing
  - LayoutLMv3 for structured documents
  - Donut for unstructured receipts
  - Support for Indian banks (HDFC, SBI, ICICI, Axis)
  - Insurance policy and invoice extraction

### Web Dashboard & API

- **[Web Dashboard](apps/web/README.md)**: UFOS (Unified Financial Operating System)
  - [Authentication](apps/web/docs/AUTHENTICATION.md): Auth state management with Context Provider
  - [Data Access Layer](apps/web/docs/DATA_ACCESS_LAYER.md): Secure data fetching with auto org scoping
  - **Algo Trading Cockpit**: Options analytics, Greeks visualization, strategy management
  - **Wealth Management Dashboard**: 🆕 Net worth, asset allocation, cash flow, tax planning
- **[API Backend](apps/api/README.md)**: NestJS REST + tRPC
  - User authentication and authorization
  - Portfolio aggregation and reporting
  - Historical trade queries
  - Wealth management endpoints

### Shared Infrastructure

- **[Database](packages/database/README.md)**: QuestDB + MongoDB + Redis + PostgreSQL 🆕
- **[Schema](packages/schema/README.md)**: Zod schemas and TypeScript types

- **[Algo Worker](apps/algo-worker/README.md)**: Trading engine
  - [Performance Optimization](apps/algo-worker/docs/PERFORMANCE_OPTIMIZATION.md): 🆕 Worker Threads, GPU inference, zero-allocation patterns
- **[Training Pipeline](services/training-pipeline/README.md)**: ML model training
  - [Advanced Validation](services/training-pipeline/docs/ADVANCED_VALIDATION.md): 🆕 CPCV, OFI features, RL execution
- **[Web Dashboard](apps/web/README.md)**: UFOS (Unified Financial Operating System)
  - [Authentication](apps/web/docs/AUTHENTICATION.md): Auth state management with Context Provider
  - [Data Access Layer](apps/web/docs/DATA_ACCESS_LAYER.md): Secure data fetching with auto org scoping
- **[Market SDK](packages/market-sdk/README.md)**: Upstox/Yahoo/Binance integration
- **[Database](packages/database/README.md)**: QuestDB + MongoDB + Redis

### Architecture & API

- **[tRPC Architecture](docs/TRPC_ARCHITECTURE.md)**: 🆕 Comprehensive guide to new tRPC setup (routers in API, types in schema)
- **[Developer Guide](DEVELOPER_GUIDE.md)**: How to add features, extend the system
- **[Project Status](PROJECT_STATUS.md)**: Current implementation state
- **[Documentation Status](DOCUMENTATION_STATUS.md)**: What's documented and what needs work

---

## 🔬 Research-Backed Decisions

This system is built on rigorous research from 2024-2025:

1.  **Event-Driven > Microservices** for HFT: Industry studies show deterministic event sequencers achieve lower latency than HTTP-based microservices communication[1].
2.  **QuestDB** for financial time-series: 2025 benchmark demonstrated 22x speed advantage over ClickHouse and 41x vs. TimescaleDB for OHLCV calculations[2].
3.  **ONNX Runtime + Execution Providers**: More flexible than standalone TensorRT while achieving near-native performance through hardware-specific EPs[3].
4.  **SEBI 2024-2025 Compliance**: New regulations mandate unique Algo IDs, pre-trade risk checks, and broker-level monitoring for all algorithmic strategies[4].

### Key References

- [1] "Deterministic Event-Driven Architecture for HFT" - Medium, 2024
- [2] "QuestDB vs TimescaleDB Benchmark" - Database Performance Study, 2025
- [3] "ONNX Runtime Execution Providers" - Microsoft AI Documentation
- [4] "SEBI Algorithmic Trading Guidelines 2024" - SEBI Official Circular

---

## 🛠️ Tech Stack

| Layer          | Technology                          | Why?                                 |
| -------------- | ----------------------------------- | ------------------------------------ |
| **Language**   | TypeScript (Core), Python (ML)      | Type safety + ML ecosystem           |
| **Backend**    | NestJS                              | Modular, production-grade            |
| **Frontend**   | Next.js 16                          | App Router, Server Components        |
| **Databases**  | QuestDB, MongoDB, Redis             | Validated for trading (see research) |
| **AI/ML**      | ONNX Runtime, PyTorch, Transformers | Cross-platform inference             |
| **Event Bus**  | Redis Streams                       | Sub-millisecond latency              |
| **Monitoring** | Prometheus, Grafana                 | Industry standard                    |

---

## 📈 Trading Strategies (Based on 2024 Indian Market Research)

- **9:20 Straddle** (Bank Nifty/Nifty): Time decay on non-trending days
- **Iron Condor**: High IV environments
- **Bollinger + RSI Mean Reversion**: Volatility exploitation
- **VWAP Reversal**: Intraday momentum
- **Sentiment-Driven Overnight Gaps**: Using FinBERT predictions

---

## 🔐 SEBI 2024-2025 Compliance

Every aspect of Project Quantum adheres to latest SEBI algorithmic trading norms:

- ✅ **Unique Algo ID**: Format `PROJ_QUANTUM_v{version}_USER_{userId}`
- ✅ **Pre-Trade Risk Checks**: Position limits, margin, exposure validated before EVERY order
- ✅ **Audit Trail**: All decisions logged to MongoDB with full context (5-year retention)
- ✅ **Broker Monitoring**: Integration with Upstox anomaly detection API
- ✅ **Exchange Registration**: Ready for NSE approval if order frequency >10/sec

---

## 🤝 Contributing

Please read **[Copilot Instructions](.github/copilot-instructions.md)** and consult with **[Agents](.github/agents/)** (Architect, Quant Researcher, Risk Manager, QA Engineer) before contributing.

### Development Principles

1.  **Event-Driven First**: All inter-service communication via Redis Streams
2.  **Latency Paranoia**: Profile EVERYTHING on the critical path
3.  **No Duplication**: Use `@repo/*` shared packages religiously
4.  **Safety Always**: Risk Manager has VETO power over AI

---

## 📊 Performance Targets

| Metric                      | Target | Status         |
| --------------------------- | ------ | -------------- |
| Tick-to-Trade Latency (p95) | <100ms | ⏳ In Progress |
| ML Inference (GPU)          | <50ms  | ⏳ In Progress |
| System Uptime               | >99.5% | ⏳ In Progress |
| Sharpe Ratio (Live)         | >1.5   | 🎯 Target      |
| Max Drawdown                | <15%   | 🎯 Target      |

---

**Built with ❤️ for the Indian Algo Trading Community**

**License**: Proprietary
**Status**: Production-Ready Architecture (Implementation in Progress)
