# Market Feeder

> **Real-time market data ingestion service with compute-engine integration for feature computation.**

**Port**: 3002  
**Last Updated**: January 18, 2026

---

## Purpose

Market Feeder is the **data ingestion layer** that:

1. Connects to Upstox WebSocket for real-time market data
2. Computes features using **compute-engine (Rust)**
3. Publishes features to Redis for algo-worker
4. Stores data to QuestDB for training

### What This Service Does

- ✅ Subscribe to Upstox WebSocket for live tick data
- ✅ Generate 1-minute candles from tick data
- ✅ Compute 33 features using compute-engine (Rust, <5ms)
- ✅ Publish features to Redis Pub/Sub (`features:live`)
- ✅ Store features to QuestDB (`instrument_features_1m`)
- ✅ Handle reconnection with exponential backoff
- ✅ Monitor connection health

### What This Service Should NOT Do

- ❌ ML inference (use algo-worker)
- ❌ Trading decisions (use algo-worker)
- ❌ Historical data processing (use training-pipeline)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MARKET FEEDER (NestJS)                               │
│                                                                              │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│   │ Upstox          │ →  │ Tick Handler    │ →  │ Candle Builder  │         │
│   │ WebSocket       │    │                 │    │ (1-min OHLCV)   │         │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                                                          ↓                   │
│   ┌─────────────────┐    ┌─────────────────────────────────────────────┐   │
│   │ QuestDB         │ ←  │ compute-engine (Rust/NAPI)                  │   │
│   │ (Storage)       │    │ 33 features in <5ms                         │   │
│   └─────────────────┘    └─────────────────────────────────────────────┘   │
│                                    ↓                                         │
│                          ┌─────────────────┐                                │
│                          │ Redis Pub/Sub   │ → algo-worker                  │
│                          │ (features:live) │                                │
│                          └─────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Dependencies

### Internal Packages

| Package | Purpose |
|---------|---------|
| `@repo/compute-engine` | **Rust NAPI-RS** feature computation |
| `@repo/market-sdk` | Upstox WebSocket client |
| `@repo/database` | QuestDB and Redis access |
| `@repo/schema` | Type definitions |

### External

| Library | Purpose |
|---------|---------|
| NestJS | Application framework |
| Redis | Pub/Sub for feature distribution |
| QuestDB | Time-series storage |

---

## Data Flow

```
1. Upstox WebSocket sends tick data
   ↓
2. TickHandler aggregates into 1-min candles
   ↓
3. CandleComplete event triggers feature computation
   ↓
4. compute-engine (Rust) computes 33 features (<5ms)
   ↓
5. Features published to Redis (features:live channel)
   ↓
6. Features stored to QuestDB (instrument_features_1m table)
   ↓
7. algo-worker subscribes to Redis and runs inference
```

---

## Quick Start

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build compute-engine
cd packages/compute-engine
pnpm build

# Configure environment
cd services/market-feeder
cp .env.example .env
# Edit .env with Upstox credentials

# Development
pnpm dev

# Production
pnpm build
pnpm start:prod
```

---

## Integration with Compute Engine

```typescript
import { computeFeatures, FeatureInput } from '@repo/compute-engine';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureComputationService {
  constructor(
    private redis: RedisService,
    private questdb: QuestDbService,
  ) {}

  async onCandleComplete(candle: Candle, options: OptionChain) {
    // Prepare input for compute-engine
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

    // Compute features (Rust, <5ms)
    const result = computeFeatures(input);
    
    console.log(`Features computed in ${result.totalDurationMicros}µs`);

    // Publish to Redis for algo-worker
    await this.redis.publish('features:live', JSON.stringify(result.features));

    // Store to QuestDB for training
    await this.questdb.insert('instrument_features_1m', result.features);
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
```

---

## Outputs

| Output | Destination | Consumer |
|--------|-------------|----------|
| Features (live) | Redis `features:live` | algo-worker |
| Features (historical) | QuestDB `instrument_features_1m` | training-pipeline |
| Candles | QuestDB `market_candles` | All services |
| Ticks | QuestDB `tick_data` | Analysis |

---

## Health Monitoring

```bash
GET /health
```

Returns:

```json
{
  "status": "healthy",
  "websocket": "connected",
  "questdb": "connected",
  "redis": "connected",
  "lastTick": "2026-01-18T09:30:01.000Z",
  "featuresComputed": 12500
}
```

---

## Related Documentation

- [compute-engine README](../../packages/compute-engine/README.md) - Rust feature computation
- [algo-worker README](../../apps/algo-worker/README.md) - Trading engine
- [ML Architecture](../../docs/ml/README.md) - AI/ML overview

---

**Status**: Active Development  
**Technology**: NestJS, Rust (NAPI-RS), QuestDB, Redis
