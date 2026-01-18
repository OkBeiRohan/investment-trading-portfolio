-- Rollback for Migration 003: Enhanced historical data schema
-- NOTE: QuestDB does not support DROP COLUMN - table recreation required

-- If rollback needed, tables must be recreated without the new columns:
-- 1. Export data from affected tables
-- 2. Drop tables
-- 3. Recreate from original schema
-- 4. Re-import data

-- This is a non-destructive migration (add only), so typically no rollback is needed
