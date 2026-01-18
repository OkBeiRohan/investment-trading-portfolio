-- Instrument Features 1-Day (Daily)
-- Daily features for 26-year Regime HMM training (2000-2026)
-- Used for Tier 1 macro models

CREATE TABLE IF NOT EXISTS instrument_features_1d (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  
  -- ========== PRICE STRUCTURE (8) ==========
  close DOUBLE,
  return_1d DOUBLE,                      -- 1-day return
  return_5d DOUBLE,                      -- 5-day return
  return_20d DOUBLE,                     -- 20-day (monthly) return
  range_hl DOUBLE,                       -- (high - low) / close
  gap_open DOUBLE,                       -- (open - prev_close) / prev_close
  close_vs_high_20d DOUBLE,              -- Distance from 20-day high
  close_vs_low_20d DOUBLE,               -- Distance from 20-day low
  
  -- ========== MOMENTUM (8) ==========
  rsi_14 DOUBLE,
  rsi_5 DOUBLE,
  macd DOUBLE,
  macd_signal DOUBLE,
  macd_hist DOUBLE,
  adx_14 DOUBLE,
  plus_di DOUBLE,                        -- +DI for ADX
  minus_di DOUBLE,                       -- -DI for ADX
  
  -- ========== MOVING AVERAGES (6) ==========
  sma_10 DOUBLE,
  sma_20 DOUBLE,
  sma_50 DOUBLE,
  sma_200 DOUBLE,
  ema_12 DOUBLE,
  ema_26 DOUBLE,
  
  -- ========== MA SIGNALS (4) ==========
  price_vs_sma_20 DOUBLE,                -- (close - sma_20) / sma_20
  price_vs_sma_50 DOUBLE,
  price_vs_sma_200 DOUBLE,
  golden_cross INT,                      -- 1 if sma_50 > sma_200, else 0
  
  -- ========== VOLATILITY (6) ==========
  atr_14 DOUBLE,
  atr_percent DOUBLE,                    -- ATR / close
  realized_vol_20d DOUBLE,               -- 20-day realized volatility
  realized_vol_60d DOUBLE,               -- 60-day realized volatility
  bollinger_width DOUBLE,                -- (upper - lower) / middle
  bollinger_position DOUBLE,             -- (close - lower) / (upper - lower)
  
  -- ========== VIX / VOLATILITY REGIME (4) ==========
  -- (VIX is stored in market_candles, features computed here)
  vix_close DOUBLE,
  vix_percentile_30d DOUBLE,             -- 30-day VIX percentile
  vix_percentile_1yr DOUBLE,             -- 1-year VIX percentile
  vix_sma_10 DOUBLE,
  
  -- ========== VOLUME (4) ==========
  volume_sma_20_ratio DOUBLE,            -- volume / sma_20(volume)
  volume_trend DOUBLE,                   -- Volume trending up/down
  obv_change DOUBLE,                     -- On-balance volume change
  accumulation_dist DOUBLE,              -- A/D indicator
  
  -- ========== REGIME INDICATORS (4) ==========
  trend_strength DOUBLE,                 -- ADX-based trend strength
  mean_reversion_signal DOUBLE,          -- RSI + Bollinger combined
  momentum_regime INT,                   -- 1=bullish, 0=neutral, -1=bearish
  volatility_regime INT,                 -- 1=high, 0=normal, -1=low
  
  -- ========== TIME CONTEXT (4) ==========
  day_of_week INT,
  month_of_year INT,
  is_month_end BOOLEAN,
  is_quarter_end BOOLEAN,
  
  -- ========== VALIDITY FLAGS ==========
  is_valid BOOLEAN,
  invalid_reason STRING,
  
  -- ========== METADATA ==========
  feature_version STRING
  
) TIMESTAMP(timestamp) PARTITION BY YEAR WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
