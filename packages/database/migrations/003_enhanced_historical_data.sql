-- Migration 003: Enhanced historical data schema
-- Adds new columns to option_chain_snapshot and orderbook_l2_snapshots
-- Also adds extended fields to instrument_master

-- ============================================
-- 1. Alter option_chain_snapshot
-- ============================================
ALTER TABLE option_chain_snapshot ADD COLUMN IF NOT EXISTS bid_qty LONG;
ALTER TABLE option_chain_snapshot ADD COLUMN IF NOT EXISTS ask_qty LONG;
ALTER TABLE option_chain_snapshot ADD COLUMN IF NOT EXISTS prev_oi LONG;
ALTER TABLE option_chain_snapshot ADD COLUMN IF NOT EXISTS close_price DOUBLE;
ALTER TABLE option_chain_snapshot ADD COLUMN IF NOT EXISTS pop DOUBLE;

-- ============================================
-- 2. Alter orderbook_l2_snapshots
-- ============================================
ALTER TABLE orderbook_l2_snapshots ADD COLUMN IF NOT EXISTS orders INT;

-- ============================================
-- Note: instrument_master already has extended fields
-- in create_instrument_master.sql - no changes needed
-- Fields already present: isin, exchange_token, underlying_symbol,
-- underlying_type, freeze_quantity, minimum_lot, weekly, is_active
-- ============================================
