-- QuestDB Rollback Script
-- Version: 1.0.0
-- Date: January 13, 2026
-- Description: Rollback initial schema setup
--
-- WARNING: This will drop all tables and their data!
-- Only run this if you want to completely reset the database.
--
-- Run this script in QuestDB console (http://localhost:9000)

-- Drop materialized views first (if they exist)
DROP VIEW IF EXISTS market_candles_30m;
DROP VIEW IF EXISTS market_candles_1m;

-- Drop training tables
DROP TABLE IF EXISTS training_labels;
DROP TABLE IF EXISTS training_features_tft;
DROP TABLE IF EXISTS training_features_lightgbm;
DROP TABLE IF EXISTS market_ticks;

-- Drop core market data tables
DROP TABLE IF EXISTS system_audit;
DROP TABLE IF EXISTS market_depth;
DROP TABLE IF EXISTS option_greeks;
DROP TABLE IF EXISTS market_quotes;
DROP TABLE IF EXISTS market_candles;

-- Verify all tables are dropped
-- SELECT table_name FROM tables();
