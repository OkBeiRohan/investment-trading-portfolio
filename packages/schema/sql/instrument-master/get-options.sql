SELECT * FROM instrument_master 
WHERE underlying_key = $1 
AND instrument_type = 'OPTION'
AND is_expired = false
ORDER BY strike, option_type
