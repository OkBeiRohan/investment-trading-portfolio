SELECT * FROM instrument_features
WHERE instrument_key = $1
  AND interval_value = $2
  AND interval_unit = $3
  AND timestamp >= $4
  AND timestamp < $5
  AND is_valid = true
ORDER BY timestamp ASC
