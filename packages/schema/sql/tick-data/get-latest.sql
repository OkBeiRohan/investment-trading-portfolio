SELECT * FROM tick_data 
WHERE instrument_key = $1 
ORDER BY timestamp DESC 
LIMIT 1
