-- Option Chain Snapshot
-- Option chain with Greeks (CRITICAL for Market State Encoder)

CREATE TABLE IF NOT EXISTS option_chain_snapshot (
  timestamp TIMESTAMP,
  underlying_key SYMBOL CAPACITY 1000 NOCACHE INDEX,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  expiry DATE,
  strike DOUBLE,
  option_type SYMBOL CAPACITY 2,
  
  last_price DOUBLE,
  bid_price DOUBLE,
  ask_price DOUBLE,
  volume DOUBLE,
  open_interest DOUBLE,
  
  iv DOUBLE,
  delta DOUBLE,
  gamma DOUBLE,
  vega DOUBLE,
  theta DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, underlying_key, instrument_key);
