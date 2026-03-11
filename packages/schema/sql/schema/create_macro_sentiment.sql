-- Macro Sentiment & News Data - v1.0
-- Stores NLP-processed news sentiment and global macro events
-- Used by Tier 0 (Pre-Market Gap Predictor) and Tier 1 (Macro Director)
-- Expected: ~100-500 records/day from RSS/news feeds
CREATE TABLE IF NOT EXISTS macro_sentiment (
  timestamp TIMESTAMP,
  entity SYMBOL CAPACITY 256 CACHE INDEX,       -- e.g., 'RBI', 'BRENT_CRUDE', 'FED', 'NIFTY50'
  event_type SYMBOL CAPACITY 32,                -- e.g., 'NEWS', 'RATE_DECISION', 'GEOPOLITICAL', 'EARNINGS'
  sentiment_score DOUBLE,                        -- -1.0 (Bearish) to 1.0 (Bullish)
  impact_score DOUBLE,                           -- 0.0 to 1.0 (How significant is the event)
  headline STRING,                               -- Raw headline text for debugging/audit
  source SYMBOL CAPACITY 32                      -- e.g., 'REUTERS', 'MONEYCONTROL', 'BLOOMBERG'
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, entity, event_type);
