SELECT
  timestamp,
  instrument_key,
  interval_value,
  interval_unit,
  target_return_5m,
  target_return_15m,
  target_return_30m,
  target_direction_5m,
  target_direction_15m,
  target_direction_30m,
  regime_label,
  regime_confidence,
  label_quality
FROM training_labels
WHERE instrument_key = $1
  AND interval_value = $2
  AND interval_unit = $3
  AND timestamp >= $4
  AND timestamp < $5
  AND is_valid = true
ORDER BY timestamp ASC
