# Algo Worker - Project Structure

**Last Updated**: January 18, 2026  
**Architecture**: 6-Layer Event-Driven

---

## Directory Structure

```
apps/algo-worker/
├── src/
│   ├── layers/                          # 6-Layer Architecture
│   │   ├── data-ingestion/              # Layer 1: Market Data Subscription
│   │   │   ├── data-ingestion.module.ts
│   │   │   ├── market-data.consumer.ts   # Redis Streams subscriber
│   │   │   ├── news.consumer.ts          # News/sentiment subscriber
│   │   │   └── event-normalizer.ts       # Normalize incoming events
│   │   │
│   │   ├── feature-engine/              # Layer 2: Rust compute-engine (117 features)
│   │   │   ├── feature-engine.module.ts
│   │   │   ├── feature-engine.service.ts # Calls compute-engine NAPI
│   │   │   ├── feature-cache.service.ts  # Sliding window cache
│   │   │   └── feature-types.ts          # 117 feature definitions
│   │   │
│   │   ├── prediction/                  # Layer 3: ONNX Ensemble Inference
│   │   │   ├── prediction.module.ts
│   │   │   ├── model-pool.service.ts     # Pre-load ONNX models
│   │   │   ├── inference-worker.service.ts # Worker thread inference
│   │   │   ├── regime-detector.service.ts  # Market regime classification
│   │   │   ├── ensemble.service.ts       # Meta-learner fusion
│   │   │   └── workers/
│   │   │       └── inference.worker.ts   # GPU inference worker
│   │   │
│   │   ├── strategy-risk/               # Layer 4: Strategy & Risk Management
│   │   │   ├── strategy-risk.module.ts
│   │   │   ├── strategy-selector.service.ts  # Regime → Strategy mapping
│   │   │   ├── strike-selector.service.ts    # Delta-based strike selection
│   │   │   ├── risk-validator.service.ts     # Pre-trade risk checks
│   │   │   ├── position-sizer.service.ts     # Kelly criterion sizing
│   │   │   └── circuit-breaker.service.ts    # Trading halt logic
│   │   │
│   │   ├── execution/                   # Layer 5: Order Routing & Positions
│   │   │   ├── execution.module.ts
│   │   │   ├── order-manager.service.ts      # TWAP/VWAP/Market orders
│   │   │   ├── position-tracker.service.ts   # Real-time position tracking
│   │   │   ├── exit-engine.service.ts        # Exit signal generation
│   │   │   ├── trailing-stop.service.ts      # Trailing stop logic
│   │   │   └── pnl-calculator.service.ts     # Real-time PnL
│   │   │
│   │   └── observability/               # Layer 6: Metrics & Persistence
│   │       ├── observability.module.ts
│   │       ├── metrics.service.ts        # Prometheus metrics
│   │       ├── logging.service.ts        # Structured logging (Pino)
│   │       ├── health-check.service.ts   # Liveness/readiness
│   │       ├── redis-state.service.ts    # Hot state (positions)
│   │       ├── questdb-writer.service.ts # Warm storage (features)
│   │       └── mongodb-sync.service.ts   # Cold storage (audit)
│   │
│   ├── events/                          # Event Definitions
│   │   ├── market-data.event.ts          # MarketDataReceivedEvent
│   │   ├── features-computed.event.ts    # FeaturesComputedEvent
│   │   ├── trading-signal.event.ts       # TradingSignalEvent
│   │   ├── strategy-selected.event.ts    # StrategySelectedEvent
│   │   ├── order.event.ts                # OrderPlacedEvent, OrderFilledEvent
│   │   └── position.event.ts             # PositionOpenedEvent, PositionClosedEvent
│   │
│   ├── orchestrator/                    # Trading Pipeline Orchestrator
│   │   ├── orchestrator.module.ts
│   │   └── trading-orchestrator.service.ts   # Coordinates all layers
│   │
│   ├── config/                          # Configuration
│   │   ├── trading.config.ts             # Trading parameters
│   │   ├── model.config.ts               # ONNX model paths
│   │   └── risk.config.ts                # Risk limits
│   │
│   ├── shared/                          # Shared Utilities
│   │   ├── circular-buffer.ts            # Zero-allocation buffer
│   │   ├── object-pool.ts                # Object pooling
│   │   └── typed-arrays.ts               # TypedArray helpers
│   │
│   ├── app.module.ts                    # Root NestJS module
│   └── main.ts                          # Application entry point
│
├── models/                              # ONNX Models (from training-pipeline)
│   ├── lightgbm_54.onnx                  # LightGBM (46 features)
│   ├── lit_14.onnx                       # LiT microstructure (14 features)
│   ├── tft_sequence.onnx                 # TFT regime (46×120)
│   └── meta_learner.onnx                 # Meta-learner fusion
│
├── docs/                                # Documentation
│   ├── ARCHITECTURE.md                   # 6-layer overview
│   ├── INFERENCE_ENGINE.md               # Inference pipeline
│   ├── PERFORMANCE_OPTIMIZATION.md       # Latency optimization
│   ├── VISUAL_FLOW.md                    # Data flow diagrams
│   └── layers/                           # Layer-specific docs
│       ├── 01-DATA-INGESTION.md
│       ├── 02-FEATURE-ENGINE.md
│       ├── 03-PREDICTION.md
│       ├── 04-STRATEGY-RISK.md
│       ├── 05-EXECUTION.md
│       └── 06-OBSERVABILITY.md
│
├── test/                                # Tests
│   ├── unit/                             # Unit tests per layer
│   │   ├── feature-engine.spec.ts
│   │   ├── prediction.spec.ts
│   │   └── ...
│   ├── integration/                      # Integration tests
│   │   └── trading-pipeline.e2e.spec.ts
│   └── load/                             # Load/latency tests
│       └── latency-benchmark.ts
│
├── .env.example                         # Environment template
├── package.json                         # Dependencies
├── tsconfig.json                        # TypeScript config
└── README.md                            # Main documentation
```

---

## Layer Responsibilities

| Layer | Directory | Purpose | Target |
|-------|-----------|---------|--------|
| **1** | `data-ingestion/` | Market data subscription | <5ms |
| **2** | `feature-engine/` | 117 features (Rust) | <5ms |
| **3** | `prediction/` | ONNX ensemble inference | <50ms |
| **4** | `strategy-risk/` | Strategy selection + risk | <10ms |
| **5** | `execution/` | Order routing + positions | <20ms |
| **6** | `observability/` | Metrics + persistence | Async |

---

## Key Files

### Entry Points
- `main.ts` - Application bootstrap
- `app.module.ts` - Root module importing all layers

### Core Services
- `feature-engine.service.ts` - Calls Rust compute-engine via NAPI
- `inference-worker.service.ts` - GPU inference in Worker Threads
- `trading-orchestrator.service.ts` - Coordinates trading pipeline

### Configuration
- `trading.config.ts` - Trading parameters
- `model.config.ts` - ONNX model paths and settings
- `risk.config.ts` - Risk limits and circuit breakers

---

## Dependencies

### Internal Packages
- `@repo/compute-engine` - Rust feature computation (NAPI-RS)
- `@repo/schema` - Zod schemas for events
- `@repo/database` - QuestDB, MongoDB, Redis clients
- `@repo/market-sdk` - Upstox API wrapper

### External
- `@nestjs/*` - NestJS framework
- `onnxruntime-node` - ONNX Runtime for ML inference
- `ioredis` - Redis client
- `pino` - Structured logging
- `prom-client` - Prometheus metrics

---

## Event Flow

```
[Redis Streams]
     ↓
Layer 1: data-ingestion/
     ↓ MarketDataReceivedEvent
Layer 2: feature-engine/
     ↓ FeaturesComputedEvent (117 features)
Layer 3: prediction/
     ↓ TradingSignalEvent
Layer 4: strategy-risk/
     ↓ ValidatedOrderEvent
Layer 5: execution/
     ↓ OrderFilledEvent, PositionOpenedEvent
Layer 6: observability/
     → Prometheus, QuestDB, MongoDB
```
