# Algo Worker — Event-Driven Trading Engine

> **Institutional-grade algorithmic trading engine for NSE index options. Implements a 5-Tier Data-Bound Hierarchical AI architecture with 117-feature Rust compute-engine and ONNX ensemble inference (<80ms E2E).**

**Last Updated**: March 17, 2026
**Framework**: NestJS + TypeScript
**Feature Engine**: Rust (NAPI-RS) + Rayon — 117 features in <5ms
**ML Inference**: ONNX Runtime (TensorRT/OpenVINO) — <50ms
**Event Bus**: Redis Streams — <1ms delivery
**Databases**: QuestDB (time-series) + MongoDB (documents) + Redis (hot cache)
**Broker**: Upstox API (NSE)

---

## System Overview

Algo Worker is the **live trading execution engine** at the center of the system. It consumes real-time market data, runs a 5-tier ML pipeline, selects an options strategy, validates risk, and routes orders to the exchange — all within an 80ms budget.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        END-TO-END PIPELINE (<80ms)                              │
│                                                                                 │
│  [Upstox WS] → [market-feeder] → [compute-engine] → [algo-worker] → [NSE Order]│
│                       ↓                  ↓                 ↓                    │
│                 Redis Streams       117 features       5-Tier AI                │
│                   (<1ms)              (<5ms)           Ensemble                 │
│                                                        (<50ms)                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 5-Tier Data-Bound Hierarchical AI

Each tier is bound by the intersection of **target horizon** and **historical data depth**:

| Tier  | Name                    | Models                    | Data Depth | Horizon      | Cadence          | Latency |
| ----- | ----------------------- | ------------------------- | ---------- | ------------ | ---------------- | ------- |
| **0** | Pre-Market Gap          | XGBoost                   | 10yr daily | Gap at open  | Once @ 09:08 IST | ~5ms    |
| **1** | Macro Director          | HMM + PatchTST            | 26yr daily | Day regime   | Once @ 09:09 IST | ~15ms   |
| **2** | Intraday Navigator      | LightGBM + TFT + Mamba    | 4yr 1-min  | 5m/15m/30m   | Every 60s        | ~40ms   |
| **3** | Microstructure Scalper  | LiT Transformer           | Live LOB   | 10s-1min     | Every 100ms      | ~8ms    |
| **4** | Meta-Learner & Strategy | Contextual Gating Network | OOF preds  | Final signal | Every 60s        | ~12ms   |

See [docs/ml/](../../docs/ml/) for detailed model architectures.

---

## 6-Layer Event-Driven Architecture

| Layer                  | Purpose                              | Components                                     | Latency Budget |
| ---------------------- | ------------------------------------ | ---------------------------------------------- | -------------- |
| **1. Data Ingestion**  | Market data subscription             | MarketDataConsumer, EventNormalizer            | <5ms           |
| **2. Feature Engine**  | Rust compute-engine (117 features)   | compute-engine (NAPI-RS), FeatureCache         | <5ms           |
| **3. Prediction**      | 5-tier ONNX ensemble                 | ModelPool, InferenceWorkers, RegimeDetector    | <50ms          |
| **4. Strategy & Risk** | Strategy selection + risk validation | StrategySelector, RiskValidator, PositionSizer | <10ms          |
| **5. Execution**       | Order routing + position management  | OrderManager, PositionTracker, ExitEngine      | <20ms          |
| **6. Observability**   | Metrics, logging, persistence        | Prometheus, CircuitBreaker, QuestDB, MongoDB   | Async          |

**Total End-to-End Target**: **<80ms** (p95)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: DATA INGESTION                                                     │
│ market-feeder → Redis Streams → algo-worker                                │
│ Instruments: NIFTY Future + NIFTY 50 constituents + Option chain + VIX     │
│ Latency: <5ms                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: FEATURE ENGINE (Rust compute-engine via NAPI-RS)                   │
│ Two-phase parallel computation via Rayon                                    │
│ Phase 1 (independent):  Index Breadth(8) + Futures(12) + Options(14)       │
│                          + Volatility(10) + Order Flow(8)                   │
│ Phase 2 (dependent):    Time Context(13) + Momentum(8) + Price Structure(8)│
│                          + Global Macro(12) + Regime Context(4)             │
│ Latency: <5ms for 117 features                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: PREDICTION (ONNX Runtime, Worker Threads)                          │
│                                                                              │
│ Pre-Market (once):                                                          │
│   Tier 0: XGBoost gap prediction @ 09:08:05 IST                            │
│   Tier 1: HMM regime + PatchTST trend @ 09:09:00 IST                      │
│                                                                              │
│ Live (every 60s):                                                           │
│   Tier 2: LightGBM + TFT + Mamba → P(up/flat/down) × 3 horizons           │
│   Tier 4: Contextual Gating Network → fused signal + confidence            │
│                                                                              │
│ Live (every 100ms):                                                         │
│   Tier 3: LiT Transformer → microstructure pressure (10s horizon)          │
│                                                                              │
│ Latency: <50ms (parallel Worker Threads)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: STRATEGY & RISK                                                    │
│                                                                              │
│ Strategy Selection (regime-conditioned):                                    │
│   BULL_TRENDING → LONG_CALL, BULL_CALL_SPREAD                              │
│   BEAR_TRENDING → LONG_PUT, BEAR_PUT_SPREAD                                │
│   VOLATILE      → LONG_STRADDLE                                            │
│   RANGING       → IRON_CONDOR, SHORT_STRANGLE                              │
│                                                                              │
│ Strike Selection: Neural network (IV surface + delta + liquidity)           │
│ Position Sizing:  Kelly criterion with VIX + regime scaling                 │
│ Risk Validation:  Greeks limits, max loss, leverage checks (VETO power)    │
│                                                                              │
│ Latency: <10ms                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 5: EXECUTION                                                          │
│                                                                              │
│ Entry:  OrderManager (limit/market routing via Upstox API)                 │
│ Track:  PositionTracker (real-time PnL, Greeks, MTM)                       │
│ Exit:   Multi-criteria ExitEngine:                                          │
│         1. Hard stop-loss (highest priority)                                │
│         2. Trailing stop (dynamic with ATR)                                 │
│         3. Take profit target                                               │
│         4. ML-driven signal reversal                                        │
│         5. Time-based (15:15 IST forced exit)                              │
│         6. Greeks breach (delta/gamma/theta limits)                         │
│                                                                              │
│ Latency: <20ms                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 6: OBSERVABILITY & PERSISTENCE                                        │
│                                                                              │
│ Metrics:   Prometheus + Grafana (real-time dashboards)                      │
│ Circuit:   Auto-halt on data staleness, risk breach, latency spike         │
│ Storage:   Redis (hot, TTL) → QuestDB (warm, time-series) → MongoDB (cold) │
│ Audit:     5-year trade log with full decision context (SEBI compliant)    │
│                                                                              │
│ Latency: Async (non-blocking)                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Trading Session Lifecycle

```
Time (IST)     Event                                    Algo Worker Action
─────────────────────────────────────────────────────────────────────────────
00:00-09:00    Overnight global data collection         Sleeping (market-feeder collects)
09:00-09:07    NSE pre-open session (order entry)       Standby
09:08:00       NSE freezes indicative price             Tier 0 fires (gap prediction)
09:08-09:14    Pre-open matching + estimation           Tier 1 fires, synthetic Greeks
09:14:55       Overnight candle synthesized             All pre-market context cached
09:15:00       Market opens — continuous trading        Tier 2/3/4 loop begins
09:15-09:20    First 5 minutes — CAUTION MODE           Reduced position sizing (0.5×)
09:20-15:15    Full trading                             Normal 60s + 100ms loops
15:15          Exit deadline                            Force-close all positions
15:25          Last signal computation                  Tier 2/4 loop stops
15:30          Market close                             Post-market reconciliation
```

See [MODEL_PIPELINE_WORKFLOW.md](../../docs/ml/MODEL_PIPELINE_WORKFLOW.md) for detailed minute-by-minute timing.

---

## Options Strategies

| ID  | Strategy         | Condition                 | Structure                       | Max Loss              |
| --- | ---------------- | ------------------------- | ------------------------------- | --------------------- |
| 0   | LONG_CALL        | Bullish + low IV          | Buy ATM/OTM CE                  | Premium paid          |
| 1   | LONG_PUT         | Bearish + low IV          | Buy ATM/OTM PE                  | Premium paid          |
| 2   | BULL_CALL_SPREAD | Mildly bullish            | Buy CE + sell higher CE         | Net debit             |
| 3   | BEAR_PUT_SPREAD  | Mildly bearish            | Buy PE + sell lower PE          | Net debit             |
| 4   | LONG_STRADDLE    | High vol expected         | Buy ATM CE + ATM PE             | Total premium         |
| 5   | IRON_CONDOR      | Range-bound, high IV      | Sell OTM CE+PE, buy further OTM | Spread width - credit |
| 6   | SHORT_STRANGLE   | Range-bound, very high IV | Sell OTM CE + OTM PE            | Unlimited (hedged)    |

---

## Risk Management

### Pre-Trade Validation (VETO Power)

Every order passes through rule-based checks before execution. **Any single failure blocks the order.**

| Check                 | Limit                 | Action on Breach     |
| --------------------- | --------------------- | -------------------- |
| Max open positions    | Configurable per user | Block new entry      |
| Single trade size     | % of equity           | Block entry          |
| Total delta exposure  | ±N lots               | Block or reduce size |
| Total gamma exposure  | ±N lots               | Block entry          |
| Total vega exposure   | ±N lots               | Block entry          |
| Daily drawdown        | -X% of equity         | Halt trading for day |
| Max single trade loss | -Y% of equity         | Block entry          |
| Leverage ratio        | Configurable          | Block entry          |

### Multi-Criteria Exit System

Exits are evaluated in priority order. The first trigger that fires wins:

1. **Hard stop-loss** — Immediate market order (highest priority)
2. **Daily drawdown breach** — Close all positions
3. **Trailing stop** — ATR-based dynamic trail
4. **Take profit** — Fixed target reached
5. **ML signal reversal** — Tier 4 flips direction with high confidence
6. **Time exit** — Forced at 15:15 IST, 15 minutes before market close
7. **Greeks breach** — Position Greeks exceed limits

### Circuit Breakers

| Trigger                        | Action                 | Recovery               |
| ------------------------------ | ---------------------- | ---------------------- |
| Data staleness (>5s no tick)   | Pause new entries      | Auto-resume on data    |
| Risk limit breach              | Halt trading           | Manual reset required  |
| Latency spike (>200ms p95)     | Reduce position sizing | Auto-resume            |
| Model disagreement (all tiers) | Skip cycle             | Auto-resume next cycle |
| Exchange circuit breaker       | Halt trading           | Follow exchange rules  |

---

## Performance Targets

| Component                     | Target    | Measurement               |
| ----------------------------- | --------- | ------------------------- |
| Data Ingestion (Layer 1)      | <5ms      | Tick-to-event             |
| Feature Computation (Layer 2) | <5ms      | 117 features via Rust     |
| ML Inference (Layer 3)        | <50ms     | All tiers parallel        |
| Strategy + Risk (Layer 4)     | <10ms     | Signal-to-validated-order |
| Order Execution (Layer 5)     | <20ms     | Order-to-exchange         |
| **Total End-to-End (p95)**    | **<80ms** | Tick-to-order             |

---

## SEBI 2024-2026 Compliance

| Requirement                 | Implementation                                    |
| --------------------------- | ------------------------------------------------- |
| **Unique Algo ID**          | `PROJ_QUANTUM_v{version}_USER_{userId}` per order |
| **Pre-Trade Risk Checks**   | Mandatory validation before every order (Layer 4) |
| **5-Year Audit Trail**      | MongoDB with automated retention policy           |
| **Circuit Breakers**        | Multi-level auto-halt (Layer 6)                   |
| **Broker Integration**      | Upstox API with health monitoring                 |
| **Trade Rationale Logging** | Full model output + feature snapshot per decision |

---

## Documentation

### Core Architecture

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System design overview
- [INFERENCE_ENGINE.md](./docs/INFERENCE_ENGINE.md) — 117-feature inference pipeline

### 6-Layer Documentation

- [01-DATA-INGESTION.md](./docs/layers/01-DATA-INGESTION.md) — Market data subscription
- [02-FEATURE-ENGINE.md](./docs/layers/02-FEATURE-ENGINE.md) — Rust compute-engine integration
- [03-PREDICTION.md](./docs/layers/03-PREDICTION.md) — ONNX ensemble + regime detection
- [04-STRATEGY-RISK.md](./docs/layers/04-STRATEGY-RISK.md) — Strategy selection + risk validation
- [05-EXECUTION.md](./docs/layers/05-EXECUTION.md) — Order routing + position management
- [06-OBSERVABILITY.md](./docs/layers/06-OBSERVABILITY.md) — Metrics + persistence + audit

### ML Model Documentation

- [TIER0_MODELS.md](../../docs/ml/TIER0_MODELS.md) — Pre-Market Gap Predictor
- [TIER1_MODELS.md](../../docs/ml/TIER1_MODELS.md) — Macro Director
- [TIER2_MODELS.md](../../docs/ml/TIER2_MODELS.md) — Intraday Navigator
- [TIER3_MODELS.md](../../docs/ml/TIER3_MODELS.md) — Microstructure Scalper
- [TIER4_MODELS.md](../../docs/ml/TIER4_MODELS.md) — Meta-Learner & Strategy
- [MODEL_PIPELINE_WORKFLOW.md](../../docs/ml/MODEL_PIPELINE_WORKFLOW.md) — Full session timing

### Related Services

- [compute-engine](../../packages/compute-engine/README.md) — Rust feature computation
- [market-feeder](../../services/market-feeder/README.md) — Real-time data ingestion
- [training-pipeline](../../services/training-pipeline/README.md) — ONNX model training

---

## Quick Start

### Prerequisites

- Node.js 20+
- Rust 1.75+ (for compute-engine native build)
- MongoDB 8.0+, QuestDB 8.0+, Redis 7.0+
- Pre-trained ONNX models (from training-pipeline)
- Upstox API credentials

### Installation

```bash
# 1. Install dependencies (from monorepo root)
cd investment-trading-portfolio
pnpm install

# 2. Build packages
pnpm build --filter=@repo/compute-engine
pnpm build --filter=@repo/schema
pnpm build --filter=@repo/database

# 3. Copy ONNX models
cp services/training-pipeline/models/*.onnx apps/algo-worker/models/

# 4. Configure environment
cd apps/algo-worker
cp .env.example .env
# Edit .env with database URLs and Upstox credentials

# 5. Start development
pnpm dev
```

### Environment Variables

```bash
# Databases
MONGODB_URI=mongodb://localhost:27017/trading
QUESTDB_HOST=localhost
REDIS_URL=redis://localhost:6379

# Upstox API
UPSTOX_API_KEY=your_api_key
UPSTOX_API_SECRET=your_api_secret

# Risk Management
MAX_DAILY_LOSS=-50000
MAX_POSITIONS=5

# GPU (optional)
GPU_ENABLED=true
```

---

## Project Structure

```
apps/algo-worker/
├── docs/
│   ├── ARCHITECTURE.md              # System design
│   ├── INFERENCE_ENGINE.md          # Inference pipeline
│   └── layers/                      # 6-layer documentation
│       ├── 01-DATA-INGESTION.md
│       ├── 02-FEATURE-ENGINE.md
│       ├── 03-PREDICTION.md
│       ├── 04-STRATEGY-RISK.md
│       ├── 05-EXECUTION.md
│       └── 06-OBSERVABILITY.md
├── models/                          # ONNX model files
│   ├── tier0_gap_predictor.onnx
│   ├── tier1_hmm.onnx
│   ├── tier1_patchtst.onnx
│   ├── tier2_lightgbm.onnx
│   ├── tier2_tft.onnx
│   ├── tier2_mamba.onnx
│   ├── tier3_lit.onnx
│   └── tier4_meta_learner.onnx
├── src/
│   ├── layers/                      # 6-Layer Implementation
│   │   ├── data-ingestion/          # Layer 1: Market data subscription
│   │   ├── feature-engine/          # Layer 2: Rust compute-engine bridge
│   │   ├── prediction/              # Layer 3: ONNX inference workers
│   │   ├── strategy-risk/           # Layer 4: Strategy + risk + sizing
│   │   ├── execution/               # Layer 5: Order routing + exits
│   │   └── observability/           # Layer 6: Metrics + persistence
│   ├── events/                      # Event definitions (Redis Streams)
│   ├── config/                      # Configuration schemas
│   └── main.ts                      # NestJS bootstrap
├── test/                            # Integration + unit tests
└── README.md
```

---

## Tech Stack

| Category           | Technology             | Purpose                                         |
| ------------------ | ---------------------- | ----------------------------------------------- |
| **Framework**      | NestJS + TypeScript    | Application framework with DI                   |
| **Feature Engine** | Rust (NAPI-RS) + Rayon | 117 features in <5ms                            |
| **ML Inference**   | ONNX Runtime           | TensorRT/OpenVINO execution providers           |
| **Event Bus**      | Redis Streams          | <1ms inter-service messaging                    |
| **Time-Series DB** | QuestDB                | 22x faster than ClickHouse for TSDB workloads   |
| **Document Store** | MongoDB                | Configuration, audit trail, cold storage        |
| **Hot Cache**      | Redis                  | Feature cache, model output cache, tier results |
| **Broker API**     | Upstox                 | NSE order routing                               |

---

**Architecture**: 6-Layer Event-Driven with 5-Tier Hierarchical AI
**Features**: 117 (Rust, <5ms)
**Inference**: ONNX Ensemble (<50ms)
**Target Latency**: <80ms E2E (p95)
**Last Updated**: March 17, 2026
