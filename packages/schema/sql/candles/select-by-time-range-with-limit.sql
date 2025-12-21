-- Query candles for a time range with limit
-- Parameters: $1 = instrument_key, $2 = interval, $3 = start_time (ISO timestamp), $4 = end_time (ISO timestamp), $5 = limit (use 999999999 for no limit)
SELECT 
  timestamp,
  instrument_key,
  interval,
  open,
  high,
  low,
  close,
  volume,
  open_interest
FROM market_candles
WHERE instrument_key = $1
  AND interval = $2
  AND timestamp >= $3
  AND timestamp <= $4
ORDER BY timestamp ASC
LIMIT $5;
