# Feature Store Architecture

> **Direct Redis + QuestDB feature store for consistent training and serving.**

**Last Updated**: March 13, 2026
**Architecture**: 5-Tier Data-Bound Hierarchical

---

## Overview

The feature store ensures **training-serving consistency** by providing a single source of truth for all ML features:

- **Offline Store (QuestDB)**: `instrument_features` table — 117 features for historical batch training
- **Online Store (Redis)**: Direct writes via `ioredis` — sub-millisecond serving for real-time inference
- **Computation**: Rust `compute-engine` (real-time) + Python `training-pipeline` (batch)

```
┌──────────────────────────────────────────────────────────────────┐
│                     FEATURE PIPELINE                              │
│                                                                   │
│  ┌────────────┐    ┌─────────────────┐    ┌────────────────────┐ │
│  │ Raw Data   │    │ Rust compute-   │    │ Feature Store      │ │
│  │ (Upstox    │ →  │ engine (NAPI)   │ →  │                    │ │
│  │  WebSocket)│    │ + market-feeder │    │ ┌──────┐ ┌──────┐ │ │
│  └────────────┘    └─────────────────┘    │ │QuestDB│ │Redis │ │ │
│                                            │ └──┬───┘ └──┬───┘ │ │
│                                            └────┼────────┼─────┘ │
│                                                  │        │       │
│                      ┌───────────────────────────┘        │       │
│                      ▼                                    ▼       │
│             ┌────────────────┐                 ┌──────────────┐  │
│             │ training-      │                 │ algo-worker   │  │
│             │ pipeline       │                 │ (Inference)   │  │
│             │ (Kedro, batch) │                 │ (real-time)   │  │
│             └────────────────┘                 └──────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Offline Store — QuestDB `instrument_features`

The offline store is the `instrument_features` table in QuestDB with **117 columns** grouped into 13 categories. This is the source of truth for training data.

**Schema**: `packages/schema/sql/schema/create_instrument_features.sql`
**Zod validation**: `packages/schema/src/market-data/questdb-tables.schema.ts`

### Feature Categories (117 total)

| Category | Count | Key Features |
|----------|-------|-------------|
| Index Breadth | 8 | `pct_stocks_above_vwap`, `advance_decline_ratio`, `breadth_thrust` |
| Futures | 12 | `fut_price_vs_vwap`, `fut_return_5m`, `fut_oi_change`, `fut_rsi_14` |
| Options | 14 | `atm_iv`, `iv_skew`, `pcr_oi`, `max_pain_distance`, `vanna_atm` |
| Volatility | 10 | `india_vix`, `realized_vol_5m`, `iv_rv_ratio`, `vix_percentile_1yr` |
| Order Flow | 8 | `bid_ask_spread_bps`, `ofi_1s`, `trade_imbalance`, `bid_slope` |
| Price Structure | 8 | `close`, `return_1d`, `gap_open`, `close_vs_high_20d` |
| Momentum | 8 | `rsi_14`, `macd`, `adx_14`, `plus_di`, `minus_di` |
| Moving Averages | 6 | `sma_20`, `sma_200`, `ema_12`, `ema_26` |
| MA Signals | 4 | `price_vs_sma_20`, `price_vs_sma_50`, `golden_cross` |
| Bollinger | 2 | `bollinger_width`, `bollinger_position` |
| Volume | 4 | `volume_sma_20_ratio`, `obv_change`, `accumulation_dist` |
| Regime | 4 | `trend_strength`, `mean_reversion_signal`, `momentum_regime` |
| Time Context | 9 | `minutes_from_open`, `is_expiry_day`, `session_phase` |
| Cyclical Encoding | 4 | `time_sin`, `time_cos`, `day_of_week_sin`, `day_of_week_cos` |
| Global Macro | 12 | `gift_nifty_premium`, `sp500_overnight_return`, `brent_crude_change` |
| Pre-Market | 4 | `actual_gap_pct`, `pre_market_bias`, `overnight_news_sentiment` |

### Querying Training Data

```sql
SELECT f.*, l.target_return_5m, l.target_direction_5m
FROM instrument_features f
INNER JOIN training_labels l
  ON f.timestamp = l.timestamp
  AND f.instrument_key = l.instrument_key
  AND f.interval_value = l.interval_value
  AND f.interval_unit = l.interval_unit
WHERE f.is_valid = TRUE AND l.is_valid = TRUE
  AND f.interval_value = 1 AND f.interval_unit = 'minute'
  AND f.timestamp BETWEEN '2020-01-01' AND '2025-12-31'
ORDER BY f.timestamp;
```

---

## Online Store — Redis (Direct Writes)

Features are written directly to Redis using `ioredis` from the `@repo/database` package. No Feast, no materialization — direct writes for minimal latency.

### Key Schema

```
features:{instrument_key}:{interval}  →  Hash of all 117 feature values
```

Example:
```
features:NSE_INDEX|Nifty 50:1m  →  {
  "pct_stocks_above_vwap": "0.72",
  "fut_return_5m": "0.0015",
  "atm_iv": "16.5",
  ...
}
```

### Write Pattern (TypeScript — market-feeder)

```typescript
import Redis from 'ioredis';

export class FeatureRedisService {
  constructor(private readonly redis: Redis) {}

  async writeFeatures(
    instrumentKey: string,
    interval: string,
    features: Record<string, number>,
    ttlSeconds: number = 300,  // 5 min TTL
  ): Promise<void> {
    const key = `features:${instrumentKey}:${interval}`;
    const stringified = Object.fromEntries(
      Object.entries(features).map(([k, v]) => [k, v.toString()])
    );
    await this.redis.hset(key, stringified);
    await this.redis.expire(key, ttlSeconds);
  }

  async readFeatures(
    instrumentKey: string,
    interval: string,
    featureNames: string[],
  ): Promise<Record<string, number | null>> {
    const key = `features:${instrumentKey}:${interval}`;
    const pipe = this.redis.pipeline();
    for (const name of featureNames) {
      pipe.hget(key, name);
    }
    const results = await pipe.exec();
    return Object.fromEntries(
      featureNames.map((name, i) => [
        name,
        results?.[i]?.[1] ? parseFloat(results[i][1] as string) : null,
      ])
    );
  }
}
```

### Read Pattern (Python — algo-worker inference)

```python
import redis
import numpy as np

def get_online_features(
    instrument_key: str = "NSE_INDEX|Nifty 50",
    interval: str = "1m",
    feature_names: list[str] | None = None,
) -> np.ndarray:
    """Get latest feature vector from Redis for model inference."""
    r = redis.Redis(host="localhost", port=6379, decode_responses=True)
    key = f"features:{instrument_key}:{interval}"

    if feature_names:
        values = r.hmget(key, *feature_names)
    else:
        values = list(r.hgetall(key).values())

    return np.array([float(v) if v else 0.0 for v in values], dtype=np.float64)
```

---

## Computation Pipeline

Features are computed by two systems:

### 1. Rust `compute-engine` (Real-time)

The `@repo/compute-engine` package is a Rust NAPI module that computes features at sub-millisecond latency. It processes live tick data from the WebSocket multiplexer.

**Source**: `packages/compute-engine/src/`

| Module | Features Computed |
|--------|-------------------|
| `features/index_breadth.rs` | `pct_stocks_above_vwap`, `advance_decline_ratio`, etc. |
| `features/nifty_future.rs` | `fut_price_vs_vwap`, `fut_return_*`, `fut_rsi_14`, etc. |
| `features/options.rs` | `atm_iv`, `iv_skew`, `pcr_oi`, `gamma_atm`, etc. |
| `features/volatility.rs` | `india_vix`, `realized_vol_*`, `iv_rv_ratio`, etc. |
| `features/order_flow.rs` | `bid_ask_spread_bps`, `ofi_*`, `trade_imbalance`, etc. |
| `features/time_context.rs` | `minutes_from_open`, `is_expiry_day`, etc. |
| `features/daily.rs` | `return_1d`, `sma_*`, `rsi_14`, `macd`, etc. |
| `cache/rolling_window.rs` | Rolling window cache for stateful features |

### 2. Python `training-pipeline` (Batch)

Kedro pipelines compute historical features for training. Uses `psycopg2` to read from QuestDB and writes results back to `instrument_features` table.

**Source**: `services/training-pipeline/src/training_pipeline/pipelines/`

---

## Performance Benchmarks

| Operation | Latency (p50) | Latency (p99) | Throughput |
|-----------|---------------|---------------|------------|
| Redis write (117 features) | 0.2ms | 0.8ms | 15,000/s |
| Redis read (117 features) | 0.3ms | 1.2ms | 10,000/s |
| QuestDB batch read (1M rows) | 2.5s | 5s | 400,000/s |
| compute-engine (1 tick) | 0.05ms | 0.2ms | 100,000/s |

---

## Related Documentation

- [QUESTDB_TRAINING_DATA.md](./QUESTDB_TRAINING_DATA.md) — 9 table schemas
- [FEATURE_SPECIFICATION.md](./FEATURE_SPECIFICATION.md) — 117 feature definitions
- [compute-engine README](../../packages/compute-engine/README.md) — Rust NAPI module
- SQL DDL: `packages/schema/sql/schema/create_instrument_features.sql`
