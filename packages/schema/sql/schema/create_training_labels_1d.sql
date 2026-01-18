-- Training Labels 1-Day (Daily)
-- Daily labels for 26-year Regime HMM training (2000-2026)
-- Used for Tier 1 macro models

CREATE TABLE IF NOT EXISTS training_labels_1d (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  
  -- ========== REGRESSION TARGETS ==========
  target_return_1d DOUBLE,               -- 1-day forward return
  target_return_5d DOUBLE,               -- 5-day forward return
  target_return_20d DOUBLE,              -- 20-day forward return
  
  -- ========== VOLATILITY TARGETS ==========
  target_volatility_5d DOUBLE,           -- 5-day forward volatility
  target_volatility_20d DOUBLE,          -- 20-day forward volatility
  target_max_drawdown_5d DOUBLE,         -- Max drawdown in next 5 days
  
  -- ========== CLASSIFICATION TARGETS ==========
  target_direction_1d INT,               -- -1 = DOWN, 0 = NEUTRAL, 1 = UP
  target_direction_5d INT,
  target_direction_20d INT,
  
  -- ========== REGIME LABELS ==========
  regime_label SYMBOL CAPACITY 20,       -- 'BULL', 'BEAR', 'RANGING', 'VOLATILE'
  regime_confidence DOUBLE,
  
  -- ========== EVENT FLAGS ==========
  had_regime_change BOOLEAN,
  had_crash BOOLEAN,                     -- >5% single day drop
  had_rally BOOLEAN,                     -- >5% single day gain
  
  -- ========== VALIDITY FLAGS ==========
  is_valid BOOLEAN,
  invalid_reason STRING
  
) TIMESTAMP(timestamp) PARTITION BY YEAR WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
