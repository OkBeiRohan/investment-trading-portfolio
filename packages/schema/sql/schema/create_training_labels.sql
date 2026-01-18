-- Training Labels (Unified)
-- All labels for ML training with interval-based storage
-- Combines 1m and 1d labels into one table

CREATE TABLE IF NOT EXISTS training_labels (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  interval_value INT,                      -- 1, 5, 15, 30, 60
  interval_unit SYMBOL CAPACITY 10,        -- 'minute', 'day'
  
  -- ========== REGRESSION TARGETS - SHORT TERM (1m) ==========
  target_return_5m DOUBLE,
  target_return_15m DOUBLE,
  target_return_30m DOUBLE,
  target_return_1h DOUBLE,
  target_return_eod DOUBLE,
  
  -- ========== REGRESSION TARGETS - LONG TERM (1d) ==========
  target_return_1d DOUBLE,
  target_return_5d DOUBLE,
  target_return_20d DOUBLE,
  
  -- ========== VOLATILITY TARGETS - SHORT TERM ==========
  target_volatility_5m DOUBLE,
  target_volatility_15m DOUBLE,
  target_max_drawdown_5m DOUBLE,
  target_max_runup_5m DOUBLE,
  
  -- ========== VOLATILITY TARGETS - LONG TERM ==========
  target_volatility_5d DOUBLE,
  target_volatility_20d DOUBLE,
  target_max_drawdown_5d DOUBLE,
  
  -- ========== CLASSIFICATION TARGETS - SHORT TERM ==========
  target_direction_5m INT,
  target_direction_15m INT,
  target_direction_30m INT,
  
  -- ========== CLASSIFICATION TARGETS - LONG TERM ==========
  target_direction_1d INT,
  target_direction_5d INT,
  target_direction_20d INT,
  
  -- ========== REGIME LABELS ==========
  regime_label SYMBOL CAPACITY 20,
  regime_confidence DOUBLE,
  
  -- ========== EVENT FLAGS ==========
  had_regime_change BOOLEAN,
  had_spike_event BOOLEAN,
  had_gap_event BOOLEAN,
  had_crash BOOLEAN,
  had_rally BOOLEAN,
  
  -- ========== VALIDITY FLAGS ==========
  is_valid BOOLEAN,
  invalid_reason STRING,
  label_quality SYMBOL CAPACITY 10
  
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, interval_value, interval_unit);
