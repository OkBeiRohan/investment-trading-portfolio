-- Tick Data Table (Depth-30)
-- Stores live tick-by-tick data with full order book depth
-- Expected: ~50M ticks/day across all instruments

CREATE TABLE IF NOT EXISTS tick_data (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  
  -- Price data
  ltp DOUBLE,                            -- Last traded price
  ltq LONG,                              -- Last traded quantity
  cp DOUBLE,                             -- Close price (previous day)
  
  -- Aggregates
  atp DOUBLE,                            -- Average traded price
  vtt LONG,                              -- Volume traded today
  oi LONG,                               -- Open interest
  tbq LONG,                              -- Total bid quantity
  tsq LONG,                              -- Total ask quantity
  
  -- Depth Level 1-10
  bid_price_1 DOUBLE, bid_qty_1 LONG,
  bid_price_2 DOUBLE, bid_qty_2 LONG,
  bid_price_3 DOUBLE, bid_qty_3 LONG,
  bid_price_4 DOUBLE, bid_qty_4 LONG,
  bid_price_5 DOUBLE, bid_qty_5 LONG,
  bid_price_6 DOUBLE, bid_qty_6 LONG,
  bid_price_7 DOUBLE, bid_qty_7 LONG,
  bid_price_8 DOUBLE, bid_qty_8 LONG,
  bid_price_9 DOUBLE, bid_qty_9 LONG,
  bid_price_10 DOUBLE, bid_qty_10 LONG,
  
  ask_price_1 DOUBLE, ask_qty_1 LONG,
  ask_price_2 DOUBLE, ask_qty_2 LONG,
  ask_price_3 DOUBLE, ask_qty_3 LONG,
  ask_price_4 DOUBLE, ask_qty_4 LONG,
  ask_price_5 DOUBLE, ask_qty_5 LONG,
  ask_price_6 DOUBLE, ask_qty_6 LONG,
  ask_price_7 DOUBLE, ask_qty_7 LONG,
  ask_price_8 DOUBLE, ask_qty_8 LONG,
  ask_price_9 DOUBLE, ask_qty_9 LONG,
  ask_price_10 DOUBLE, ask_qty_10 LONG,
  
  -- Depth Level 11-20
  bid_price_11 DOUBLE, bid_qty_11 LONG,
  bid_price_12 DOUBLE, bid_qty_12 LONG,
  bid_price_13 DOUBLE, bid_qty_13 LONG,
  bid_price_14 DOUBLE, bid_qty_14 LONG,
  bid_price_15 DOUBLE, bid_qty_15 LONG,
  bid_price_16 DOUBLE, bid_qty_16 LONG,
  bid_price_17 DOUBLE, bid_qty_17 LONG,
  bid_price_18 DOUBLE, bid_qty_18 LONG,
  bid_price_19 DOUBLE, bid_qty_19 LONG,
  bid_price_20 DOUBLE, bid_qty_20 LONG,
  
  ask_price_11 DOUBLE, ask_qty_11 LONG,
  ask_price_12 DOUBLE, ask_qty_12 LONG,
  ask_price_13 DOUBLE, ask_qty_13 LONG,
  ask_price_14 DOUBLE, ask_qty_14 LONG,
  ask_price_15 DOUBLE, ask_qty_15 LONG,
  ask_price_16 DOUBLE, ask_qty_16 LONG,
  ask_price_17 DOUBLE, ask_qty_17 LONG,
  ask_price_18 DOUBLE, ask_qty_18 LONG,
  ask_price_19 DOUBLE, ask_qty_19 LONG,
  ask_price_20 DOUBLE, ask_qty_20 LONG,
  
  -- Depth Level 21-30
  bid_price_21 DOUBLE, bid_qty_21 LONG,
  bid_price_22 DOUBLE, bid_qty_22 LONG,
  bid_price_23 DOUBLE, bid_qty_23 LONG,
  bid_price_24 DOUBLE, bid_qty_24 LONG,
  bid_price_25 DOUBLE, bid_qty_25 LONG,
  bid_price_26 DOUBLE, bid_qty_26 LONG,
  bid_price_27 DOUBLE, bid_qty_27 LONG,
  bid_price_28 DOUBLE, bid_qty_28 LONG,
  bid_price_29 DOUBLE, bid_qty_29 LONG,
  bid_price_30 DOUBLE, bid_qty_30 LONG,
  
  ask_price_21 DOUBLE, ask_qty_21 LONG,
  ask_price_22 DOUBLE, ask_qty_22 LONG,
  ask_price_23 DOUBLE, ask_qty_23 LONG,
  ask_price_24 DOUBLE, ask_qty_24 LONG,
  ask_price_25 DOUBLE, ask_qty_25 LONG,
  ask_price_26 DOUBLE, ask_qty_26 LONG,
  ask_price_27 DOUBLE, ask_qty_27 LONG,
  ask_price_28 DOUBLE, ask_qty_28 LONG,
  ask_price_29 DOUBLE, ask_qty_29 LONG,
  ask_price_30 DOUBLE, ask_qty_30 LONG,
  
  -- Greeks (options only, from Upstox)
  delta DOUBLE,
  theta DOUBLE,
  gamma DOUBLE,
  vega DOUBLE,
  rho DOUBLE,
  iv DOUBLE                              -- Implied volatility
  
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
