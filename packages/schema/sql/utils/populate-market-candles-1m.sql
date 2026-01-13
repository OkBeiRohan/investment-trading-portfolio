-- Populate 1-minute candles from market_quotes into market_candles table
-- Run this query periodically (e.g., every 5 minutes) to refresh aggregated data
-- This query aggregates the last 2 hours of data to avoid full table scans
INSERT INTO market_candles
SELECT
  timestamp,
  instrument_key,
  '1m' as interval,
  first(ltp) as open,
  max(ltp) as high,
  min(ltp) as low,
  last(ltp) as close,
  sum(volume) as volume,
  last(open_interest) as open_interest
FROM market_quotes
WHERE timestamp >= dateadd('h', -2, now())
SAMPLE BY 1m
ALIGN TO CALENDAR;
