-- Training labels (supervised learning targets)
-- Expected: ~375 rows/day (matches feature frequency)
CREATE TABLE IF NOT EXISTS training_labels (
  timestamp TIMESTAMP,
  reference_instrument SYMBOL CAPACITY 100,
  index_name SYMBOL CAPACITY 20,
  target_return_1m DOUBLE,
  target_return_5m DOUBLE,
  target_return_15m DOUBLE,
  target_return_eod DOUBLE,
  target_volatility_5m DOUBLE,
  target_volatility_15m DOUBLE,
  target_direction_5m STRING,
  target_volatility_regime_5m STRING,
  regime_label STRING,
  regime_confidence DOUBLE,
  max_drawdown_5m DOUBLE,
  max_runup_5m DOUBLE,
  realized_volatility_5m DOUBLE,
  had_regime_change BOOLEAN,
  had_spike_event BOOLEAN,
  label_quality STRING,
  label_version STRING
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, reference_instrument);
