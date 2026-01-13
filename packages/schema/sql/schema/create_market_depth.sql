-- Market depth (order book levels)
-- Supports 1-20 levels (stores whatever is available: 5, 10, or 20)
-- Expected: 500K-2M depth updates/day (5-20 levels * 2 sides * 10K updates)
CREATE TABLE IF NOT EXISTS market_depth (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  instrument_type SYMBOL CAPACITY 10,
  index_name SYMBOL CAPACITY 20,
  side SYMBOL CAPACITY 2,
  level BYTE,
  price DOUBLE,
  quantity INT,
  orders INT,
  exchange SYMBOL CAPACITY 5
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, side, level);
