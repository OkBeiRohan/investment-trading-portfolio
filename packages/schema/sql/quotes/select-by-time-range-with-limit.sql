-- Query quotes for a time range with limit
-- Parameters: $1 = instrument_key, $2 = start_time (ISO timestamp), $3 = end_time (ISO timestamp), $4 = limit (use 999999999 for no limit)
SELECT 
  timestamp,
  instrument_key,
  ltp,
  bid,
  ask,
  bid_qty,
  ask_qty,
  volume,
  open_interest,
  upper_circuit,
  lower_circuit
FROM market_quotes
WHERE instrument_key = $1
  AND timestamp >= $2
  AND timestamp <= $3
ORDER BY timestamp ASC
LIMIT $4;
