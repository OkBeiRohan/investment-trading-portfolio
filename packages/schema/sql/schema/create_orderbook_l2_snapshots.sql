-- Order Book L2 Snapshots (OPTIONAL - for execution models)
-- Level 2 order book snapshots (Upstox Market Feed V3 - depth 30)

CREATE TABLE IF NOT EXISTS orderbook_l2_snapshots (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  side SYMBOL CAPACITY 2,
  level BYTE,
  price DOUBLE,
  quantity DOUBLE,
  orders INT                                 -- NEW: Number of orders at this level
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, side, level);
