# Market Feeder — Real-Time Data Ingestion & Market Intelligence

> **Auth-agnostic data ingestion service. Fetches admin-enabled trading instruments from DB, streams live ticks via Upstox WebSocket (market hours), syncs historical candles to QuestDB (post-market), and distributes market data to algo-worker, api-gateway, and QuestDB. Covers Indian equities, F&O, indices AND global commodities (Crude Oil, Natural Gas, Gold via MCX).**

**Last Updated**: March 16, 2026  
**Port**: 3002  
**Framework**: NestJS + TypeScript  
**Feature Engine**: @repo/compute-engine (Rust/NAPI-RS)  
**Broker SDK**: @repo/market-sdk (multi-token WebSocket + REST)

---

## Core Philosophy

**Market Feeder does NOT care about authentication.**

All authentication, token management, and access token selection is handled exclusively by `@repo/market-sdk`. Market Feeder simply declares what data it needs; the SDK handles *who* authenticates it.

Market Feeder's only job: **fetch the right data, at the right time, in the right format — and distribute it efficiently.**

---

## System Architecture

```
                         ┌─────────────────────────────┐
                         │        MONGODB (DB)          │
                         │  enabled_trading_instruments │ ← Admin configures
                         │  instrument_registry         │   via Web UI
                         └────────────┬────────────────┘
                                      │ "what to watch"
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            MARKET FEEDER                                         │
│                                                                                  │
│  ┌──────────────────┐    ┌────────────────────┐    ┌────────────────────────┐   │
│  │  InstrumentSync  │    │  LiveDataService   │    │  HistoricalBackfill    │   │
│  │  (daily refresh) │    │  (market hours)    │    │  (post-market sync)    │   │
│  └────────┬─────────┘    └────────┬───────────┘    └───────────┬────────────┘   │
│           │                       │                             │                │
│           ▼                       ▼                             ▼                │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                      @repo/market-sdk                                    │   │
│  │  (Selects access tokens, manages WebSocket, respects rate limits)        │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌────────────────────────┐    ┌──────────────────┐    ┌────────────────────┐   │
│  │  FeatureComputation    │    │  Redis Streams   │    │  QuestDB Writer    │   │
│  │  (Rust, <5ms / candle) │───▶│  features:live   │    │  tick_data         │   │
│  └────────────────────────┘    │  candles:1m      │    │  market_candles    │   │
│                                 └──────────────────┘    │  instrument_feat.. │   │
└─────────────────────────────────────────────────────────└────────────────────┘──┘
                 │                         │                         │
                 ▼                         ▼                         ▼
          algo-worker               api-gateway (web)          training-pipeline
```

---

## What Market Feeder Manages

### Instrument Categories

Market Feeder streams **all instruments that admins have enabled** in the DB. These span:

| Category             | Examples                                              | Data Type          | Notes                                        |
|----------------------|-------------------------------------------------------|--------------------|----------------------------------------------|
| **NSE Indices**      | NIFTY 50, NIFTY BANK, NIFTY IT, MIDCAP               | Spot price, no vol | No constituents exposed via WebSocket        |
| **BSE Indices**      | SENSEX, BANKEX                                        | Spot price         | —                                            |
| **NSE Equities**     | RELIANCE, TCS, HDFC BANK, etc.                        | Full quote + volume| Options attached if F&O enabled              |
| **NSE F&O**          | NIFTY/BANKNIFTY Futures & Options                     | Full quote + OI    | Strike selector manages ATM±N chains         |
| **MCX Commodities**  | Crude Oil, Natural Gas, Gold, Silver, Copper          | Full quote + OI    | **Mandatory global macro data**              |
| **Currency**         | USDINR, EURINR, GBPINR (NSE CDS)                     | Full quote         | FX impact on portfolio                       |

> **Stocks have volume in their spot quote, but indices do NOT have constituent data exposed via WebSocket.** Constituent lists are fetched via REST API during instrument sync.

### Instrument Sync (Daily, Pre-Market)

Every morning before market open, Market Feeder:
1. Fetches the **full instrument list from Upstox API** (NSE + BSE + MCX + CDS)
2. Updates the `instrument_registry` collection in MongoDB with new expiries, new strikes, new symbols
3. This ensures fresh F&O contracts (weekly/monthly expiries, new option strikes from NSE) are always available
4. Admin can then enable/disable specific instruments via the Web UI

---

## Market Hours Data Flow

### Live Trading Session (09:15 – 15:30 IST)

```
Every tick (~10–50ms):
  1. Upstox WebSocket delivers raw Protobuf v3 tick
  2. TickHandler normalizes: instrumentKey, ltp, bid/ask, volume, OI
  3. CandleBuilder accumulates into current minute OHLCV candle

Every minute boundary (XX:XX:00.000):
  4. CandleComplete event fires
  5. compute-engine receives candle + option chain + breadth data
  6. Rust computes 117 features in <5ms (Rayon parallel)
  7. Publish to Redis Streams:
       → features:live   (consumed by algo-worker)
       → candles:1m      (consumed by algo-worker + api-gateway)
  8. Write to QuestDB:
       → instrument_features_1m (training-pipeline)
       → market_candles (all consumers)
       → tick_data (optional, analysis)
```

### MCX Commodity Session (09:00 – 23:30 IST)

MCX runs a longer session. During its active hours, Crude Oil, Natural Gas, Gold, and Silver prices are streamed continuously and stored alongside NSE data. This ensures the feature computation engine always has up-to-date global commodity context even after NSE closes at 15:30.

```
Streaming (09:00 – 23:30 IST):
  - Crude Oil (MCX)     → energy/inflation proxy
  - Natural Gas (MCX)   → energy demand proxy
  - Gold (MCX)          → safe-haven demand
  - Silver (MCX)        → industrial + safe-haven
  - Copper (MCX)        → industrial activity proxy
```

### Pre-Market Session (09:00 – 09:15 IST)

```
09:00:00  NSE pre-open session begins
          → Subscribe pre-open NIFTY Future + VIX indicative prices

09:08:00  NSE freezes indicative open price
          → Publish to Redis: premarket:indicative
          → algo-worker fires Tier 0 (gap prediction)

09:08–09:14  Indicative price stable
          → Estimate synthetic option Greeks from frozen price
          → algo-worker fires Tier 1 (regime detection)

09:14:55  Overnight candle synthesis deadline
          → Consolidate global data into context vector
          → Publish to Redis: premarket:overnight_candle

09:15:00  Market opens — switch to live WebSocket mode
```

### Overnight Global Data (00:00 – 09:00 IST)

Yahoo Finance API is used for assets not available on Upstox overnight:

```
Continuous polling (1-minute intervals):
  - GIFT Nifty (SGX)        → NIFTY proxy for overnight
  - S&P 500 Futures (ES)    → US market sentiment
  - NASDAQ Futures (NQ)     → Tech sentiment
  - Brent Crude             → International crude proxy
  - Gold Futures (GC)       → Safe-haven demand
  - DXY (Dollar Index)      → Global risk appetite
  - EUR/USD                 → Global FX context
  - US 10Y Yield (^TNX)     → Rate expectations
  - VIX (CBOE)              → Global vol proxy

Source:   Yahoo Finance API (yfinance)
Storage:  QuestDB → global_market_data table
```

---

## Post-Market Sync (After 15:30 IST)

When the market closes, Market Feeder performs a comprehensive sync:

1. **Gap Detection**: Scans all enabled instrument candles in QuestDB. Identifies any missing 1-minute slots caused by WebSocket drops, reconnection delays, or data gaps.

2. **Historical Backfill**: For each detected gap, fetches the missing 1-minute candles from Upstox Historical API via `@repo/market-sdk`.

3. **Label Generation Trigger**: Publishes a `sync.complete` event to Redis, which signals `algo-worker` to:
   - Compare predicted labels (from earlier AI inference) with actual close prices
   - Compute label accuracy (prediction quality delta)
   - Store performance metrics to QuestDB for overnight model retraining

4. **MCX End-of-Day**: Fetches MCX end-of-day settlement prices and stores them for overnight training context.

This nightly reconciliation ensures the training dataset is **gapless and accurate** before overnight ML model training begins.

---

## Compute Engine Integration

```typescript
import { computeFeatures, type FeatureInput } from '@repo/compute-engine';

async onCandleComplete(candle: Candle, options: OptionChain, breadth: BreadthData): Promise<void> {
  const input: FeatureInput = {
    timestamp: candle.timestamp,
    niftyFuture: { ltp: candle.close, open: candle.open, high: candle.high,
                   low: candle.low, close: candle.close, volume: candle.volume, oi: candle.oi },
    constituents: breadth.symbols,           // N50 for breadth features
    options: this.mapOptionsToTicks(options), // ATM±10 strikes × 2 expiries
    indiaVix: this.latestVix,
    mcxData: this.latestMCXSnapshot(),       // Crude Oil, Gold, Nat Gas prices
  };

  const result = computeFeatures(input); // Rust, <5ms

  // Live distribution
  await this.redis.xadd('features:live', result.features);
  await this.redis.xadd('candles:1m', candle);

  // Historical persistence
  await this.questdb.insert('instrument_features_1m', result.features);
  await this.questdb.insert('market_candles', candle);
}
```

### Feature Categories (117 Total)

| Category           | Count | Examples                                                    |
|--------------------|-------|-------------------------------------------------------------|
| **Index Breadth**  | 8     | `pct_above_vwap`, `breadth_thrust`, `advance_decline`       |
| **NIFTY Future**   | 12    | `fut_rsi_14`, `fut_macd`, `fut_atr_pct`, `fut_oi_change_pct`|
| **Options**        | 14    | `atm_iv`, `pcr_oi`, `pcr_volume`, `iv_skew`, `total_gex`   |
| **Volatility**     | 10    | `india_vix`, `realized_vol_5m`, `iv_rv_ratio`, `vol_of_vol` |
| **Order Flow**     | 8     | `ofi_1s`, `ofi_5s`, `depth_imbalance_5`, `trade_imbalance`  |
| **Price Structure**| 8     | `return_1m`, `return_5m`, `gap_open`, `range_position`      |
| **Momentum**       | 8     | `rsi_5`, `rsi_14`, `macd_histogram`, `adx_14`, `cci_20`     |
| **Time Context**   | 13    | `minutes_from_open`, `session_phase`, sin/cos encodings     |
| **Global Macro**   | 12    | `crude_oil_pct`, `gold_change`, `nat_gas_change`, `dxy`     |
| **Regime Context** | 4     | `regime_state` (one-hot from Tier 1, via Redis Streams)     |

---

## Data Outputs

| Output                | Channel / Table                  | Consumer                    | Frequency              |
|-----------------------|----------------------------------|-----------------------------|------------------------|
| Live features         | Redis Stream `features:live`     | algo-worker                 | Every 1 min            |
| Live candles          | Redis Stream `candles:1m`        | algo-worker, api-gateway    | Every 1 min            |
| Features (historical) | QuestDB `instrument_features_1m` | training-pipeline           | Every 1 min            |
| Candles (historical)  | QuestDB `market_candles`         | All consumers               | Every 1 min            |
| Tick data             | QuestDB `tick_data`              | Analysis                    | Every tick             |
| Pre-market data       | Redis `premarket:*`              | algo-worker                 | Pre-open session       |
| Global macro          | QuestDB `global_market_data`     | algo-worker, training       | Every 1 min (overnight)|
| MCX commodities       | QuestDB `mcx_data`               | algo-worker, training       | Live + end-of-day      |
| Sync complete event   | Redis `sync.complete`            | algo-worker (label gen)     | Post-market, once/day  |

---

## Module Structure

```
src/
├── app.module.ts                  # Root module — feature flags via env vars
├── config/                        # Configuration & environment schemas
├── ingestion/                     # Main ingestion orchestration
│   ├── ingestion.module.ts        # Imports market-sdk modules
│   ├── instrument-sync.service.ts # Daily instrument refresh from Upstox API
│   ├── live-data.service.ts       # WebSocket tick handler + candle builder
│   ├── historical-backfill.service.ts # Post-market gap fill via REST API
│   ├── global-data.service.ts     # Overnight Yahoo Finance + MCX polling
│   ├── gap-detector.service.ts    # Detects missing candle slots in QuestDB
│   └── scheduler.service.ts       # Cron scheduling (pre-market, post-market)
├── feature-computation/           # Rust compute-engine integration
├── strike-selector/               # ITM/ATM/OTM option chain management
├── historical-data/               # Legacy backfill (deprecated — use ingestion)
└── dataset-generation/            # Feature export to Parquet for ML training
```

---

## Dependencies

### Internal Packages

| Package                | Purpose                                                        |
|------------------------|----------------------------------------------------------------|
| `@repo/market-sdk`     | **All** Upstox API calls & WebSocket — auth handled here       |
| `@repo/compute-engine` | Rust NAPI-RS feature computation (117 features, <5ms)          |
| `@repo/database`       | QuestDB + MongoDB + Redis access layer                         |
| `@repo/schema`         | Shared TypeScript types                                        |

> **Important**: Market Feeder does NOT import `@repo/authentication`. All token management lives in `@repo/market-sdk`.

### External

| Library            | Purpose                                            |
|--------------------|----------------------------------------------------|
| NestJS             | Application framework with dependency injection    |
| Redis Streams      | Pub/Sub for feature/candle distribution            |
| QuestDB            | Time-series storage for all market data            |
| MongoDB            | Instrument registry + admin-enabled instrument set |
| Yahoo Finance API  | Overnight global data (yfinance)                   |

---

## Feature Flags (Environment Variables)

All major subsystems can be toggled independently:

```bash
# ─── Feature Flags ──────────────────────────────────────────────
HISTORY_SAVER_ENABLED=true          # Enable QuestDB writes + scheduling
FEATURE_COMPUTATION_ENABLED=true    # Enable Rust compute-engine
STRIKE_SELECTOR_ENABLED=true        # Enable ATM option chain management
DATASET_GENERATION_ENABLED=false    # Enable Parquet export for training

# ─── Database ───────────────────────────────────────────────────
QUESTDB_HOST=localhost
QUESTDB_PORT=9000
MONGODB_URI=mongodb://localhost:27017/trading
REDIS_URL=redis://localhost:6379

# ─── Global Data ────────────────────────────────────────────────
GLOBAL_DATA_ENABLED=true
GLOBAL_DATA_SOURCES=gift_nifty,es,nq,brent,gold,nat_gas,dxy,us10y,vix

# NOTE: No Upstox API keys here — @repo/market-sdk handles all auth.
# Access tokens are fetched from MongoDB via AuthManagerService in market-sdk.
```

---

## WebSocket Connection Management

```
DISCONNECTED ──connect──→ CONNECTING ──success──→ CONNECTED
      ↑                       │                       │
      │                    failure                  error
      │                       │                       │
      └──max_retries───── RECONNECTING ←──────────────┘
                              │
                       exponential backoff:
                       1s → 2s → 4s → 8s → 16s → 30s (max)
```

**Token selection for WebSocket is managed by `@repo/market-sdk`:**
1. Admin accounts with `isDataCollectionEnabled = true` are selected **first**
2. If admin token unavailable, falls back to authenticated trader tokens
3. If rate limits are approached, WebSocket subscriptions are maintained; deep OTM options are evicted before ATM positions

---

## Health API

```
GET /health
```

```json
{
  "status": "healthy",
  "websocket": {
    "state": "connected",
    "lastTick": "2026-03-16T10:30:01.050+05:30",
    "ticksPerSecond": 45,
    "subscribedInstruments": 127,
    "enabledInstruments": 12
  },
  "databases": {
    "questdb": "connected",
    "mongodb": "connected",
    "redis": "connected"
  },
  "features": {
    "lastComputed": "2026-03-16T10:30:00.004+05:30",
    "computeLatencyMs": 3.8,
    "totalComputedToday": 4500
  },
  "mcx": {
    "crudeOil": 6821.5,
    "naturalGas": 184.2,
    "gold": 91480.0,
    "lastUpdated": "2026-03-16T10:29:00.000+05:30"
  }
}
```

---

## Quick Start

```bash
# From monorepo root:
pnpm install
pnpm build --filter=@repo/compute-engine   # Rust native module (required)
pnpm build --filter=@repo/schema
pnpm build --filter=@repo/database
pnpm build --filter=@repo/market-sdk

cd services/market-feeder
cp .env.example .env
# Edit .env — add DB URLs only. No Upstox keys needed here.

pnpm dev         # Development
pnpm build && pnpm start:prod   # Production
```

---

## Related Documentation

- [market-sdk](../../packages/market-sdk/README.md) — Multi-token auth + WebSocket management
- [authentication](../../packages/authentication/README.md) — User auth + Upstox token lifecycle
- [compute-engine](../../packages/compute-engine/README.md) — Rust feature computation
- [algo-worker](../../apps/algo-worker/README.md) — Trading engine (consumes Redis Streams)
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — Detailed system architecture
- [ML Architecture](../../docs/ml/README.md) — AI/ML model documentation

---

**Last Updated**: March 16, 2026  
**Architecture**: NestJS + Rust compute-engine + Redis Streams + QuestDB  
**Auth**: Fully delegated to `@repo/market-sdk`  
**Data Coverage**: NSE (Equities, F&O, Indices) + MCX (Crude Oil, Natural Gas, Gold) + Global Macro
