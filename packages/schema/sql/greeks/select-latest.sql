-- Get latest greeks for instrument
-- Parameters: $1 = instrument_key
SELECT 
  timestamp,
  instrument_key,
  delta,
  gamma,
  theta,
  vega,
  iv,
  underlying_price
FROM option_greeks
WHERE instrument_key = $1
ORDER BY timestamp DESC
LIMIT 1;
