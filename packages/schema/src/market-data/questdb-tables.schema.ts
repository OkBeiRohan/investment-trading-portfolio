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
// TABLE 7: tft_sequence_data
// Stores time-series sequences for TFT model
// ============================================

export const tftSequenceDataSchema = z.object({
  timestamp: z.number(),
  indexReturn: z.number(),
  indexRealizedVol: z.number(),
  breadthScore: z.number(),
  futReturn: z.number(),
  futVolume: z.number(),
  atmIv: z.number(),
  ivChange: z.number(),
});

export type TFTSequenceData = z.infer<typeof tftSequenceDataSchema>;

export const CREATE_TABLE_TFT_SEQUENCE_DATA = `
CREATE TABLE IF NOT EXISTS tft_sequence_data (
  timestamp TIMESTAMP,
  indexReturn DOUBLE,
  indexRealizedVol DOUBLE,
  breadthScore DOUBLE,
  futReturn DOUBLE,
  futVolume LONG,
  atmIv DOUBLE,
  ivChange DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY;
`;

// ============================================
// TABLE 8: lit_lob_snapshots
// Stores raw LOB snapshots for LiT model
// ============================================

export const litLobSnapshotSchema = z.object({
  timestamp: z.number(),

  // Serialized 20-level bid/ask data
  bids: z.string(), // JSON array of {price, quantity}
  asks: z.string(), // JSON array of {price, quantity}

  // Snapshot ID for sequence tracking
  snapshotId: z.number(), // Auto-incrementing
});

export type LiTLOBSnapshot = z.infer<typeof litLobSnapshotSchema>;

export const CREATE_TABLE_LIT_LOB_SNAPSHOTS = `
CREATE TABLE IF NOT EXISTS lit_lob_snapshots (
  timestamp TIMESTAMP,
  bids STRING,
  asks STRING,
  snapshotId LONG
) TIMESTAMP(timestamp) PARTITION BY DAY;
`;

// ============================================
// TABLE 9: model_predictions_detailed
// Stores individual model predictions with full output
// ============================================

// LightGBM predictions
export const lightgbmPredictionSchema = z.object({
  timestamp: z.number(),
  pUp: z.number(),
  pNeutral: z.number(),
  pDown: z.number(),
  inferenceTimeMs: z.number(),
  modelVersion: z.string().max(20),
});

export type LightGBMPrediction = z.infer<typeof lightgbmPredictionSchema>;

export const CREATE_TABLE_LIGHTGBM_PREDICTIONS = `
CREATE TABLE IF NOT EXISTS lightgbm_predictions (
  timestamp TIMESTAMP,
  pUp DOUBLE,
  pNeutral DOUBLE,
  pDown DOUBLE,
  inferenceTimeMs DOUBLE,
  modelVersion STRING
) TIMESTAMP(timestamp) PARTITION BY DAY;
`;

// TFT predictions
export const tftPredictionSchema = z.object({
  timestamp: z.number(),
  expectedHigh: z.number(),
  expectedLow: z.number(),
  expectedRange: z.number(),
  regime: z.string().max(10), // SYMBOL
  confidence: z.number(),
  inferenceTimeMs: z.number(),
  modelVersion: z.string().max(20),
});

export type TFTPrediction = z.infer<typeof tftPredictionSchema>;

export const CREATE_TABLE_TFT_PREDICTIONS = `
CREATE TABLE IF NOT EXISTS tft_predictions (
  timestamp TIMESTAMP,
  expectedHigh DOUBLE,
  expectedLow DOUBLE,
  expectedRange DOUBLE,
  regime SYMBOL,
  confidence DOUBLE,
  inferenceTimeMs DOUBLE,
  modelVersion STRING
) TIMESTAMP(timestamp) PARTITION BY DAY;
`;

// LiT predictions
export const litPredictionSchema = z.object({
  timestamp: z.number(),
  microUpProb: z.number(),
  microDownProb: z.number(),
  microFlatProb: z.number(),
  inferenceTimeMs: z.number(),
  modelVersion: z.string().max(20),
});

export type LiTPrediction = z.infer<typeof litPredictionSchema>;

export const CREATE_TABLE_LIT_PREDICTIONS = `
CREATE TABLE IF NOT EXISTS lit_predictions (
  timestamp TIMESTAMP,
  microUpProb DOUBLE,
  microDownProb DOUBLE,
  microFlatProb DOUBLE,
  inferenceTimeMs DOUBLE,
  modelVersion STRING
) TIMESTAMP(timestamp) PARTITION BY DAY;
`;

// Meta-Learner predictions
export const metaLearnerPredictionSchema = z.object({
  timestamp: z.number(),
  finalDirection: z.string().max(10), // SYMBOL
  confidenceScore: z.number(),
  tradeAllowed: z.boolean(),
  reason: z.string(),
  inferenceTimeMs: z.number(),
  modelVersion: z.string().max(20),
});

export type MetaLearnerPrediction = z.infer<typeof metaLearnerPredictionSchema>;

export const CREATE_TABLE_META_LEARNER_PREDICTIONS = `
CREATE TABLE IF NOT EXISTS meta_learner_predictions (
  timestamp TIMESTAMP,
  finalDirection SYMBOL,
  confidenceScore DOUBLE,
  tradeAllowed BOOLEAN,
  reason STRING,
  inferenceTimeMs DOUBLE,
  modelVersion STRING
) TIMESTAMP(timestamp) PARTITION BY DAY;
`;

// Strike Selector outputs
export const strikeSelectorOutputTableSchema = z.object({
  timestamp: z.number(),
  selectedStrike: z.number(),
  optionType: z.string().max(2), // SYMBOL
  lotCount: z.number(),
  expectedRR: z.number(),
  netDelta: z.number(),
  netGamma: z.number(),
  totalCost: z.number(),
  maxLoss: z.number(),
  computationTimeMs: z.number(),
});

export type StrikeSelectorOutputTable = z.infer<
  typeof strikeSelectorOutputTableSchema
>;

export const CREATE_TABLE_STRIKE_SELECTOR_OUTPUTS = `
CREATE TABLE IF NOT EXISTS strike_selector_outputs (
  timestamp TIMESTAMP,
  selectedStrike DOUBLE,
  optionType SYMBOL,
  lotCount INT,
  expectedRR DOUBLE,
  netDelta DOUBLE,
  netGamma DOUBLE,
  totalCost DOUBLE,
  maxLoss DOUBLE,
  computationTimeMs DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY;
`;

// PPO Execution decisions
export const ppoExecutionOutputTableSchema = z.object({
  timestamp: z.number(),
  limitPriceOffset: z.number(),
  sliceQty: z.number(),
  waitOrExecute: z.string().max(10), // SYMBOL
  inferenceTimeMs: z.number(),
  modelVersion: z.string().max(20),
});

export type PPOExecutionOutputTable = z.infer<
  typeof ppoExecutionOutputTableSchema
>;

export const CREATE_TABLE_PPO_EXECUTION_OUTPUTS = `
CREATE TABLE IF NOT EXISTS ppo_execution_outputs (
  timestamp TIMESTAMP,
  limitPriceOffset DOUBLE,
  sliceQty DOUBLE,
  waitOrExecute SYMBOL,
  inferenceTimeMs DOUBLE,
  modelVersion STRING
) TIMESTAMP(timestamp) PARTITION BY DAY;
`;

// Exit Manager decisions
export const exitManagerOutputTableSchema = z.object({
  timestamp: z.number(),
  action: z.string().max(20), // SYMBOL
  exitQty: z.number().optional(),
  reason: z.string(),
  newDirection: z.string().max(10).optional(), // SYMBOL
  computationTimeMs: z.number(),
});

export type ExitManagerOutputTable = z.infer<
  typeof exitManagerOutputTableSchema
>;

export const CREATE_TABLE_EXIT_MANAGER_OUTPUTS = `
CREATE TABLE IF NOT EXISTS exit_manager_outputs (
  timestamp TIMESTAMP,
  action SYMBOL,
  exitQty DOUBLE,
  reason STRING,
  newDirection SYMBOL,
  computationTimeMs DOUBLE
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
  CREATE_TABLE_TFT_SEQUENCE_DATA,
  CREATE_TABLE_LIT_LOB_SNAPSHOTS,
  CREATE_TABLE_LIGHTGBM_PREDICTIONS,
  CREATE_TABLE_TFT_PREDICTIONS,
  CREATE_TABLE_LIT_PREDICTIONS,
  CREATE_TABLE_META_LEARNER_PREDICTIONS,
  CREATE_TABLE_STRIKE_SELECTOR_OUTPUTS,
  CREATE_TABLE_PPO_EXECUTION_OUTPUTS,
  CREATE_TABLE_EXIT_MANAGER_OUTPUTS,
];
