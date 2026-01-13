-- Instrument Master Table
-- Single source of truth for instrument metadata
-- Filled from Upstox /v3/instrument/expired-instruments

CREATE TABLE IF NOT EXISTS instrument_master (
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  exchange SYMBOL CAPACITY 10,
  segment SYMBOL CAPACITY 10,
  instrument_type SYMBOL CAPACITY 10,
  tradingsymbol SYMBOL CAPACITY 50,
  name STRING,
  expiry DATE,
  strike DOUBLE,
  option_type SYMBOL CAPACITY 2,
  lot_size INT,
  tick_size DOUBLE,
  underlying_key SYMBOL CAPACITY 50000,
  is_expired BOOLEAN,
  last_updated TIMESTAMP
);
