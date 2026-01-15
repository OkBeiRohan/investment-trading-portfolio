-- QuestDB Migration Script - Production Grade
-- Version: 2.0.0
-- Date: January 13, 2026
-- Description: Production-grade schema aligned with Upstox V3 APIs and ML architecture
--
-- Run this script in QuestDB console (http://localhost:9000)
-- Execution time: ~10 seconds
--
-- Design Principles:
-- 1. One unified raw table per data "shape"
-- 2. No derived data mixed with raw
-- 3. Instrument identity matches Upstox instrument_key
-- 4. Time-series first (timestamp is king)
-- 5. Training must be reproducible from DB alone
--
-- Tables created:
-- 1. instrument_master          - Instrument registry (spot, futures, options, stocks)
-- 2. market_candles              - Historical OHLCV data (unified across all instruments)
-- 3. orderbook_l2_snapshots      - Level 2 order book (optional, for execution models)
-- 4. instrument_features_1m      - Derived intraday features per instrument
-- 5. option_chain_snapshot       - Option chain with Greeks
-- 6. market_state_1m             - Market State Encoder output (feeds LightGBM)
-- 7. training_labels_1m          - Supervised learning labels (EXPLICIT & SEPARATE)
-- 8. system_audit                - Distributed tracing logs

-- =============================================================================
-- TABLE 1: instrument_master
-- Instrument registry - MANDATORY for all joins
-- Single source of truth for instrument metadata
-- Expected: 10K instruments (500 stocks + 9K options/futures)
-- =============================================================================
CREATE TABLE IF NOT EXISTS instrument_master (
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,  -- e.g. NSE_INDEX|Nifty 50, NSE_FO|NIFTY24JANFUT
  exchange SYMBOL CAPACITY 10,                         -- NSE, BSE, MCX
  segment SYMBOL CAPACITY 10,                          -- INDEX | EQ | FO | COMMODITY
  instrument_type SYMBOL CAPACITY 10,                  -- SPOT | STOCK | FUTURE | OPTION
  tradingsymbol SYMBOL CAPACITY 50,                    -- NIFTY, RELIANCE, NIFTY24JANFUT
  name STRING,                                         -- Human readable name
  expiry DATE,                                         -- NULL for spot/stocks
  strike DOUBLE,                                       -- NULL unless option
  option_type SYMBOL CAPACITY 2,                       -- CE | PE | NULL
  lot_size INT,                                        -- Contract multiplier
  tick_size DOUBLE,                                    -- Minimum price movement
  underlying_key SYMBOL CAPACITY 50000,                -- Links option/future → spot
  is_expired BOOLEAN,                                  -- Historical vs active
  last_updated TIMESTAMP                               -- When this record was updated
);

-- =============================================================================
-- TABLE 2: market_candles
-- Unified historical candle data (Upstox Historical Candle V3)
-- Single table for: stocks, futures, options, index
-- Expected: 500K candles/day (50 instruments × 3 intervals × 3300 bars)
-- =============================================================================
CREATE TABLE IF NOT EXISTS market_candles (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  interval_value INT,                                  -- 1, 5, 15, 30, 60, etc.
  interval_unit SYMBOL CAPACITY 10,                    -- second | minute | day
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume DOUBLE,                                       -- Can be fractional for some instruments
  open_interest DOUBLE                                 -- NULL for spot/stocks
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, interval_value, interval_unit);

-- =============================================================================
-- TABLE 3: orderbook_l2_snapshots (OPTIONAL - for execution models later)
-- Level 2 order book snapshots (Upstox Market Feed V3 - depth 30)
-- Expected: 5M snapshots/day (50 instruments × 30 levels × 2 sides × 3300 updates)
-- =============================================================================
CREATE TABLE IF NOT EXISTS orderbook_l2_snapshots (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  side SYMBOL CAPACITY 2,                              -- bid | ask
  level BYTE,                                          -- 1..30 (depth level)
  price DOUBLE,
  quantity DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, side, level);

-- =============================================================================
-- TABLE 4: instrument_features_1m
-- Per-instrument features (BEFORE aggregation into market_state_1m)
-- NOT fed directly to LightGBM - used for market state aggregation
-- Expected: 200K rows/day (50 instruments × 390 minutes × 1 row)
-- =============================================================================
CREATE TABLE IF NOT EXISTS instrument_features_1m (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  
  -- ========== PRICE & STRUCTURE ==========
  last_price DOUBLE,                                   -- Current price
  vwap DOUBLE,                                         -- Volume-weighted average price (session-aware)
  price_vs_vwap DOUBLE,                                -- (price - vwap) / vwap
  
  day_high DOUBLE,                                     -- Day high
  day_low DOUBLE,                                      -- Day low
  price_vs_day_high DOUBLE,                            -- (price - day_high) / day_high
  price_vs_day_low DOUBLE,                             -- (price - day_low) / day_low
  range_position DOUBLE,                               -- (price - day_low) / (day_high - day_low)
  
  prev_day_high_dist DOUBLE,                           -- Distance from previous day high
  prev_day_low_dist DOUBLE,                            -- Distance from previous day low
  weekly_high_dist DOUBLE,                             -- Distance from weekly high
  weekly_low_dist DOUBLE,                              -- Distance from weekly low
  
  -- ========== MOMENTUM & TREND ==========
  rsi_5 DOUBLE,                                        -- RSI (5-period)
  rsi_14 DOUBLE,                                       -- RSI (14-period)
  rsi_21 DOUBLE,                                       -- RSI (21-period)
  macd_hist DOUBLE,                                    -- MACD histogram
  ema_9 DOUBLE,                                        -- 9-period EMA
  ema_21 DOUBLE,                                       -- 21-period EMA
  ema_9_slope DOUBLE,                                  -- 9-period EMA slope
  ema_21_slope DOUBLE,                                 -- 21-period EMA slope
  adx DOUBLE,                                          -- Average Directional Index
  roc_5 DOUBLE,                                        -- Rate of change (5-period)
  
  -- ========== VOLATILITY ==========
  atr DOUBLE,                                          -- Average True Range (14-period)
  atr_percent DOUBLE,                                  -- ATR as % of price
  realized_vol_5m DOUBLE,                              -- 5-min realized volatility
  realized_vol_15m DOUBLE,                             -- 15-min realized volatility
  vol_expansion_ratio DOUBLE,                          -- Short-term vol / long-term vol
  
  -- ========== TIME CONTEXT ==========
  minutes_from_open INT,                               -- Minutes since 9:15 AM
  minutes_to_close INT,                                -- Minutes until 3:30 PM
  day_of_week INT                                      -- 1=Monday, 7=Sunday
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);

-- =============================================================================
-- TABLE 5: option_chain_snapshot
-- Option chain with Greeks (CRITICAL for Market State Encoder)
-- Expected: 100K snapshots/day (50 options × 20 strikes × 100 updates)
-- =============================================================================
CREATE TABLE IF NOT EXISTS option_chain_snapshot (
  timestamp TIMESTAMP,
  underlying_key SYMBOL CAPACITY 1000 NOCACHE INDEX,   -- e.g. NSE_INDEX|Nifty 50
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,  -- Option instrument
  expiry DATE,
  strike DOUBLE,
  option_type SYMBOL CAPACITY 2,                       -- CE | PE
  
  -- Pricing
  last_price DOUBLE,
  bid_price DOUBLE,
  ask_price DOUBLE,
  volume DOUBLE,
  open_interest DOUBLE,
  
  -- Greeks
  iv DOUBLE,                                           -- Implied volatility
  delta DOUBLE,
  gamma DOUBLE,
  vega DOUBLE,
  theta DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, underlying_key, instrument_key);

-- =============================================================================
-- TABLE 6: market_state_1m
-- Market State Encoder output - THIS feeds LightGBM (33 features)
-- Compresses 50 constituents + futures + options into one state vector
-- Expected: 390 rows/day (1 per minute during market hours)
-- =============================================================================
CREATE TABLE IF NOT EXISTS market_state_1m (
  timestamp TIMESTAMP,
  
  -- ========== INDEX BREADTH (6) ==========
  pct_stocks_above_vwap DOUBLE,
  pct_stocks_above_ema20 DOUBLE,
  weighted_return_top10 DOUBLE,
  advance_decline_ratio DOUBLE,
  breadth_momentum_5m DOUBLE,
  breadth_volatility DOUBLE,
  
  -- ========== NIFTY FUTURE (9) ==========
  fut_price_vs_vwap DOUBLE,
  fut_range_position DOUBLE,
  fut_return_1m DOUBLE,
  fut_return_5m DOUBLE,
  fut_atr_percent DOUBLE,
  fut_volume_zscore DOUBLE,
  fut_oi_change DOUBLE,
  fut_rsi_14 DOUBLE,
  fut_macd DOUBLE,
  
  -- ========== OPTIONS (11) ==========
  atm_iv DOUBLE,
  atm_iv_change DOUBLE,
  iv_skew DOUBLE,
  gamma_atm DOUBLE,
  vega_atm DOUBLE,
  theta_atm DOUBLE,
  pcr_oi DOUBLE,
  pcr_volume DOUBLE,
  max_pain_distance DOUBLE,
  charm_atm DOUBLE,
  vanna_atm DOUBLE,
  
  -- ========== VOLATILITY (4) ==========
  india_vix DOUBLE,
  realized_vol_5m DOUBLE,
  realized_vol_15m DOUBLE,
  vol_expansion_ratio DOUBLE,
  
  -- ========== TIME CONTEXT (3) ==========
  minutes_from_open INT,
  minutes_to_close INT,
  day_of_week INT
) TIMESTAMP(timestamp) PARTITION BY DAY WAL;


-- =============================================================================
-- TABLE 7: training_labels_1m
-- Supervised learning labels (EXPLICIT & SEPARATE from features)
-- Expected: 390 rows/day (matches market_state_1m frequency)
-- =============================================================================
CREATE TABLE IF NOT EXISTS training_labels_1m (
  timestamp TIMESTAMP,
  horizon_minutes INT,                                 -- Forward-looking horizon (e.g. 5, 15)
  label BYTE,                                          -- -1 (down), 0 (neutral), +1 (up)
  future_return DOUBLE,                                -- Actual return at horizon
  atr_threshold DOUBLE                                 -- ATR used for labeling threshold
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, horizon_minutes);

-- =============================================================================
-- TABLE 8: system_audit
-- Distributed tracing audit log (unchanged from v1)
-- Expected: 100K events/day (all system actions with trace_id)
-- =============================================================================
CREATE TABLE IF NOT EXISTS system_audit (
  timestamp TIMESTAMP,
  trace_id SYMBOL CAPACITY 100000 INDEX,
  service SYMBOL CAPACITY 20,
  level SYMBOL CAPACITY 10,
  action SYMBOL CAPACITY 100,
  user_id SYMBOL CAPACITY 1000,
  metadata STRING
) TIMESTAMP(timestamp) PARTITION BY DAY WAL;

-- =============================================================================
-- VERIFICATION QUERIES (uncomment to run)
-- =============================================================================

-- List all tables
-- SELECT table_name FROM tables();

-- Check table row counts
-- SELECT 'instrument_master' as table_name, count(*) as rows FROM instrument_master
-- UNION ALL
-- SELECT 'market_candles', count(*) FROM market_candles
-- UNION ALL
-- SELECT 'orderbook_l2_snapshots', count(*) FROM orderbook_l2_snapshots
-- UNION ALL
-- SELECT 'instrument_features_1m', count(*) FROM instrument_features_1m
-- UNION ALL
-- SELECT 'option_chain_snapshot', count(*) FROM option_chain_snapshot
-- UNION ALL
-- SELECT 'market_state_1m', count(*) FROM market_state_1m
-- UNION ALL
-- SELECT 'training_labels_1m', count(*) FROM training_labels_1m
-- UNION ALL
-- SELECT 'system_audit', count(*) FROM system_audit;

-- Check storage usage
-- SELECT sum(diskSize) FROM table_partitions();

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Tables created: 8
-- Total execution time: ~10 seconds
--
-- IMPORTANT NOTES:
-- 1. This migration is OPTIONAL - questdb.service.ts auto-creates tables
-- 2. Data sources:
--    - instrument_master: /v3/instrument/expired-instruments + live dump
--    - market_candles: /v3/get-historical-candle-data + /get-expired-historical-candle-data
--    - orderbook_l2_snapshots: Upstox Market Feed V3 (depth 30) - OPTIONAL
--    - instrument_features_1m: Calculated from market_candles
--    - option_chain_snapshot: Upstox option feed + Greeks endpoint
--    - market_state_1m: Aggregated from all above sources
--    - training_labels_1m: Label generation job
--    - system_audit: All services via @repo/observability
--
-- 3. Next steps:
--    - Populate instrument_master from Upstox
--    - Start market-feeder service to ingest live data
--    - Run feature engineering jobs (compute-engine)
--    - Generate labels for training
--    - Train models in training-pipeline
--
-- 4. Performance tips:
--    - Use DEDUP UPSERT for idempotent writes
--    - Partition by DAY for time-series queries
--    - Index on instrument_key for fast lookups
--    - Use SYMBOL type for high-cardinality strings
--    - Enable WAL for durability
--
-- =============================================================================
