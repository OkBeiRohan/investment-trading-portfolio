-- Query TFT features with optional filters
-- Used by: training-pipeline for TFT model training
SELECT * FROM training_features_tft
WHERE timestamp BETWEEN $1 AND $2
ORDER BY timestamp ASC;
