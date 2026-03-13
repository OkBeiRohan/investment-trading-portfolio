# Market Feeder -- NestJS Architecture

> **Comprehensive architecture specification for the market-feeder service: a NestJS microservice that ingests real-time NSE market data via Upstox WebSocket, aggregates ticks into OHLCV candles, computes 117 features through a Rust compute-engine (NAPI-RS), and publishes results to Redis Streams for downstream consumption by the algo-worker.**

**Last Updated**: March 13, 2026
**Service**: `market-feeder` (NestJS + TypeScript)
**Transport**: gRPC (port 50052, proto: `@repo/schema/proto/market-feeder`)
**Runtime**: Node.js process pinned to Core 5 (Rayon thread pool for compute-engine)
**Consumers**: `algo-worker` (Layer 1 inference), `risk-manager` (pre-trade checks)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Module Structure](#2-module-structure)
3. [Data Flow Pipeline](#3-data-flow-pipeline)
4. [WebSocket Connection State Machine](#4-websocket-connection-state-machine)
5. [Candle Generation](#5-candle-generation)
6. [Compute Engine Integration](#6-compute-engine-integration)
7. [Pre-Market Session](#7-pre-market-session)
8. [Redis Stream Output](#8-redis-stream-output)
9. [Health Monitoring](#9-health-monitoring)
10. [Performance Targets](#10-performance-targets)

---

## 1. System Overview

### NestJS Module Architecture

The market-feeder is a NestJS gRPC microservice bootstrapped via `NestFactory.createMicroservice` with Transport.GRPC. It uses conditional module registration (`ConditionalModule.registerWhen`) to enable or disable subsystems based on environment flags, allowing the same codebase to run in ingestion mode, feature-computation mode, strike-selection mode, or dataset-generation mode depending on deployment configuration.

Core framework integrations:

| Framework Feature            | Purpose                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ConfigModule.forRoot`       | Global configuration from `.env.local` / `.env` with typed accessors                                                           |
| `ScheduleModule.forRoot`     | Cron-based scheduling (nightly backfill, pre-market sync, EOD reconciliation)                                                  |
| `EventEmitterModule.forRoot` | Wildcard event bus (`market.tick`) for decoupled tick fan-out                                                                  |
| `ConditionalModule`          | Feature flags: `HISTORY_SAVER_ENABLED`, `FEATURE_COMPUTATION_ENABLED`, `STRIKE_SELECTOR_ENABLED`, `DATASET_GENERATION_ENABLED` |

### High-Level Data Flow

```
Upstox WebSocket (TBT Feed)
         |
         |  ~50,000 ticks/sec across ~150 instruments
         v
    Binary Protobuf Decode
         |
         v
    Tick Validation (staleness, range, sequence)
         |
         +-----> QuestDB (tick_data table, buffered batch insert)
         |
         v
    EventEmitter: 'market.tick'
         |
         +-----> RealtimeFeaturesService (order book imbalance -> Redis)
         |
         v
    Candle Aggregator (1m OHLCV accumulation)
         |
         v
    Compute Engine (Rust NAPI-RS, 117 features, <5ms)
         |
         v
    Redis Streams (features:live, candles:1m, premarket:*)
         |
         v
    algo-worker (Layer 1 inference)
```

### Process Affinity

The market-feeder process is pinned to a dedicated CPU core (Core 5) to ensure deterministic latency for the Rust compute-engine's Rayon thread pool. This prevents contention with the algo-worker and risk-manager processes, which run on separate cores. CPU pinning is configured at the systemd/PM2 level, not within the NestJS application.

---

## 2. Module Structure

```
services/market-feeder/
|-- src/
|   |-- main.ts                              # gRPC microservice bootstrap (port 50052)
|   |-- app.module.ts                        # Root module with conditional registration
|   |-- app.controller.ts                    # Health check, service metadata
|   |-- app.service.ts                       # Application-level utilities
|   |
|   |-- config/
|   |   `-- configuration.ts                 # Typed environment configuration
|   |
|   |-- websocket/                           # WebSocket Connection Management
|   |   |-- websocket.module.ts
|   |   |-- connection-manager.service.ts    # Connection lifecycle, reconnection
|   |   |-- subscription-manager.service.ts  # Instrument subscription management
|   |   `-- heartbeat.service.ts             # Connection health monitoring
|   |
|   |-- tick-processor/                      # Raw Tick Processing
|   |   |-- tick-processor.module.ts
|   |   |-- tick-decoder.service.ts          # Binary protobuf -> MarketTick
|   |   |-- tick-validator.service.ts        # Staleness, range, sequence checks
|   |   `-- tick-router.service.ts           # Route ticks to appropriate handlers
|   |
|   |-- candle-aggregator/                   # OHLCV Candle Generation
|   |   |-- candle-aggregator.module.ts
|   |   |-- candle-builder.service.ts        # 1-minute candle accumulation
|   |   |-- multi-timeframe.service.ts       # 5m, 15m candle generation
|   |   `-- gap-detector.service.ts          # Missing candle detection
|   |
|   |-- feature-computation/                 # Rust Compute Engine Integration
|   |   |-- feature-computation.module.ts    # Module: CE adapter, service, scheduler
|   |   |-- compute-engine.adapter.ts        # NAPI-RS bridge: computeFeatures()
|   |   |-- compute-engine.service.ts        # Type-safe wrapper with health checks
|   |   |-- feature-computation.service.ts   # Batch orchestration (QuestDB -> features)
|   |   |-- feature-computation.scheduler.ts # Cron: hourly, EOD, weekly recompute
|   |   |-- feature-cache.service.ts         # 120-bar sliding window (Rust-managed)
|   |   |-- feature-publisher.service.ts     # Publish to Redis Streams
|   |   |-- realtime-features.service.ts     # Tick-level streaming metrics -> Redis
|   |   |-- constituent-manager.service.ts   # NIFTY 50 quarterly rebalancing
|   |   `-- continuous-contract.builder.ts   # Futures roll (1! continuous notation)
|   |
|   |-- ingestion/                           # Data Ingestion Pipeline
|   |   |-- ingestion.module.ts              # Module: providers, services, controller
|   |   |-- live-data.service.ts             # Upstox WS subscription, tick buffering
|   |   |-- instrument-sync.service.ts       # Weekly instrument master refresh
|   |   |-- historical-backfill.service.ts   # Incremental gap-aware backfill
|   |   |-- global-data.service.ts           # Yahoo/AlphaVantage/Finnhub providers
|   |   |-- gap-detector.service.ts          # Missing data range detection
|   |   |-- scheduler.service.ts             # Cron orchestration (4 scheduled jobs)
|   |   |-- ingestion.controller.ts          # gRPC endpoints for manual triggers
|   |   `-- index.ts                         # Public API barrel export
|   |
|   |-- pre-market/                          # Pre-Market Session Handler
|   |   |-- pre-market.module.ts
|   |   |-- pre-open-capture.service.ts      # NSE pre-open session data
|   |   |-- overnight-collector.service.ts   # Global macro data collection
|   |   `-- gift-nifty.service.ts            # GIFT Nifty price tracking
|   |
|   |-- redis/                               # Redis Publishing
|   |   |-- redis.module.ts
|   |   `-- stream-publisher.service.ts      # XADD to features:live, candles:1m
|   |
|   |-- strike-selector/                     # Option Strike Selection
|   |   |-- strike-selector.module.ts
|   |   |-- strike-selector.service.ts       # ATM/OTM strike identification
|   |   |-- strike-selector.bootstrap.ts     # Initialization logic
|   |   |-- select-strike.ts                 # Core selection algorithm
|   |   |-- strike-selector.types.ts         # Type definitions
|   |   `-- fallback/                        # Degraded-mode fallbacks
|   |       |-- option-chain.fallback.ts     # Option chain API fallback
|   |       |-- market-quote.fallback.ts     # Market quote fallback
|   |       `-- funds-margin.fallback.ts     # Margin/funds fallback
|   |
|   |-- dataset-generation/                  # Training Dataset Export
|   |   |-- dataset-generation.module.ts
|   |   |-- dataset-generation.service.ts    # Feature -> Parquet export
|   |   |-- cpcv-splitter.service.ts         # Combinatorial Purged CV splits
|   |   |-- data-quality.service.ts          # Pre-export validation
|   |   `-- dataset.controller.ts            # gRPC trigger endpoints
|   |
|   |-- historical-data/                     # Legacy Historical Module
|   |   |-- historical-data.module.ts
|   |   |-- candle-fetcher.service.ts        # Upstox historical API client
|   |   |-- instrument-master.service.ts     # Instrument metadata resolution
|   |   |-- upstox-client.ts                 # HTTP client wrapper
|   |   |-- nifty50-instruments.ts           # Static constituent + removal data
|   |   |-- nifty50-constituents.json        # Current constituent list
|   |   |-- ind_nifty50list.csv              # NSE official constituent CSV
|   |   `-- generate-nifty50-json.ts         # CSV -> JSON generator script
|   |
|   `-- nifty50/                             # Constituent Management
|       |-- nifty50.module.ts
|       `-- constituent-manager.service.ts   # Quarterly rebalancing with history
|
|-- docs/
|   |-- ARCHITECTURE.md                      # This document
|   |-- GRPC_IMPLEMENTATION.md               # gRPC transport specification
|   |-- MULTI_TIMEFRAME_STRATEGY.md          # Multi-timeframe candle strategy
|   |-- NIFTY50_CONSTITUENT_CHANGES.md       # Historical constituent changes
|   `-- PRE_MARKET_SESSION.md                # Pre-open session specification
|
|-- test/
|   |-- app.e2e-spec.ts                      # End-to-end tests
|   `-- jest-e2e.json                        # E2E Jest configuration
|
|-- .env                                     # Environment variables (production)
|-- .env.example                             # Environment variable template
|-- nest-cli.json                            # NestJS CLI configuration
|-- tsconfig.json                            # TypeScript configuration
|-- tsconfig.build.json                      # Production build configuration
|-- eslint.config.mjs                        # ESLint flat config
|-- .prettierrc                              # Prettier formatting rules
`-- package.json                             # Dependencies and scripts
```

### Module Dependency Graph

```
AppModule
  |
  |-- ConfigModule (global)
  |-- ScheduleModule (conditional: HISTORY_SAVER_ENABLED)
  |-- EventEmitterModule (wildcard, delimiter: '.', maxListeners: 20)
  |-- QuestDBModule (conditional: HISTORY_SAVER_ENABLED)
  |
  |-- IngestionModule (conditional: HISTORY_SAVER_ENABLED)
  |     |-- HttpModule
  |     |-- DatabaseModule.forMarketFeeder()
  |     |-- WebSocketModule (@repo/market-sdk)
  |     |-- UpstoxModule (@repo/market-sdk)
  |     `-- UpstoxWebSocketModule (@repo/market-sdk)
  |
  |-- HistoricalDataModule (conditional: HISTORY_SAVER_ENABLED, legacy)
  |
  |-- FeatureComputationModule (conditional: FEATURE_COMPUTATION_ENABLED)
  |     `-- DatabaseModule.forMarketFeeder()
  |
  |-- StrikeSelectorModule (conditional: STRIKE_SELECTOR_ENABLED)
  |
  `-- DatasetGenerationModule (conditional: DATASET_GENERATION_ENABLED)
```

---

## 3. Data Flow Pipeline

### End-to-End Tick Processing

```
                          UPSTOX WEBSOCKET (TBT FEED)
                          |
                          | Binary protobuf frames
                          | ~150 instruments subscribed
                          | ~50,000 ticks/second aggregate
                          v
+-----------------------------------------------------------------------+
|                     TICK DECODER SERVICE                               |
|                                                                       |
|  Binary protobuf frame --> UpstoxMarketData object                    |
|  Fields: instrumentKey, ltp, bid[30], ask[30], volume, OI, Greeks     |
|  Target latency: <0.1ms per decode                                    |
+-----------------------------------------------------------------------+
                          |
                          v
+-----------------------------------------------------------------------+
|                     TICK VALIDATOR SERVICE                             |
|                                                                       |
|  1. Staleness check: reject if lastTradeTime is null                  |
|  2. Range check: ltp within expected bounds for instrument            |
|  3. Sequence check: monotonic timestamp per instrument                |
|  4. Drop malformed or duplicate ticks                                 |
+-----------------------------------------------------------------------+
                          |
                          v
+-----------------------------------------------------------------------+
|                     TICK ROUTER SERVICE                                |
|                                                                       |
|  Route by instrument type:                                            |
|  +-- INDEX    --> Index Handler (NIFTY 50 spot, India VIX)            |
|  +-- FUTURES  --> Futures Handler (NIFTY front-month future)          |
|  +-- OPTIONS  --> Options Handler (~100 CE/PE strikes)                |
|  +-- EQUITY   --> Constituent Handler (50 NIFTY 50 stocks)            |
+-----------------------------------------------------------------------+
                          |
          +---------------+---------------+
          |               |               |
          v               v               v
   +-----------+   +-----------+   +-----------+
   | QuestDB   |   | EventBus  |   | Redis RT  |
   | Batch     |   | market.   |   | rt:tick:  |
   | Insert    |   | tick      |   | {key}     |
   | (5000 buf |   |           |   | (1hr TTL) |
   | /1s flush)|   |           |   |           |
   +-----------+   +-----------+   +-----------+
                          |
                          v
+-----------------------------------------------------------------------+
|                     CANDLE BUILDER SERVICE                             |
|                                                                       |
|  Per-instrument 1-minute candle accumulation:                         |
|  - Open:   first tick LTP in minute window                            |
|  - High:   max(LTP) across all ticks in window                        |
|  - Low:    min(LTP) across all ticks in window                        |
|  - Close:  last tick LTP in minute window                             |
|  - Volume: cumulative VTT delta within window                         |
|  - OI:     last observed open interest                                |
|                                                                       |
|  On minute boundary: emit completed candle, reset accumulator         |
+-----------------------------------------------------------------------+
                          |
                          | Completed 1-minute candle
                          v
+-----------------------------------------------------------------------+
|                 MULTI-TIMEFRAME SERVICE                                |
|                                                                       |
|  Rolling aggregation from 1-minute base candles:                      |
|  - 5-minute:  aggregate last 5 completed 1m candles                   |
|  - 15-minute: aggregate last 15 completed 1m candles                  |
|                                                                       |
|  Aggregation rule: O=first.open, H=max(highs), L=min(lows),          |
|  C=last.close, V=sum(volumes)                                        |
+-----------------------------------------------------------------------+
                          |
                          | FeatureInput (NIFTY Future + 50 constituents
                          |              + options + India VIX)
                          v
+-----------------------------------------------------------------------+
|                 COMPUTE ENGINE SERVICE (NAPI-RS -> Rust)               |
|                                                                       |
|  Phase 1: Shared dependencies (~2ms)                                  |
|    - Update 120-bar sliding window cache                              |
|    - Compute VWAP, ATR, moving averages (shared across features)      |
|                                                                       |
|  Phase 2: Parallel feature computation (~1ms, Rayon on Core 5)        |
|    - 117 features across 14 categories                                |
|    - Each feature computed independently using shared deps             |
|    - Output: ComputeResult { features: FeatureOutput, timing }        |
|                                                                       |
|  Total target: <5ms per candle close                                  |
+-----------------------------------------------------------------------+
                          |
                          | 117 features as Float32Array
                          v
+-----------------------------------------------------------------------+
|                 REDIS STREAM PUBLISHER                                 |
|                                                                       |
|  XADD features:live * <serialized features>                           |
|  XADD candles:1m * <OHLCV candle>                                    |
|                                                                       |
|  Target: <1ms publish latency                                         |
+-----------------------------------------------------------------------+
                          |
                          v
                    ALGO-WORKER (Layer 1)
                    reads via XREADGROUP
```

### Instrument Subscription Breakdown

| Category                    | Count    | Instrument Pattern                | Feed Mode         |
| --------------------------- | -------- | --------------------------------- | ----------------- |
| NIFTY 50 Future             | 1        | `NSE_FO\|NIFTY{expiry}FUT`        | Full (L2 depth)   |
| NIFTY 50 Index Constituents | 50       | `NSE_EQ\|{symbol}`                | Full (L2 depth)   |
| NIFTY CE Options            | ~50      | `NSE_FO\|NIFTY{expiry}{strike}CE` | Full (Greeks, OI) |
| NIFTY PE Options            | ~50      | `NSE_FO\|NIFTY{expiry}{strike}PE` | Full (Greeks, OI) |
| India VIX                   | 1        | `NSE_INDEX\|India VIX`            | LTP only          |
| **Total**                   | **~152** |                                   |                   |

Options strikes are selected by the `StrikeSelectorModule` based on ATM proximity and liquidity. Strikes are re-selected on expiry roll (typically weekly Thursday) and intraday if spot moves significantly.

---

## 4. WebSocket Connection State Machine

### State Diagram

```
                    +----------------+
                    |  DISCONNECTED  |<-----------+
                    +----------------+            |
                           |                      |
                  connect()|                      | max retries
                           v                      | exceeded
                    +----------------+            |
            +------>|  CONNECTING    |------+      |
            |       +----------------+      |      |
            |              |           fail |      |
            |    connected |                |      |
            |              v                v      |
            |       +----------------+   +----+----+-----+
            |       |   CONNECTED    |   | RECONNECTING  |
            |       +----------------+   +---------------+
            |              |                   ^
            |   subscribe()|                   |
            |              v                   |
            |       +----------------+         |
            |       |  SUBSCRIBING   |         |
            |       +----------------+         |
            |              |                   |
            |    confirmed |                   |
            |              v                   |
            |       +----------------+         |
            |       |    ACTIVE      |---------+
            |       +----------------+  connection
            |              |            lost / error
            |    shutdown()|
            |              v
            |       +----------------+
            +-------|  DISCONNECTED  |
                    +----------------+
```

### Reconnection Strategy

The WebSocket connection uses exponential backoff with jitter to prevent thundering herd effects during exchange-side outages or network partitions.

| Attempt | Base Delay | Jitter Range | Effective Delay |
| ------- | ---------- | ------------ | --------------- |
| 1       | 1s         | 0-500ms      | 1.0-1.5s        |
| 2       | 2s         | 0-1000ms     | 2.0-3.0s        |
| 3       | 4s         | 0-2000ms     | 4.0-6.0s        |
| 4       | 8s         | 0-4000ms     | 8.0-12.0s       |
| 5       | 16s        | 0-8000ms     | 16.0-24.0s      |
| 6+      | 30s (cap)  | 0-15000ms    | 30.0-45.0s      |

Configuration (from `configuration.ts`):

```typescript
websocket: {
  enabled: process.env.WEBSOCKET_ENABLED === 'true',
  reconnectInterval: parseInt(process.env.WEBSOCKET_RECONNECT_INTERVAL || '5000', 10),
  bufferFlushInterval: parseInt(process.env.WEBSOCKET_BUFFER_FLUSH_INTERVAL || '1000', 10),
}
```

### Connection Lifecycle

1. **Bootstrap**: `LiveDataService.onApplicationBootstrap()` initializes the service. Live ingestion is triggered via scheduler or manual gRPC call.
2. **Instrument Resolution**: `getActiveInstruments()` queries `InstrumentMasterRepository` for all INDEX instruments plus derivatives expiring within 14 days.
3. **Subscription**: `UpstoxWebSocketService.subscribe()` opens a persistent connection in `full` mode (Level 2 depth with bid/ask arrays, Greeks, OI) at priority 20 (CRITICAL).
4. **Tick Processing**: Each incoming `UpstoxMarketData` frame is decoded, validated, buffered for QuestDB batch insert (5000-tick buffer, 1-second flush interval), and emitted as `market.tick` event.
5. **Shutdown**: `onApplicationShutdown()` flushes remaining buffer, unsubscribes, and closes the WebSocket connection.

---

## 5. Candle Generation

### 1-Minute Candle Accumulation

Each instrument maintains an in-memory candle accumulator that collects ticks within the current minute window. On minute boundary crossing, the accumulated candle is finalized and emitted.

```
Tick Stream for Instrument X:
  t=09:15:00.123  LTP=22450.50  Vol=1200    --> Open candle [09:15]
  t=09:15:01.456  LTP=22452.00  Vol=1500    --> Update high
  t=09:15:15.789  LTP=22448.25  Vol=2100    --> Update low
  t=09:15:30.012  LTP=22451.75  Vol=3500    --> Update volume
  t=09:15:59.890  LTP=22453.00  Vol=5200    --> Last tick in window
  -------------------------------------------------------
  t=09:16:00.050  LTP=22454.50  Vol=5300    --> EMIT candle [09:15]:
                                                  O=22450.50
                                                  H=22453.00
                                                  L=22448.25
                                                  C=22453.00
                                                  V=4000 (delta)
                                                  OI=last observed
                                              --> Start new candle [09:16]
```

### OHLCV Accumulation Rules

| Field         | Rule                            | Notes                     |
| ------------- | ------------------------------- | ------------------------- |
| Open          | First tick LTP in minute window | Set once, never updated   |
| High          | `max(current_high, tick.ltp)`   | Updated on every tick     |
| Low           | `min(current_low, tick.ltp)`    | Updated on every tick     |
| Close         | Last tick LTP in minute window  | Overwritten on every tick |
| Volume        | `tick.vtt - window_start_vtt`   | Cumulative volume delta   |
| Open Interest | Last observed `tick.oi`         | Overwritten on every tick |

### Candle Close Trigger

When a tick arrives with a timestamp in a new minute window:

1. Finalize the previous minute's candle.
2. Emit the completed candle to the `CandleAggregator` output channel.
3. **Trigger feature computation**: the candle close event initiates the compute-engine pipeline for that minute.
4. Reset the accumulator and start a new candle with the current tick.

### Multi-Timeframe Generation

Higher timeframe candles (5m, 15m) are generated via rolling aggregation from completed 1-minute candles, not from raw ticks. This ensures consistency and avoids reprocessing the full tick stream.

```
1-Minute Candles:                5-Minute Candle:
  [09:15] O=100 H=105 L=98  C=103  |
  [09:16] O=103 H=107 L=102 C=106  |  O = 100 (first 1m open)
  [09:17] O=106 H=108 L=104 C=105  |  H = 110 (max of all 1m highs)
  [09:18] O=105 H=110 L=103 C=109  |  L = 98  (min of all 1m lows)
  [09:19] O=109 H=109 L=106 C=107  |  C = 107 (last 1m close)
                                    |  V = sum of all 1m volumes
```

### Gap Detection

The `GapDetectorService` scans QuestDB for missing candle data by checking existence in week-sized (minute data) or month-sized (daily data) chunks. Detected gaps are coalesced into contiguous date ranges and fed to the `HistoricalBackfillService` for incremental repair.

```typescript
interface DateGap {
  from: Date;
  to: Date;
}
// findMissingMinuteRanges('NSE_FO|NIFTY...FUT', startDate, endDate) -> DateGap[]
```

---

## 6. Compute Engine Integration

### Architecture

The compute-engine is a Rust library compiled to a native Node.js addon via NAPI-RS 3.0. It is imported as `@repo/compute-engine` and exposes a single synchronous function `computeFeatures(input: FeatureInput): ComputeResult`.

```
TypeScript (NestJS)                    Rust (NAPI-RS 3.0)
+---------------------------+          +----------------------------------+
| ComputeEngineAdapter      |  NAPI    | #[napi]                          |
| .computeFeatures(input)   |--------->| pub fn compute_features(         |
|                           |          |   input: FeatureInput            |
| - JSON serialization      |          | ) -> ComputeResult               |
| - Performance monitoring  |          |                                  |
| - >5ms threshold warning  |          | Internal:                        |
+---------------------------+          | 1. Update Lazy<Mutex<Cache>>     |
           ^                           | 2. Compute shared dependencies   |
           |                           | 3. Rayon parallel features       |
+---------------------------+          +----------------------------------+
| ComputeEngineService      |
| - Type-safe wrapper       |
| - Error handling          |
| - Health check            |
+---------------------------+
```

### NAPI-RS 3.0 Pattern

- Functions exported via `#[napi]` are automatically available on `require('@repo/compute-engine')`.
- No explicit initialization needed. Rust uses `Lazy` statics for global cache.
- The 120-bar sliding window cache is managed internally in Rust global state (`Lazy<Mutex<HistoricalCache>>`).
- Input is passed as a Zod-validated `FeatureInput` object. JSON serialization is used to avoid the NAPI 32-field object limit.
- The adapter monitors execution time and logs a warning if computation exceeds the 5ms target.

### Two-Phase Computation

**Phase 1: Shared Dependencies (~2ms)**

Update the internal 120-bar sliding window cache and compute values that multiple features depend on:

- VWAP (Volume Weighted Average Price)
- ATR (Average True Range) across multiple lookback periods
- Moving averages (EMA-9, EMA-20, SMA-50)
- Rolling volatility measures

**Phase 2: Parallel Feature Computation (~1ms)**

Using Rayon's data-parallel thread pool (pinned to Core 5), compute all 117 features independently across 14 categories:

| Category                  | Feature Count | Examples                                                           |
| ------------------------- | ------------- | ------------------------------------------------------------------ |
| Index Breadth             | 6             | % stocks above VWAP, % above EMA-20, weighted breadth              |
| NIFTY Future Price        | 9             | Price vs VWAP, range position, multi-horizon returns               |
| NIFTY Future Technicals   | 8             | ATR, RSI, MACD signal, Bollinger %B                                |
| Options IV Surface        | 6             | ATM IV, IV skew, IV term structure slope                           |
| Options Greeks            | 5             | Gamma exposure, Vega, Theta, Charm, Vanna                          |
| Options Flow              | 5             | Put-Call Ratio (volume), PCR (OI), max pain delta                  |
| Order Book Microstructure | 8             | Bid-ask imbalance, depth pressure, trade intensity                 |
| Volatility Regime         | 6             | India VIX level, realized vol, vol expansion ratio, VIX-RV spread  |
| Volume Profile            | 7             | Relative volume, VWAP deviation, cumulative delta                  |
| Momentum                  | 10            | Multi-horizon returns (1m, 5m, 15m, 30m), ROC, momentum divergence |
| Mean Reversion            | 8             | Z-score vs VWAP, Bollinger bandwidth, RSI extremes                 |
| Trend Strength            | 12            | ADX, EMA alignment, higher-high/lower-low counts                   |
| Cross-Asset               | 8             | GIFT Nifty premium, DXY correlation, US futures lead               |
| Time Context              | 19            | Minutes from open, minutes to close, day of week, session phase    |
| **Total**                 | **117**       |                                                                    |

### FeatureInput Schema

```typescript
interface FeatureInput {
  timestamp: number; // Unix ms
  niftyFuture: {
    ltp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    openInterest: number;
  };
  constituents: Array<{
    symbol: string; // e.g., 'NSE_EQ|RELIANCE'
    ltp: number;
    open: number;
    volume: number;
  }>;
  options: Array<OptionData>; // CE/PE strikes with Greeks
  indiaVix?: number; // India VIX close
}
```

### ComputeResult Schema

```typescript
interface ComputeResult {
  features: FeatureOutput; // 117 named float fields
  totalDurationMicros: number; // Total computation time
  // Per-category timing for performance profiling
}
```

---

## 7. Pre-Market Session

The pre-market session handles the period before the continuous trading session begins at 09:15 IST. It captures overnight global macro data, NSE pre-open auction data, and publishes derived features for Tier 0 (pre-market gap prediction) and Tier 1 (early session models).

For the full pre-market specification, see [PRE_MARKET_SESSION.md](./PRE_MARKET_SESSION.md).

### Timeline

```
08:30 IST                09:00 IST               09:08 IST           09:15 IST
    |                        |                        |                    |
    |  OVERNIGHT COLLECTOR   |    PRE-OPEN SESSION    |  FREEZE CAPTURE    |  CONTINUOUS
    |                        |                        |                    |  TRADING
    |  Fetch global macro:   |  Connect to Upstox     |  Capture freeze:   |  BEGINS
    |  - ES, NQ futures      |  Subscribe pre-open    |  - Equilibrium     |
    |  - DXY (Dollar Index)  |  instruments:          |    price           |  Switch to
    |  - US 10Y yield        |  - NIFTY 50 equities   |  - Indicative      |  full tick
    |  - Gold (XAUUSD)       |  - NIFTY Future        |    index value     |  processing
    |  - Brent Crude         |  - Select options      |  - Final order     |  mode
    |  - Nikkei 225          |                        |    book snapshot   |
    |  - GIFT Nifty          |  Receive indicative    |                    |
    |                        |  prices (fluctuating)  |  Publish to Redis: |
    |  Publish to Redis:     |                        |  premarket:freeze  |
    |  premarket:overnight   |                        |                    |
    |                        |                        |                    |
    v                        v                        v                    v
```

### Overnight Data Collection (08:30 IST)

The `GlobalDataService` is triggered by the `SchedulerService` cron job (`preMarketGlobal` at 09:08 IST / 03:38 UTC). It collects overnight data from three providers:

| Provider      | Data                               | Instruments                                                             |
| ------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| Yahoo Finance | Global indices, commodities, forex | ES (S&P 500 futures), NQ (NASDAQ futures), DXY, Gold, Brent, Nikkei 225 |
| Alpha Vantage | US Treasury yield                  | US 10-Year yield (daily)                                                |
| Finnhub       | Market news sentiment              | General market news articles                                            |

Data is stored in QuestDB as daily candles and simultaneously published to `premarket:overnight` Redis stream.

### Pre-Open Freeze Capture (09:08 IST)

At exactly 09:08 IST, when the NSE pre-open order book freezes:

1. **Equilibrium price**: The price at which maximum volume can be traded.
2. **Indicative index value**: The projected NIFTY 50 opening level based on constituent equilibrium prices.
3. **Order book snapshot**: Final frozen state of the pre-open order book.

This data is published to `premarket:freeze` Redis stream for consumption by the algo-worker's Tier 0 model (Pre-Market Gap Predictor).

### GIFT Nifty Tracking

The `GiftNiftyService` tracks SGX GIFT Nifty futures price throughout the pre-market period. GIFT Nifty trades from 06:30 IST and serves as a leading indicator for the NIFTY 50 opening direction. The premium/discount versus previous NIFTY close is computed and included in pre-market features.

---

## 8. Redis Stream Output

### Stream Definitions

| Stream                | Content                                                    | Frequency                   | Max Length   | Consumer Group       |
| --------------------- | ---------------------------------------------------------- | --------------------------- | ------------ | -------------------- |
| `features:live`       | 117 features as serialized `FeatureOutput`                 | Every 60s (on candle close) | 1000 entries | `algo-worker:layer1` |
| `candles:1m`          | OHLCV candle for NIFTY Future                              | Every 60s                   | 500 entries  | `algo-worker:layer1` |
| `premarket:overnight` | Global macro features (8 instruments)                      | Once daily @ ~08:30 IST     | 50 entries   | `algo-worker:tier0`  |
| `premarket:freeze`    | Pre-open freeze data (equilibrium price, indicative index) | Once daily @ ~09:08 IST     | 50 entries   | `algo-worker:tier0`  |

### Stream Publishing Pattern

```typescript
// XADD with auto-generated ID (server timestamp)
await redis.xadd(
  'features:live',
  'MAXLEN',
  '~',
  '1000', // Approximate trimming for performance
  '*', // Auto-generate stream entry ID
  'timestamp',
  candle.timestamp.toISOString(),
  'instrument',
  'NSE_INDEX|Nifty 50',
  'features',
  Buffer.from(float32Array.buffer),
  'computeMs',
  result.totalDurationMicros / 1000,
);
```

### Real-Time Tick State (Redis Key-Value)

In addition to streams, the `RealtimeFeaturesService` publishes per-instrument tick state to Redis keys with a 1-hour TTL for live algorithmic lookup:

```
Key:    rt:tick:{instrumentKey}
Value:  {
          instrumentKey: string,
          timestamp: ISO string,
          ltp: number,
          volume: number,
          oi: number,
          imbalance: number,      // (totalBid - totalAsk) / (totalBid + totalAsk)
          delta: number | null,
          iv: number | null
        }
TTL:    3600 seconds
```

### Consumer Pattern (algo-worker)

The algo-worker reads from Redis Streams using `XREADGROUP` with consumer groups for guaranteed delivery and at-least-once processing semantics. Each Layer 1 inference cycle reads the latest entry from `features:live` and `candles:1m`.

---

## 9. Health Monitoring

### Tick Rate Monitoring

The `RealtimeFeaturesService` tracks tick throughput with per-minute logging:

```
Expected: ~50,000 ticks/second (~3,000,000 ticks/minute)
Warning threshold: <30,000 ticks/second (indicates subscription loss or exchange issue)
Critical threshold: <10,000 ticks/second (indicates WebSocket connection failure)
```

Throughput is logged every 60 seconds with the format:

```
Processing ~{tickCount} ticks/min. Latest: {instrumentKey} @ {ltp}
```

### Candle Gap Detection

The `GapDetectorService` provides two detection modes:

| Mode              | Chunk Size    | Use Case                                |
| ----------------- | ------------- | --------------------------------------- |
| Minute-level gaps | 7-day chunks  | Intraday data completeness verification |
| Daily-level gaps  | 30-day chunks | Historical backfill gap identification  |

Detected gaps are logged with coalesced ranges and fed to the `HistoricalBackfillService` for automatic repair via the nightly backfill cron job.

### WebSocket Connection Health

| Check               | Method                         | Frequency       |
| ------------------- | ------------------------------ | --------------- |
| Connection state    | State machine status           | Continuous      |
| Heartbeat/ping      | WebSocket ping frame           | Every 30s       |
| Subscription count  | Active subscription registry   | On state change |
| Last tick timestamp | Per-instrument staleness check | Every 60s       |

### Compute Engine Latency Tracking

The `ComputeEngineAdapter` monitors every invocation:

```typescript
if (result.totalDurationMicros > 5000) {
  this.logger.warn(
    `Feature computation exceeded 5ms target: ${result.totalDurationMicros}us`,
  );
}
```

Latency percentiles are tracked for alerting:

| Percentile | Target | Action           |
| ---------- | ------ | ---------------- |
| p50        | <3ms   | Normal operation |
| p95        | <5ms   | Within SLA       |
| p99        | <8ms   | Warning logged   |
| p99.9      | <15ms  | Alert triggered  |

### Redis Publish Success Rate

Each `XADD` operation is wrapped with error handling. Failed publishes are logged and counted. A publish failure rate exceeding 1% over a 5-minute window triggers an alert.

### Scheduled Health Jobs

The `SchedulerService` runs four cron jobs that each log to the `ProcessingLogRepository` for audit trail:

| Job                    | Schedule (IST)    | UTC Cron          | Description                                    |
| ---------------------- | ----------------- | ----------------- | ---------------------------------------------- |
| Nightly Backfill       | 12:00 AM Mon-Fri  | `0 30 18 * * 1-5` | Incremental candle gap repair (7-day lookback) |
| Pre-Market Global      | 09:08 AM Mon-Fri  | `0 38 3 * * 1-5`  | Overnight global macro data fetch              |
| EOD Reconciliation     | 04:00 PM Mon-Fri  | `0 30 10 * * 1-5` | Verify current day data completeness           |
| Weekly Instrument Sync | 06:00 AM Saturday | `0 30 0 * * 6`    | Refresh instrument master (new expiries)       |

---

## 10. Performance Targets

### Pipeline Latency Budget

| Stage                            | Target   | Budget   | Notes                                                            |
| -------------------------------- | -------- | -------- | ---------------------------------------------------------------- |
| Tick decode (protobuf to object) | <0.1ms   | 1.25%    | Binary protobuf deserialization                                  |
| Tick validation                  | <0.05ms  | 0.625%   | Staleness + range + sequence checks                              |
| Candle accumulation              | <1ms     | 12.5%    | OHLCV update per tick (amortized over minute)                    |
| Feature computation              | <5ms     | 62.5%    | Rust NAPI-RS: 2ms shared deps + 1ms parallel features + overhead |
| Redis publish                    | <1ms     | 12.5%    | XADD to features:live + candles:1m                               |
| **Total pipeline**               | **<8ms** | **100%** | **Tick-to-publish end-to-end latency**                           |

### Throughput Targets

| Metric               | Target            | Notes                                     |
| -------------------- | ----------------- | ----------------------------------------- |
| Tick ingestion rate  | 50,000 ticks/s    | ~150 instruments, full L2 depth           |
| QuestDB batch insert | 5,000 ticks/batch | 1-second flush interval                   |
| Candle generation    | 150 candles/min   | One per instrument per minute             |
| Feature computation  | 1 invocation/min  | Triggered on NIFTY Future candle close    |
| Redis publishes      | ~155/min          | 150 candles + 1 feature set + 4 ancillary |

### Memory Budget

| Component                 | Allocation  | Notes                                                  |
| ------------------------- | ----------- | ------------------------------------------------------ |
| Tick buffer               | ~50 MB      | 5000-tick ring buffer per flush cycle                  |
| Candle accumulators       | ~5 MB       | ~150 instruments, each with OHLCV state                |
| Rust compute-engine cache | ~30 MB      | 120-bar sliding window, all feature intermediate state |
| Redis connection pool     | ~10 MB      | ioredis client with connection pooling                 |
| Node.js heap overhead     | ~100 MB     | V8 heap, NestJS DI container, gRPC server              |
| **Total**                 | **~200 MB** | **Target RSS for market-feeder process**               |

### CPU Affinity

| Core       | Process              | Notes                                    |
| ---------- | -------------------- | ---------------------------------------- |
| Core 0-3   | OS + system services | General purpose                          |
| Core 4     | algo-worker          | Model inference                          |
| **Core 5** | **market-feeder**    | **Rayon thread pool for compute-engine** |
| Core 6     | risk-manager         | Position/margin calculations             |
| Core 7     | Redis + QuestDB      | Database I/O                             |

### Batch Feature Computation Performance (Historical Mode)

When running in `FEATURE_COMPUTATION_ENABLED` mode for historical batch processing:

| Metric             | Value                              | Notes                                            |
| ------------------ | ---------------------------------- | ------------------------------------------------ |
| Batch size         | 5,000 timestamps                   | Configurable via `BATCH_SIZE` constant           |
| DB queries per day | ~50                                | Down from 19,125 (batched fetching optimization) |
| Processing rate    | ~375 minutes of data per run       | Full trading day: 09:15-15:30 IST                |
| Feature storage    | `market_state_1m` table in QuestDB | Idempotent: safe to reprocess                    |
| Label horizons     | 1m, 5m, 15m, 30m                   | Multi-task learning with ATR-scaled thresholds   |

---

## Appendix A: Environment Variables

| Variable                          | Default                  | Description                             |
| --------------------------------- | ------------------------ | --------------------------------------- |
| `GRPC_PORT`                       | `50052`                  | gRPC server listen port                 |
| `PORT`                            | `3005`                   | HTTP health check port                  |
| `NODE_ENV`                        | `development`            | Runtime environment                     |
| `HISTORY_SAVER_ENABLED`           | `false`                  | Enable ingestion + historical modules   |
| `FEATURE_COMPUTATION_ENABLED`     | `false`                  | Enable batch feature computation        |
| `STRIKE_SELECTOR_ENABLED`         | `false`                  | Enable option strike selection          |
| `DATASET_GENERATION_ENABLED`      | `false`                  | Enable Parquet dataset export           |
| `WEBSOCKET_ENABLED`               | `false`                  | Enable Upstox WebSocket connection      |
| `WEBSOCKET_RECONNECT_INTERVAL`    | `5000`                   | Reconnection base interval (ms)         |
| `WEBSOCKET_BUFFER_FLUSH_INTERVAL` | `1000`                   | Tick buffer flush interval (ms)         |
| `REDIS_URL`                       | `redis://localhost:6379` | Redis connection URL                    |
| `QUESTDB_HOST`                    | `localhost`              | QuestDB hostname                        |
| `QUESTDB_PG_PORT`                 | `8812`                   | QuestDB PostgreSQL wire protocol port   |
| `QUESTDB_ILP_PORT`                | `9000`                   | QuestDB ILP (Influx Line Protocol) port |
| `UPSTOX_API_KEY`                  | (required)               | Upstox API key                          |
| `UPSTOX_API_SECRET`               | (required)               | Upstox API secret                       |
| `SCHEDULER_NIGHTLY_ENABLED`       | `false`                  | Enable nightly backfill cron            |
| `SCHEDULER_INTRADAY_ENABLED`      | `false`                  | Enable intraday cron jobs               |
| `SCHEDULER_LOOKBACK_DAYS`         | `7`                      | Nightly backfill lookback window        |
| `FETCH_CONCURRENCY`               | `5`                      | Parallel HTTP fetch limit               |
| `FETCH_MAX_RETRIES`               | `3`                      | Max retries per failed fetch            |

## Appendix B: Related Documentation

| Document                     | Path                                                               | Description                                                          |
| ---------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| gRPC Implementation          | [GRPC_IMPLEMENTATION.md](./GRPC_IMPLEMENTATION.md)                 | gRPC transport, proto definitions, service endpoints                 |
| Multi-Timeframe Strategy     | [MULTI_TIMEFRAME_STRATEGY.md](./MULTI_TIMEFRAME_STRATEGY.md)       | 1m/5m/15m candle generation and aggregation rules                    |
| NIFTY 50 Constituent Changes | [NIFTY50_CONSTITUENT_CHANGES.md](./NIFTY50_CONSTITUENT_CHANGES.md) | Historical additions/removals for survivorship-bias-free computation |
| Pre-Market Session           | [PRE_MARKET_SESSION.md](./PRE_MARKET_SESSION.md)                   | Full pre-open session specification (09:00-09:15 IST)                |
