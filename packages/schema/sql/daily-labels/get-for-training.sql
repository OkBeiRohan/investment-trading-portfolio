-- Get daily labels for training (by year range)
-- $1 = instrument_key, $2 = start_date, $3 = end_date
SELECT * FROM training_labels_1d 
WHERE instrument_key = $1 
AND timestamp >= $2 
AND timestamp <= $3
AND is_valid = true
ORDER BY timestamp ASC
