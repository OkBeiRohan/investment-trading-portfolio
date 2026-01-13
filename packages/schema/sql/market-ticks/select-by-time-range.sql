-- Get ticks for time range with optional filters
-- Used for: Training data extraction, backtesting
SELECT *
FROM market_ticks
WHERE timestamp BETWEEN $1 AND $2
ORDER BY timestamp DESC
LIMIT $3;
