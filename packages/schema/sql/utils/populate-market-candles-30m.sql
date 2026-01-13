-- Populate 30-minute candles from 1-minute candles into market_candles table
-- Run this query periodically (e.g., every 30 minutes) to refresh aggregated data
-- This query aggregates the last 24 hours of data
INSERT INTO market_candles
SELECT
  timestamp,
  instrument_key,
  '30m' as interval,
  first(open) as open,
  max(high) as high,
  min(low) as low,
  last(close) as close,
  sum(volume) as volume,
  last(open_interest) as open_interest
FROM market_candles
WHERE interval = '1m'
  AND timestamp >= dateadd('h', -24, now())
SAMPLE BY 30m
ALIGN TO CALENDAR;
