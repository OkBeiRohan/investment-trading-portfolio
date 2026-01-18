-- Training Features Table (54 Features)
-- All features for ML training with validity flags
-- Replaces instrument_features_1m for training purposes

CREATE TABLE IF NOT EXISTS instrument_features_1m (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  
  -- ========== INDEX BREADTH (8) ==========
  pct_stocks_above_vwap DOUBLE,          -- [0, 1]
  pct_stocks_above_ema20 DOUBLE,         -- [0, 1]
  weighted_return_top10 DOUBLE,          -- [-0.1, 0.1]
  advance_decline_ratio DOUBLE,          -- [0, ∞)
  breadth_momentum_5m DOUBLE,            -- [-0.05, 0.05]
  breadth_volatility DOUBLE,             -- [0, 0.1]
  breadth_thrust DOUBLE,                 -- [0, 1]
  new_highs_lows_ratio DOUBLE,           -- [-1, 1]
  
  -- ========== NIFTY FUTURE (12) ==========
  fut_price_vs_vwap DOUBLE,              -- [-0.03, 0.03]
  fut_range_position DOUBLE,             -- [0, 1]
  fut_return_1m DOUBLE,                  -- [-0.02, 0.02]
  fut_return_5m DOUBLE,                  -- [-0.05, 0.05]
  fut_return_15m DOUBLE,                 -- [-0.08, 0.08]
  fut_atr_percent DOUBLE,                -- [0.005, 0.03]
  fut_volume_zscore DOUBLE,              -- [-3, 5]
  fut_oi_change DOUBLE,                  -- raw
  fut_oi_change_pct DOUBLE,              -- [-0.1, 0.1]
  fut_rsi_14 DOUBLE,                     -- [0, 100]
  fut_macd DOUBLE,                       -- [-200, 200]
  fut_macd_signal DOUBLE,                -- [-200, 200]
  
  -- ========== OPTIONS (14) ==========
  atm_iv DOUBLE,                         -- [0.08, 0.50]
  atm_iv_change DOUBLE,                  -- [-0.05, 0.05]
  iv_skew DOUBLE,                        -- [-0.1, 0.1]
  iv_term_structure DOUBLE,              -- [-0.1, 0.1]
  gamma_atm DOUBLE,                      -- [0, 0.01]
  vega_atm DOUBLE,                       -- [0, 100]
  theta_atm DOUBLE,                      -- [-50, 0]
  pcr_oi DOUBLE,                         -- [0.5, 2.0]
  pcr_volume DOUBLE,                     -- [0.3, 3.0]
  max_pain_distance DOUBLE,              -- [0, 500]
  total_gamma_exposure DOUBLE,           -- [-100, 100]
  charm_atm DOUBLE,                      -- [-0.001, 0.001]
  vanna_atm DOUBLE,                      -- [-0.01, 0.01]
  iv_percentile_30d DOUBLE,              -- [0, 100]
  
  -- ========== VOLATILITY (6) ==========
  india_vix DOUBLE,                      -- [10, 50]
  realized_vol_5m DOUBLE,                -- [0.05, 0.50]
  realized_vol_15m DOUBLE,               -- [0.05, 0.50]
  vol_expansion_ratio DOUBLE,            -- [0.5, 2.0]
  iv_rv_ratio DOUBLE,                    -- [0.5, 3.0]
  vix_percentile_30d DOUBLE,             -- [0, 100]
  
  -- ========== ORDER FLOW (8) ==========
  -- Only populated for live data (NULL for historical)
  bid_ask_spread_bps DOUBLE,             -- [1, 50]
  depth_imbalance_5 DOUBLE,              -- [-1, 1]
  ofi_1s DOUBLE,                         -- [-1, 1]
  ofi_5s DOUBLE,                         -- [-1, 1]
  ofi_30s DOUBLE,                        -- [-1, 1]
  trade_imbalance DOUBLE,                -- [-1, 1]
  bid_slope DOUBLE,                      -- [0, 1000]
  ask_slope DOUBLE,                      -- [0, 1000]
  
  -- ========== TIME CONTEXT (6) ==========
  minutes_from_open INT,                 -- [0, 375]
  minutes_to_close INT,                  -- [0, 375]
  day_of_week INT,                       -- [1, 5]
  is_expiry_day INT,                     -- {0, 1}
  days_to_expiry INT,                    -- [0, 30]
  session_phase INT,                     -- {1, 2, 3} (morning, midday, closing)
  
  -- ========== VALIDITY FLAGS ==========
  is_valid BOOLEAN,
  invalid_reason STRING,                 -- 'MARKET_CLOSED', 'PRE_OPEN', 'STALE_DATA', etc.
  
  -- ========== METADATA ==========
  feature_mode SYMBOL CAPACITY 10,       -- 'HISTORICAL', 'LIVE'
  computation_latency_us INT,
  feature_version STRING
  
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
