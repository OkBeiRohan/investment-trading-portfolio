-- 30-minute candles (auto-aggregated from 1m candles)
-- For longer-term analysis and backtesting
CREATE MATERIALIZED VIEW IF NOT EXISTS market_candles_30m AS
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
SAMPLE BY 30m
ALIGN TO CALENDAR;
