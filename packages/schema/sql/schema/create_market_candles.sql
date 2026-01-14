-- Historical candles (OHLCV data) - v2.0 with interval_value + interval_unit
-- Aligned with Upstox V3 /get-historical-candle-data API
-- Expected: 200K candles/day across all instruments and intervals
CREATE TABLE IF NOT EXISTS market_candles (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  interval_value INT,
  interval_unit SYMBOL CAPACITY 10,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume LONG,
  open_interest LONG
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, interval_value, interval_unit);
