# Training Data Schema - QuestDB Design

> **Comprehensive market data and feature storage for ML training pipeline**

**Last Updated**: January 18, 2026  
**Status**: Production Schema Design  
**Related**: [QUESTDB_TRAINING_DATA.md](../../../docs/ml/QUESTDB_TRAINING_DATA.md)

---

## Overview

This document describes the QuestDB schema design for storing:

1. **Historical Market Data**: 26 years of OHLCV (2000-2026)
2. **Tick-by-Tick Data**: Real-time from Upstox WebSocket (2024+)
3. **Market Depth**: 20-level LOB snapshots
4. **Computed Features**: 54 pre-calculated features for ML models
5. **Training Labels**: Multi-horizon targets with validity flags

> **Purpose**: QuestDB is **ONLY for training models**. Not for live inference or application data.

---

## Data Scope

| Data Type | Time Range | Frequency | Size Estimate |
|-----------|------------|-----------|---------------|
| Historical OHLCV | 2000-2026 | Daily/Minute | ~50GB |
| Tick-by-Tick | 2024-2026 | Tick | ~1TB |
| Market Depth 20 | 2024-2026 | Snapshot | ~2TB |
| 54 Computed Features | 2020-2026 | 1-minute | ~10GB |
| Multi-horizon Labels | 2020-2026 | 1-minute | ~5GB |

---

## Table Schemas

### 1. historical_ohlcv

26 years of daily and minute-level OHLCV data.

```sql
CREATE TABLE IF NOT EXISTS historical_ohlcv (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  instrument_type SYMBOL CAPACITY 10,    -- 'INDEX', 'FUTURE', 'STOCK', 'OPTION'
  index_name SYMBOL CAPACITY 20,          -- 'NIFTY50', 'BANKNIFTY', NULL
  timeframe SYMBOL CAPACITY 10,           -- '1m', '5m', '15m', '1h', '1d'
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume LONG,
  open_interest LONG,
  strike_price DOUBLE,                    -- For options
  option_type SYMBOL CAPACITY 2,          -- 'CE', 'PE'
  expiry_date TIMESTAMP,
  source SYMBOL CAPACITY 20,              -- 'NSE', 'YAHOO', 'UPSTOX'
  is_valid BOOLEAN,
  invalid_reason STRING
) TIMESTAMP(timestamp) PARTITION BY YEAR WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, timeframe);
```

### 2. tick_data

Tick-by-tick data from Upstox WebSocket.

```sql
CREATE TABLE IF NOT EXISTS tick_data (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  instrument_type SYMBOL CAPACITY 10,
  ltp DOUBLE,
  last_traded_qty INT,
  total_traded_volume LONG,
  best_bid_price DOUBLE,
  best_bid_qty INT,
  best_ask_price DOUBLE,
  best_ask_qty INT,
  open_interest LONG,
  trade_side SYMBOL CAPACITY 5,           -- 'BUY', 'SELL', 'UNKNOWN'
  is_valid BOOLEAN,
  invalid_reason STRING
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
```

### 3. market_depth_20

20-level order book snapshots.

```sql
CREATE TABLE IF NOT EXISTS market_depth_20 (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  
  -- Flattened 20-level depth (bid side)
  bid_price_1 DOUBLE, bid_qty_1 INT, bid_orders_1 INT,
  bid_price_2 DOUBLE, bid_qty_2 INT, bid_orders_2 INT,
  -- ... (levels 3-20)
  bid_price_20 DOUBLE, bid_qty_20 INT, bid_orders_20 INT,
  
  -- Flattened 20-level depth (ask side)
  ask_price_1 DOUBLE, ask_qty_1 INT, ask_orders_1 INT,
  ask_price_2 DOUBLE, ask_qty_2 INT, ask_orders_2 INT,
  -- ... (levels 3-20)
  ask_price_20 DOUBLE, ask_qty_20 INT, ask_orders_20 INT,
  
  -- Aggregates
  total_bid_qty LONG,
  total_ask_qty LONG,
  mid_price DOUBLE,
  spread_bps DOUBLE,
  
  is_valid BOOLEAN,
  invalid_reason STRING
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
```

### 4. training_features_54

54 pre-computed features for ML training.

```sql
CREATE TABLE IF NOT EXISTS training_features_54 (
  timestamp TIMESTAMP,
  reference_instrument SYMBOL CAPACITY 100,
  
  -- Index Breadth (8)
  pct_stocks_above_vwap DOUBLE,
  pct_stocks_above_ema20 DOUBLE,
  weighted_return_top10 DOUBLE,
  advance_decline_ratio DOUBLE,
  breadth_momentum_5m DOUBLE,
  breadth_volatility DOUBLE,
  breadth_thrust DOUBLE,
  new_highs_lows_ratio DOUBLE,
  
  -- NIFTY Future (12)
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
  
  -- Options (14)
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
  
  -- Volatility (6)
  india_vix DOUBLE,
  realized_vol_5m DOUBLE,
  realized_vol_15m DOUBLE,
  vol_expansion_ratio DOUBLE,
  iv_rv_ratio DOUBLE,
  vix_percentile_30d DOUBLE,
  
  -- Order Flow (8)
  bid_ask_spread_bps DOUBLE,
  depth_imbalance_5 DOUBLE,
  ofi_1s DOUBLE,
  ofi_5s DOUBLE,
  ofi_30s DOUBLE,
  trade_imbalance DOUBLE,
  bid_slope DOUBLE,
  ask_slope DOUBLE,
  
  -- Time Context (6)
  minutes_from_open INT,
  minutes_to_close INT,
  day_of_week INT,
  is_expiry_day INT,
  days_to_expiry INT,
  session_phase INT,
  
  -- Metadata
  feature_version STRING,
  computation_latency_us INT,
  is_valid BOOLEAN,
  invalid_reason STRING
  
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, reference_instrument);
```

### 5. training_labels

Multi-horizon labels for supervised learning.

```sql
CREATE TABLE IF NOT EXISTS training_labels (
  timestamp TIMESTAMP,
  reference_instrument SYMBOL CAPACITY 100,
  
  -- Regression targets
  target_return_10s DOUBLE,
  target_return_1m DOUBLE,
  target_return_5m DOUBLE,
  target_return_15m DOUBLE,
  target_return_1h DOUBLE,
  target_return_eod DOUBLE,
  
  -- Volatility targets
  target_volatility_5m DOUBLE,
  target_volatility_15m DOUBLE,
  target_max_drawdown_5m DOUBLE,
  target_max_runup_5m DOUBLE,
  
  -- Classification targets
  target_direction_5m SYMBOL CAPACITY 5,     -- 'UP', 'DOWN', 'NEUTRAL'
  target_direction_15m SYMBOL CAPACITY 5,
  target_volatility_regime SYMBOL CAPACITY 5, -- 'HIGH', 'MEDIUM', 'LOW'
  
  -- Regime labels
  regime_label SYMBOL CAPACITY 20,
  regime_confidence DOUBLE,
  
  -- Event flags
  had_regime_change BOOLEAN,
  had_spike_event BOOLEAN,
  had_gap_event BOOLEAN,
  
  -- Validity
  is_valid BOOLEAN,
  invalid_reason STRING,
  label_quality SYMBOL CAPACITY 10,          -- 'CLEAN', 'NOISY', 'OUTLIER'
  label_version STRING
  
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, reference_instrument);
```

---

## Validity Flags

All training tables include `is_valid` and `invalid_reason` columns:

| invalid_reason | Meaning | Action |
|----------------|---------|--------|
| `MARKET_CLOSED` | Holiday/weekend | Exclude |
| `PRE_OPEN` | 9:00-9:15 session | Exclude |
| `STALE_DATA` | Gap >60s | Review |
| `OUTLIER` | >5σ from mean | Review |
| `INCOMPLETE_BREADTH` | <40 stocks | Caution |
| `INCOMPLETE_OPTIONS` | <10 strikes | Exclude options |
| `CIRCUIT_LIMIT` | Circuit hit | Special handling |
| `LOW_LIQUIDITY` | Spread >50bps | Review |

---

## Query Examples

### Training data with validity

```sql
SELECT 
  f.*,
  l.target_return_5m,
  l.target_direction_5m
FROM training_features_54 f
JOIN training_labels l USING (timestamp, reference_instrument)
WHERE f.is_valid = TRUE
  AND l.is_valid = TRUE
  AND l.label_quality = 'CLEAN'
  AND f.timestamp BETWEEN '2020-01-01' AND '2025-12-31'
ORDER BY f.timestamp;
```

---

## Related Documentation

- [QUESTDB_TRAINING_DATA.md](../../../docs/ml/QUESTDB_TRAINING_DATA.md) - Detailed architecture
- [FEATURE_SPECIFICATION.md](../../../docs/ml/FEATURE_SPECIFICATION.md) - 54 feature definitions
- [TRAINING_DATA_GUIDE.md](../../../services/training-pipeline/docs/TRAINING_DATA_GUIDE.md) - Python usage
