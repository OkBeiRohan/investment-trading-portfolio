SELECT * FROM market_candles 
WHERE instrument_key = $1 
AND interval_value = $2
AND interval_unit = $3
ORDER BY timestamp DESC 
LIMIT 1
