-- Query candles for a time range
-- Parameters: $1 = instrument_key, $2 = interval, $3 = start_time (ISO timestamp), $4 = end_time (ISO timestamp), $5 = limit (optional)
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
ORDER BY timestamp ASC;
