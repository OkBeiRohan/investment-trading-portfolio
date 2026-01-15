-- Market State 1m
-- Market State Encoder output - feeds LightGBM (33 features from compute-engine)
-- CRITICAL: Must exactly match FeatureOutput from @repo/compute-engine

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
