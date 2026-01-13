-- Historical candles (OHLCV data) - Raw tick-level data
-- Expected: 200K candles/day across all instruments and intervals
CREATE TABLE IF NOT EXISTS market_candles (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  interval SYMBOL CAPACITY 20,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume LONG,
  open_interest LONG
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, interval);
