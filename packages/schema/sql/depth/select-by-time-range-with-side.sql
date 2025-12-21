-- Query market depth for a time range with optional side filter
-- Parameters: $1 = instrument_key, $2 = start_time (ISO timestamp), $3 = end_time (ISO timestamp), $4 = side (optional, 'BUY' or 'SELL')
-- Note: Side filter is applied in application code when $4 is provided
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
