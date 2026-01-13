-- Get option chain (all strikes) for a specific index and expiry
-- Used for: Option Greeks analysis, IV surface construction
SELECT *
FROM market_ticks
WHERE instrument_type = 'OPTION'
  AND index_name = $1
  AND expiry_date = $2
  AND timestamp BETWEEN $3 AND $4
ORDER BY strike_price, option_type, timestamp DESC;
