# Algo Worker - Project Structure

**Last Updated**: March 13, 2026
**Architecture**: 6-Layer Event-Driven | 5-Tier Hierarchical Inference
**Models**: 8 ONNX models across 5 tiers

---

## Directory Structure

```
apps/algo-worker/
├── src/
│   ├── layers/                          # 6-Layer Architecture
│   │   ├── data-ingestion/              # Layer 1: Market Data Subscription
│   │   │   ├── data-ingestion.module.ts
│   │   │   ├── redis-consumer.service.ts    # Redis Streams subscriber (features:live, candles:1m)
│   │   │   ├── cache-reader.service.ts      # Read cached tier outputs from Redis
│   │   │   └── event-normalizer.ts          # Normalize incoming events
│   │   │
│   │   ├── feature-engine/              # Layer 2: Rust compute-engine (117 features)
│   │   │   ├── feature-engine.module.ts
│   │   │   ├── feature-engine.service.ts    # Calls compute-engine NAPI-RS
│   │   │   ├── feature-cache.service.ts     # Sliding window cache (120-bar for TFT/Mamba)
│   │   │   └── feature-types.ts             # 117 feature type definitions
│   │   │
│   │   ├── prediction/                  # Layer 3: 5-Tier Hierarchical Inference
│   │   │   ├── prediction.module.ts
│   │   │   ├── tier0.service.ts             # Pre-Market Gap Predictor (XGBoost, CPU)
│   │   │   ├── tier1.service.ts             # Macro Director (HMM + PatchTST, CPU)
│   │   │   ├── tier2.service.ts             # Intraday Navigator (LightGBM+TFT+Mamba)
│   │   │   ├── tier3.service.ts             # Microstructure Scalper (LiT, GPU)
│   │   │   ├── tier4.service.ts             # Meta-Learner (Contextual Gating Network)
│   │   │   ├── worker-pool.service.ts       # Manages Worker Thread lifecycle
│   │   │   ├── onnx-session.config.ts       # ONNX EP configs for all 8 models
│   │   │   └── workers/
│   │   │       ├── tier2-lightgbm.worker.ts # CPU Worker (Core 1)
│   │   │       ├── tier2-tft.worker.ts      # GPU Worker - TensorRT (Core 2)
│   │   │       ├── tier2-mamba.worker.ts    # GPU Worker - CUDA (Core 3)
│   │   │       └── tier3-lit.worker.ts      # GPU Worker - Self-driving 100ms loop (Core 4)
│   │   │
│   │   ├── strategy-risk/               # Layer 4: Strategy & Risk Management
│   │   │   ├── strategy-risk.module.ts
│   │   │   ├── strategy-selector.service.ts    # Regime x Direction -> 7 strategies
│   │   │   ├── strike-selector.service.ts      # IV surface + delta-based strike selection
│   │   │   ├── position-sizer.service.ts       # Kelly criterion + VIX + regime scaling
│   │   │   ├── risk-validator.service.ts       # 7 pre-trade risk checks
│   │   │   └── circuit-breaker.service.ts      # 6 circuit breaker triggers
│   │   │
│   │   ├── execution/                   # Layer 5: Order Routing & Positions
│   │   │   ├── execution.module.ts
│   │   │   ├── order-manager.service.ts        # MARKET/TWAP/VWAP smart routing
│   │   │   ├── position-tracker.service.ts     # Real-time position tracking
│   │   │   ├── exit-engine.service.ts          # Multi-criteria exit engine
│   │   │   ├── trailing-stop.service.ts        # Trailing stop logic
│   │   │   └── pnl-calculator.service.ts       # Real-time PnL
│   │   │
│   │   └── observability/               # Layer 6: Metrics & Persistence
│   │       ├── observability.module.ts
│   │       ├── metrics.service.ts              # Prometheus counters/histograms/gauges
│   │       ├── logging.service.ts              # Pino structured logging
│   │       ├── health-check.service.ts         # Liveness/readiness probes
│   │       ├── redis-state.service.ts          # Hot state (<5min TTL)
│   │       ├── questdb-writer.service.ts       # Warm storage (180d)
│   │       └── mongodb-sync.service.ts         # Cold storage (5yr, SEBI audit)
│   │
│   ├── events/                          # Event Definitions
│   │   ├── market-data.event.ts
│   │   ├── features-computed.event.ts
│   │   ├── candle-complete.event.ts         # Triggers 60s inference cycle
│   │   ├── trading-signal.event.ts
│   │   ├── strategy-selected.event.ts
│   │   ├── order.event.ts
│   │   └── position.event.ts
│   │
│   ├── orchestrator/                    # Trading Pipeline Orchestrator
│   │   ├── orchestrator.module.ts
│   │   └── trading-orchestrator.service.ts   # Coordinates 60s cycle + tier scheduling
│   │
│   ├── config/                          # Configuration
│   │   ├── trading.config.ts                 # Trading parameters
│   │   ├── model.config.ts                   # ONNX model paths + EP configs
│   │   ├── risk.config.ts                    # Risk limits + circuit breaker thresholds
│   │   └── gpu.config.ts                     # CUDA stream + VRAM allocation
│   │
│   ├── shared/                          # Shared Utilities
│   │   ├── circular-buffer.ts               # Zero-allocation ring buffer
│   │   ├── object-pool.ts                   # Object pooling for GC reduction
│   │   └── typed-arrays.ts                  # TypedArray helpers
│   │
│   ├── app.module.ts                    # Root NestJS module
│   └── main.ts                          # Bootstrap with CPU affinity
│
├── models/                              # ONNX Models (from training-pipeline)
│   ├── tier0/
│   │   └── xgboost_gap.onnx               # Tier 0: XGBoost (500 trees, depth 6)
│   ├── tier1/
│   │   ├── hmm_regime.onnx                 # Tier 1: HMM regime detector
│   │   └── patchtst_trend.onnx             # Tier 1: PatchTST daily trend
│   ├── tier2/
│   │   ├── lightgbm_intraday.onnx          # Tier 2: LightGBM (CPU, [1,84])
│   │   ├── tft_intraday.onnx               # Tier 2: TFT (GPU, [1,120,80])
│   │   ├── tft_intraday_fp16.engine        # TensorRT FP16 cached engine
│   │   └── mamba_intraday.onnx             # Tier 2: Mamba (GPU, [1,120,80])
│   ├── tier3/
│   │   └── lit_microstructure.onnx          # Tier 3: LiT Transformer (GPU, [1,14])
│   └── tier4/
│       └── meta_learner_cgn.onnx            # Tier 4: Contextual Gating Network ([1,24])
│
├── docs/                                # Documentation
│   ├── ARCHITECTURE.md                     # 6-layer + 5-tier overview
│   ├── INFERENCE_ENGINE.md                 # GPU/CPU allocation, ONNX EP config, Worker Threads
│   ├── PERFORMANCE_OPTIMIZATION.md         # Zero-allocation patterns
│   ├── VISUAL_FLOW.md                      # ASCII flow diagrams
│   ├── PROJECT_STRUCTURE.md                # This file
│   └── layers/
│       ├── 01-DATA-INGESTION.md
│       ├── 02-FEATURE-ENGINE.md
│       ├── 03-PREDICTION.md
│       ├── 04-STRATEGY-RISK.md
│       ├── 05-EXECUTION.md
│       └── 06-OBSERVABILITY.md
│
├── test/
│   ├── unit/
│   │   ├── tier0.spec.ts
│   │   ├── tier1.spec.ts
│   │   ├── tier2.spec.ts
│   │   ├── tier3.spec.ts
│   │   ├── tier4.spec.ts
│   │   ├── feature-engine.spec.ts
│   │   ├── strategy-selector.spec.ts
│   │   ├── risk-validator.spec.ts
│   │   └── position-sizer.spec.ts
│   ├── integration/
│   │   ├── trading-pipeline.e2e.spec.ts
│   │   └── worker-pool.e2e.spec.ts
│   └── load/
│       ├── latency-benchmark.ts
│       └── gpu-throughput.ts
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Layer Responsibilities

| Layer | Directory         | Purpose                                         | Latency Target |
| ----- | ----------------- | ----------------------------------------------- | -------------: |
| **1** | `data-ingestion/` | Redis Streams subscription, event normalization |           <2ms |
| **2** | `feature-engine/` | 117 features via Rust compute-engine (NAPI-RS)  |           <5ms |
| **3** | `prediction/`     | 5-tier hierarchical inference (8 ONNX models)   |      <25ms GPU |
| **4** | `strategy-risk/`  | Regime-aware strategy selection + 7 risk checks |          <10ms |
| **5** | `execution/`      | MARKET/TWAP/VWAP routing + position management  |          <20ms |
| **6** | `observability/`  | Prometheus, QuestDB, MongoDB persistence        |          Async |

---

## Key Files

### Entry Points

| File            | Description                                     |
| --------------- | ----------------------------------------------- |
| `main.ts`       | Application bootstrap with CPU affinity pinning |
| `app.module.ts` | Root NestJS module; imports all 6 layer modules |

### Core Services

| File                              | Layer | Description                                                        |
| --------------------------------- | ----- | ------------------------------------------------------------------ |
| `redis-consumer.service.ts`       | 1     | Subscribes to `features:live` and `candles:1m` Redis Streams       |
| `cache-reader.service.ts`         | 1     | Reads cached tier outputs from Redis for downstream consumers      |
| `feature-engine.service.ts`       | 2     | Calls Rust compute-engine via NAPI-RS; produces 117 features       |
| `feature-cache.service.ts`        | 2     | Maintains 120-bar sliding window for TFT and Mamba sequence inputs |
| `tier0.service.ts`                | 3     | Pre-market gap prediction (XGBoost, once daily at 09:00)           |
| `tier1.service.ts`                | 3     | Macro regime detection (HMM) and daily trend (PatchTST)            |
| `tier2.service.ts`                | 3     | Intraday inference: LightGBM (CPU) + TFT (TensorRT) + Mamba (CUDA) |
| `tier3.service.ts`                | 3     | Microstructure scalper on self-driving 100ms GPU loop (LiT)        |
| `tier4.service.ts`                | 3     | Meta-learner contextual gating across all tier outputs             |
| `worker-pool.service.ts`          | 3     | Manages lifecycle of 4 dedicated Worker Threads                    |
| `strategy-selector.service.ts`    | 4     | Maps Regime x Direction to one of 7 options strategies             |
| `risk-validator.service.ts`       | 4     | Executes 7 pre-trade risk checks before order submission           |
| `circuit-breaker.service.ts`      | 4     | Monitors 6 circuit breaker triggers; halts trading on breach       |
| `order-manager.service.ts`        | 5     | Smart order routing: MARKET, TWAP, VWAP execution algorithms       |
| `trading-orchestrator.service.ts` | --    | Coordinates the 60s inference cycle and tier scheduling            |

### Configuration

| File                | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `trading.config.ts` | Trading parameters (session times, symbols, timeframes)    |
| `model.config.ts`   | ONNX model paths, execution provider configs, input shapes |
| `risk.config.ts`    | Risk limits, circuit breaker thresholds, max drawdown      |
| `gpu.config.ts`     | CUDA stream allocation, VRAM budgets, TensorRT cache paths |

---

## Model Files

All models are exported from `training-pipeline` and stored in `models/`. The system loads 8 ONNX models organized across 5 tiers.

| Model File                      | Tier | Architecture                 | Input Shape    | Execution Provider | Approx. Size |
| ------------------------------- | ---- | ---------------------------- | -------------- | ------------------ | ------------ |
| `tier0/xgboost_gap.onnx`        | 0    | XGBoost (500 trees, depth 6) | `[1, 42]`      | CPU                | ~8 MB        |
| `tier1/hmm_regime.onnx`         | 1    | Hidden Markov Model          | `[1, 20]`      | CPU                | ~2 MB        |
| `tier1/patchtst_trend.onnx`     | 1    | PatchTST (daily trend)       | `[1, 60, 12]`  | CPU                | ~15 MB       |
| `tier2/lightgbm_intraday.onnx`  | 2    | LightGBM                     | `[1, 84]`      | CPU                | ~12 MB       |
| `tier2/tft_intraday.onnx`       | 2    | Temporal Fusion Transformer  | `[1, 120, 80]` | TensorRT (FP16)    | ~45 MB       |
| `tier2/mamba_intraday.onnx`     | 2    | Mamba (selective SSM)        | `[1, 120, 80]` | CUDA               | ~38 MB       |
| `tier3/lit_microstructure.onnx` | 3    | LiT Transformer              | `[1, 14]`      | CUDA               | ~10 MB       |
| `tier4/meta_learner_cgn.onnx`   | 4    | Contextual Gating Network    | `[1, 24]`      | CPU                | ~5 MB        |

Additionally, `tier2/tft_intraday_fp16.engine` is the TensorRT FP16 cached engine file generated on first inference from `tft_intraday.onnx`. This avoids the ~30s TensorRT compilation penalty on subsequent startups.

---

## Worker Thread Architecture

The prediction layer runs 4 dedicated Worker Threads, each pinned to a specific CPU core to eliminate scheduling jitter. The main thread dispatches work and collects results via `MessagePort`.

```
Main Thread (Core 0)
├── NestJS Application
├── Layers 1, 2, 4, 5, 6
├── Tier 0 (XGBoost - inline, CPU)
├── Tier 1 (HMM + PatchTST - inline, CPU)
├── Tier 4 (Meta-Learner CGN - inline, CPU)
└── Worker Pool Service
     │
     ├── Worker Thread 1 (Core 1) ── tier2-lightgbm.worker.ts
     │   EP: CPU
     │   Trigger: Every 60s candle close
     │   Model: lightgbm_intraday.onnx
     │
     ├── Worker Thread 2 (Core 2) ── tier2-tft.worker.ts
     │   EP: TensorRT (FP16)
     │   Trigger: Every 60s candle close
     │   Model: tft_intraday.onnx / tft_intraday_fp16.engine
     │
     ├── Worker Thread 3 (Core 3) ── tier2-mamba.worker.ts
     │   EP: CUDA
     │   Trigger: Every 60s candle close
     │   Model: mamba_intraday.onnx
     │
     └── Worker Thread 4 (Core 4) ── tier3-lit.worker.ts
         EP: CUDA
         Trigger: Self-driving 100ms loop (independent of candle cycle)
         Model: lit_microstructure.onnx
```

Worker lifecycle is managed by `worker-pool.service.ts`. All Worker Threads are spawned at startup and kept alive for the duration of the trading session. ONNX sessions are created once per worker and reused across inference calls.

---

## Dependencies

### Internal Packages (Monorepo)

| Package                | Purpose                                                   |
| ---------------------- | --------------------------------------------------------- |
| `@repo/compute-engine` | Rust-based feature computation via NAPI-RS (117 features) |
| `@repo/schema`         | Zod schemas for event validation and type generation      |
| `@repo/database`       | QuestDB, MongoDB, and Redis client wrappers               |
| `@repo/market-sdk`     | Upstox API wrapper for order placement and market data    |

### External Dependencies

| Package            | Purpose                                                       |
| ------------------ | ------------------------------------------------------------- |
| `@nestjs/*`        | NestJS framework (modules, DI, event emitter, microservices)  |
| `onnxruntime-node` | ONNX Runtime with CPU, CUDA, and TensorRT execution providers |
| `ioredis`          | Redis client for Streams, pub/sub, and caching                |
| `pino`             | Structured JSON logging with sub-millisecond overhead         |
| `prom-client`      | Prometheus metrics (counters, histograms, gauges)             |

---

## Event Flow

The trading pipeline processes market data through 6 layers in sequence. Each layer communicates via strongly-typed NestJS events. The full cycle completes within the 60-second candle window.

```
                        [Redis Streams: features:live, candles:1m]
                                          |
                                          v
    Layer 1: data-ingestion  ──  redis-consumer.service.ts
                                          |
                              MarketDataReceivedEvent
                              CandleCompleteEvent
                                          |
                                          v
    Layer 2: feature-engine  ──  feature-engine.service.ts
                                          |
                              FeaturesComputedEvent (117 features)
                                          |
                                          v
    Layer 3: prediction      ──  5-Tier Hierarchical Inference
             │
             ├── Tier 0: Pre-Market Gap       (XGBoost, daily at 09:00)
             ├── Tier 1: Macro Director       (HMM + PatchTST, daily at 09:15)
             ├── Tier 2: Intraday Navigator   (LightGBM + TFT + Mamba, every 60s)
             ├── Tier 3: Microstructure       (LiT, self-driving 100ms loop)
             └── Tier 4: Meta-Learner         (CGN, fuses all tier outputs)
                                          |
                              TradingSignalEvent
                                          |
                                          v
    Layer 4: strategy-risk   ──  strategy-selector.service.ts
                                 risk-validator.service.ts
                                          |
                              StrategySelectedEvent
                              ValidatedOrderEvent
                                          |
                                          v
    Layer 5: execution       ──  order-manager.service.ts
                                 position-tracker.service.ts
                                          |
                              OrderPlacedEvent / OrderFilledEvent
                              PositionOpenedEvent / PositionClosedEvent
                                          |
                                          v
    Layer 6: observability   ──  metrics.service.ts
                                 questdb-writer.service.ts
                                 mongodb-sync.service.ts
                                          |
                                          v
                        [Prometheus]  [QuestDB 180d]  [MongoDB 5yr SEBI]
```

---

## Related Documentation

| Document                                                     | Description                                                     |
| ------------------------------------------------------------ | --------------------------------------------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                         | Full 6-layer + 5-tier architectural overview                    |
| [INFERENCE_ENGINE.md](./INFERENCE_ENGINE.md)                 | GPU/CPU allocation, ONNX EP configuration, Worker Thread design |
| [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) | Zero-allocation patterns, GC tuning, typed array strategies     |
| [VISUAL_FLOW.md](./VISUAL_FLOW.md)                           | ASCII flow diagrams for all trading scenarios                   |
| [layers/03-PREDICTION.md](./layers/03-PREDICTION.md)         | Detailed 5-tier prediction layer specification                  |
