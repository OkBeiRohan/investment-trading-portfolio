-- Count candles for instrument + interval
-- Parameters: $1 = instrument_key, $2 = interval
SELECT COUNT(*) as count
FROM market_candles
WHERE instrument_key = $1
  AND interval = $2;
