-- Query LightGBM features with optional filters
-- Used by: training-pipeline for model training
SELECT * FROM training_features_lightgbm
WHERE timestamp BETWEEN $1 AND $2
ORDER BY timestamp ASC;
