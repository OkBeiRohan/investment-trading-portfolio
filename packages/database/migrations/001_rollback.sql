-- QuestDB Rollback Script
-- Version: 2.0.0
-- Date: January 13, 2026
-- Description: Rollback production-grade schema setup
--
-- WARNING: This will drop all tables and their data!
-- Only run this if you want to completely reset the database.
--
-- Run this script in QuestDB console (http://localhost:9000)

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS system_audit;
DROP TABLE IF EXISTS training_labels_1m;
DROP TABLE IF EXISTS market_state_1m;
DROP TABLE IF EXISTS option_chain_snapshot;
DROP TABLE IF EXISTS instrument_features_1m;
DROP TABLE IF EXISTS orderbook_l2_snapshots;
DROP TABLE IF EXISTS market_candles;
DROP TABLE IF EXISTS instrument_master;

-- Verify all tables are dropped
-- SELECT table_name FROM tables();

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- All production tables have been dropped.
-- Re-run 001_initial_schema.sql to recreate the schema.
-- =============================================================================
