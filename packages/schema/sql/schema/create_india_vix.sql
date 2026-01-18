-- India VIX Table
-- Stores India VIX index data (launched Feb 26, 2014)
-- Used for volatility regime detection

CREATE TABLE IF NOT EXISTS india_vix (
  timestamp TIMESTAMP,
  interval_value INT,                    -- 1 for minute, 1 for daily
  interval_unit SYMBOL CAPACITY 10,      -- 'minutes', 'days'
  
  -- OHLCV
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  
  -- Computed metrics (for daily)
  percentile_30d DOUBLE,                 -- 30-day percentile rank
  percentile_1yr DOUBLE,                 -- 1-year percentile rank
  sma_10 DOUBLE,
  sma_20 DOUBLE
  
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, interval_value, interval_unit);
