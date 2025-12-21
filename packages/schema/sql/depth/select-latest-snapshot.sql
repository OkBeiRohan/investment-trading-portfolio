-- Get latest depth snapshot (all levels, both sides)
-- Parameters: $1 = instrument_key
WITH latest_timestamp AS (
  SELECT MAX(timestamp) as ts
  FROM market_depth
  WHERE instrument_key = $1
)
SELECT 
  d.timestamp,
  d.instrument_key,
  d.side,
  d.level,
  d.price,
  d.quantity,
  d.orders
FROM market_depth d
CROSS JOIN latest_timestamp lt
WHERE d.instrument_key = $1
  AND d.timestamp = lt.ts
ORDER BY d.side ASC, d.level ASC;
