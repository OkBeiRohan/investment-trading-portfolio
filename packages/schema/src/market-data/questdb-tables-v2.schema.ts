/**
 * QuestDB Table Schemas - Production Grade v2.0
 * Aligned with Upstox V3 APIs and ML architecture
 *
 * Design Principles:
 * 1. One unified raw table per data "shape"
 * 2. No derived data mixed with raw
 * 3. Instrument identity matches Upstox instrument_key
 * 4. Time-series first (timestamp is king)
 * 5. Training must be reproducible from DB alone
 */

import { z } from "zod";

// ============================================
// TABLE 1: instrument_master
// Instrument registry - MANDATORY for all joins
// ============================================

export const InstrumentMasterSchema = z.object({
  instrumentKey: z.string(), // e.g. NSE_INDEX|Nifty 50, NSE_FO|NIFTY24JANFUT
  exchange: z.enum(["NSE", "BSE", "MCX"]),
  segment: z.enum(["INDEX", "EQ", "FO", "COMMODITY"]),
  instrumentType: z.enum(["SPOT", "STOCK", "FUTURE", "OPTION"]),
  tradingsymbol: z.string(), // NIFTY, RELIANCE, NIFTY24JANFUT
  name: z.string(), // Human readable name
  expiry: z.date().nullable(), // NULL for spot/stocks
  strike: z.number().nullable(), // NULL unless option
  optionType: z.enum(["CE", "PE"]).nullable(), // NULL for non-options
  lotSize: z.number().int(), // Contract multiplier
  tickSize: z.number(), // Minimum price movement
  underlyingKey: z.string().nullable(), // Links option/future → spot
  isExpired: z.boolean(), // Historical vs active
  lastUpdated: z.date(), // When this record was updated
});

export type InstrumentMaster = z.infer<typeof InstrumentMasterSchema>;

export const CREATE_TABLE_INSTRUMENT_MASTER = `
CREATE TABLE IF NOT EXISTS instrument_master (
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  exchange SYMBOL CAPACITY 10,
  segment SYMBOL CAPACITY 10,
  instrument_type SYMBOL CAPACITY 10,
  tradingsymbol SYMBOL CAPACITY 50,
  name STRING,
  expiry DATE,
  strike DOUBLE,
  option_type SYMBOL CAPACITY 2,
  lot_size INT,
  tick_size DOUBLE,
  underlying_key SYMBOL CAPACITY 50000,
  is_expired BOOLEAN,
  last_updated TIMESTAMP
);
`;

// ============================================
// TABLE 2: market_candles
// Unified historical candle data
// ============================================

export const MarketCandleSchema = z.object({
  timestamp: z.date(), // TIMESTAMP (designated timestamp column)
  instrumentKey: z.string(),
  intervalValue: z.number().int(), // 1, 5, 15, 30, 60
  intervalUnit: z.enum(["second", "minute", "day"]),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(), // Can be fractional
  openInterest: z.number().nullable(), // NULL for spot/stocks
});

export type MarketCandle = z.infer<typeof MarketCandleSchema>;

export const CREATE_TABLE_MARKET_CANDLES = `
CREATE TABLE IF NOT EXISTS market_candles (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  interval_value INT,
  interval_unit SYMBOL CAPACITY 10,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume DOUBLE,
  open_interest DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, interval_value, interval_unit);
`;

// ============================================
// TABLE 3: orderbook_l2_snapshots (OPTIONAL)
// Level 2 order book snapshots
// ============================================

export const OrderbookL2SnapshotSchema = z.object({
  timestamp: z.date(),
  instrumentKey: z.string(),
  side: z.enum(["bid", "ask"]),
  level: z.number().int().min(1).max(30), // Depth level 1-30
  price: z.number(),
  quantity: z.number(),
});

export type OrderbookL2Snapshot = z.infer<typeof OrderbookL2SnapshotSchema>;

export const CREATE_TABLE_ORDERBOOK_L2_SNAPSHOTS = `
CREATE TABLE IF NOT EXISTS orderbook_l2_snapshots (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  side SYMBOL CAPACITY 2,
  level BYTE,
  price DOUBLE,
  quantity DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, side, level);
`;

// ============================================
// TABLE 4: instrument_features_1m
// Derived intraday features per instrument
// ============================================

export const InstrumentFeatures1mSchema = z.object({
  timestamp: z.date(),
  instrumentKey: z.string(),

  // Price structure
  vwap: z.number(), // Volume-weighted average price
  atr: z.number(), // Average True Range (14-period)
  atrPercent: z.number(), // ATR as % of price

  // Volatility
  realizedVol5m: z.number(), // 5-min realized volatility
  realizedVol15m: z.number(), // 15-min realized volatility
  volExpansionRatio: z.number(), // Short-term vol / long-term vol

  // Momentum
  rsi5: z.number(), // RSI (5-period)
  rsi14: z.number(), // RSI (14-period)
  macdHist: z.number(), // MACD histogram
  ema9Slope: z.number(), // 9-period EMA slope
  ema21Slope: z.number(), // 21-period EMA slope

  // Range context
  dayHighDist: z.number(), // Distance from day high (%)
  dayLowDist: z.number(), // Distance from day low (%)
  weeklyHighDist: z.number(), // Distance from weekly high (%)
  weeklyLowDist: z.number(), // Distance from weekly low (%)
});

export type InstrumentFeatures1m = z.infer<typeof InstrumentFeatures1mSchema>;

export const CREATE_TABLE_INSTRUMENT_FEATURES_1M = `
CREATE TABLE IF NOT EXISTS instrument_features_1m (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  vwap DOUBLE,
  atr DOUBLE,
  atr_percent DOUBLE,
  realized_vol_5m DOUBLE,
  realized_vol_15m DOUBLE,
  vol_expansion_ratio DOUBLE,
  rsi_5 DOUBLE,
  rsi_14 DOUBLE,
  macd_hist DOUBLE,
  ema_9_slope DOUBLE,
  ema_21_slope DOUBLE,
  day_high_dist DOUBLE,
  day_low_dist DOUBLE,
  weekly_high_dist DOUBLE,
  weekly_low_dist DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
`;

// ============================================
// TABLE 5: option_chain_snapshot
// Option chain with Greeks
// ============================================

export const OptionChainSnapshotSchema = z.object({
  timestamp: z.date(),
  underlyingKey: z.string(), // e.g. NSE_INDEX|Nifty 50
  instrumentKey: z.string(), // Option instrument
  expiry: z.date(),
  strike: z.number(),
  optionType: z.enum(["CE", "PE"]),

  // Pricing
  lastPrice: z.number(),
  bidPrice: z.number(),
  askPrice: z.number(),
  volume: z.number(),
  openInterest: z.number(),

  // Greeks
  iv: z.number(), // Implied volatility
  delta: z.number(),
  gamma: z.number(),
  vega: z.number(),
  theta: z.number(),
});

export type OptionChainSnapshot = z.infer<typeof OptionChainSnapshotSchema>;

export const CREATE_TABLE_OPTION_CHAIN_SNAPSHOT = `
CREATE TABLE IF NOT EXISTS option_chain_snapshot (
  timestamp TIMESTAMP,
  underlying_key SYMBOL CAPACITY 1000 NOCACHE INDEX,
  instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
  expiry DATE,
  strike DOUBLE,
  option_type SYMBOL CAPACITY 2,
  last_price DOUBLE,
  bid_price DOUBLE,
  ask_price DOUBLE,
  volume DOUBLE,
  open_interest DOUBLE,
  iv DOUBLE,
  delta DOUBLE,
  gamma DOUBLE,
  vega DOUBLE,
  theta DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, underlying_key, instrument_key);
`;

// ============================================
// TABLE 6: market_state_1m
// Market State Encoder output - feeds LightGBM
// ============================================

export const MarketState1mSchema = z.object({
  timestamp: z.date(),

  // Aggregated index state
  indexReturn1m: z.number(), // 1-min return
  indexTrendStrength: z.number(), // ADX or similar
  indexVolatility: z.number(), // Realized volatility

  // Breadth (from 50 constituents)
  advancersRatio: z.number(), // % stocks up vs down
  declineStrength: z.number(), // Average decline magnitude
  sectorDispersion: z.number(), // Cross-sectional volatility

  // Futures context
  futBasis: z.number(), // Future - Spot (absolute)
  futOiChange: z.number(), // Change in open interest

  // Options summary
  atmIv: z.number(), // At-the-money implied volatility
  atmIvChange: z.number(), // Change in ATM IV
  pcrOi: z.number(), // Put-call ratio (open interest)
  pcrVolume: z.number(), // Put-call ratio (volume)
  maxPainDist: z.number(), // Distance from max pain strike

  // Time context
  minutesFromOpen: z.number().int(), // Minutes since 9:15 AM
  minutesToClose: z.number().int(), // Minutes until 3:30 PM
  dayOfWeek: z.number().int().min(1).max(7), // 1=Monday, 7=Sunday
});

export type MarketState1m = z.infer<typeof MarketState1mSchema>;

export const CREATE_TABLE_MARKET_STATE_1M = `
CREATE TABLE IF NOT EXISTS market_state_1m (
  timestamp TIMESTAMP,
  index_return_1m DOUBLE,
  index_trend_strength DOUBLE,
  index_volatility DOUBLE,
  advancers_ratio DOUBLE,
  decline_strength DOUBLE,
  sector_dispersion DOUBLE,
  fut_basis DOUBLE,
  fut_oi_change DOUBLE,
  atm_iv DOUBLE,
  atm_iv_change DOUBLE,
  pcr_oi DOUBLE,
  pcr_volume DOUBLE,
  max_pain_dist DOUBLE,
  minutes_from_open INT,
  minutes_to_close INT,
  day_of_week INT
) TIMESTAMP(timestamp) PARTITION BY DAY WAL;
`;

// ============================================
// TABLE 7: training_labels_1m
// Supervised learning labels
// ============================================

export const TrainingLabels1mSchema = z.object({
  timestamp: z.date(),
  horizonMinutes: z.number().int(), // Forward-looking horizon (e.g. 5, 15)
  label: z.number().int().min(-1).max(1), // -1 (down), 0 (neutral), +1 (up)
  futureReturn: z.number(), // Actual return at horizon
  atrThreshold: z.number(), // ATR used for labeling threshold
});

export type TrainingLabels1m = z.infer<typeof TrainingLabels1mSchema>;

export const CREATE_TABLE_TRAINING_LABELS_1M = `
CREATE TABLE IF NOT EXISTS training_labels_1m (
  timestamp TIMESTAMP,
  horizon_minutes INT,
  label BYTE,
  future_return DOUBLE,
  atr_threshold DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, horizon_minutes);
`;

// ============================================
// TABLE 8: system_audit
// Distributed tracing audit log
// ============================================

export const SystemAuditSchema = z.object({
  timestamp: z.date(),
  traceId: z.string(),
  service: z.string(),
  level: z.enum(["DEBUG", "INFO", "WARN", "ERROR", "FATAL"]),
  action: z.string(),
  userId: z.string().optional(),
  metadata: z.string(), // JSON string
});

export type SystemAudit = z.infer<typeof SystemAuditSchema>;

export const CREATE_TABLE_SYSTEM_AUDIT = `
CREATE TABLE IF NOT EXISTS system_audit (
  timestamp TIMESTAMP,
  trace_id SYMBOL CAPACITY 100000 INDEX,
  service SYMBOL CAPACITY 20,
  level SYMBOL CAPACITY 10,
  action SYMBOL CAPACITY 100,
  user_id SYMBOL CAPACITY 1000,
  metadata STRING
) TIMESTAMP(timestamp) PARTITION BY DAY WAL;
`;

// ============================================
// Export all CREATE TABLE statements
// ============================================

export const ALL_CREATE_TABLE_STATEMENTS = [
  CREATE_TABLE_INSTRUMENT_MASTER,
  CREATE_TABLE_MARKET_CANDLES,
  CREATE_TABLE_ORDERBOOK_L2_SNAPSHOTS,
  CREATE_TABLE_INSTRUMENT_FEATURES_1M,
  CREATE_TABLE_OPTION_CHAIN_SNAPSHOT,
  CREATE_TABLE_MARKET_STATE_1M,
  CREATE_TABLE_TRAINING_LABELS_1M,
  CREATE_TABLE_SYSTEM_AUDIT,
];

// ============================================
// Table name constants
// ============================================

export const QuestDBTables = {
  INSTRUMENT_MASTER: "instrument_master",
  MARKET_CANDLES: "market_candles",
  ORDERBOOK_L2_SNAPSHOTS: "orderbook_l2_snapshots",
  INSTRUMENT_FEATURES_1M: "instrument_features_1m",
  OPTION_CHAIN_SNAPSHOT: "option_chain_snapshot",
  MARKET_STATE_1M: "market_state_1m",
  TRAINING_LABELS_1M: "training_labels_1m",
  SYSTEM_AUDIT: "system_audit",
} as const;

// ============================================
// Helper types
// ============================================

export type QuestDBTableName =
  (typeof QuestDBTables)[keyof typeof QuestDBTables];

// Map of table names to their Zod schemas
export const TableSchemaMap = {
  [QuestDBTables.INSTRUMENT_MASTER]: InstrumentMasterSchema,
  [QuestDBTables.MARKET_CANDLES]: MarketCandleSchema,
  [QuestDBTables.ORDERBOOK_L2_SNAPSHOTS]: OrderbookL2SnapshotSchema,
  [QuestDBTables.INSTRUMENT_FEATURES_1M]: InstrumentFeatures1mSchema,
  [QuestDBTables.OPTION_CHAIN_SNAPSHOT]: OptionChainSnapshotSchema,
  [QuestDBTables.MARKET_STATE_1M]: MarketState1mSchema,
  [QuestDBTables.TRAINING_LABELS_1M]: TrainingLabels1mSchema,
  [QuestDBTables.SYSTEM_AUDIT]: SystemAuditSchema,
} as const;

// Map of table names to their TypeScript types
export type TableTypeMap = {
  [QuestDBTables.INSTRUMENT_MASTER]: InstrumentMaster;
  [QuestDBTables.MARKET_CANDLES]: MarketCandle;
  [QuestDBTables.ORDERBOOK_L2_SNAPSHOTS]: OrderbookL2Snapshot;
  [QuestDBTables.INSTRUMENT_FEATURES_1M]: InstrumentFeatures1m;
  [QuestDBTables.OPTION_CHAIN_SNAPSHOT]: OptionChainSnapshot;
  [QuestDBTables.MARKET_STATE_1M]: MarketState1m;
  [QuestDBTables.TRAINING_LABELS_1M]: TrainingLabels1m;
  [QuestDBTables.SYSTEM_AUDIT]: SystemAudit;
};
