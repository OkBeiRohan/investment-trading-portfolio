-- Get TFT time-series features for regime detection training
-- Used by: training-pipeline for TFT model training
SELECT *
FROM training_features_tft
WHERE timestamp BETWEEN $1 AND $2
  AND index_name = $3
ORDER BY timestamp ASC
LIMIT $4;
