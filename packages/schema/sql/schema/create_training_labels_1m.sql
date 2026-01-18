-- Training Labels Table
-- Multi-horizon labels with validity flags
-- Used for ML model training

CREATE TABLE IF NOT EXISTS training_labels_1m (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  
  -- ========== REGRESSION TARGETS ==========
  target_return_5m DOUBLE,               -- 5-minute forward return
  target_return_15m DOUBLE,              -- 15-minute forward return
  target_return_30m DOUBLE,              -- 30-minute forward return
  target_return_1h DOUBLE,               -- 1-hour forward return
  target_return_eod DOUBLE,              -- Return until 3:30 PM
  
  -- ========== VOLATILITY TARGETS ==========
  target_volatility_5m DOUBLE,
  target_volatility_15m DOUBLE,
  target_max_drawdown_5m DOUBLE,
  target_max_runup_5m DOUBLE,
  
  -- ========== CLASSIFICATION TARGETS ==========
  -- -1 = DOWN, 0 = NEUTRAL, 1 = UP
  target_direction_5m INT,               -- 5-minute direction
  target_direction_15m INT,              -- 15-minute direction
  target_direction_30m INT,              -- 30-minute direction
  
  -- ========== REGIME LABELS ==========
  regime_label SYMBOL CAPACITY 20,       -- 'TRENDING_UP', 'TRENDING_DOWN', 'RANGING', 'VOLATILE'
  regime_confidence DOUBLE,
  
  -- ========== EVENT FLAGS ==========
  had_regime_change BOOLEAN,
  had_spike_event BOOLEAN,
  had_gap_event BOOLEAN,
  
  -- ========== VALIDITY FLAGS ==========
  is_valid BOOLEAN,
  invalid_reason STRING,
  label_quality SYMBOL CAPACITY 10       -- 'CLEAN', 'NOISY', 'OUTLIER'
  
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
