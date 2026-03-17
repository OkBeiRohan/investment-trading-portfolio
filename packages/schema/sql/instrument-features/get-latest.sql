SELECT * FROM instrument_features
WHERE instrument_key = $1
ORDER BY timestamp DESC
LIMIT 1
