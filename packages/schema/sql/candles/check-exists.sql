SELECT count(*) as count FROM market_candles 
WHERE instrument_key = $1 
AND interval_value = $2
AND interval_unit = $3
AND timestamp >= $4 
AND timestamp < $5
