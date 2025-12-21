-- Get latest quote for instrument
-- Parameters: $1 = instrument_key
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
ORDER BY timestamp DESC
LIMIT 1;
