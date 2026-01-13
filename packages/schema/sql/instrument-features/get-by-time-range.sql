SELECT * FROM instrument_features_1m 
WHERE instrument_key = $1 
AND timestamp >= $2 
AND timestamp < $3 
ORDER BY timestamp DESC
