# Training Data Schema - QuestDB Design

> **Comprehensive market data and feature storage for ML training pipeline**

**Last Updated**: January 13, 2026  
**Status**: Production Schema Design  
**Related**: [FEATURE_STORE_ARCHITECTURE.md](../../../docs/FEATURE_STORE_ARCHITECTURE.md)

---

## Overview

This document describes the QuestDB schema design for storing:

1. **Raw Market Data**: All market data from NSE (NIFTY spot/futures, options, constituents, depth)
2. **Computed Features**: Pre-calculated features for ML models (starting with LightGBM)
3. **Training Metadata**: Labels, regime tags, and training dataset snapshots

**Key Design Decisions**:

- ✅ **Type Classifiers Over Separate Tables**: Single unified tables with `instrument_type` SYMBOL column
- ✅ **Scalability**: Easy to add new indices (BANKNIFTY, SENSEX) or instrument types
- ✅ **Performance**: PARTITION BY DAY, SYMBOL indexing, DEDUP UPSERT for optimal query speed
- ✅ **Training Pipeline Integration**: Python can directly query features without recalculation

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA COLLECTION FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

1. market-feeder (NestJS)
   ├─ Upstox WebSocket → Raw market data (tick, depth, Greeks)
   ├─ Store RAW data → QuestDB (market_ticks, market_depth_20, option_greeks)
   └─ Publish event → Redis Stream ("raw-data-available")

2. compute-engine (Rust)
   ├─ Consume Redis Stream ("raw-data-available")
   ├─ Calculate features → Technical indicators, aggregations
   └─ Store FEATURES → QuestDB (training_features_lightgbm, training_features_tft, ...)

3. algo-worker (NestJS)
   ├─ Consume Redis Stream ("features-available")
   ├─ Real-time inference → ONNX models
   └─ Store predictions → MongoDB (for monitoring)

4. training-pipeline (Python/Kedro)
   ├─ Query QuestDB → SELECT * FROM training_features_lightgbm WHERE ...
   ├─ Join with labels → TARGET column (future returns, volatility)
   ├─ Train models → Walk-forward cross-validation
   └─ Export ONNX → Deploy to algo-worker
```

---

## Table Design Philosophy

### Why Type Classifiers?

**Option A: Separate Tables** ❌

```sql
CREATE TABLE nifty_spot_ticks (...);
CREATE TABLE nifty_future_ticks (...);
CREATE TABLE banknifty_spot_ticks (...);
CREATE TABLE banknifty_future_ticks (...);
-- 10+ tables for each instrument type
```

**Problems**:

- Code duplication in queries
- Hard to add new indices
- Complex JOINs for market-wide analysis

**Option B: Type Classifier Column** ✅

```sql
CREATE TABLE market_ticks (
  timestamp TIMESTAMP,
  instrument_key SYMBOL,
  instrument_type SYMBOL,  -- 'SPOT', 'FUTURE', 'OPTION', 'STOCK'
  index_name SYMBOL,        -- 'NIFTY50', 'BANKNIFTY', 'SENSEX'
  ...
);
```

**Benefits**:

- Single query for all instrument types: `WHERE index_name = 'NIFTY50'`
- Easy to add: `instrument_type = 'COMMODITY'` for MCX futures
- Scalable: QuestDB SYMBOL type handles high cardinality efficiently

---

## Raw Market Data Tables

### 1. market_ticks (Unified Tick Data)

**Purpose**: Raw tick-level price data for ALL instruments (spot, futures, options, stocks)

**Schema**:

```sql
CREATE TABLE IF NOT EXISTS market_ticks (
  -- Time dimension (QuestDB designated timestamp)
  timestamp TIMESTAMP,

  -- Instrument identification
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  instrument_type SYMBOL CAPACITY 10,  -- 'SPOT', 'FUTURE', 'OPTION', 'STOCK'
  index_name SYMBOL CAPACITY 20,       -- 'NIFTY50', 'BANKNIFTY', 'SENSEX', NULL (for individual stocks)

  -- For options: contract details
  strike_price DOUBLE,                 -- NULL for non-options
  option_type SYMBOL CAPACITY 2,       -- 'CE', 'PE', NULL
  expiry_date TIMESTAMP,               -- NULL for non-options

  -- For stocks: constituent metadata
  stock_symbol SYMBOL CAPACITY 1000,   -- 'RELIANCE', 'HDFC', etc. (NULL for indices/options)
  is_nifty50_constituent BOOLEAN,      -- TRUE if part of NIFTY50

  -- Price data
  ltp DOUBLE,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  prev_close DOUBLE,

  -- Volume data
  volume LONG,
  open_interest LONG,                  -- NULL for spot

  -- Bid/Ask (Level 1)
  bid DOUBLE,
  ask DOUBLE,
  bid_qty INT,
  ask_qty INT,

  -- Circuit limits
  upper_circuit DOUBLE,
  lower_circuit DOUBLE,

  -- Metadata
  exchange SYMBOL CAPACITY 5,          -- 'NSE', 'BSE'
  trade_time TIMESTAMP                 -- Original exchange timestamp

) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
```

**Indexes**:

- `instrument_key` (PRIMARY) - for single instrument queries
- `instrument_type` (SYMBOL) - for filtering by type
- `index_name` (SYMBOL) - for NIFTY50/BANKNIFTY queries
- `stock_symbol` (SYMBOL) - for constituent analysis

**Example Queries**:

```sql
-- Get NIFTY50 FUTURE ticks
SELECT * FROM market_ticks
WHERE index_name = 'NIFTY50'
  AND instrument_type = 'FUTURE'
  AND timestamp BETWEEN '2026-01-01' AND '2026-01-31';

-- Get all NIFTY50 constituents ticks
SELECT * FROM market_ticks
WHERE is_nifty50_constituent = TRUE
  AND timestamp > dateadd('h', -1, now());

-- Get option chain for NIFTY ATM strikes
SELECT * FROM market_ticks
WHERE instrument_type = 'OPTION'
  AND index_name = 'NIFTY50'
  AND strike_price BETWEEN 23000 AND 24000
  AND timestamp > dateadd('m', -5, now());
```

**Expected Volume**: ~10M ticks/day (50 stocks × 1 future × 50 options × ~4K ticks)

---

### 2. market_depth_20 (20-Level Order Book)

**Purpose**: Full market depth (up to 20 levels) for all instruments

**Schema**:

```sql
CREATE TABLE IF NOT EXISTS market_depth_20 (
  -- Time dimension
  timestamp TIMESTAMP,

  -- Instrument identification
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  instrument_type SYMBOL CAPACITY 10,
  index_name SYMBOL CAPACITY 20,

  -- Order book side and level
  side SYMBOL CAPACITY 2,              -- 'BUY', 'SELL'
  level BYTE,                          -- 0-19 (depth level)

  -- Order book data
  price DOUBLE,
  quantity INT,
  orders INT,                          -- Number of orders at this level

  -- Metadata
  exchange SYMBOL CAPACITY 5

) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, side, level);
```

**Indexes**:

- Composite: `(instrument_key, side, level)` for snapshot reconstruction

**Example Queries**:

```sql
-- Get latest 20-level depth for NIFTY FUTURE
SELECT * FROM market_depth_20
WHERE instrument_key = 'NSE_FO|NIFTY26JAN24FUT'
  AND timestamp = (SELECT MAX(timestamp) FROM market_depth_20 WHERE instrument_key = 'NSE_FO|NIFTY26JAN24FUT')
ORDER BY side, level;

-- Calculate bid-ask imbalance for top 5 levels
SELECT
  timestamp,
  SUM(CASE WHEN side = 'BUY' THEN quantity ELSE 0 END) AS total_bid_qty,
  SUM(CASE WHEN side = 'SELL' THEN quantity ELSE 0 END) AS total_ask_qty,
  (SUM(CASE WHEN side = 'BUY' THEN quantity ELSE 0 END) -
   SUM(CASE WHEN side = 'SELL' THEN quantity ELSE 0 END)) AS imbalance
FROM market_depth_20
WHERE instrument_key = 'NSE_FO|NIFTY26JAN24FUT'
  AND level < 5
  AND timestamp BETWEEN '2026-01-13 09:15' AND '2026-01-13 15:30'
GROUP BY timestamp
ORDER BY timestamp DESC;
```

**Expected Volume**: ~50M rows/day (10K instruments × 40 levels × 120 updates/instrument)

---

### 3. option_greeks (Greeks + IV Snapshots)

**Purpose**: Option Greeks calculated by Upstox or compute-engine

**Schema**:

```sql
CREATE TABLE IF NOT EXISTS option_greeks (
  -- Time dimension
  timestamp TIMESTAMP,

  -- Instrument identification
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  index_name SYMBOL CAPACITY 20,
  strike_price DOUBLE,
  option_type SYMBOL CAPACITY 2,
  expiry_date TIMESTAMP,

  -- Greeks
  delta DOUBLE,
  gamma DOUBLE,
  theta DOUBLE,
  vega DOUBLE,
  rho DOUBLE,

  -- Implied Volatility
  iv DOUBLE,                           -- Implied Volatility (%)
  iv_bid DOUBLE,                       -- IV calculated from bid
  iv_ask DOUBLE,                       -- IV calculated from ask

  -- Underlying data
  underlying_price DOUBLE,
  underlying_symbol SYMBOL CAPACITY 20,

  -- Time to expiry
  days_to_expiry DOUBLE,               -- Calendar days
  trading_days_to_expiry DOUBLE,       -- Trading days (excluding weekends/holidays)

  -- Option pricing metadata
  risk_free_rate DOUBLE,               -- Used for Greeks calculation
  dividend_yield DOUBLE

) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
```

**Example Queries**:

```sql
-- Get ATM straddle Greeks
SELECT * FROM option_greeks
WHERE index_name = 'NIFTY50'
  AND ABS(underlying_price - strike_price) < 100
  AND timestamp > dateadd('h', -1, now())
ORDER BY timestamp DESC, strike_price;

-- Calculate portfolio delta exposure
SELECT
  timestamp,
  SUM(delta) AS total_delta,
  SUM(gamma) AS total_gamma,
  SUM(vega) AS total_vega
FROM option_greeks
WHERE instrument_key IN ('NSE_FO|NIFTY26JAN24C23000', 'NSE_FO|NIFTY26JAN24P23000')
  AND timestamp = (SELECT MAX(timestamp) FROM option_greeks)
GROUP BY timestamp;
```

**Expected Volume**: ~2M rows/day (50 strikes × 2 option types × 200 snapshots)

---

## Computed Features Tables

### 4. training_features_lightgbm (LightGBM Input Features)

**Purpose**: Pre-calculated features for LightGBM model (33 features)

**Schema**:

```sql
CREATE TABLE IF NOT EXISTS training_features_lightgbm (
  -- Time dimension (1-minute snapshots aligned to market timestamps)
  timestamp TIMESTAMP,

  -- Reference instrument (typically NIFTY50 FUTURE)
  reference_instrument SYMBOL CAPACITY 100,
  index_name SYMBOL CAPACITY 20,

  -- === INDEX FEATURES (10) ===
  -- Price action
  nifty_spot_price DOUBLE,
  nifty_future_price DOUBLE,
  spot_future_basis DOUBLE,            -- Basis = Future - Spot
  basis_pct DOUBLE,                    -- Basis %

  -- Volume
  nifty_future_volume LONG,
  nifty_spot_volume LONG,

  -- Volatility
  nifty_spot_volatility_5m DOUBLE,     -- Realized volatility (5-min rolling)
  nifty_spot_volatility_15m DOUBLE,

  -- Trend
  nifty_spot_roc_5m DOUBLE,            -- Rate of Change (5-min)
  nifty_spot_momentum_15m DOUBLE,

  -- === FUTURES FEATURES (8) ===
  -- Technical indicators (from compute-engine)
  future_sma_9 DOUBLE,
  future_sma_21 DOUBLE,
  future_ema_9 DOUBLE,
  future_rsi_14 DOUBLE,
  future_atr_14 DOUBLE,
  future_macd DOUBLE,
  future_macd_signal DOUBLE,
  future_macd_histogram DOUBLE,

  -- === OPTIONS FEATURES (10) ===
  -- ATM straddle data
  atm_strike DOUBLE,
  atm_call_iv DOUBLE,
  atm_put_iv DOUBLE,
  atm_iv_skew DOUBLE,                  -- Call IV - Put IV

  -- PCR (Put-Call Ratio)
  pcr_oi DOUBLE,                       -- OI-based PCR
  pcr_volume DOUBLE,                   -- Volume-based PCR

  -- Greeks exposure
  total_call_oi LONG,
  total_put_oi LONG,
  max_pain_strike DOUBLE,              -- Strike with max OI
  iv_rank DOUBLE,                      -- IV percentile (0-100)

  -- === MARKET BREADTH (5) ===
  -- Constituent analysis
  nifty50_advance_count INT,           -- Number of stocks up
  nifty50_decline_count INT,           -- Number of stocks down
  nifty50_unchanged_count INT,
  nifty50_advance_decline_ratio DOUBLE,
  nifty50_avg_return_1m DOUBLE,        -- Average 1-min return across constituents

  -- === MICROSTRUCTURE (from LiT features) (5) ===
  -- Order Flow Imbalance (OFI)
  ofi_1s DOUBLE,                       -- 1-second OFI
  ofi_5s DOUBLE,
  ofi_30s DOUBLE,

  -- Bid-ask spread
  bid_ask_spread_bps DOUBLE,           -- Spread in basis points
  depth_imbalance_top5 DOUBLE,         -- (Bid qty - Ask qty) / (Bid qty + Ask qty) for top 5 levels

  -- === TIME FEATURES (5) ===
  hour INT,
  minute INT,
  seconds_since_market_open INT,
  seconds_to_market_close INT,
  is_first_hour BOOLEAN,

  -- === METADATA ===
  feature_version STRING,              -- 'v1.0.0' (for tracking schema changes)
  computation_latency_ms INT           -- Time taken to compute features (for monitoring)

) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, reference_instrument);
```

**Total Features**: 43 (10 index + 8 futures + 10 options + 5 breadth + 5 microstructure + 5 time)

**Example Queries**:

```sql
-- Get training data for specific date range
SELECT * FROM training_features_lightgbm
WHERE timestamp BETWEEN '2025-12-01' AND '2025-12-31'
  AND index_name = 'NIFTY50'
ORDER BY timestamp;

-- Join with labels for supervised learning
SELECT
  f.*,
  -- Forward-looking target (5-min future return)
  (LEAD(nifty_future_price, 5) OVER (ORDER BY timestamp) - nifty_future_price) / nifty_future_price * 100 AS target_return_5m
FROM training_features_lightgbm f
WHERE timestamp BETWEEN '2025-12-01' AND '2025-12-31'
ORDER BY timestamp;
```

**Expected Volume**: ~375 rows/day (6.5 hours × 60 minutes)

---

### 5. training_features_tft (Temporal Fusion Transformer Features)

**Purpose**: Time-series features for TFT model (regime detection + volatility forecasting)

**Schema**:

```sql
CREATE TABLE IF NOT EXISTS training_features_tft (
  -- Time dimension
  timestamp TIMESTAMP,

  -- Reference instrument
  reference_instrument SYMBOL CAPACITY 100,
  index_name SYMBOL CAPACITY 20,

  -- === TIME-SERIES FEATURES (Past 120 timesteps, 5-min intervals = 10 hours) ===
  -- These are stored as JSON arrays for Python compatibility

  -- Returns (log returns for numerical stability)
  returns_5m STRING,                   -- JSON array: [-0.002, 0.001, ...]
  returns_15m STRING,
  returns_1h STRING,

  -- Volatility (rolling std of returns)
  volatility_5m STRING,
  volatility_15m STRING,
  volatility_1h STRING,

  -- Volume
  volume_normalized STRING,            -- Z-scored volume

  -- Breadth indicators
  advance_decline_ratio STRING,
  nifty50_momentum_distribution STRING, -- Distribution of constituent returns

  -- Options flow
  pcr_oi STRING,
  atm_iv STRING,
  iv_term_structure STRING,            -- IV at different expiries [weekly, monthly, quarterly]

  -- Microstructure
  bid_ask_spread STRING,
  order_flow_imbalance STRING,

  -- === STATIC FEATURES (Current snapshot) ===
  current_regime STRING,               -- 'TRENDING', 'RANGING', 'VOLATILE'
  vix_level DOUBLE,
  market_phase STRING,                 -- 'OPENING', 'MID_DAY', 'CLOSING'

  -- === METADATA ===
  feature_version STRING,
  lookback_window INT                  -- Number of timesteps in arrays (default: 120)

) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, reference_instrument);
```

**Note**: Time-series stored as JSON strings for Python compatibility. Alternative: separate table with (timestamp, feature_name, timestep, value).

**Expected Volume**: ~75 rows/day (5-min snapshots)

---

### 6. training_labels (Supervised Learning Targets)

**Purpose**: Ground truth labels for training (future returns, regime labels, etc.)

**Schema**:

```sql
CREATE TABLE IF NOT EXISTS training_labels (
  -- Time dimension (matches feature timestamp)
  timestamp TIMESTAMP,

  -- Reference instrument
  reference_instrument SYMBOL CAPACITY 100,
  index_name SYMBOL CAPACITY 20,

  -- === REGRESSION TARGETS ===
  -- Future returns (for directional prediction)
  target_return_1m DOUBLE,             -- 1-minute forward return
  target_return_5m DOUBLE,
  target_return_15m DOUBLE,
  target_return_eod DOUBLE,            -- Return until 3:30 PM

  -- Future volatility (for volatility forecasting)
  target_volatility_5m DOUBLE,
  target_volatility_15m DOUBLE,

  -- === CLASSIFICATION TARGETS ===
  -- Directional labels
  target_direction_5m STRING,          -- 'UP', 'DOWN', 'NEUTRAL' (thresholded returns)
  target_volatility_regime_5m STRING,  -- 'HIGH', 'MEDIUM', 'LOW'

  -- Regime labels (from TFT or HMM)
  regime_label STRING,                 -- 'TRENDING', 'RANGING', 'VOLATILE'
  regime_confidence DOUBLE,            -- Posterior probability

  -- === RISK LABELS ===
  -- Max drawdown in next 5 minutes
  max_drawdown_5m DOUBLE,
  max_runup_5m DOUBLE,

  -- Realized volatility (actual, not predicted)
  realized_volatility_5m DOUBLE,

  -- === EVENT LABELS ===
  had_regime_change BOOLEAN,           -- Did regime change in next 15 minutes?
  had_spike_event BOOLEAN,             -- Did price move >0.5% in next 1 minute?

  -- === METADATA ===
  label_quality STRING,                -- 'CLEAN', 'NOISY', 'OUTLIER' (data quality flag)
  label_version STRING

) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, reference_instrument);
```

**Example Queries**:

```sql
-- Join features with labels for model training
SELECT
  f.*,
  l.target_return_5m,
  l.target_direction_5m,
  l.regime_label
FROM training_features_lightgbm f
INNER JOIN training_labels l
  ON f.timestamp = l.timestamp
  AND f.reference_instrument = l.reference_instrument
WHERE f.timestamp BETWEEN '2025-12-01' AND '2025-12-31'
  AND l.label_quality = 'CLEAN'
ORDER BY f.timestamp;
```

**Expected Volume**: ~375 rows/day (matches feature frequency)

---

## Materialized Views (Query Optimization)

### Auto-Aggregated Candles

```sql
-- 5-minute candles from 1-minute ticks (auto-materialized)
CREATE TABLE IF NOT EXISTS market_candles_5m AS
SELECT
  timestamp,
  instrument_key,
  instrument_type,
  index_name,
  FIRST(ltp) AS open,
  MAX(ltp) AS high,
  MIN(ltp) AS low,
  LAST(ltp) AS close,
  SUM(volume) AS volume,
  LAST(open_interest) AS open_interest
FROM market_ticks
SAMPLE BY 5m ALIGN TO CALENDAR
PARTITION BY DAY;
```

---

## Indexes & Performance Tuning

### Critical Indexes

```sql
-- Primary: instrument_key (SYMBOL with INDEX)
-- Secondary: (index_name, instrument_type) composite
-- Time-based: Automatic via TIMESTAMP(timestamp) PARTITION BY DAY
```

### Query Optimization Rules

1. **Always filter by timestamp first**: `WHERE timestamp BETWEEN ... AND ...`
2. **Use SYMBOL columns for filtering**: `WHERE index_name = 'NIFTY50'` (not `LIKE '%NIFTY%'`)
3. **Avoid SELECT \***: Specify columns to reduce I/O
4. **Use SAMPLE BY for aggregation**: Built-in time-series downsampling
5. **Leverage PARTITION BY DAY**: Queries within 1 day are ~10x faster

---

## Data Retention Policy

| Table                 | Retention | Reason                                  |
| --------------------- | --------- | --------------------------------------- |
| `market_ticks`        | 1 year    | Training needs 6-12 months walk-forward |
| `market_depth_20`     | 3 months  | High volume, microstructure only        |
| `option_greeks`       | 6 months  | Historical Greeks for backtesting       |
| `training_features_*` | 2 years   | Model retraining and comparison         |
| `training_labels`     | 2 years   | Must match features                     |

**Archival**: After retention period, export to Parquet files and store in cloud (S3/GCS).

---

## Training Pipeline Integration (Python)

### Example: Fetch LightGBM Training Data

```python
from questdb import QuestDBClient
import pandas as pd

# Connect to QuestDB
client = QuestDBClient(host='localhost', port=8812, user='admin', password='quest')

# Query features + labels
query = """
SELECT
  f.*,
  l.target_return_5m,
  l.target_direction_5m
FROM training_features_lightgbm f
INNER JOIN training_labels l
  ON f.timestamp = l.timestamp
  AND f.reference_instrument = l.reference_instrument
WHERE f.timestamp BETWEEN '2025-06-01' AND '2025-12-31'
  AND f.index_name = 'NIFTY50'
  AND l.label_quality = 'CLEAN'
ORDER BY f.timestamp
"""

# Load into pandas
df = client.query_to_df(query)

# Split features and target
feature_cols = [col for col in df.columns if col.startswith(('nifty_', 'future_', 'atm_', 'pcr_', 'ofi_', 'nifty50_', 'bid_ask_', 'depth_'))]
X = df[feature_cols]
y = df['target_direction_5m']

print(f"Loaded {len(df)} training samples with {len(feature_cols)} features")
```

**No feature recalculation needed!** All features are pre-computed by compute-engine.

---

## Migration Plan

### Phase 1: Schema Creation (Week 1)

- [ ] Create new tables in QuestDB
- [ ] Update `@repo/database` repositories
- [ ] Add SQL queries to `@repo/schema/sql/`
- [ ] Unit tests for insert/query operations

### Phase 2: Data Collection (Week 2)

- [ ] Update `market-feeder` to store raw ticks to `market_ticks`
- [ ] Implement depth-20 collection to `market_depth_20`
- [ ] Store Greeks snapshots to `option_greeks`

### Phase 3: Feature Computation (Week 3)

- [ ] Implement `compute-engine` Rust services:
  - `TechnicalIndicatorComputer` (RSI, MACD, ATR, etc.)
  - `MarketBreadthAggregator` (NIFTY50 constituent analysis)
  - `MicrostructureFeatureBuilder` (OFI, depth imbalance)
- [ ] Store computed features to `training_features_lightgbm`

### Phase 4: Label Generation (Week 4)

- [ ] Implement label calculation service (forward returns, regime labels)
- [ ] Store labels to `training_labels`
- [ ] Validate feature-label alignment

### Phase 5: Training Pipeline Integration (Week 5)

- [ ] Update `training-pipeline` Kedro nodes to query QuestDB
- [ ] Remove duplicate feature calculation code
- [ ] Benchmark: training time reduction (expect 50-70% faster)

---

## Monitoring & Quality Checks

### Data Quality Metrics

```sql
-- Check for missing data (gaps in timestamps)
SELECT
  timestamp,
  LEAD(timestamp) OVER (ORDER BY timestamp) AS next_timestamp,
  DATEDIFF('s', timestamp, LEAD(timestamp) OVER (ORDER BY timestamp)) AS gap_seconds
FROM training_features_lightgbm
WHERE gap_seconds > 120  -- Alert if >2 minute gap
ORDER BY timestamp DESC
LIMIT 100;

-- Feature distribution check (detect outliers)
SELECT
  COUNT(*) AS total_rows,
  AVG(nifty_spot_price) AS avg_spot,
  STDDEV(nifty_spot_price) AS stddev_spot,
  MIN(nifty_spot_price) AS min_spot,
  MAX(nifty_spot_price) AS max_spot
FROM training_features_lightgbm
WHERE timestamp > dateadd('d', -7, now());
```

---

## Cost Estimation

### Storage Requirements (1 year)

| Table                        | Rows/Day | Row Size | Daily Size | Yearly Size |
| ---------------------------- | -------- | -------- | ---------- | ----------- |
| `market_ticks`               | 10M      | 150 B    | 1.5 GB     | 550 GB      |
| `market_depth_20`            | 50M      | 80 B     | 4 GB       | 1.5 TB      |
| `option_greeks`              | 2M       | 120 B    | 240 MB     | 88 GB       |
| `training_features_lightgbm` | 375      | 500 B    | 190 KB     | 69 MB       |
| `training_features_tft`      | 75       | 2 KB     | 150 KB     | 55 MB       |
| `training_labels`            | 375      | 200 B    | 75 KB      | 27 MB       |
| **TOTAL**                    | -        | -        | **5.7 GB** | **~2 TB**   |

**Compression**: QuestDB achieves ~70% compression → **~600 GB actual storage**

**Cost** (AWS EBS gp3): $0.08/GB/month × 600 GB = **$48/month**

---

## References

- [QuestDB Time-Series Best Practices](https://questdb.io/docs/concept/partitions/)
- [SYMBOL vs STRING Performance](https://questdb.io/docs/concept/symbol/)
- [Feature Store Architecture](../../../docs/FEATURE_STORE_ARCHITECTURE.md)
