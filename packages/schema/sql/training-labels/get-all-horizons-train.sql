SELECT * FROM training_labels_1m 
WHERE timestamp >= :training_start 
AND timestamp < :training_end 
ORDER BY timestamp ASC, horizon_minutes ASC
