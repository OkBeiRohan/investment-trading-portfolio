-- Instrument Master Table (Full Upstox Schema)
-- Single source of truth for ALL instrument metadata
-- Includes options/futures fields from Upstox expired-instruments API

CREATE TABLE IF NOT EXISTS instrument_master (
  -- Primary identifier
  instrument_key SYMBOL CAPACITY 100000 NOCACHE INDEX,
  
  -- Exchange info
  exchange SYMBOL CAPACITY 10,           -- 'NSE', 'BSE', 'NFO'
  segment SYMBOL CAPACITY 10,            -- 'NSE_EQ', 'NSE_FO', 'NSE_INDEX'
  
  -- Instrument classification
  instrument_type SYMBOL CAPACITY 20,    -- 'INDEX', 'STOCK', 'FUTURE', 'OPTION_CE', 'OPTION_PE'
  
  -- Naming
  trading_symbol SYMBOL CAPACITY 100,    -- e.g., 'NIFTY 20400 PE 17 APR 25'
  name STRING,                           -- e.g., 'NIFTY', 'RELIANCE'
  isin STRING,                           -- For stocks
  
  -- For F&O instruments
  expiry DATE,
  strike DOUBLE,
  option_type SYMBOL CAPACITY 2,         -- 'CE', 'PE'
  
  -- Underlying reference
  underlying_key SYMBOL CAPACITY 100,    -- e.g., 'NSE_INDEX|Nifty 50'
  underlying_symbol SYMBOL CAPACITY 50,  -- e.g., 'NIFTY'
  underlying_type SYMBOL CAPACITY 20,    -- 'INDEX', 'STOCK'
  
  -- Lot and tick info
  lot_size INT,
  minimum_lot INT,
  tick_size DOUBLE,
  freeze_quantity INT,
  
  -- Classification flags
  weekly BOOLEAN,                        -- Weekly expiry flag
  is_expired BOOLEAN,
  is_active BOOLEAN,
  
  -- Exchange token
  exchange_token STRING,
  
  -- Timestamps
  created_at TIMESTAMP,
  last_updated TIMESTAMP
);

-- Create index for fast lookups
-- ALTER TABLE instrument_master ADD INDEX idx_underlying (underlying_key);
