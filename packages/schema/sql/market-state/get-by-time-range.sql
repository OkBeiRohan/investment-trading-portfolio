SELECT * FROM market_state_1m 
WHERE timestamp >= $1 AND timestamp < $2 
ORDER BY timestamp ASC
