-- Instrument Features (Unified)
-- All features for ML training with interval-based storage
-- Combines 1m and 1d features into one table

CREATE TABLE IF NOT EXISTS instrument_features (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  interval_value INT,                      -- 1, 5, 15, 30, 60
  interval_unit SYMBOL CAPACITY 10,        -- 'minute', 'day'
  
  -- ========== INDEX BREADTH (8) - 1m primarily ==========
  pct_stocks_above_vwap DOUBLE,
  pct_stocks_above_ema20 DOUBLE,
  weighted_return_top10 DOUBLE,
  advance_decline_ratio DOUBLE,
  breadth_momentum_5m DOUBLE,
  breadth_volatility DOUBLE,
  breadth_thrust DOUBLE,
  new_highs_lows_ratio DOUBLE,
  
  -- ========== FUTURES (12) ==========
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
  
  -- ========== OPTIONS (14) ==========
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
  
  -- ========== VOLATILITY (8) ==========
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
  
  -- ========== ORDER FLOW (8) - 1m/live only ==========
  bid_ask_spread_bps DOUBLE,
  depth_imbalance_5 DOUBLE,
  ofi_1s DOUBLE,
  ofi_5s DOUBLE,
  ofi_30s DOUBLE,
  trade_imbalance DOUBLE,
  bid_slope DOUBLE,
  ask_slope DOUBLE,
  
  -- ========== PRICE STRUCTURE - 1d primarily (8) ==========
  close DOUBLE,
  return_1d DOUBLE,
  return_5d DOUBLE,
  return_20d DOUBLE,
  range_hl DOUBLE,
  gap_open DOUBLE,
  close_vs_high_20d DOUBLE,
  close_vs_low_20d DOUBLE,
  
  -- ========== MOMENTUM (8) ==========
  rsi_14 DOUBLE,
  rsi_5 DOUBLE,
  macd DOUBLE,
  macd_signal DOUBLE,
  macd_hist DOUBLE,
  adx_14 DOUBLE,
  plus_di DOUBLE,
  minus_di DOUBLE,
  
  -- ========== MOVING AVERAGES (6) ==========
  sma_10 DOUBLE,
  sma_20 DOUBLE,
  sma_50 DOUBLE,
  sma_200 DOUBLE,
  ema_12 DOUBLE,
  ema_26 DOUBLE,
  
  -- ========== MA SIGNALS (4) ==========
  price_vs_sma_20 DOUBLE,
  price_vs_sma_50 DOUBLE,
  price_vs_sma_200 DOUBLE,
  golden_cross INT,
  
  -- ========== BOLLINGER (2) ==========
  bollinger_width DOUBLE,
  bollinger_position DOUBLE,
  
  -- ========== VOLUME (4) ==========
  volume_sma_20_ratio DOUBLE,
  volume_trend DOUBLE,
  obv_change DOUBLE,
  accumulation_dist DOUBLE,
  
  -- ========== REGIME INDICATORS (4) ==========
  trend_strength DOUBLE,
  mean_reversion_signal DOUBLE,
  momentum_regime INT,
  volatility_regime INT,
  
  -- ========== TIME CONTEXT (8) ==========
  minutes_from_open INT,
  minutes_to_close INT,
  day_of_week INT,
  month_of_year INT,
  is_expiry_day INT,
  days_to_expiry INT,
  session_phase INT,
  is_month_end BOOLEAN,
  is_quarter_end BOOLEAN,
  
  -- ========== VALIDITY FLAGS ==========
  is_valid BOOLEAN,
  invalid_reason STRING,
  
  -- ========== METADATA ==========
  feature_mode SYMBOL CAPACITY 10,
  computation_latency_us INT,
  feature_version STRING
  
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, interval_value, interval_unit);
