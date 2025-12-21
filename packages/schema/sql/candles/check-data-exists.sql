-- Check if candles exist for date range
-- Parameters: $1 = instrument_key, $2 = interval, $3 = start_time (ISO timestamp), $4 = end_time (ISO timestamp)
SELECT COUNT(*) as count
FROM market_candles
WHERE instrument_key = $1
  AND interval = $2
  AND timestamp >= $3
  AND timestamp <= $4;
