-- QuestDB Migration Script - 54 Feature Architecture Update
-- Version: 2.1.0
-- Date: January 18, 2026
-- Description: Updates for 54-feature ML architecture + daily features
--
-- Run this script in QuestDB console (http://localhost:9000)
--
-- Changes:
-- 1. CREATE tick_data table (depth-30 for live trading)
-- 2. CREATE instrument_features_1d (daily features for regime model)
-- 3. REPLACE instrument_features_1m (54 features + validity)
-- 4. REPLACE training_labels_1m (multi-horizon + validity)
-- 
-- Note: india_vix consolidated into market_candles (use instrument_key = 'NSE_INDEX|India VIX')

-- =============================================================================
-- TABLE: tick_data (NEW)
-- Live tick-by-tick data with full depth-30 from Upstox
-- Expected: ~50M ticks/day across all instruments
-- =============================================================================
CREATE TABLE IF NOT EXISTS tick_data (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  
  -- Price data
  ltp DOUBLE,
  ltq LONG,
  cp DOUBLE,
  
  -- Aggregates
  atp DOUBLE,
  vtt LONG,
  oi LONG,
  tbq LONG,
  tsq LONG,
  
  -- Depth Level 1-10
  bid_price_1 DOUBLE, bid_qty_1 LONG,
  bid_price_2 DOUBLE, bid_qty_2 LONG,
  bid_price_3 DOUBLE, bid_qty_3 LONG,
  bid_price_4 DOUBLE, bid_qty_4 LONG,
  bid_price_5 DOUBLE, bid_qty_5 LONG,
  bid_price_6 DOUBLE, bid_qty_6 LONG,
  bid_price_7 DOUBLE, bid_qty_7 LONG,
  bid_price_8 DOUBLE, bid_qty_8 LONG,
  bid_price_9 DOUBLE, bid_qty_9 LONG,
  bid_price_10 DOUBLE, bid_qty_10 LONG,
  
  ask_price_1 DOUBLE, ask_qty_1 LONG,
  ask_price_2 DOUBLE, ask_qty_2 LONG,
  ask_price_3 DOUBLE, ask_qty_3 LONG,
  ask_price_4 DOUBLE, ask_qty_4 LONG,
  ask_price_5 DOUBLE, ask_qty_5 LONG,
  ask_price_6 DOUBLE, ask_qty_6 LONG,
  ask_price_7 DOUBLE, ask_qty_7 LONG,
  ask_price_8 DOUBLE, ask_qty_8 LONG,
  ask_price_9 DOUBLE, ask_qty_9 LONG,
  ask_price_10 DOUBLE, ask_qty_10 LONG,
  
  -- Depth Level 11-20
  bid_price_11 DOUBLE, bid_qty_11 LONG,
  bid_price_12 DOUBLE, bid_qty_12 LONG,
  bid_price_13 DOUBLE, bid_qty_13 LONG,
  bid_price_14 DOUBLE, bid_qty_14 LONG,
  bid_price_15 DOUBLE, bid_qty_15 LONG,
  bid_price_16 DOUBLE, bid_qty_16 LONG,
  bid_price_17 DOUBLE, bid_qty_17 LONG,
  bid_price_18 DOUBLE, bid_qty_18 LONG,
  bid_price_19 DOUBLE, bid_qty_19 LONG,
  bid_price_20 DOUBLE, bid_qty_20 LONG,
  
  ask_price_11 DOUBLE, ask_qty_11 LONG,
  ask_price_12 DOUBLE, ask_qty_12 LONG,
  ask_price_13 DOUBLE, ask_qty_13 LONG,
  ask_price_14 DOUBLE, ask_qty_14 LONG,
  ask_price_15 DOUBLE, ask_qty_15 LONG,
  ask_price_16 DOUBLE, ask_qty_16 LONG,
  ask_price_17 DOUBLE, ask_qty_17 LONG,
  ask_price_18 DOUBLE, ask_qty_18 LONG,
  ask_price_19 DOUBLE, ask_qty_19 LONG,
  ask_price_20 DOUBLE, ask_qty_20 LONG,
  
  -- Depth Level 21-30
  bid_price_21 DOUBLE, bid_qty_21 LONG,
  bid_price_22 DOUBLE, bid_qty_22 LONG,
  bid_price_23 DOUBLE, bid_qty_23 LONG,
  bid_price_24 DOUBLE, bid_qty_24 LONG,
  bid_price_25 DOUBLE, bid_qty_25 LONG,
  bid_price_26 DOUBLE, bid_qty_26 LONG,
  bid_price_27 DOUBLE, bid_qty_27 LONG,
  bid_price_28 DOUBLE, bid_qty_28 LONG,
  bid_price_29 DOUBLE, bid_qty_29 LONG,
  bid_price_30 DOUBLE, bid_qty_30 LONG,
  
  ask_price_21 DOUBLE, ask_qty_21 LONG,
  ask_price_22 DOUBLE, ask_qty_22 LONG,
  ask_price_23 DOUBLE, ask_qty_23 LONG,
  ask_price_24 DOUBLE, ask_qty_24 LONG,
  ask_price_25 DOUBLE, ask_qty_25 LONG,
  ask_price_26 DOUBLE, ask_qty_26 LONG,
  ask_price_27 DOUBLE, ask_qty_27 LONG,
  ask_price_28 DOUBLE, ask_qty_28 LONG,
  ask_price_29 DOUBLE, ask_qty_29 LONG,
  ask_price_30 DOUBLE, ask_qty_30 LONG,
  
  -- Greeks (options only)
  delta DOUBLE,
  theta DOUBLE,
  gamma DOUBLE,
  vega DOUBLE,
  rho DOUBLE,
  iv DOUBLE
  
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);

-- =============================================================================
-- TABLE: instrument_features_1d (NEW)
-- Daily features for 26-year Regime HMM training (2000-2026)
-- =============================================================================
CREATE TABLE IF NOT EXISTS instrument_features_1d (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  
  -- PRICE STRUCTURE (8)
  close DOUBLE,
  return_1d DOUBLE,
  return_5d DOUBLE,
  return_20d DOUBLE,
  range_hl DOUBLE,
  gap_open DOUBLE,
  close_vs_high_20d DOUBLE,
  close_vs_low_20d DOUBLE,
  
  -- MOMENTUM (8)
  rsi_14 DOUBLE,
  rsi_5 DOUBLE,
  macd DOUBLE,
  macd_signal DOUBLE,
  macd_hist DOUBLE,
  adx_14 DOUBLE,
  plus_di DOUBLE,
  minus_di DOUBLE,
  
  -- MOVING AVERAGES (6)
  sma_10 DOUBLE,
  sma_20 DOUBLE,
  sma_50 DOUBLE,
  sma_200 DOUBLE,
  ema_12 DOUBLE,
  ema_26 DOUBLE,
  
  -- MA SIGNALS (4)
  price_vs_sma_20 DOUBLE,
  price_vs_sma_50 DOUBLE,
  price_vs_sma_200 DOUBLE,
  golden_cross INT,
  
  -- VOLATILITY (6)
  atr_14 DOUBLE,
  atr_percent DOUBLE,
  realized_vol_20d DOUBLE,
  realized_vol_60d DOUBLE,
  bollinger_width DOUBLE,
  bollinger_position DOUBLE,
  
  -- VIX (from market_candles where instrument_key = India VIX)
  vix_close DOUBLE,
  vix_percentile_30d DOUBLE,
  vix_percentile_1yr DOUBLE,
  vix_sma_10 DOUBLE,
  
  -- VOLUME (4)
  volume_sma_20_ratio DOUBLE,
  volume_trend DOUBLE,
  obv_change DOUBLE,
  accumulation_dist DOUBLE,
  
  -- REGIME INDICATORS (4)
  trend_strength DOUBLE,
  mean_reversion_signal DOUBLE,
  momentum_regime INT,
  volatility_regime INT,
  
  -- TIME CONTEXT (4)
  day_of_week INT,
  month_of_year INT,
  is_month_end BOOLEAN,
  is_quarter_end BOOLEAN,
  
  -- VALIDITY
  is_valid BOOLEAN,
  invalid_reason STRING,
  feature_version STRING
  
) TIMESTAMP(timestamp) PARTITION BY YEAR WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);

-- =============================================================================
-- RECREATE: instrument_features_1m (54 features + validity)
-- =============================================================================
DROP TABLE IF EXISTS instrument_features_1m;

CREATE TABLE IF NOT EXISTS instrument_features_1m (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  
  -- INDEX BREADTH (8)
  pct_stocks_above_vwap DOUBLE,
  pct_stocks_above_ema20 DOUBLE,
  weighted_return_top10 DOUBLE,
  advance_decline_ratio DOUBLE,
  breadth_momentum_5m DOUBLE,
  breadth_volatility DOUBLE,
  breadth_thrust DOUBLE,
  new_highs_lows_ratio DOUBLE,
  
  -- NIFTY FUTURE (12)
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
  
  -- OPTIONS (14)
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
  
  -- VOLATILITY (6)
  india_vix DOUBLE,
  realized_vol_5m DOUBLE,
  realized_vol_15m DOUBLE,
  vol_expansion_ratio DOUBLE,
  iv_rv_ratio DOUBLE,
  vix_percentile_30d DOUBLE,
  
  -- ORDER FLOW (8)
  bid_ask_spread_bps DOUBLE,
  depth_imbalance_5 DOUBLE,
  ofi_1s DOUBLE,
  ofi_5s DOUBLE,
  ofi_30s DOUBLE,
  trade_imbalance DOUBLE,
  bid_slope DOUBLE,
  ask_slope DOUBLE,
  
  -- TIME CONTEXT (6)
  minutes_from_open INT,
  minutes_to_close INT,
  day_of_week INT,
  is_expiry_day INT,
  days_to_expiry INT,
  session_phase INT,
  
  -- VALIDITY
  is_valid BOOLEAN,
  invalid_reason STRING,
  feature_mode SYMBOL CAPACITY 10,
  computation_latency_us INT,
  feature_version STRING
  
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);

-- =============================================================================
-- RECREATE: training_labels_1m (multi-horizon + validity)
-- =============================================================================
DROP TABLE IF EXISTS training_labels_1m;

CREATE TABLE IF NOT EXISTS training_labels_1m (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  
  -- REGRESSION TARGETS
  target_return_5m DOUBLE,
  target_return_15m DOUBLE,
  target_return_30m DOUBLE,
  target_return_1h DOUBLE,
  target_return_eod DOUBLE,
  
  -- VOLATILITY TARGETS
  target_volatility_5m DOUBLE,
  target_volatility_15m DOUBLE,
  target_max_drawdown_5m DOUBLE,
  target_max_runup_5m DOUBLE,
  
  -- CLASSIFICATION TARGETS
  target_direction_5m INT,
  target_direction_15m INT,
  target_direction_30m INT,
  
  -- REGIME LABELS
  regime_label SYMBOL CAPACITY 20,
  regime_confidence DOUBLE,
  
  -- EVENT FLAGS
  had_regime_change BOOLEAN,
  had_spike_event BOOLEAN,
  had_gap_event BOOLEAN,
  
  -- VALIDITY
  is_valid BOOLEAN,
  invalid_reason STRING,
  label_quality SYMBOL CAPACITY 10
  
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);

-- =============================================================================
-- TABLE: training_labels_1d (NEW)
-- Daily labels for 26-year Regime HMM training (2000-2026)
-- =============================================================================
CREATE TABLE IF NOT EXISTS training_labels_1d (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  
  -- REGRESSION TARGETS
  target_return_1d DOUBLE,
  target_return_5d DOUBLE,
  target_return_20d DOUBLE,
  
  -- VOLATILITY TARGETS
  target_volatility_5d DOUBLE,
  target_volatility_20d DOUBLE,
  target_max_drawdown_5d DOUBLE,
  
  -- CLASSIFICATION TARGETS
  target_direction_1d INT,
  target_direction_5d INT,
  target_direction_20d INT,
  
  -- REGIME LABELS
  regime_label SYMBOL CAPACITY 20,
  regime_confidence DOUBLE,
  
  -- EVENT FLAGS
  had_regime_change BOOLEAN,
  had_crash BOOLEAN,
  had_rally BOOLEAN,
  
  -- VALIDITY
  is_valid BOOLEAN,
  invalid_reason STRING
  
) TIMESTAMP(timestamp) PARTITION BY YEAR WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);

