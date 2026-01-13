-- Query market ticks with optional filters
-- Supports filtering by instrument_key, instrument_type, and index_name
-- Used for: Training data extraction, backtesting, analysis
SELECT * FROM market_ticks
WHERE timestamp BETWEEN $1 AND $2
ORDER BY timestamp DESC;
