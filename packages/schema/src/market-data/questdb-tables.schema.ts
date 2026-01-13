/**
 * QuestDB Table Schemas
 * Time-series storage for training and backtesting
 */

import { z } from "zod";

// ============================================
// TABLE 1: raw_market_data_future
// Stores NIFTY Future ticks
// ============================================

export const rawMarketDataFutureSchema = z.object({
  timestamp: z.number(), // TIMESTAMP (designated timestamp column)
  symbol: z.string().max(50), // SYMBOL

  // Price OHLCV
  ltp: z.number(), // DOUBLE
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(), // LONG

  // Derivatives
  openInterest: z.number(), // LONG
  oiChange: z.number(), // LONG

  // LOB (top 20 levels serialized as JSON or separate columns)
  bids: z.string(), // STRING (JSON array)
  asks: z.string(), // STRING (JSON array)

  // Trade
  lastTradePrice: z.number().optional(),
  lastTradeQty: z.number().optional(),
  lastTradeTime: z.number().optional(),
});

export type RawMarketDataFuture = z.infer<typeof rawMarketDataFutureSchema>;

// QuestDB CREATE TABLE statement
export const CREATE_TABLE_RAW_MARKET_DATA_FUTURE = `
CREATE TABLE IF NOT EXISTS raw_market_data_future (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  ltp DOUBLE,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume LONG,
  openInterest LONG,
  oiChange LONG,
  bids STRING,
  asks STRING,
  lastTradePrice DOUBLE,
  lastTradeQty DOUBLE,
  lastTradeTime TIMESTAMP
) TIMESTAMP(timestamp) PARTITION BY DAY;
`;

// ============================================
// TABLE 2: raw_market_data_constituents
// Stores 50 constituent ticks
// ============================================

export const rawMarketDataConstituentSchema = z.object({
  timestamp: z.number(),
  symbol: z.string().max(50), // SYMBOL (one of 50 stocks)

  // OHLCV
  ltp: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),

  // LOB (serialized)
  bids: z.string(),
  asks: z.string(),

  // Broker-calculated
  vwap: z.number(),
  totalBuyQty: z.number(),
  totalSellQty: z.number(),
});

export type RawMarketDataConstituent = z.infer<
  typeof rawMarketDataConstituentSchema
>;

export const CREATE_TABLE_RAW_MARKET_DATA_CONSTITUENTS = `
CREATE TABLE IF NOT EXISTS raw_market_data_constituents (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  ltp DOUBLE,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume LONG,
  bids STRING,
  asks STRING,
  vwap DOUBLE,
  totalBuyQty LONG,
  totalSellQty LONG
) TIMESTAMP(timestamp) PARTITION BY DAY;
`;

// ============================================
// TABLE 3: raw_market_data_options
// Stores option chain ticks (ATM ± 10 strikes)
// ============================================

export const rawMarketDataOptionSchema = z.object({
  timestamp: z.number(),
  symbol: z.string().max(50), // e.g., "NIFTY24JAN21000CE"
  strikePrice: z.number(),
  optionType: z.string().max(2), // CE or PE (SYMBOL)
  expiryDate: z.string().max(10), // YYYY-MM-DD

  // Price
  ltp: z.number(),
  bid: z.number(),
  ask: z.number(),
  bidQty: z.number(),
  askQty: z.number(),

  // LOB (serialized)
  bids: z.string(),
  asks: z.string(),

  // Greeks
  iv: z.number(),
  delta: z.number(),
  gamma: z.number(),
  vega: z.number(),
  theta: z.number(),

  // OI & Volume
  openInterest: z.number(),
  oiChange: z.number(),
  volume: z.number(),
  volumeChange: z.number().optional(),
});

export type RawMarketDataOption = z.infer<typeof rawMarketDataOptionSchema>;

export const CREATE_TABLE_RAW_MARKET_DATA_OPTIONS = `
CREATE TABLE IF NOT EXISTS raw_market_data_options (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  strikePrice DOUBLE,
  optionType SYMBOL,
  expiryDate STRING,
  ltp DOUBLE,
  bid DOUBLE,
  ask DOUBLE,
  bidQty LONG,
  askQty LONG,
  bids STRING,
  asks STRING,
  iv DOUBLE,
  delta DOUBLE,
  gamma DOUBLE,
  vega DOUBLE,
  theta DOUBLE,
  openInterest LONG,
  oiChange LONG,
  volume LONG,
  volumeChange LONG
) TIMESTAMP(timestamp) PARTITION BY DAY;
`;

// ============================================
// TABLE 4: market_state_encoder_output
// Stores MSE compressed state (for training)
// ============================================

export const marketStateEncoderOutputSchema = z.object({
  timestamp: z.number(),

  // Macro State (6 columns)
  pctStocksAboveVwap: z.number(),
  pctStocksAboveEma20: z.number(),
  weightedReturnTop10: z.number(),
  advanceDeclineRatio: z.number(),
  breadthMomentum5m: z.number(),
  breadthVolatility: z.number(),

  // Micro State (7 columns)
  futPriceVsVwap: z.number(),
  futRangePosition: z.number(),
  futReturn1m: z.number(),
  futReturn5m: z.number(),
  futAtrPercent: z.number(),
  futVolumeZscore: z.number(),
  futOiChange: z.number(),

  // Volatility State (11 columns)
  atmIv: z.number(),
  atmIvChange: z.number(),
  ivSkew: z.number(),
  gammaAtm: z.number(),
  vegaAtm: z.number(),
  thetaAtm: z.number(),
  pcrOi: z.number(),
  pcrVolume: z.number(),
  maxPainDistance: z.number(),
  indiaVix: z.number(),
  realizedVol5m: z.number(),
  volExpansionRatio: z.number(),

  // Execution State (4 columns)
  futBidAskSpread: z.number(),
  futBidAskSpreadBps: z.number(),
  futLobImbalance: z.number(),
  futLobDepth: z.number(),

  // Time Context (3 columns)
  minutesFromOpen: z.number(),
  minutesToClose: z.number(),
  dayOfWeek: z.number(),

  // Metadata
  computationTimeMs: z.number(),
  dataQuality: z.string().max(10), // SYMBOL (high, medium, low)
});

export type MarketStateEncoderOutput = z.infer<
  typeof marketStateEncoderOutputSchema
>;

export const CREATE_TABLE_MARKET_STATE_ENCODER_OUTPUT = `
CREATE TABLE IF NOT EXISTS market_state_encoder_output (
  timestamp TIMESTAMP,
  pctStocksAboveVwap DOUBLE,
  pctStocksAboveEma20 DOUBLE,
  weightedReturnTop10 DOUBLE,
  advanceDeclineRatio DOUBLE,
  breadthMomentum5m DOUBLE,
  breadthVolatility DOUBLE,
  futPriceVsVwap DOUBLE,
  futRangePosition DOUBLE,
  futReturn1m DOUBLE,
  futReturn5m DOUBLE,
  futAtrPercent DOUBLE,
  futVolumeZscore DOUBLE,
  futOiChange DOUBLE,
  atmIv DOUBLE,
  atmIvChange DOUBLE,
  ivSkew DOUBLE,
  gammaAtm DOUBLE,
  vegaAtm DOUBLE,
  thetaAtm DOUBLE,
  pcrOi DOUBLE,
  pcrVolume DOUBLE,
  maxPainDistance DOUBLE,
  indiaVix DOUBLE,
  realizedVol5m DOUBLE,
  volExpansionRatio DOUBLE,
  futBidAskSpread DOUBLE,
  futBidAskSpreadBps DOUBLE,
  futLobImbalance DOUBLE,
  futLobDepth DOUBLE,
  minutesFromOpen INT,
  minutesToClose INT,
  dayOfWeek INT,
  computationTimeMs DOUBLE,
  dataQuality SYMBOL
) TIMESTAMP(timestamp) PARTITION BY DAY;
`;

// ============================================
// TABLE 5: model_predictions
// Stores model outputs for analysis
// ============================================

export const modelPredictionsSchema = z.object({
  timestamp: z.number(),
  modelName: z.string().max(50), // SYMBOL (lightgbm, tft, lit, meta_learner)
  modelVersion: z.string().max(20),

  // Generic prediction output (JSON)
  prediction: z.string(), // STRING (JSON serialized)

  // Metadata
  inferenceTimeMs: z.number(),
});

export type ModelPredictions = z.infer<typeof modelPredictionsSchema>;

export const CREATE_TABLE_MODEL_PREDICTIONS = `
CREATE TABLE IF NOT EXISTS model_predictions (
  timestamp TIMESTAMP,
  modelName SYMBOL,
  modelVersion STRING,
  prediction STRING,
  inferenceTimeMs DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY;
`;

// ============================================
// TABLE 6: training_labels
// Stores ground truth labels for training
// ============================================

export const trainingLabelsSchema = z.object({
  timestamp: z.number(),

  // Future returns (for directional models)
  return5m: z.number(),
  return15m: z.number(),
  return30m: z.number(),
  return60m: z.number(),

  // Direction labels (for classification)
  direction5m: z.string().max(10), // SYMBOL (up, down, neutral)
  direction15m: z.string().max(10),

  // Regime labels (for TFT)
  regime: z.string().max(10), // SYMBOL (trend, range, chop)

  // Max excursion (for strike selection)
  maxMoveUp5m: z.number(),
  maxMoveDown5m: z.number(),

  // LOB labels (for LiT)
  nextMicroMove: z.string().max(10), // SYMBOL (up, down, flat)
});

export type TrainingLabels = z.infer<typeof trainingLabelsSchema>;

export const CREATE_TABLE_TRAINING_LABELS = `
CREATE TABLE IF NOT EXISTS training_labels (
  timestamp TIMESTAMP,
  return5m DOUBLE,
  return15m DOUBLE,
  return30m DOUBLE,
  return60m DOUBLE,
  direction5m SYMBOL,
  direction15m SYMBOL,
  regime SYMBOL,
  maxMoveUp5m DOUBLE,
  maxMoveDown5m DOUBLE,
  nextMicroMove SYMBOL
) TIMESTAMP(timestamp) PARTITION BY DAY;
`;

// ============================================
// All table creation statements
// ============================================

export const ALL_TABLE_CREATION_STATEMENTS = [
  CREATE_TABLE_RAW_MARKET_DATA_FUTURE,
  CREATE_TABLE_RAW_MARKET_DATA_CONSTITUENTS,
  CREATE_TABLE_RAW_MARKET_DATA_OPTIONS,
  CREATE_TABLE_MARKET_STATE_ENCODER_OUTPUT,
  CREATE_TABLE_MODEL_PREDICTIONS,
  CREATE_TABLE_TRAINING_LABELS,
];
