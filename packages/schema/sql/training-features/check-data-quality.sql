-- Check for data quality issues (missing features, outliers)
-- Used by: Data validation, quality monitoring
SELECT 
  COUNT(*) as total_rows,
  COUNT(CASE WHEN nifty_spot_price IS NULL THEN 1 END) as missing_spot_price,
  COUNT(CASE WHEN future_rsi_14 < 0 OR future_rsi_14 > 100 THEN 1 END) as invalid_rsi,
  COUNT(CASE WHEN computation_latency_ms > 1000 THEN 1 END) as slow_computation,
  AVG(computation_latency_ms) as avg_latency_ms,
  MIN(timestamp) as earliest_timestamp,
  MAX(timestamp) as latest_timestamp
FROM training_features_lightgbm
WHERE timestamp BETWEEN $1 AND $2;
