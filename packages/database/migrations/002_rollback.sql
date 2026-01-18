-- Rollback for 002_54_feature_architecture.sql

-- Drop new tables
DROP TABLE IF EXISTS tick_data;
DROP TABLE IF EXISTS india_vix;

-- Note: instrument_features_1m and training_labels_1m were recreated
-- To fully rollback, run 001_initial_schema.sql again to restore original structure
