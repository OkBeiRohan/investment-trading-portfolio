-- Market depth (order book levels)
-- Expected: 500K depth updates/day (5 levels * 2 sides * 10K updates)
CREATE TABLE IF NOT EXISTS market_depth (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  side SYMBOL CAPACITY 2,
  level BYTE,
  price DOUBLE,
  quantity INT,
  orders INT
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, side, level);
