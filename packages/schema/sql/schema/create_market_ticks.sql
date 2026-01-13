-- Unified tick data for ALL instruments (spot, futures, options, stocks)
-- Expected: ~10M ticks/day (50 stocks × 1 future × 50 options × ~4K ticks)
CREATE TABLE IF NOT EXISTS market_ticks (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  instrument_type SYMBOL CAPACITY 10,
  index_name SYMBOL CAPACITY 20,
  strike_price DOUBLE,
  option_type SYMBOL CAPACITY 2,
  expiry_date TIMESTAMP,
  stock_symbol SYMBOL CAPACITY 1000,
  is_nifty50_constituent BOOLEAN,
  ltp DOUBLE,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  prev_close DOUBLE,
  volume LONG,
  open_interest LONG,
  bid DOUBLE,
  ask DOUBLE,
  bid_qty INT,
  ask_qty INT,
  upper_circuit DOUBLE,
  lower_circuit DOUBLE,
  exchange SYMBOL CAPACITY 5,
  trade_time TIMESTAMP
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
