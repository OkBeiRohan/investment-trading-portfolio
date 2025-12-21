-- Check if quotes exist for date range
-- Parameters: $1 = instrument_key, $2 = start_time (ISO timestamp), $3 = end_time (ISO timestamp)
SELECT COUNT(*) as count
FROM market_quotes
WHERE instrument_key = $1
  AND timestamp >= $2
  AND timestamp <= $3;
