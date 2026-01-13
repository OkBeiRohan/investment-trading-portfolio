-- Check if tick data exists for date range
-- Used for: Gap detection, data validation
SELECT COUNT(*) as count
FROM market_ticks
WHERE instrument_key = $1
  AND timestamp BETWEEN $2 AND $3;
