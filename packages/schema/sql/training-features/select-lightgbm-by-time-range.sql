-- Get LightGBM features for training (with optional filtering)
-- Used by: training-pipeline for model training
SELECT *
FROM training_features_lightgbm
WHERE timestamp BETWEEN $1 AND $2
ORDER BY timestamp ASC
LIMIT $3;
