-- Get regime change events
-- $1 = instrument_key, $2 = start_date, $3 = end_date
SELECT * FROM training_labels_1d 
WHERE instrument_key = $1 
AND timestamp >= $2 
AND timestamp <= $3
AND had_regime_change = true
ORDER BY timestamp ASC
