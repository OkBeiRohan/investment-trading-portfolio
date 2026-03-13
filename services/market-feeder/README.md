# Market Feeder — Real-Time Data Ingestion & Feature Computation

> **Connects to Upstox WebSocket, builds 1-minute OHLCV candles, computes 117 features via Rust compute-engine (<5ms), and distributes features to algo-worker via Redis Streams. Handles NSE pre-market session, overnight global data collection, and NIFTY 50 constituent management.**

**Last Updated**: March 13, 2026
**Port**: 3002
**Framework**: NestJS + TypeScript
**Feature Engine**: @repo/compute-engine (Rust/NAPI-RS)
**Broker SDK**: @repo/market-sdk (Upstox WebSocket)

---

## System Overview

Market Feeder is the **data ingestion layer** responsible for converting raw exchange ticks into structured, feature-rich data. It sits between the broker WebSocket and the algo-worker, ensuring continuous data flow with sub-millisecond publishing latency.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         MARKET FEEDER PIPELINE                                  │
│                                                                                 │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐    ┌────────────────┐  │
│  │ Upstox   │ →  │ Tick Handler │ →  │ Candle Builder│ →  │ compute-engine │  │
│  │ WebSocket│    │ (normalize)  │    │ (1-min OHLCV) │    │ (Rust, <5ms)   │  │
│  └──────────┘    └──────────────┘    └───────────────┘    └───────┬────────┘  │
│                                                                     │           │
│                   ┌──────────────────────────────────────────────────┤           │
│                   │                                                  │           │
│                   ▼                                                  ▼           │
│  ┌─────────────────────────┐                       ┌────────────────────────┐  │
│  │ Redis Streams           │                       │ QuestDB                │  │
│  │ features:live → algo-wkr│                       │ instrument_features_1m │  │
│  │ candles:1m   → algo-wkr │                       │ market_candles         │  │
│  └─────────────────────────┘                       └────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Responsibilities

| Responsibility             | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| **WebSocket Management**   | Connect/reconnect to Upstox with exponential backoff      |
| **Tick Normalization**     | Normalize raw tick format into internal schema            |
| **Candle Generation**      | Aggregate ticks into 1-minute OHLCV candles               |
| **Feature Computation**    | Invoke Rust compute-engine for 117 features per candle    |
| **Feature Distribution**   | Publish features to Redis Streams for algo-worker         |
| **Data Persistence**       | Store features + candles to QuestDB for training-pipeline |
| **Pre-Market Session**     | Collect pre-open indicative prices for Tier 0             |
| **Global Data Collection** | Overnight GIFT Nifty, currencies, commodities, indices    |
| **Constituent Management** | Track NIFTY 50 constituents for breadth features          |
| **Health Monitoring**      | Connection status, data freshness, feature latency        |

### What This Service Does NOT Do

- ML inference (algo-worker)
- Trading decisions (algo-worker)
- Historical data backfill (training-pipeline)
- Model training (training-pipeline)

---

## Data Flow — Minute by Minute

### Normal Trading (09:15 - 15:30 IST)

```
Every tick (~10-50ms apart):
  1. Upstox WebSocket delivers raw tick
  2. TickHandler normalizes to internal format
  3. CandleBuilder accumulates into current minute candle

Every 1 minute (on minute boundary):
  4. CandleComplete event fires
  5. compute-engine receives candle + option chain + constituents
  6. Rust computes 117 features in <5ms (Rayon parallel)
  7. Features serialized to JSON (NAPI-RS boundary)
  8. Published to Redis Streams: features:live channel
  9. Stored to QuestDB: instrument_features_1m table
  10. algo-worker receives features, runs inference
```

### Pre-Market Session (09:00 - 09:15 IST)

```
09:00:00  NSE pre-open session begins
          → Subscribe to NIFTY Future + VIX indicative prices

09:08:00  NSE freezes indicative open price
          → Publish frozen price to Redis: premarket:indicative
          → algo-worker fires Tier 0 (gap prediction)

09:08-09:14  Indicative price stable
          → Estimate synthetic option Greeks from frozen price
          → algo-worker fires Tier 1 (regime detection)

09:14:55  Overnight candle synthesis deadline
          → Consolidate 17+ hours of global data into context vector
          → Publish to Redis: premarket:overnight_candle

09:15:00  Market opens — switch to continuous trading mode
          → Begin normal tick → candle → feature loop
```

### Overnight Collection (00:00 - 09:00 IST)

```
Continuous polling (1-minute intervals):
  - GIFT Nifty (SGX)        → futures proxy for NIFTY
  - EUR/INR, USD/INR        → currency impact
  - S&P 500 futures (ES)    → US market sentiment
  - NASDAQ futures (NQ)     → tech sentiment
  - Brent Crude             → energy/inflation proxy
  - Gold futures            → safe-haven demand
  - DXY (Dollar Index)      → global risk appetite
  - US 10Y yield            → rate expectations
  - VIX (CBOE)              → global vol proxy

Source: Yahoo Finance API (yfinance)
Storage: QuestDB global_market_data table
```

---

## WebSocket Connection Management

```
┌──────────────────────────────────────────────────────────────┐
│ CONNECTION STATE MACHINE                                      │
│                                                               │
│  DISCONNECTED ──connect──→ CONNECTING ──success──→ CONNECTED │
│       ↑                        │                       │      │
│       │                     failure                  error    │
│       │                        │                       │      │
│       │                        ▼                       │      │
│       └──max_retries──── RECONNECTING ←────────────────┘      │
│                            │                                  │
│                     exponential                               │
│                     backoff:                                  │
│                     1s → 2s → 4s → 8s → 16s → 30s (max)     │
└──────────────────────────────────────────────────────────────┘
```

### Subscribed Instruments

| Category                  | Instruments                   | Update Frequency | Purpose                 |
| ------------------------- | ----------------------------- | ---------------- | ----------------------- |
| **NIFTY Future**          | Current month future          | Every tick       | Primary price feed      |
| **NIFTY 50 Constituents** | 50 stocks                     | Every tick       | Breadth features        |
| **Option Chain**          | ATM ± 10 strikes × 2 expiries | Every tick       | IV surface, Greeks, PCR |
| **India VIX**             | VIX index                     | Every tick       | Volatility context      |

---

## Candle Generation

| Property          | Specification                                             |
| ----------------- | --------------------------------------------------------- |
| **Resolution**    | 1 minute (aligned to clock minute)                        |
| **Fields**        | open, high, low, close, volume, OI                        |
| **Trigger**       | Clock-aligned: fires at XX:XX:00.000 for previous minute  |
| **Edge Cases**    | No-tick minutes: forward-fill previous close, zero volume |
| **First Candle**  | 09:15-09:16 (first full minute after open)                |
| **Last Candle**   | 15:29-15:30 (final minute)                                |
| **Total Per Day** | 375 candles (6.25 hours × 60 min/hr)                      |

---

## Compute Engine Integration

```typescript
import { computeFeatures, type FeatureInput } from '@repo/compute-engine';

@Injectable()
export class FeatureComputationService {
  constructor(
    private redis: RedisService,
    private questdb: QuestDbService,
  ) {}

  async onCandleComplete(candle: Candle, options: OptionChain): Promise<void> {
    const input: FeatureInput = {
      timestamp: candle.timestamp,
      niftyFuture: {
        ltp: candle.close,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        openInterest: candle.oi,
      },
      constituents: this.getConstituents(),
      options: this.mapOptionsToTicks(options),
      indiaVix: this.latestVix,
    };

    // Rust computes 117 features in <5ms
    const result = computeFeatures(input);

    // Publish to Redis for algo-worker (live consumption)
    await this.redis.publish('features:live', JSON.stringify(result.features));

    // Store to QuestDB for training-pipeline (historical)
    await this.questdb.insert('instrument_features_1m', result.features);
  }
}
```

### Feature Categories (117 Total)

| Category            | Count | Examples                                                     |
| ------------------- | ----- | ------------------------------------------------------------ |
| **Index Breadth**   | 8     | `pct_above_vwap`, `breadth_thrust`, `advance_decline`        |
| **NIFTY Future**    | 12    | `fut_rsi_14`, `fut_macd`, `fut_atr_pct`, `fut_oi_change_pct` |
| **Options**         | 14    | `atm_iv`, `pcr_oi`, `pcr_volume`, `iv_skew`, `total_gex`     |
| **Volatility**      | 10    | `india_vix`, `realized_vol_5m`, `iv_rv_ratio`, `vol_of_vol`  |
| **Order Flow**      | 8     | `ofi_1s`, `ofi_5s`, `depth_imbalance_5`, `trade_imbalance`   |
| **Price Structure** | 8     | `return_1m`, `return_5m`, `gap_open`, `range_position`       |
| **Momentum**        | 8     | `rsi_5`, `rsi_14`, `macd_histogram`, `adx_14`, `cci_20`      |
| **Time Context**    | 13    | `minutes_from_open`, `session_phase`, sin/cos encodings      |
| **Global Macro**    | 12    | `es_return_1m`, `nq_return`, `brent_return`, `dxy_change`    |
| **Regime Context**  | 4     | `regime_state` (one-hot from Tier 1, via Redis)              |

See [FEATURE_SPECIFICATION.md](../../docs/ml/FEATURE_SPECIFICATION.md) for formulas.

---

## Dependencies

### Internal Packages

| Package                | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| `@repo/compute-engine` | Rust NAPI-RS feature computation (117 features, <5ms) |
| `@repo/market-sdk`     | Upstox WebSocket client + REST API                    |
| `@repo/database`       | QuestDB and Redis access layer                        |
| `@repo/schema`         | Shared TypeScript type definitions                    |

### External

| Library                   | Purpose                                         |
| ------------------------- | ----------------------------------------------- |
| NestJS                    | Application framework with dependency injection |
| Redis                     | Pub/Sub for feature distribution + hot cache    |
| QuestDB                   | Time-series storage for features + candles      |
| yfinance (Python sidecar) | Overnight global market data collection         |

---

## Data Outputs

| Output                | Channel/Table                    | Consumer              | Frequency        |
| --------------------- | -------------------------------- | --------------------- | ---------------- |
| Features (live)       | Redis `features:live`            | algo-worker           | Every 1 min      |
| Candles               | Redis `candles:1m`               | algo-worker           | Every 1 min      |
| Features (historical) | QuestDB `instrument_features_1m` | training-pipeline     | Every 1 min      |
| Candles (historical)  | QuestDB `market_candles`         | All services          | Every 1 min      |
| Ticks (raw)           | QuestDB `tick_data`              | Analysis              | Every tick       |
| Pre-market data       | Redis `premarket:*`              | algo-worker           | Pre-open session |
| Global market data    | QuestDB `global_market_data`     | algo-worker, training | Every 1 min      |

---

## NIFTY 50 Constituent Management

Constituents are required for Index Breadth features (`pct_above_vwap`, `breadth_thrust`, `advance_decline`, etc.).

| Property             | Specification                                               |
| -------------------- | ----------------------------------------------------------- |
| **Source**           | NSE official NIFTY 50 list                                  |
| **Update Frequency** | Semi-annual (March + September reconstitution)              |
| **Storage**          | MongoDB `nifty50_constituents` collection                   |
| **Subscription**     | All 50 stocks subscribed on WebSocket at startup            |
| **Feature Use**      | Index breadth (8 features), advance/decline, new highs/lows |

---

## Health Monitoring

```
GET /health
```

```json
{
  "status": "healthy",
  "websocket": {
    "state": "connected",
    "lastTick": "2026-03-13T10:30:01.050+05:30",
    "ticksPerSecond": 45,
    "subscribedInstruments": 72
  },
  "databases": {
    "questdb": "connected",
    "redis": "connected"
  },
  "features": {
    "lastComputed": "2026-03-13T10:30:00.004+05:30",
    "computeLatencyMs": 3.8,
    "totalComputedToday": 4500,
    "failedComputations": 0
  },
  "candles": {
    "currentMinute": "2026-03-13T10:30:00.000+05:30",
    "ticksInCurrentCandle": 38
  }
}
```

---

## Configuration

### Environment Variables

```bash
# Upstox API
UPSTOX_API_KEY=your_api_key
UPSTOX_API_SECRET=your_api_secret
UPSTOX_ACCESS_TOKEN=your_access_token

# Databases
QUESTDB_HOST=localhost
QUESTDB_PORT=9000
REDIS_URL=redis://localhost:6379

# Feature computation
FEATURE_COMPUTATION_ENABLED=true

# Global data collection
GLOBAL_DATA_ENABLED=true
GLOBAL_DATA_SOURCES=gift_nifty,es,nq,brent,gold,dxy,eurinr,usdinr,us10y,vix
```

---

## Quick Start

```bash
# 1. Install dependencies (from monorepo root)
cd investment-trading-portfolio
pnpm install

# 2. Build compute-engine (Rust native module)
pnpm build --filter=@repo/compute-engine

# 3. Build shared packages
pnpm build --filter=@repo/schema
pnpm build --filter=@repo/database

# 4. Configure environment
cd services/market-feeder
cp .env.example .env
# Edit .env with Upstox credentials and database URLs

# 5. Development
pnpm dev

# 6. Production
pnpm build && pnpm start:prod
```

---

## Related Documentation

- [compute-engine](../../packages/compute-engine/README.md) — Rust feature computation (117 features, <5ms)
- [algo-worker](../../apps/algo-worker/README.md) — Trading engine (consumes features)
- [ML Architecture](../../docs/ml/README.md) — AI/ML model documentation
- [MODEL_PIPELINE_WORKFLOW.md](../../docs/ml/MODEL_PIPELINE_WORKFLOW.md) — Full session timing
- [FEATURE_SPECIFICATION.md](../../docs/ml/FEATURE_SPECIFICATION.md) — All 117 feature definitions

---

**Architecture**: NestJS event-driven with Rust compute-engine
**Features**: 117 computed per candle (<5ms)
**Data Sources**: Upstox WebSocket + Yahoo Finance (overnight)
**Outputs**: Redis Streams (live) + QuestDB (historical)
**Last Updated**: March 13, 2026
