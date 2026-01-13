-- Option Greeks snapshots
-- Expected: 50K greeks/day (snapshots every 5 minutes for active options)
CREATE TABLE IF NOT EXISTS option_greeks (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  delta DOUBLE,
  gamma DOUBLE,
  theta DOUBLE,
  vega DOUBLE,
  iv DOUBLE,
  underlying_price DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
