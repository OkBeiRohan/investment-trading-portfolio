-- Instrument Features 1m
-- Per-instrument features (BEFORE aggregation into market_state_1m)
-- NOT fed directly to LightGBM - used for market state aggregation

CREATE TABLE IF NOT EXISTS instrument_features_1m (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  
  -- ========== PRICE & STRUCTURE ==========
  last_price DOUBLE,
  vwap DOUBLE,
  price_vs_vwap DOUBLE,
  
  day_high DOUBLE,
  day_low DOUBLE,
  price_vs_day_high DOUBLE,
  price_vs_day_low DOUBLE,
  range_position DOUBLE,
  
  prev_day_high_dist DOUBLE,
  prev_day_low_dist DOUBLE,
  weekly_high_dist DOUBLE,
  weekly_low_dist DOUBLE,
  
  -- ========== MOMENTUM & TREND ==========
  rsi_5 DOUBLE,
  rsi_14 DOUBLE,
  rsi_21 DOUBLE,
  macd_hist DOUBLE,
  ema_9 DOUBLE,
  ema_21 DOUBLE,
  ema_9_slope DOUBLE,
  ema_21_slope DOUBLE,
  adx DOUBLE,
  roc_5 DOUBLE,
  
  -- ========== VOLATILITY ==========
  atr DOUBLE,
  atr_percent DOUBLE,
  realized_vol_5m DOUBLE,
  realized_vol_15m DOUBLE,
  vol_expansion_ratio DOUBLE,
  
  -- ========== TIME CONTEXT ==========
  minutes_from_open INT,
  minutes_to_close INT,
  day_of_week INT
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
