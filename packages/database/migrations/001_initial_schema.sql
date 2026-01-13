-- QuestDB Migration Script
-- Version: 1.0.0
-- Date: January 13, 2026
-- Description: Initial schema setup for trading platform
--
-- Run this script in QuestDB console (http://localhost:9000)
-- Execution time: ~5 seconds
--
-- Tables created:
-- 1. market_candles - Historical OHLCV data
-- 2. market_quotes - High-frequency bid/ask quotes
-- 3. option_greeks - Option Greeks snapshots
-- 4. market_depth - Order book (1-20 levels, variable depth)
-- 5. system_audit - Distributed tracing logs
-- 6. market_ticks - Unified tick data (spot/future/option/stock)
-- 7. training_features_lightgbm - LightGBM training features
-- 8. training_features_tft - TFT time-series features
-- 9. training_labels - Supervised learning labels
-- 10. market_candles_1m (VIEW) - Auto-aggregated 1-minute candles
-- 11. market_candles_30m (VIEW) - Auto-aggregated 30-minute candles
--
-- NOTE: This migration is OPTIONAL. The questdb.service.ts automatically
-- creates all tables on first run. Use this migration only if you want to
-- manually set up the schema or reset the database.

-- =============================================================================
-- TABLE 1: market_candles
-- Historical OHLCV candles
-- Expected: 200K candles/day across all instruments and intervals
-- =============================================================================
CREATE TABLE IF NOT EXISTS market_candles (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  interval SYMBOL CAPACITY 20,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume LONG,
  open_interest LONG
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, interval);

-- =============================================================================
-- TABLE 2: market_quotes
-- High-frequency bid/ask snapshots
-- Expected: 1M quotes/day (tick-by-tick)
-- =============================================================================
CREATE TABLE IF NOT EXISTS market_quotes (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  ltp DOUBLE,
  bid DOUBLE,
  ask DOUBLE,
  bid_qty INT,
  ask_qty INT,
  volume LONG,
  open_interest LONG,
  upper_circuit DOUBLE,
  lower_circuit DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);

-- =============================================================================
-- TABLE 3: option_greeks
-- Option Greeks snapshots
-- Expected: 50K greeks/day (snapshots every 5 minutes for active options)
-- =============================================================================
CREATE TABLE IF NOT EXISTS option_greeks (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  delta DOUBLE,
  gamma DOUBLE,
  theta DOUBLE,
  vega DOUBLE,
  iv DOUBLE,
  underlying_price DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);

-- =============================================================================
-- TABLE 4: market_depth
-- Order book levels (1-20 levels, stores whatever is available)
-- Expected: 500K-2M depth updates/day (5-20 levels × 2 sides × 10K updates)
-- Min 5 levels always available, 90% chance of getting 20 levels
-- =============================================================================
CREATE TABLE IF NOT EXISTS market_depth (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  instrument_type SYMBOL CAPACITY 10,
  index_name SYMBOL CAPACITY 20,
  side SYMBOL CAPACITY 2,
  level BYTE,
  price DOUBLE,
  quantity INT,
  orders INT,
  exchange SYMBOL CAPACITY 5
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, side, level);

-- =============================================================================
-- TABLE 5: system_audit
-- Distributed tracing audit log
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
-- TRAINING DATA TABLES (For ML Pipeline)
-- =============================================================================

-- =============================================================================
-- TABLE 6: market_ticks
-- Unified tick data for ALL instruments (spot, futures, options, stocks)
-- Expected: ~10M ticks/day (50 stocks × 1 future × 50 options × ~4K ticks)
-- =============================================================================
CREATE TABLE IF NOT EXISTS market_ticks (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  instrument_type SYMBOL CAPACITY 10,
  index_name SYMBOL CAPACITY 20,
  strike_price DOUBLE,
  option_type SYMBOL CAPACITY 2,
  expiry_date TIMESTAMP,
  stock_symbol SYMBOL CAPACITY 1000,
  is_nifty50_constituent BOOLEAN,
  ltp DOUBLE,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  prev_close DOUBLE,
  volume LONG,
  open_interest LONG,
  bid DOUBLE,
  ask DOUBLE,
  bid_qty INT,
  ask_qty INT,
  upper_circuit DOUBLE,
  lower_circuit DOUBLE,
  exchange SYMBOL CAPACITY 5,
  trade_time TIMESTAMP
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);

-- =============================================================================
-- TABLE 7: training_features_lightgbm
-- LightGBM training features (43 features)
-- Expected: ~375 rows/day (6.5 hours × 60 minutes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS training_features_lightgbm (
  timestamp TIMESTAMP,
  reference_instrument SYMBOL CAPACITY 100,
  index_name SYMBOL CAPACITY 20,
  nifty_spot_price DOUBLE,
  nifty_future_price DOUBLE,
  spot_future_basis DOUBLE,
  basis_pct DOUBLE,
  nifty_future_volume LONG,
  nifty_spot_volume LONG,
  nifty_spot_volatility_5m DOUBLE,
  nifty_spot_volatility_15m DOUBLE,
  nifty_spot_roc_5m DOUBLE,
  nifty_spot_momentum_15m DOUBLE,
  future_sma_9 DOUBLE,
  future_sma_21 DOUBLE,
  future_ema_9 DOUBLE,
  future_rsi_14 DOUBLE,
  future_atr_14 DOUBLE,
  future_macd DOUBLE,
  future_macd_signal DOUBLE,
  future_macd_histogram DOUBLE,
  atm_strike DOUBLE,
  atm_call_iv DOUBLE,
  atm_put_iv DOUBLE,
  atm_iv_skew DOUBLE,
  pcr_oi DOUBLE,
  pcr_volume DOUBLE,
  total_call_oi LONG,
  total_put_oi LONG,
  max_pain_strike DOUBLE,
  iv_rank DOUBLE,
  nifty50_advance_count INT,
  nifty50_decline_count INT,
  nifty50_unchanged_count INT,
  nifty50_advance_decline_ratio DOUBLE,
  nifty50_avg_return_1m DOUBLE,
  ofi_1s DOUBLE,
  ofi_5s DOUBLE,
  ofi_30s DOUBLE,
  bid_ask_spread_bps DOUBLE,
  depth_imbalance_top5 DOUBLE,
  hour INT,
  minute INT,
  seconds_since_market_open INT,
  seconds_to_market_close INT,
  is_first_hour BOOLEAN,
  feature_version STRING,
  computation_latency_ms INT
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, reference_instrument);

-- =============================================================================
-- TABLE 9: training_features_tft
-- TFT time-series features (for regime detection)
-- Expected: ~75 rows/day (5-min snapshots)
-- =============================================================================
CREATE TABLE IF NOT EXISTS training_features_tft (
  timestamp TIMESTAMP,
  reference_instrument SYMBOL CAPACITY 100,
  index_name SYMBOL CAPACITY 20,
  returns_5m STRING,
  returns_15m STRING,
  returns_1h STRING,
  volatility_5m STRING,
  volatility_15m STRING,
  volatility_1h STRING,
  volume_normalized STRING,
  advance_decline_ratio STRING,
  nifty50_momentum_distribution STRING,
  pcr_oi STRING,
  atm_iv STRING,
  iv_term_structure STRING,
  bid_ask_spread STRING,
  order_flow_imbalance STRING,
  current_regime STRING,
  vix_level DOUBLE,
  market_phase STRING,
  feature_version STRING,
  lookback_window INT
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, reference_instrument);

-- =============================================================================
-- TABLE 10: training_labels
-- Training labels (supervised learning targets)
-- Expected: ~375 rows/day (matches feature frequency)
-- =============================================================================
CREATE TABLE IF NOT EXISTS training_labels (
  timestamp TIMESTAMP,
  reference_instrument SYMBOL CAPACITY 100,
  index_name SYMBOL CAPACITY 20,
  target_return_1m DOUBLE,
  target_return_5m DOUBLE,
  target_return_15m DOUBLE,
  target_return_eod DOUBLE,
  target_volatility_5m DOUBLE,
  target_volatility_15m DOUBLE,
  target_direction_5m STRING,
  target_volatility_regime_5m STRING,
  regime_label STRING,
  regime_confidence DOUBLE,
  max_drawdown_5m DOUBLE,
  max_runup_5m DOUBLE,
  realized_volatility_5m DOUBLE,
  had_regime_change BOOLEAN,
  had_spike_event BOOLEAN,
  label_quality STRING,
  label_version STRING
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, reference_instrument);

-- =============================================================================
-- MATERIALIZED VIEWS (Auto-Aggregation)
-- =============================================================================

-- =============================================================================
-- VIEW 1: market_candles_1m
-- Auto-aggregated 1-minute candles from market_quotes
-- Reduces query-time computation for dashboard charts
-- NOTE: Will be auto-created by questdb.service.ts
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS market_candles_1m AS
SELECT
  timestamp,
  instrument_key,
  '1m' as interval,
  first(ltp) as open,
  max(ltp) as high,
  min(ltp) as low,
  last(ltp) as close,
  sum(volume) as volume,
  last(open_interest) as open_interest
FROM market_quotes
SAMPLE BY 1m
ALIGN TO CALENDAR;

-- =============================================================================
-- VIEW 2: market_candles_30m
-- Auto-aggregated 30-minute candles from 1m candles
-- For longer-term analysis and backtesting
-- NOTE: Will be auto-created by questdb.service.ts
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS market_candles_30m AS
SELECT
  timestamp,
  instrument_key,
  '30m' as interval,
  first(open) as open,
  max(high) as high,
  min(low) as low,
  last(close) as close,
  sum(volume) as volume,
  last(open_interest) as open_interest
FROM market_candles
WHERE interval = '1m'
SAMPLE BY 30m
ALIGN TO CALENDAR;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- List all tables
-- SELECT table_name FROM tables();

-- Check table sizes
-- SELECT
--   table_name,
--   (SELECT count(*) FROM table_name) as row_count
-- FROM tables()
-- WHERE table_name IN (
--   'market_candles', 'market_quotes', 'option_greeks', 'market_depth',
--   'system_audit', 'market_ticks', 'market_depth_20',
--   'training_features_lightgbm', 'training_features_tft', 'training_labels'
-- );

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Tables created: 9
-- Views created: 2 (materialized views enabled)
-- Total execution time: ~5 seconds
--
-- IMPORTANT: This migration is OPTIONAL!
-- The questdb.service.ts automatically creates all tables when you first
-- run any service that uses @repo/database (e.g., market-feeder, algo-worker).
--
-- Only run this migration if you want to:
-- - Manually set up the schema before starting services
-- - Reset/recreate the database schema
-- - Verify the exact schema being used
--
-- Next steps:
-- 1. Verify tables: SELECT table_name FROM tables();
-- 2. Check storage: SELECT sum(diskSize) FROM table_partitions();
-- 3. Start data ingestion via market-feeder service
-- =============================================================================
