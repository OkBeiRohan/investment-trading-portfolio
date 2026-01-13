-- Training Labels 1m
-- Supervised learning labels (EXPLICIT & SEPARATE from features)

CREATE TABLE IF NOT EXISTS training_labels_1m (
  timestamp TIMESTAMP,
  horizon_minutes INT,
  label BYTE,
  future_return DOUBLE,
  atr_threshold DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, horizon_minutes);
