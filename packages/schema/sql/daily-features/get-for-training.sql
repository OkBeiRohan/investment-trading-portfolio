-- Get daily features for training (by year range)
-- $1 = instrument_key, $2 = start_year, $3 = end_year
SELECT * FROM instrument_features_1d 
WHERE instrument_key = $1 
AND timestamp >= $2 
AND timestamp <= $3
AND is_valid = true
ORDER BY timestamp ASC
