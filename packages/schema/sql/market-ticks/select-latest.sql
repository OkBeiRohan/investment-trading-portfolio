-- Get latest tick for a specific instrument
-- Used for: Real-time price display, last known state
SELECT *
FROM market_ticks
WHERE instrument_key = $1
ORDER BY timestamp DESC
LIMIT 1;
