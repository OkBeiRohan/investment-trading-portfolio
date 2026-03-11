/**
 * QuestDB Table Schemas - Production Grade v3.0
 * Unified schema with interval-based feature/label storage
 *
 * Design Principles:
 * 1. One unified raw table per data "shape"
 * 2. Interval-based storage (like market_candles) for features/labels
 * 3. Instrument identity matches Upstox instrument_key
 * 4. Time-series first (timestamp is king)
 * 5. Training must be reproducible from DB alone
 *
 * Tables (7 total):
 * 1. instrument_master - Instrument registry
 * 2. market_candles - OHLCV data
 * 3. orderbook_l2_snapshots - Order book depth
 * 4. tick_data - Live tick data
 * 5. option_chain_snapshot - Options with Greeks
 * 6. instrument_features - All ML features (1m + 1d)
 * 7. training_labels - All ML labels (1m + 1d)
 *
 * NOTE: SQL CREATE TABLE statements are in packages/schema/sql/schema/
 */

import { z } from "zod";

// ============================================
// TABLE 3: orderbook_l2_snapshots
// Level 2 order book snapshots
// ============================================

export const OrderbookL2SnapshotSchema = z.object({
  timestamp: z.date(),
  instrumentKey: z.string(),
  side: z.enum(["bid", "ask"]),
  level: z.number().int().min(1).max(30),
  price: z.number(),
  quantity: z.number(),
  orders: z.number().int().optional(),
});

export type OrderbookL2Snapshot = z.infer<typeof OrderbookL2SnapshotSchema>;

// ============================================
// TABLE 4: option_chain_snapshot
// Option chain with Greeks
// ============================================

export const OptionChainSnapshotSchema = z.object({
  timestamp: z.date(),
  underlyingKey: z.string(),
  instrumentKey: z.string(),
  expiry: z.date(),
  strike: z.number(),
  optionType: z.enum(["CE", "PE"]),
  lastPrice: z.number(),
  bidPrice: z.number(),
  askPrice: z.number(),
  bidQty: z.number().optional(),
  askQty: z.number().optional(),
  volume: z.number(),
  openInterest: z.number(),
  prevOi: z.number().nullable().optional(),
  closePrice: z.number().optional(),
  iv: z.number(),
  delta: z.number(),
  gamma: z.number(),
  vega: z.number(),
  theta: z.number(),
  pop: z.number().nullable().optional(),
});

export type OptionChainSnapshot = z.infer<typeof OptionChainSnapshotSchema>;

// ============================================
// TABLE 5: instrument_features (Unified)
// All ML features with interval-based storage
// ============================================

export const InstrumentFeaturesSchema = z.object({
  timestamp: z.date(),
  instrumentKey: z.string(),
  intervalValue: z.number().int(), // 1, 5, 15, 30, 60
  intervalUnit: z.enum(["minute", "day"]),

  // Index Breadth (8)
  pctStocksAboveVwap: z.number().optional(),
  pctStocksAboveEma20: z.number().optional(),
  weightedReturnTop10: z.number().optional(),
  advanceDeclineRatio: z.number().optional(),
  breadthMomentum5m: z.number().optional(),
  breadthVolatility: z.number().optional(),
  breadthThrust: z.number().optional(),
  newHighsLowsRatio: z.number().optional(),

  // Futures (12)
  futPriceVsVwap: z.number().optional(),
  futRangePosition: z.number().optional(),
  futReturn1m: z.number().optional(),
  futReturn5m: z.number().optional(),
  futReturn15m: z.number().optional(),
  futAtrPercent: z.number().optional(),
  futVolumeZscore: z.number().optional(),
  futOiChange: z.number().optional(),
  futOiChangePct: z.number().optional(),
  futRsi14: z.number().optional(),
  futMacd: z.number().optional(),
  futMacdSignal: z.number().optional(),

  // Options (14)
  atmIv: z.number().optional(),
  atmIvChange: z.number().optional(),
  ivSkew: z.number().optional(),
  ivTermStructure: z.number().optional(),
  gammaAtm: z.number().optional(),
  vegaAtm: z.number().optional(),
  thetaAtm: z.number().optional(),
  pcrOi: z.number().optional(),
  pcrVolume: z.number().optional(),
  maxPainDistance: z.number().optional(),
  totalGammaExposure: z.number().optional(),
  charmAtm: z.number().optional(),
  vannaAtm: z.number().optional(),
  ivPercentile30d: z.number().optional(),

  // Volatility (10)
  indiaVix: z.number().optional(),
  realizedVol5m: z.number().optional(),
  realizedVol15m: z.number().optional(),
  realizedVol20d: z.number().optional(),
  realizedVol60d: z.number().optional(),
  volExpansionRatio: z.number().optional(),
  ivRvRatio: z.number().optional(),
  vixPercentile30d: z.number().optional(),
  vixPercentile1yr: z.number().optional(),
  vixSma10: z.number().optional(),

  // Order Flow (8) - live only
  bidAskSpreadBps: z.number().optional(),
  depthImbalance5: z.number().optional(),
  ofi1s: z.number().optional(),
  ofi5s: z.number().optional(),
  ofi30s: z.number().optional(),
  tradeImbalance: z.number().optional(),
  bidSlope: z.number().optional(),
  askSlope: z.number().optional(),

  // Price Structure (8) - daily primarily
  close: z.number().optional(),
  return1d: z.number().optional(),
  return5d: z.number().optional(),
  return20d: z.number().optional(),
  rangeHl: z.number().optional(),
  gapOpen: z.number().optional(),
  closeVsHigh20d: z.number().optional(),
  closeVsLow20d: z.number().optional(),

  // Momentum (8)
  rsi14: z.number().optional(),
  rsi5: z.number().optional(),
  macd: z.number().optional(),
  macdSignal: z.number().optional(),
  macdHist: z.number().optional(),
  adx14: z.number().optional(),
  plusDi: z.number().optional(),
  minusDi: z.number().optional(),

  // Moving Averages (10)
  sma10: z.number().optional(),
  sma20: z.number().optional(),
  sma50: z.number().optional(),
  sma200: z.number().optional(),
  ema12: z.number().optional(),
  ema26: z.number().optional(),
  priceVsSma20: z.number().optional(),
  priceVsSma50: z.number().optional(),
  priceVsSma200: z.number().optional(),
  goldenCross: z.number().int().optional(),

  // Bollinger (2)
  bollingerWidth: z.number().optional(),
  bollingerPosition: z.number().optional(),

  // Volume (4)
  volumeSma20Ratio: z.number().optional(),
  volumeTrend: z.number().optional(),
  obvChange: z.number().optional(),
  accumulationDist: z.number().optional(),

  // Regime (4)
  trendStrength: z.number().optional(),
  meanReversionSignal: z.number().optional(),
  momentumRegime: z.number().int().optional(),
  volatilityRegime: z.number().int().optional(),

  // Time Context (9)
  minutesFromOpen: z.number().int().optional(),
  minutesToClose: z.number().int().optional(),
  dayOfWeek: z.number().int().optional(),
  monthOfYear: z.number().int().optional(),
  isExpiryDay: z.number().int().optional(),
  daysToExpiry: z.number().int().optional(),
  sessionPhase: z.number().int().optional(),
  isMonthEnd: z.boolean().optional(),
  isQuarterEnd: z.boolean().optional(),

  // Cyclical Time Encoding (4) - sin/cos transforms for neural networks
  timeSin: z.number().optional(), // sin(2π × minutes_from_open / 375)
  timeCos: z.number().optional(), // cos(2π × minutes_from_open / 375)
  dayOfWeekSin: z.number().optional(), // sin(2π × day_of_week / 5)
  dayOfWeekCos: z.number().optional(), // cos(2π × day_of_week / 5)

  // Global Macro (12) - for Tier 0 (Pre-Market) and Tier 1 (Macro Director)
  giftNiftyPremium: z.number().optional(), // GIFT Nifty LTP - prev NIFTY close
  sp500OvernightReturn: z.number().optional(), // S&P 500 futures overnight %
  nasdaqOvernightReturn: z.number().optional(), // Nasdaq 100 futures overnight %
  nikkeiReturn: z.number().optional(), // Nikkei 225 session return %
  ftseReturn: z.number().optional(), // FTSE 100 session return %
  brentCrudeChange: z.number().optional(), // Brent crude overnight % change
  wtiCrudeChange: z.number().optional(), // WTI crude overnight % change
  brentWtiSpread: z.number().optional(), // Brent - WTI price spread
  goldChange: z.number().optional(), // Gold overnight % change
  silverChange: z.number().optional(), // Silver overnight % change
  usdInrChange: z.number().optional(), // USD/INR overnight % change
  us10yYieldChange: z.number().optional(), // US 10Y Treasury yield change

  // Pre-Market (4) - computed at 9:08 AM from pre-open session
  actualGapPct: z.number().optional(), // (9:08 price - prev close) / prev close
  expectedOpeningVolatility: z.number().optional(), // Tier 0 model output
  preMarketBias: z.number().optional(), // -1 to 1 directional bias
  overnightNewsSentiment: z.number().optional(), // Aggregated overnight sentiment

  // Validity
  isValid: z.boolean().optional(),
  invalidReason: z.string().optional(),
  featureMode: z.enum(["HISTORICAL", "LIVE"]).optional(),
  computationLatencyUs: z.number().int().optional(),
  featureVersion: z.string().optional(),
});

export type InstrumentFeatures = z.infer<typeof InstrumentFeaturesSchema>;

// ============================================
// TABLE 6: training_labels (Unified)
// All ML labels with interval-based storage
// ============================================

export const TrainingLabelsSchema = z.object({
  timestamp: z.date(),
  instrumentKey: z.string(),
  intervalValue: z.number().int(),
  intervalUnit: z.enum(["minute", "day"]),

  // Regression Targets - Short Term
  targetReturn5m: z.number().optional(),
  targetReturn15m: z.number().optional(),
  targetReturn30m: z.number().optional(),
  targetReturn1h: z.number().optional(),
  targetReturnEod: z.number().optional(),

  // Regression Targets - Long Term
  targetReturn1d: z.number().optional(),
  targetReturn5d: z.number().optional(),
  targetReturn20d: z.number().optional(),

  // Volatility Targets
  targetVolatility5m: z.number().optional(),
  targetVolatility15m: z.number().optional(),
  targetMaxDrawdown5m: z.number().optional(),
  targetMaxRunup5m: z.number().optional(),
  targetVolatility5d: z.number().optional(),
  targetVolatility20d: z.number().optional(),
  targetMaxDrawdown5d: z.number().optional(),

  // Classification Targets
  targetDirection5m: z.number().int().optional(),
  targetDirection15m: z.number().int().optional(),
  targetDirection30m: z.number().int().optional(),
  targetDirection1d: z.number().int().optional(),
  targetDirection5d: z.number().int().optional(),
  targetDirection20d: z.number().int().optional(),

  // Regime Labels
  regimeLabel: z
    .enum([
      "TRENDING_UP",
      "TRENDING_DOWN",
      "RANGING",
      "VOLATILE",
      "BULL",
      "BEAR",
    ])
    .optional(),
  regimeConfidence: z.number().optional(),

  // Event Flags
  hadRegimeChange: z.boolean().optional(),
  hadSpikeEvent: z.boolean().optional(),
  hadGapEvent: z.boolean().optional(),
  hadCrash: z.boolean().optional(),
  hadRally: z.boolean().optional(),

  // Validity
  isValid: z.boolean().optional(),
  invalidReason: z.string().optional(),
  labelQuality: z.enum(["CLEAN", "NOISY", "OUTLIER"]).optional(),
});

export type TrainingLabels = z.infer<typeof TrainingLabelsSchema>;

// ============================================
// TABLE 1: instrument_master
// QuestDB instrument registry
// ============================================

export const InstrumentMasterSchema = z.object({
  instrumentKey: z.string(),
  exchange: z.string(),
  segment: z.string(),
  instrumentType: z.string(),
  tradingsymbol: z.string(),
  name: z.string(),
  expiry: z.date().nullable().optional(),
  strike: z.number().nullable().optional(),
  optionType: z.string().nullable().optional(),
  lotSize: z.number(),
  tickSize: z.number(),
  underlyingKey: z.string().nullable().optional(),
  isExpired: z.boolean(),
  lastUpdated: z.date(),
  // Extended fields
  isin: z.string().nullable().optional(),
  exchangeToken: z.string().nullable().optional(),
  underlyingSymbol: z.string().nullable().optional(),
  underlyingType: z.string().nullable().optional(),
  freezeQuantity: z.number().nullable().optional(),
  minimumLot: z.number().nullable().optional(),
  weekly: z.boolean().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type InstrumentMaster = z.infer<typeof InstrumentMasterSchema>;

// ============================================
// TABLE 2: market_candles
// QuestDB OHLCV with interval-based storage
// ============================================

export const MarketCandleSchema = z.object({
  timestamp: z.union([z.date(), z.string()]).transform((v) =>
    typeof v === "string" ? new Date(v) : v
  ),
  instrumentKey: z.string(),
  intervalValue: z.number().int(),
  intervalUnit: z.enum(["second", "minute", "hour", "day", "week", "month"]),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  openInterest: z.number().nullable().optional(),
});

export type MarketCandle = z.infer<typeof MarketCandleSchema>;

// ============================================

