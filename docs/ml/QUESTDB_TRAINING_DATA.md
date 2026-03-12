# QuestDB Training Data Architecture

> **Complete schema for 26 years of historical data (2000-2026) plus tick-by-tick depth for ML training.**

**Last Updated**: March 13, 2026
**Status**: Production Schema (9 tables)
**Purpose**: **Training data storage + live feature persistence**
**Source of truth**: `packages/schema/sql/schema/*.sql`

---

## Overview

QuestDB stores all time-series data across 9 tables:

| # | Table | Purpose | Partition | Dedup Keys |
|---|-------|---------|-----------|------------|
| 1 | `instrument_master` | Instrument registry (Upstox metadata) | None | — |
| 2 | `market_candles` | OHLCV candles (all intervals) | DAY | timestamp, instrument_key, interval_value, interval_unit |
| 3 | `tick_data` | Tick-by-tick with 30-level depth + Greeks | DAY | timestamp, instrument_key |
| 4 | `orderbook_l2_snapshots` | Normalized L2 order book rows | DAY | timestamp, instrument_key, side, level |
| 5 | `option_chain_snapshot` | Option chain with Greeks | DAY | timestamp, underlying_key, instrument_key |
| 6 | `instrument_features` | 117 ML features (unified 1m + 1d) | MONTH | timestamp, instrument_key, interval_value, interval_unit |
| 7 | `training_labels` | Multi-horizon targets | MONTH | timestamp, instrument_key, interval_value, interval_unit |
| 8 | `macro_sentiment` | NLP news sentiment | MONTH | timestamp, entity, event_type |
| 9 | `dataset_folds` | CPCV train/test splits | MONTH | — |

```
┌──────────────────────────────────────────────────────────────────────┐
│                     QUESTDB DATA ARCHITECTURE                        │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                     RAW MARKET DATA (4 tables)                  │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │  │
│  │  │ market_      │ │ tick_data    │ │ option_chain_        │    │  │
│  │  │ candles      │ │ (30-level    │ │ snapshot (Greeks)    │    │  │
│  │  │ (2000-2026)  │ │  depth+LTP)  │ │                      │    │  │
│  │  └──────────────┘ └──────────────┘ └──────────────────────┘    │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │  │
│  │  │ orderbook_   │ │ instrument_  │ │ macro_sentiment      │    │  │
│  │  │ l2_snapshots │ │ master       │ │ (NLP news)           │    │  │
│  │  └──────────────┘ └──────────────┘ └──────────────────────┘    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                ↓                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                   COMPUTED DATA (3 tables)                      │  │
│  │  ┌──────────────────────┐  ┌────────────────────────────────┐  │  │
│  │  │ instrument_features  │  │ training_labels                │  │  │
│  │  │ (117 features,       │  │ (multi-horizon, multi-interval │  │  │
│  │  │  multi-interval)     │  │  direction + regression)       │  │  │
│  │  └──────────────────────┘  └────────────────────────────────┘  │  │
│  │  ┌──────────────────────┐                                      │  │
│  │  │ dataset_folds        │                                      │  │
│  │  │ (CPCV splits)        │                                      │  │
│  │  └──────────────────────┘                                      │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Data Storage Scope

| Data Type | Start Date | End Date | Source | Size Estimate |
|-----------|------------|----------|--------|---------------|
| OHLCV Candles | 2000-01-01 | Present | Upstox/Yahoo | ~50GB |
| Tick Data (30-level depth) | 2024-01-01 | Present | Upstox WebSocket | ~500GB/year |
| Option Chain Snapshots | 2020-01-01 | Present | Upstox | ~100GB |
| Macro Sentiment | 2024-01-01 | Present | Finnhub/RSS | ~1GB |
| Instrument Features | 2020-01-01 | Present | compute-engine | ~10GB |
| Training Labels | 2020-01-01 | Present | market-feeder | ~5GB |

---

## Table Schemas

> **Source of truth**: `packages/schema/sql/schema/create_*.sql`
> **Zod validation**: `packages/schema/src/market-data/questdb-tables.schema.ts`

### 1. `instrument_master` — Instrument Registry

Full Upstox instrument metadata including F&O fields.

```sql
CREATE TABLE IF NOT EXISTS instrument_master (
  instrumentKey SYMBOL CAPACITY 1000000 NOCACHE INDEX,
  exchange SYMBOL CAPACITY 10,           -- 'NSE', 'BSE', 'NFO'
  segment SYMBOL CAPACITY 10,            -- 'NSE_EQ', 'NSE_FO', 'NSE_INDEX'
  instrument_type SYMBOL CAPACITY 20,    -- 'INDEX', 'STOCK', 'FUTURE', 'OPTION_CE', 'OPTION_PE'
  trading_symbol SYMBOL CAPACITY 1000000,
  name STRING,
  isin STRING,
  expiry DATE,
  strike DOUBLE,
  option_type SYMBOL CAPACITY 2,         -- 'CE', 'PE'
  underlying_key SYMBOL CAPACITY 100,
  underlying_symbol SYMBOL CAPACITY 50,
  underlying_type SYMBOL CAPACITY 20,
  lot_size INT,
  minimum_lot INT,
  tick_size DOUBLE,
  freeze_quantity INT,
  weekly BOOLEAN,
  is_expired BOOLEAN,
  is_active BOOLEAN,
  exchange_token STRING,
  created_at TIMESTAMP,
  last_updated TIMESTAMP
);
```

> **Note**: No `TIMESTAMP()` designation or `PARTITION BY` — this is intentional for a low-volume lookup table. Writes are infrequent (daily instrument sync).

---

### 2. `market_candles` — OHLCV Data (All Intervals)

Interval-based storage using `interval_value` + `interval_unit` instead of a string timeframe column.

```sql
CREATE TABLE IF NOT EXISTS market_candles (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  interval_value INT,                    -- 1, 5, 15, 30, 60
  interval_unit SYMBOL CAPACITY 10,      -- 'minute', 'day', 'week', 'month'
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume LONG,
  open_interest LONG
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, interval_value, interval_unit);
```

**Coverage**: NIFTY 50 Index (2000+), constituents (2005+), futures (2010+), options (2015+).

---

### 3. `tick_data` — Tick-by-Tick with 30-Level Depth

Stores live tick data with full 30-level order book depth and Greeks (for options).

```sql
CREATE TABLE IF NOT EXISTS tick_data (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  ltp DOUBLE, ltq LONG, cp DOUBLE,
  atp DOUBLE, vtt LONG, oi LONG, tbq LONG, tsq LONG,
  -- 30 bid levels: bid_price_1..30, bid_qty_1..30
  -- 30 ask levels: ask_price_1..30, ask_qty_1..30
  -- Greeks (options only): delta, theta, gamma, vega, rho, iv
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
```

**Expected volume**: ~50M ticks/day across all instruments.

---

### 4. `orderbook_l2_snapshots` — Normalized Order Book

Row-per-level format for flexible depth queries.

```sql
CREATE TABLE IF NOT EXISTS orderbook_l2_snapshots (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  side SYMBOL CAPACITY 2,               -- 'bid', 'ask'
  level BYTE,                            -- 1-30
  price DOUBLE,
  quantity DOUBLE,
  orders INT
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, side, level);
```

---

### 5. `option_chain_snapshot` — Option Chain with Greeks

```sql
CREATE TABLE IF NOT EXISTS option_chain_snapshot (
  timestamp TIMESTAMP,
  underlying_key SYMBOL CAPACITY 1000 NOCACHE INDEX,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  expiry DATE, strike DOUBLE, option_type SYMBOL CAPACITY 2,
  last_price DOUBLE, bid_price DOUBLE, ask_price DOUBLE,
  bid_qty LONG, ask_qty LONG,
  volume DOUBLE, open_interest DOUBLE, prev_oi LONG, close_price DOUBLE,
  iv DOUBLE, delta DOUBLE, gamma DOUBLE, vega DOUBLE, theta DOUBLE, pop DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, underlying_key, instrument_key);
```

---

### 6. `instrument_features` — 117 ML Features (Unified)

All features for ML training with interval-based storage. Combines 1m and 1d features.

**Feature Categories** (117 total):

| Category | Count | Examples |
|----------|-------|---------|
| Index Breadth | 8 | `pct_stocks_above_vwap`, `advance_decline_ratio` |
| Futures | 12 | `fut_price_vs_vwap`, `fut_return_5m`, `fut_oi_change` |
| Options | 14 | `atm_iv`, `iv_skew`, `pcr_oi`, `max_pain_distance` |
| Volatility | 10 | `india_vix`, `realized_vol_5m`, `iv_rv_ratio`, `vix_percentile_1yr` |
| Order Flow | 8 | `bid_ask_spread_bps`, `ofi_1s`, `trade_imbalance` |
| Price Structure | 8 | `close`, `return_1d`, `gap_open`, `close_vs_high_20d` |
| Momentum | 8 | `rsi_14`, `macd`, `adx_14` |
| Moving Averages | 6 | `sma_20`, `sma_200`, `ema_12` |
| MA Signals | 4 | `price_vs_sma_20`, `golden_cross` |
| Bollinger | 2 | `bollinger_width`, `bollinger_position` |
| Volume | 4 | `volume_sma_20_ratio`, `obv_change` |
| Regime | 4 | `trend_strength`, `momentum_regime` |
| Time Context | 9 | `minutes_from_open`, `is_expiry_day`, `session_phase` |
| Cyclical Encoding | 4 | `time_sin`, `time_cos`, `day_of_week_sin` |
| Global Macro | 12 | `gift_nifty_premium`, `sp500_overnight_return`, `brent_crude_change` |
| Pre-Market | 4 | `actual_gap_pct`, `pre_market_bias` |
| Metadata | 4 | `is_valid`, `feature_mode`, `computation_latency_us` |

```sql
CREATE TABLE IF NOT EXISTS instrument_features (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  interval_value INT,                    -- 1, 5, 15, 30, 60
  interval_unit SYMBOL CAPACITY 10,      -- 'minute', 'day'
  -- ... 117 feature columns ...
  is_valid BOOLEAN,
  invalid_reason STRING,
  feature_mode SYMBOL CAPACITY 10,       -- 'HISTORICAL', 'LIVE'
  computation_latency_us INT,
  feature_version STRING
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, interval_value, interval_unit);
```

> Full column list: `packages/schema/sql/schema/create_instrument_features.sql`

---

### 7. `training_labels` — Multi-Horizon Targets

```sql
CREATE TABLE IF NOT EXISTS training_labels (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  interval_value INT,
  interval_unit SYMBOL CAPACITY 10,
  -- Regression (short-term): target_return_5m, 15m, 30m, 1h, eod
  -- Regression (long-term): target_return_1d, 5d, 20d
  -- Volatility: target_volatility_5m, 15m, max_drawdown_5m, max_runup_5m, ...
  -- Classification: target_direction_5m INT, 15m INT, 30m INT, 1d INT, 5d INT, 20d INT
  -- Regime: regime_label SYMBOL, regime_confidence DOUBLE
  -- Events: had_regime_change, had_spike_event, had_gap_event, had_crash, had_rally
  -- Validity: is_valid BOOLEAN, invalid_reason STRING, label_quality SYMBOL
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, interval_value, interval_unit);
```

> **Note**: `target_direction_*` columns use `INT` (0=DOWN, 1=NEUTRAL, 2=UP), not SYMBOL.

---

### 8. `macro_sentiment` — NLP News Sentiment

```sql
CREATE TABLE IF NOT EXISTS macro_sentiment (
  timestamp TIMESTAMP,
  entity SYMBOL CAPACITY 256 CACHE INDEX, -- 'RBI', 'BRENT_CRUDE', 'FED', 'NIFTY50'
  event_type SYMBOL CAPACITY 32,          -- 'NEWS', 'RATE_DECISION', 'GEOPOLITICAL', ...
  sentiment_score DOUBLE,                 -- -1.0 (Bearish) to 1.0 (Bullish)
  impact_score DOUBLE,                    -- 0.0 to 1.0
  headline STRING,
  source SYMBOL CAPACITY 32              -- 'REUTERS', 'MONEYCONTROL', 'FINNHUB'
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, entity, event_type);
```

---

### 9. `dataset_folds` — CPCV Train/Test Splits

```sql
CREATE TABLE IF NOT EXISTS dataset_folds (
  instrument_key SYMBOL,
  dataset_name SYMBOL,                   -- 'nifty50_cpcv_lightgbm'
  fold_id INT,
  split_type SYMBOL,                     -- 'TRAIN' or 'TEST'
  range_start TIMESTAMP,
  range_end TIMESTAMP,
  created_at TIMESTAMP
) timestamp(created_at) PARTITION BY MONTH WAL;
```

---

## Validity Rules

### Invalid Reasons (Standardized)

| Code | Meaning | Action |
|------|---------|--------|
| `MARKET_CLOSED` | Holiday, weekend, or outside 9:15-3:30 | Exclude |
| `PRE_OPEN` | 9:00-9:15 pre-open session | Exclude from most models |
| `STALE_DATA` | Gap >60s in tick stream | Mark for review |
| `OUTLIER` | Feature >5σ from rolling mean | Mark for review |
| `INCOMPLETE_BREADTH` | <40 constituents available | Limited models only |
| `INCOMPLETE_OPTIONS` | <10 strikes available | Exclude options features |
| `CIRCUIT_LIMIT` | Stock/index hit circuit | Special handling |
| `AUCTION` | Opening/closing auction | Exclude |
| `LOW_LIQUIDITY` | Spread >50bps | Mark for review |
| `DATA_QUALITY` | Obvious data errors | Exclude |

---

## Training Data Query

```sql
-- Fetch training data with validity filtering
SELECT
  f.*,
  l.target_return_5m,
  l.target_direction_5m
FROM instrument_features f
INNER JOIN training_labels l
  ON f.timestamp = l.timestamp
  AND f.instrument_key = l.instrument_key
  AND f.interval_value = l.interval_value
  AND f.interval_unit = l.interval_unit
WHERE f.is_valid = TRUE
  AND l.is_valid = TRUE
  AND l.label_quality = 'CLEAN'
  AND f.interval_value = 1
  AND f.interval_unit = 'minute'
  AND f.timestamp BETWEEN '2020-01-01' AND '2025-12-31'
ORDER BY f.timestamp;
```

---

## Python Training Integration

```python
import psycopg2
import pandas as pd

def get_training_data(
    start_date: str,
    end_date: str,
    interval_value: int = 1,
    interval_unit: str = "minute",
    instrument_key: str = "NSE_INDEX|Nifty 50",
) -> pd.DataFrame:
    """Fetch training data from QuestDB via PostgreSQL wire protocol."""
    conn = psycopg2.connect(
        host="localhost", port=8812,
        user="admin", password="quest", dbname="qdb"
    )
    query = """
    SELECT f.*, l.target_return_5m, l.target_direction_5m, l.regime_label
    FROM instrument_features f
    INNER JOIN training_labels l
        ON f.timestamp = l.timestamp
        AND f.instrument_key = l.instrument_key
        AND f.interval_value = l.interval_value
        AND f.interval_unit = l.interval_unit
    WHERE f.is_valid = TRUE AND l.is_valid = TRUE
      AND f.timestamp BETWEEN %s AND %s
      AND f.instrument_key = %s
      AND f.interval_value = %s AND f.interval_unit = %s
    ORDER BY f.timestamp
    """
    return pd.read_sql(query, conn, params=[
        start_date, end_date, instrument_key, interval_value, interval_unit
    ])
```

---

## Data Retention Policy

| Table | Retention | Storage | Archive |
|-------|-----------|---------|---------|
| `market_candles` | Forever | ~50GB | — |
| `tick_data` | 2 years | ~1TB | S3 Parquet |
| `orderbook_l2_snapshots` | 1 year | ~1TB | S3 Parquet |
| `option_chain_snapshot` | 5 years | ~500GB | — |
| `instrument_features` | Forever | ~10GB | — |
| `training_labels` | Forever | ~5GB | — |
| `macro_sentiment` | Forever | ~1GB | — |

---

## Related Documentation

- [FEATURE_SPECIFICATION.md](./FEATURE_SPECIFICATION.md) — 117 feature definitions
- [MODEL_ARCHITECTURE.md](./MODEL_ARCHITECTURE.md) — 5-tier model architecture
- [compute-engine README](../../packages/compute-engine/README.md) — Rust feature computation
- SQL DDL: `packages/schema/sql/schema/*.sql`
- Zod schemas: `packages/schema/src/market-data/questdb-tables.schema.ts`
