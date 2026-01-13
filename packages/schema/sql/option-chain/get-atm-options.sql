SELECT * FROM option_chain_snapshot 
WHERE underlying_key = $1
AND timestamp >= dateadd('m', -5, now())
ORDER BY abs(strike - $2), option_type
LIMIT 2
