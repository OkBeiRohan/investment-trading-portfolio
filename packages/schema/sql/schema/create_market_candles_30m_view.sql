-- 30-minute candles (aggregated from 1m candles)
-- For longer-term analysis and backtesting
-- NOTE: QuestDB doesn't support traditional materialized views
-- This is a regular table that needs to be populated via INSERT FROM SELECT
-- The application should periodically refresh this data
CREATE TABLE IF NOT EXISTS market_candles_30m (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 1000,
  interval SYMBOL CAPACITY 10,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume LONG,
  open_interest LONG
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
