-- 20-level order book depth for all instruments
-- Expected: ~50M rows/day (10K instruments × 40 levels × 120 updates/instrument)
CREATE TABLE IF NOT EXISTS market_depth_20 (
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
