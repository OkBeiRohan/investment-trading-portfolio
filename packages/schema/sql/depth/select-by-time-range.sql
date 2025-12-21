-- Query market depth for a time range
-- Parameters: $1 = instrument_key, $2 = start_time (ISO timestamp), $3 = end_time (ISO timestamp), $4 = side (optional, 'BUY' or 'SELL'), $5 = limit (optional)
SELECT 
  timestamp,
  instrument_key,
  side,
  level,
  price,
  quantity,
  orders
FROM market_depth
WHERE instrument_key = $1
  AND timestamp >= $2
  AND timestamp <= $3
ORDER BY timestamp ASC, side ASC, level ASC;
