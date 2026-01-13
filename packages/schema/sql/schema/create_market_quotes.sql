-- Market quotes (bid/ask snapshots) - High-frequency tick data
-- Expected: 1M quotes/day (tick-by-tick)
CREATE TABLE IF NOT EXISTS market_quotes (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  ltp DOUBLE,
  bid DOUBLE,
  ask DOUBLE,
  bid_qty INT,
  ask_qty INT,
  volume LONG,
  open_interest LONG,
  upper_circuit DOUBLE,
  lower_circuit DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
