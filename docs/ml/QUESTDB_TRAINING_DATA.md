# QuestDB Training Data Architecture

> **Complete schema for 26 years of historical data (2000-2026) plus tick-by-tick depth for ML training.**

**Last Updated**: January 18, 2026  
**Status**: Production Schema  
**Purpose**: **ONLY for training models. Not for live inference.**

---

## Overview

QuestDB stores:

1. **Historical OHLCV Data**: Jan 2000 - Present (26+ years)
2. **Tick-by-Tick Data**: Real-time from Upstox WebSocket (2024+)
3. **Market Depth (LOB)**: 20-level order book snapshots
4. **Pre-Computed Features**: 54 features for training
5. **Training Labels**: Multi-horizon targets with validity flags

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           QUESTDB DATA ARCHITECTURE                          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         RAW MARKET DATA                                  │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │ │
│  │  │ Historical  │  │ Tick-by-   │  │ Market      │  │ Option      │     │ │
│  │  │ OHLCV       │  │ Tick       │  │ Depth       │  │ Greeks      │     │ │
│  │  │ (2000-2026) │  │ (2024+)    │  │ (30 levels) │  │ (chain)     │     │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        COMPUTED FEATURES                                 │ │
│  │  ┌─────────────────────────┐  ┌─────────────────────────────┐           │ │
│  │  │ training_features_54    │  │ training_features_tft       │           │ │
│  │  │ (LightGBM, 1-min freq)  │  │ (TFT, 5-min freq, sequences)│           │ │
│  │  └─────────────────────────┘  └─────────────────────────────┘           │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        TRAINING LABELS                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────┐        │ │
│  │  │ training_labels (multi-horizon, with is_valid column)       │        │ │
│  │  └─────────────────────────────────────────────────────────────┘        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Storage Scope

| Data Type | Start Date | End Date | Source | Size Estimate |
|-----------|------------|----------|--------|---------------|
| Historical OHLCV | 2000-01-01 | Present | NSE/Yahoo | ~50GB |
| Tick-by-Tick | 2024-01-01 | Present | Upstox WS | ~500GB/year |
| Market Depth 20 | 2024-01-01 | Present | Upstox WS | ~2TB/year |
| Option Greeks | 2020-01-01 | Present | Calculated | ~100GB |
| Computed Features | 2020-01-01 | Present | compute-engine | ~10GB |
| Training Labels | 2020-01-01 | Present | Pipeline | ~5GB |

---

## Table Schemas

### 1. `historical_ohlcv` (26 Years of Daily/Minute Data)

```sql
CREATE TABLE IF NOT EXISTS historical_ohlcv (
  -- Time dimension
  timestamp TIMESTAMP,
  
  -- Instrument identification
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  instrument_type SYMBOL CAPACITY 10,      -- 'INDEX', 'FUTURE', 'STOCK', 'OPTION'
  index_name SYMBOL CAPACITY 20,           -- 'NIFTY50', 'BANKNIFTY', 'SENSEX', NULL
  
  -- Timeframe
  timeframe SYMBOL CAPACITY 10,            -- '1m', '5m', '15m', '1h', '1d'
  
  -- OHLCV data
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume LONG,
  
  -- For futures/options
  open_interest LONG,
  
  -- For options
  strike_price DOUBLE,
  option_type SYMBOL CAPACITY 2,           -- 'CE', 'PE'
  expiry_date TIMESTAMP,
  
  -- Data source
  source SYMBOL CAPACITY 20,               -- 'NSE', 'YAHOO', 'UPSTOX'
  
  -- Validity
  is_valid BOOLEAN,
  invalid_reason STRING
  
) TIMESTAMP(timestamp) PARTITION BY YEAR WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, timeframe);
```

**Index Coverage**:
- NIFTY 50 Index: 2000-01-01 to present (daily + minute from 2015)
- NIFTY 50 Constituents: 2005-01-01 to present
- NIFTY Futures: 2010-01-01 to present
- NIFTY Options: 2015-01-01 to present

---

### 2. `tick_data` (Tick-by-Tick from WebSocket)

```sql
CREATE TABLE IF NOT EXISTS tick_data (
  -- Time dimension (microsecond precision)
  timestamp TIMESTAMP,
  
  -- Instrument
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  instrument_type SYMBOL CAPACITY 10,
  
  -- Tick data
  ltp DOUBLE,
  last_traded_qty INT,
  total_traded_volume LONG,
  
  -- Best bid/ask
  best_bid_price DOUBLE,
  best_bid_qty INT,
  best_ask_price DOUBLE,
  best_ask_qty INT,
  
  -- Open Interest (for F&O)
  open_interest LONG,
  
  -- Trade direction (if available)
  trade_side SYMBOL CAPACITY 5,            -- 'BUY', 'SELL', 'UNKNOWN'
  
  -- Validity
  is_valid BOOLEAN,
  invalid_reason STRING
  
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
```

**Expected Volume**: ~50M ticks/day across all instruments

---

### 3. `market_depth_20` (20-Level Order Book)

```sql
CREATE TABLE IF NOT EXISTS market_depth_20 (
  -- Time dimension
  timestamp TIMESTAMP,
  
  -- Instrument
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  
  -- Flattened 20-level depth (to avoid joins)
  -- Bid side
  bid_price_1 DOUBLE, bid_qty_1 INT, bid_orders_1 INT,
  bid_price_2 DOUBLE, bid_qty_2 INT, bid_orders_2 INT,
  bid_price_3 DOUBLE, bid_qty_3 INT, bid_orders_3 INT,
  bid_price_4 DOUBLE, bid_qty_4 INT, bid_orders_4 INT,
  bid_price_5 DOUBLE, bid_qty_5 INT, bid_orders_5 INT,
  bid_price_6 DOUBLE, bid_qty_6 INT, bid_orders_6 INT,
  bid_price_7 DOUBLE, bid_qty_7 INT, bid_orders_7 INT,
  bid_price_8 DOUBLE, bid_qty_8 INT, bid_orders_8 INT,
  bid_price_9 DOUBLE, bid_qty_9 INT, bid_orders_9 INT,
  bid_price_10 DOUBLE, bid_qty_10 INT, bid_orders_10 INT,
  bid_price_11 DOUBLE, bid_qty_11 INT, bid_orders_11 INT,
  bid_price_12 DOUBLE, bid_qty_12 INT, bid_orders_12 INT,
  bid_price_13 DOUBLE, bid_qty_13 INT, bid_orders_13 INT,
  bid_price_14 DOUBLE, bid_qty_14 INT, bid_orders_14 INT,
  bid_price_15 DOUBLE, bid_qty_15 INT, bid_orders_15 INT,
  bid_price_16 DOUBLE, bid_qty_16 INT, bid_orders_16 INT,
  bid_price_17 DOUBLE, bid_qty_17 INT, bid_orders_17 INT,
  bid_price_18 DOUBLE, bid_qty_18 INT, bid_orders_18 INT,
  bid_price_19 DOUBLE, bid_qty_19 INT, bid_orders_19 INT,
  bid_price_20 DOUBLE, bid_qty_20 INT, bid_orders_20 INT,
  
  -- Ask side (same structure)
  ask_price_1 DOUBLE, ask_qty_1 INT, ask_orders_1 INT,
  ask_price_2 DOUBLE, ask_qty_2 INT, ask_orders_2 INT,
  ask_price_3 DOUBLE, ask_qty_3 INT, ask_orders_3 INT,
  ask_price_4 DOUBLE, ask_qty_4 INT, ask_orders_4 INT,
  ask_price_5 DOUBLE, ask_qty_5 INT, ask_orders_5 INT,
  ask_price_6 DOUBLE, ask_qty_6 INT, ask_orders_6 INT,
  ask_price_7 DOUBLE, ask_qty_7 INT, ask_orders_7 INT,
  ask_price_8 DOUBLE, ask_qty_8 INT, ask_orders_8 INT,
  ask_price_9 DOUBLE, ask_qty_9 INT, ask_orders_9 INT,
  ask_price_10 DOUBLE, ask_qty_10 INT, ask_orders_10 INT,
  ask_price_11 DOUBLE, ask_qty_11 INT, ask_orders_11 INT,
  ask_price_12 DOUBLE, ask_qty_12 INT, ask_orders_12 INT,
  ask_price_13 DOUBLE, ask_qty_13 INT, ask_orders_13 INT,
  ask_price_14 DOUBLE, ask_qty_14 INT, ask_orders_14 INT,
  ask_price_15 DOUBLE, ask_qty_15 INT, ask_orders_15 INT,
  ask_price_16 DOUBLE, ask_qty_16 INT, ask_orders_16 INT,
  ask_price_17 DOUBLE, ask_qty_17 INT, ask_orders_17 INT,
  ask_price_18 DOUBLE, ask_qty_18 INT, ask_orders_18 INT,
  ask_price_19 DOUBLE, ask_qty_19 INT, ask_orders_19 INT,
  ask_price_20 DOUBLE, ask_qty_20 INT, ask_orders_20 INT,
  
  -- Aggregates
  total_bid_qty LONG,
  total_ask_qty LONG,
  mid_price DOUBLE,
  spread_bps DOUBLE,
  
  -- Validity
  is_valid BOOLEAN,
  invalid_reason STRING
  
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
```

---

### 4. `option_greeks` (Greeks Snapshots)

```sql
CREATE TABLE IF NOT EXISTS option_greeks (
  -- Time dimension
  timestamp TIMESTAMP,
  
  -- Option identification
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  underlying_symbol SYMBOL CAPACITY 20,
  strike_price DOUBLE,
  option_type SYMBOL CAPACITY 2,
  expiry_date TIMESTAMP,
  
  -- Greeks
  iv DOUBLE,
  delta DOUBLE,
  gamma DOUBLE,
  theta DOUBLE,
  vega DOUBLE,
  rho DOUBLE,
  
  -- Second-order Greeks (calculated)
  charm DOUBLE,
  vanna DOUBLE,
  volga DOUBLE,
  
  -- Underlying data
  underlying_price DOUBLE,
  
  -- Time context
  days_to_expiry DOUBLE,
  
  -- Validity
  is_valid BOOLEAN,
  invalid_reason STRING
  
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
```

---

### 5. `training_features_54` (Computed Features)

```sql
CREATE TABLE IF NOT EXISTS training_features_54 (
  -- Time dimension (1-minute aligned)
  timestamp TIMESTAMP,
  
  -- Reference
  reference_instrument SYMBOL CAPACITY 100,
  
  -- === INDEX BREADTH (8) ===
  pct_stocks_above_vwap DOUBLE,
  pct_stocks_above_ema20 DOUBLE,
  weighted_return_top10 DOUBLE,
  advance_decline_ratio DOUBLE,
  breadth_momentum_5m DOUBLE,
  breadth_volatility DOUBLE,
  breadth_thrust DOUBLE,
  new_highs_lows_ratio DOUBLE,
  
  -- === NIFTY FUTURE (12) ===
  fut_price_vs_vwap DOUBLE,
  fut_range_position DOUBLE,
  fut_return_1m DOUBLE,
  fut_return_5m DOUBLE,
  fut_return_15m DOUBLE,
  fut_atr_percent DOUBLE,
  fut_volume_zscore DOUBLE,
  fut_oi_change DOUBLE,
  fut_oi_change_pct DOUBLE,
  fut_rsi_14 DOUBLE,
  fut_macd DOUBLE,
  fut_macd_signal DOUBLE,
  
  -- === OPTIONS (14) ===
  atm_iv DOUBLE,
  atm_iv_change DOUBLE,
  iv_skew DOUBLE,
  iv_term_structure DOUBLE,
  gamma_atm DOUBLE,
  vega_atm DOUBLE,
  theta_atm DOUBLE,
  pcr_oi DOUBLE,
  pcr_volume DOUBLE,
  max_pain_distance DOUBLE,
  total_gamma_exposure DOUBLE,
  charm_atm DOUBLE,
  vanna_atm DOUBLE,
  iv_percentile_30d DOUBLE,
  
  -- === VOLATILITY (6) ===
  india_vix DOUBLE,
  realized_vol_5m DOUBLE,
  realized_vol_15m DOUBLE,
  vol_expansion_ratio DOUBLE,
  iv_rv_ratio DOUBLE,
  vix_percentile_30d DOUBLE,
  
  -- === ORDER FLOW (8) ===
  bid_ask_spread_bps DOUBLE,
  depth_imbalance_5 DOUBLE,
  ofi_1s DOUBLE,
  ofi_5s DOUBLE,
  ofi_30s DOUBLE,
  trade_imbalance DOUBLE,
  bid_slope DOUBLE,
  ask_slope DOUBLE,
  
  -- === TIME CONTEXT (6) ===
  minutes_from_open INT,
  minutes_to_close INT,
  day_of_week INT,
  is_expiry_day INT,
  days_to_expiry INT,
  session_phase INT,
  
  -- Metadata
  feature_version STRING,
  computation_latency_us INT,
  
  -- Validity
  is_valid BOOLEAN,
  invalid_reason STRING
  
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, reference_instrument);
```

---

### 6. `training_labels` (Multi-Horizon Labels)

```sql
CREATE TABLE IF NOT EXISTS training_labels (
  -- Time dimension
  timestamp TIMESTAMP,
  
  -- Reference
  reference_instrument SYMBOL CAPACITY 100,
  
  -- === MULTI-HORIZON REGRESSION TARGETS ===
  target_return_10s DOUBLE,               -- 10-second forward return
  target_return_1m DOUBLE,                -- 1-minute forward return
  target_return_5m DOUBLE,                -- 5-minute forward return
  target_return_15m DOUBLE,               -- 15-minute forward return
  target_return_1h DOUBLE,                -- 1-hour forward return
  target_return_eod DOUBLE,               -- Return until 3:30 PM
  
  -- === VOLATILITY TARGETS ===
  target_volatility_5m DOUBLE,
  target_volatility_15m DOUBLE,
  target_max_drawdown_5m DOUBLE,
  target_max_runup_5m DOUBLE,
  
  -- === CLASSIFICATION TARGETS ===
  target_direction_5m SYMBOL CAPACITY 5,  -- 'UP', 'DOWN', 'NEUTRAL'
  target_direction_15m SYMBOL CAPACITY 5,
  target_volatility_regime SYMBOL CAPACITY 5, -- 'HIGH', 'MEDIUM', 'LOW'
  
  -- === REGIME LABELS ===
  regime_label SYMBOL CAPACITY 20,        -- 'TRENDING_UP', 'TRENDING_DOWN', 'RANGING', 'VOLATILE'
  regime_confidence DOUBLE,
  
  -- === EVENT FLAGS ===
  had_regime_change BOOLEAN,
  had_spike_event BOOLEAN,
  had_gap_event BOOLEAN,
  
  -- === VALIDITY FLAGS ===
  is_valid BOOLEAN,
  invalid_reason STRING,
  
  -- Quality scoring
  label_quality SYMBOL CAPACITY 10,       -- 'CLEAN', 'NOISY', 'OUTLIER'
  
  -- Versioning
  label_version STRING
  
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, reference_instrument);
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

### Validation Query

```sql
-- Training data with validity filtering
SELECT 
  f.*,
  l.target_return_5m,
  l.target_direction_5m
FROM training_features_54 f
INNER JOIN training_labels l 
  ON f.timestamp = l.timestamp 
  AND f.reference_instrument = l.reference_instrument
WHERE f.is_valid = TRUE
  AND l.is_valid = TRUE
  AND l.label_quality = 'CLEAN'
  AND f.timestamp BETWEEN '2020-01-01' AND '2025-12-31'
  AND l.target_direction_5m IS NOT NULL
ORDER BY f.timestamp;
```

---

## Data Retention Policy

| Table | Retention | Storage | Archive |
|-------|-----------|---------|---------|
| `historical_ohlcv` | Forever | ~50GB | - |
| `tick_data` | 2 years | ~1TB | S3 Parquet |
| `market_depth_20` | 1 year | ~2TB | S3 Parquet |
| `option_greeks` | 5 years | ~500GB | - |
| `training_features_54` | Forever | ~10GB | - |
| `training_labels` | Forever | ~5GB | - |

### Archive Strategy

```bash
# Export old tick data to Parquet
questdb-export \
  --table tick_data \
  --where "timestamp < '2024-01-01'" \
  --format parquet \
  --output s3://quantum-trading-archive/tick_data/
```

---

## Performance Tuning

### Partitioning Strategy

| Table | Partition By | Reason |
|-------|--------------|--------|
| `historical_ohlcv` | YEAR | 26 years, mostly read |
| `tick_data` | DAY | High volume, recent queries |
| `market_depth_20` | DAY | Very high volume |
| `option_greeks` | DAY | Medium volume |
| `training_features_54` | MONTH | Training queries span months |
| `training_labels` | MONTH | Aligned with features |

### Index Strategy

```sql
-- Most queries filter by instrument first
CREATE INDEX ON historical_ohlcv (instrument_key);
CREATE INDEX ON tick_data (instrument_key);
CREATE INDEX ON market_depth_20 (instrument_key);
```

---

## Python Training Integration

```python
import questdb.ingress as qi
import pandas as pd

# Connect to QuestDB
def get_training_data(
    start_date: str,
    end_date: str,
    instruments: list = ['NIFTY50_FUTURE']
) -> pd.DataFrame:
    """
    Fetch training data with validity filtering.
    """
    query = f"""
    SELECT 
        f.*,
        l.target_return_5m,
        l.target_direction_5m,
        l.regime_label
    FROM training_features_54 f
    INNER JOIN training_labels l 
        ON f.timestamp = l.timestamp 
        AND f.reference_instrument = l.reference_instrument
    WHERE f.is_valid = TRUE
      AND l.is_valid = TRUE
      AND f.timestamp BETWEEN '{start_date}' AND '{end_date}'
      AND f.reference_instrument IN ({','.join(f"'{i}'" for i in instruments)})
    ORDER BY f.timestamp
    """
    
    return pd.read_sql(query, questdb_connection)
```

---

## Related Documentation

- [FEATURE_SPECIFICATION.md](./FEATURE_SPECIFICATION.md) - 54 feature definitions
- [TRAINING_PIPELINE.md](./TRAINING_PIPELINE.md) - Kedro training orchestration
- [compute-engine README](../../packages/compute-engine/README.md) - Rust feature computation
