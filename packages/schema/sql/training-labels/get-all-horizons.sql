SELECT * FROM training_labels_1m 
WHERE timestamp >= $1 
AND timestamp < $2 
ORDER BY timestamp ASC, horizon_minutes ASC
