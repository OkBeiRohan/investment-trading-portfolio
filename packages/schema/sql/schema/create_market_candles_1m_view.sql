-- 1-minute candles (auto-aggregated from market_quotes)
-- Reduces query-time computation for dashboard charts
CREATE MATERIALIZED VIEW IF NOT EXISTS market_candles_1m AS
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
SAMPLE BY 1m
ALIGN TO CALENDAR;
