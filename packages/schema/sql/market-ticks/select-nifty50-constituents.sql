-- Get all NIFTY50 constituents ticks for a time range
-- Used for: Market breadth analysis, constituent correlation
SELECT *
FROM market_ticks
WHERE is_nifty50_constituent = TRUE
  AND timestamp BETWEEN $1 AND $2
ORDER BY timestamp DESC, stock_symbol
LIMIT $3;
