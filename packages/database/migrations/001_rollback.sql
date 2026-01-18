-- QuestDB Schema Rollback
-- Version: 3.0 (Unified Schema)
-- Drops all 7 tables

DROP TABLE IF EXISTS training_labels;
DROP TABLE IF EXISTS instrument_features;
DROP TABLE IF EXISTS option_chain_snapshot;
DROP TABLE IF EXISTS tick_data;
DROP TABLE IF EXISTS orderbook_l2_snapshots;
DROP TABLE IF EXISTS market_candles;
DROP TABLE IF EXISTS instrument_master;
