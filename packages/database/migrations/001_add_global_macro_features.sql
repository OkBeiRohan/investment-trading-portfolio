-- Migration: Add global macro, cyclical time, and pre-market features
-- to instrument_features table
-- Run this AFTER the base table exists (create_instrument_features.sql)

-- Cyclical Time Encoding (4 columns)
ALTER TABLE instrument_features ADD COLUMN time_sin DOUBLE;
ALTER TABLE instrument_features ADD COLUMN time_cos DOUBLE;
ALTER TABLE instrument_features ADD COLUMN day_of_week_sin DOUBLE;
ALTER TABLE instrument_features ADD COLUMN day_of_week_cos DOUBLE;

-- Global Macro (12 columns)
ALTER TABLE instrument_features ADD COLUMN gift_nifty_premium DOUBLE;
ALTER TABLE instrument_features ADD COLUMN sp500_overnight_return DOUBLE;
ALTER TABLE instrument_features ADD COLUMN nasdaq_overnight_return DOUBLE;
ALTER TABLE instrument_features ADD COLUMN nikkei_return DOUBLE;
ALTER TABLE instrument_features ADD COLUMN ftse_return DOUBLE;
ALTER TABLE instrument_features ADD COLUMN brent_crude_change DOUBLE;
ALTER TABLE instrument_features ADD COLUMN wti_crude_change DOUBLE;
ALTER TABLE instrument_features ADD COLUMN brent_wti_spread DOUBLE;
ALTER TABLE instrument_features ADD COLUMN gold_change DOUBLE;
ALTER TABLE instrument_features ADD COLUMN silver_change DOUBLE;
ALTER TABLE instrument_features ADD COLUMN usd_inr_change DOUBLE;
ALTER TABLE instrument_features ADD COLUMN us_10y_yield_change DOUBLE;

-- Pre-Market (4 columns)
ALTER TABLE instrument_features ADD COLUMN actual_gap_pct DOUBLE;
ALTER TABLE instrument_features ADD COLUMN expected_opening_volatility DOUBLE;
ALTER TABLE instrument_features ADD COLUMN pre_market_bias DOUBLE;
ALTER TABLE instrument_features ADD COLUMN overnight_news_sentiment DOUBLE;
