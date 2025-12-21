-- Get latest candle for instrument + interval
-- Parameters: $1 = instrument_key, $2 = interval
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
ORDER BY timestamp DESC
LIMIT 1;
