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
  bid_qty LONG,                              -- NEW: Bid quantity
  ask_qty LONG,                              -- NEW: Ask quantity
  volume DOUBLE,
  open_interest DOUBLE,
  prev_oi LONG,                              -- NEW: Previous day OI
  close_price DOUBLE,                        -- NEW: Previous close
  
  iv DOUBLE,
  delta DOUBLE,
  gamma DOUBLE,
  vega DOUBLE,
  theta DOUBLE,
  pop DOUBLE                                 -- NEW: Probability of Profit
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, underlying_key, instrument_key);
