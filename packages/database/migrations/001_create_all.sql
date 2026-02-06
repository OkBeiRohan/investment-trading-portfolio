-- QuestDB Schema Creation
-- Version: 3.0 (Unified Schema)
-- Creates all 7 tables for the trading system

-- ============================================
-- 1. INSTRUMENT MASTER
-- ============================================
CREATE TABLE IF NOT EXISTS instrument_master (
  instrument_key SYMBOL CAPACITY 100000 NOCACHE INDEX,
  exchange SYMBOL CAPACITY 10,
  segment SYMBOL CAPACITY 10,
  instrument_type SYMBOL CAPACITY 20,
  trading_symbol SYMBOL CAPACITY 100,
  name STRING,
  isin STRING,
  expiry DATE,
  strike DOUBLE,
  option_type SYMBOL CAPACITY 2,
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

-- ============================================
-- 2. MARKET CANDLES
-- ============================================
CREATE TABLE IF NOT EXISTS market_candles (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  interval_value INT,
  interval_unit SYMBOL CAPACITY 10,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume DOUBLE,
  open_interest DOUBLE
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, interval_value, interval_unit);

-- ============================================
-- 3. ORDERBOOK L2 SNAPSHOTS
-- ============================================
CREATE TABLE IF NOT EXISTS orderbook_l2_snapshots (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  side SYMBOL CAPACITY 2,
  level BYTE,
  price DOUBLE,
  quantity DOUBLE,
  orders INT
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, side, level);

-- ============================================
-- 4. TICK DATA
-- ============================================
CREATE TABLE IF NOT EXISTS tick_data (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  ltp DOUBLE,
  ltq INT,
  volume LONG,
  avg_price DOUBLE,
  oi LONG,
  bid_price DOUBLE,
  bid_qty INT,
  ask_price DOUBLE,
  ask_qty INT,
  total_buy_qty LONG,
  total_sell_qty LONG,
  lower_circuit DOUBLE,
  upper_circuit DOUBLE,
  depth_buy_1_price DOUBLE,
  depth_buy_1_qty INT,
  depth_buy_1_orders INT,
  depth_buy_2_price DOUBLE,
  depth_buy_2_qty INT,
  depth_buy_2_orders INT,
  depth_buy_3_price DOUBLE,
  depth_buy_3_qty INT,
  depth_buy_3_orders INT,
  depth_buy_4_price DOUBLE,
  depth_buy_4_qty INT,
  depth_buy_4_orders INT,
  depth_buy_5_price DOUBLE,
  depth_buy_5_qty INT,
  depth_buy_5_orders INT,
  depth_sell_1_price DOUBLE,
  depth_sell_1_qty INT,
  depth_sell_1_orders INT,
  depth_sell_2_price DOUBLE,
  depth_sell_2_qty INT,
  depth_sell_2_orders INT,
  depth_sell_3_price DOUBLE,
  depth_sell_3_qty INT,
  depth_sell_3_orders INT,
  depth_sell_4_price DOUBLE,
  depth_sell_4_qty INT,
  depth_sell_4_orders INT,
  depth_sell_5_price DOUBLE,
  depth_sell_5_qty INT,
  depth_sell_5_orders INT
) TIMESTAMP(timestamp) PARTITION BY DAY WAL;

-- ============================================
-- 5. OPTION CHAIN SNAPSHOT
-- ============================================
CREATE TABLE IF NOT EXISTS option_chain_snapshot (
  timestamp TIMESTAMP,
  underlying_key SYMBOL CAPACITY 1000 NOCACHE INDEX,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  expiry DATE,
  strike DOUBLE,
  option_type SYMBOL CAPACITY 2,
  last_price DOUBLE,
  bid_price DOUBLE,
  ask_price DOUBLE,
  bid_qty LONG,
  ask_qty LONG,
  volume DOUBLE,
  open_interest DOUBLE,
  prev_oi LONG,
  close_price DOUBLE,
  iv DOUBLE,
  delta DOUBLE,
  gamma DOUBLE,
  vega DOUBLE,
  theta DOUBLE,
  pop DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, underlying_key, instrument_key);

-- ============================================
-- 6. INSTRUMENT FEATURES (Unified)
-- ============================================
CREATE TABLE IF NOT EXISTS instrument_features (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  interval_value INT,
  interval_unit SYMBOL CAPACITY 10,
  
  -- Index Breadth
  pct_stocks_above_vwap DOUBLE,
  pct_stocks_above_ema20 DOUBLE,
  weighted_return_top10 DOUBLE,
  advance_decline_ratio DOUBLE,
  breadth_momentum_5m DOUBLE,
  breadth_volatility DOUBLE,
  breadth_thrust DOUBLE,
  new_highs_lows_ratio DOUBLE,
  
  -- Futures
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
  
  -- Options
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
  
  -- Volatility
  india_vix DOUBLE,
  realized_vol_5m DOUBLE,
  realized_vol_15m DOUBLE,
  realized_vol_20d DOUBLE,
  realized_vol_60d DOUBLE,
  vol_expansion_ratio DOUBLE,
  iv_rv_ratio DOUBLE,
  vix_percentile_30d DOUBLE,
  vix_percentile_1yr DOUBLE,
  vix_sma_10 DOUBLE,
  
  -- Order Flow
  bid_ask_spread_bps DOUBLE,
  depth_imbalance_5 DOUBLE,
  ofi_1s DOUBLE,
  ofi_5s DOUBLE,
  ofi_30s DOUBLE,
  trade_imbalance DOUBLE,
  bid_slope DOUBLE,
  ask_slope DOUBLE,
  
  -- Price Structure
  close DOUBLE,
  return_1d DOUBLE,
  return_5d DOUBLE,
  return_20d DOUBLE,
  range_hl DOUBLE,
  gap_open DOUBLE,
  close_vs_high_20d DOUBLE,
  close_vs_low_20d DOUBLE,
  
  -- Momentum
  rsi_14 DOUBLE,
  rsi_5 DOUBLE,
  macd DOUBLE,
  macd_signal DOUBLE,
  macd_hist DOUBLE,
  adx_14 DOUBLE,
  plus_di DOUBLE,
  minus_di DOUBLE,
  
  -- Moving Averages
  sma_10 DOUBLE,
  sma_20 DOUBLE,
  sma_50 DOUBLE,
  sma_200 DOUBLE,
  ema_12 DOUBLE,
  ema_26 DOUBLE,
  price_vs_sma_20 DOUBLE,
  price_vs_sma_50 DOUBLE,
  price_vs_sma_200 DOUBLE,
  golden_cross INT,
  bollinger_width DOUBLE,
  bollinger_position DOUBLE,
  
  -- Volume
  volume_sma_20_ratio DOUBLE,
  volume_trend DOUBLE,
  obv_change DOUBLE,
  accumulation_dist DOUBLE,
  
  -- Regime
  trend_strength DOUBLE,
  mean_reversion_signal DOUBLE,
  momentum_regime INT,
  volatility_regime INT,
  
  -- Time Context
  minutes_from_open INT,
  minutes_to_close INT,
  day_of_week INT,
  month_of_year INT,
  is_expiry_day INT,
  days_to_expiry INT,
  session_phase INT,
  is_month_end BOOLEAN,
  is_quarter_end BOOLEAN,
  
  -- Validity
  is_valid BOOLEAN,
  invalid_reason STRING,
  feature_mode SYMBOL CAPACITY 10,
  computation_latency_us INT,
  feature_version STRING
  
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, interval_value, interval_unit);

-- ============================================
-- 7. TRAINING LABELS (Unified)
-- ============================================
CREATE TABLE IF NOT EXISTS training_labels (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  interval_value INT,
  interval_unit SYMBOL CAPACITY 10,
  
  -- Regression Targets - Short Term
  target_return_5m DOUBLE,
  target_return_15m DOUBLE,
  target_return_30m DOUBLE,
  target_return_1h DOUBLE,
  target_return_eod DOUBLE,
  
  -- Regression Targets - Long Term
  target_return_1d DOUBLE,
  target_return_5d DOUBLE,
  target_return_20d DOUBLE,
  
  -- Volatility Targets
  target_volatility_5m DOUBLE,
  target_volatility_15m DOUBLE,
  target_max_drawdown_5m DOUBLE,
  target_max_runup_5m DOUBLE,
  target_volatility_5d DOUBLE,
  target_volatility_20d DOUBLE,
  target_max_drawdown_5d DOUBLE,
  
  -- Classification Targets
  target_direction_5m INT,
  target_direction_15m INT,
  target_direction_30m INT,
  target_direction_1d INT,
  target_direction_5d INT,
  target_direction_20d INT,
  
  -- Regime Labels
  regime_label SYMBOL CAPACITY 20,
  regime_confidence DOUBLE,
  
  -- Event Flags
  had_regime_change BOOLEAN,
  had_spike_event BOOLEAN,
  had_gap_event BOOLEAN,
  had_crash BOOLEAN,
  had_rally BOOLEAN,
  
  -- Validity
  is_valid BOOLEAN,
  invalid_reason STRING,
  label_quality SYMBOL CAPACITY 10
  
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, interval_value, interval_unit);
