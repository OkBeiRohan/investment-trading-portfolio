SELECT * FROM training_labels_1m 
WHERE timestamp >= $1 
AND timestamp < $2 
AND horizon_minutes = $3
ORDER BY timestamp ASC
