SELECT * FROM option_chain_snapshot 
WHERE underlying_key = $1
AND timestamp >= dateadd('m', -5, now())
ORDER BY strike, option_type
