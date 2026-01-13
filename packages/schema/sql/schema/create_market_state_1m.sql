-- Market State 1m
-- Market State Encoder output - THIS feeds LightGBM (33 features)
-- Compresses 50 constituents + futures + options into one state vector

CREATE TABLE IF NOT EXISTS market_state_1m (
  timestamp TIMESTAMP,
  
  -- ========== MARKET STRUCTURE (8) ==========
  price_vs_vwap DOUBLE,
  price_vs_day_high DOUBLE,
  price_vs_day_low DOUBLE,
  range_position DOUBLE,
  prev_day_high_dist DOUBLE,
  prev_day_low_dist DOUBLE,
  weekly_high_dist DOUBLE,
  weekly_low_dist DOUBLE,
  
  -- ========== MOMENTUM & TREND (8) ==========
  rsi_5 DOUBLE,
  rsi_14 DOUBLE,
  rsi_21 DOUBLE,
  macd_hist DOUBLE,
  ema_9_slope DOUBLE,
  ema_21_slope DOUBLE,
  adx DOUBLE,
  roc_5 DOUBLE,
  
  -- ========== VOLATILITY (5) ==========
  atr_percent DOUBLE,
  realized_vol_5m DOUBLE,
  realized_vol_15m DOUBLE,
  vol_expansion_ratio DOUBLE,
  india_vix DOUBLE,
  
  -- ========== OPTIONS (9) ==========
  atm_iv DOUBLE,
  atm_iv_change DOUBLE,
  delta_atm DOUBLE,
  gamma_atm DOUBLE,
  vega_atm DOUBLE,
  theta_atm DOUBLE,
  pcr_oi DOUBLE,
  pcr_volume DOUBLE,
  max_pain_dist DOUBLE,
  
  -- ========== TIME CONTEXT (3) ==========
  minutes_from_open INT,
  minutes_to_close INT,
  day_of_week INT
) TIMESTAMP(timestamp) PARTITION BY DAY WAL;
