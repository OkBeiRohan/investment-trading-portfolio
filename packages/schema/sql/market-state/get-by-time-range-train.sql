SELECT * FROM market_state_1m 
WHERE timestamp >= :training_start AND timestamp < :training_end 
ORDER BY timestamp ASC
