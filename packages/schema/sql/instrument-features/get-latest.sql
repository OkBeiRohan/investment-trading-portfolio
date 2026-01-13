SELECT * FROM instrument_features_1m 
WHERE instrument_key = $1 
ORDER BY timestamp DESC 
LIMIT 1
