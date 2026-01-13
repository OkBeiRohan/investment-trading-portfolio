-- TFT time-series features (for regime detection)
-- Expected: ~75 rows/day (5-min snapshots)
CREATE TABLE IF NOT EXISTS training_features_tft (
  timestamp TIMESTAMP,
  reference_instrument SYMBOL CAPACITY 100,
  index_name SYMBOL CAPACITY 20,
  returns_5m STRING,
  returns_15m STRING,
  returns_1h STRING,
  volatility_5m STRING,
  volatility_15m STRING,
  volatility_1h STRING,
  volume_normalized STRING,
  advance_decline_ratio STRING,
  nifty50_momentum_distribution STRING,
  pcr_oi STRING,
  atm_iv STRING,
  iv_term_structure STRING,
  bid_ask_spread STRING,
  order_flow_imbalance STRING,
  current_regime STRING,
  vix_level DOUBLE,
  market_phase STRING,
  feature_version STRING,
  lookback_window INT
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, reference_instrument);
