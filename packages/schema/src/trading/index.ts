/**
 * Trading-specific Zod schemas
 * Shared across all market data providers
 */

import { z } from "zod";

// ============================================
// Re-export all trading schemas
// ============================================

export * from "./market-data.schema";
export * from "./portfolio.schema";
export * from "./websocket.schema";
export * from "./api.schema";

// ============================================
// Common Trading Enums
// ============================================

export const ExchangeEnum = z.enum([
  "NSE_EQ",
  "NSE_FO",
  "NSE_INDEX",
  "BSE_EQ",
  "BSE_FO",
  "MCX_FO",
  "NYSE",
  "NASDAQ",
  "CRYPTO",
]);
export type Exchange = z.infer<typeof ExchangeEnum>;

export const ProductTypeEnum = z.enum([
  "INTRADAY", // I
  "DELIVERY", // D
  "CARRYFORWARD", // CNC
  "MARGIN_INTRADAY", // MTF
]);
export type ProductType = z.infer<typeof ProductTypeEnum>;

export const TransactionTypeEnum = z.enum(["BUY", "SELL"]);
export type TransactionType = z.infer<typeof TransactionTypeEnum>;

export const OrderTypeEnum = z.enum([
  "MARKET",
  "LIMIT",
  "STOP_LOSS",
  "STOP_LOSS_MARKET",
]);
export type OrderType = z.infer<typeof OrderTypeEnum>;

export const ValidityEnum = z.enum([
  "DAY",
  "IOC", // Immediate or Cancel
  "GTC", // Good Till Cancelled
]);
export type Validity = z.infer<typeof ValidityEnum>;

export const OrderStatusEnum = z.enum([
  "PENDING",
  "OPEN",
  "COMPLETE",
  "CANCELLED",
  "REJECTED",
  "TRIGGER_PENDING",
  "PARTIALLY_FILLED",
]);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

export const InstrumentTypeEnum = z.enum([
  "EQUITY",
  "FUTURES",
  "OPTIONS",
  "CURRENCY",
  "COMMODITY",
  "INDEX",
  "CRYPTO",
]);
export type InstrumentType = z.infer<typeof InstrumentTypeEnum>;

export const OptionTypeEnum = z.enum(["CALL", "PUT"]);
export type OptionType = z.infer<typeof OptionTypeEnum>;

export const CandleIntervalEnum = z.enum([
  "1minute",
  "5minute",
  "15minute",
  "30minute",
  "1hour",
  "day",
  "week",
  "month",
]);
export type CandleInterval = z.infer<typeof CandleIntervalEnum>;

// ============================================
// Trading Signal Schema
// ============================================

export const tradingSignalSchema = z.object({
  _id: z.string().optional(),
  userId: z.string(),
  timestamp: z.date(),
  prediction: z.enum(["VOL_UP", "VOL_DOWN", "NEUTRAL"]),
  confidence: z.number().min(0).max(1),
  probability: z.number().min(0).max(1),
  modelContributions: z.object({
    xgboost: z.number(),
    cnnLstm: z.number(),
    ginn: z.number(),
    svm: z.number(),
  }),
  features: z.record(z.string(), z.unknown()),
  metadata: z
    .object({
      modelVersions: z.record(z.string(), z.string()),
      latencyMs: z.number(),
    })
    .optional(),
  createdAt: z.date(),
});

export type TradingSignal = z.infer<typeof tradingSignalSchema>;

// ============================================
// Order Schema
// ============================================

export const orderLegSchema = z.object({
  instrumentKey: z.string(),
  instrumentType: InstrumentTypeEnum.optional(),
  transactionType: TransactionTypeEnum,
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  orderType: OrderTypeEnum,
  triggerPrice: z.number().nonnegative().optional(),
  disclosedQuantity: z.number().nonnegative().optional(),
});

export const orderSchema = z.object({
  _id: z.string().optional(),
  orderId: z.string(),
  userId: z.string(),
  signalId: z.string().optional(), // Reference to trading signal
  strategy: z.string().optional(), // 'LONG_STRADDLE', 'IRON_CONDOR', etc.
  legs: z.array(
    z.object({
      instrument: z.string(),
      instrumentKey: z.string(),
      side: TransactionTypeEnum,
      quantity: z.number(),
      orderType: OrderTypeEnum,
      price: z.number().optional(),
      triggerPrice: z.number().optional(),
      status: OrderStatusEnum,
      filledQuantity: z.number(),
      averagePrice: z.number().optional(),
      filledAt: z.date().optional(),
    })
  ),
  status: OrderStatusEnum,
  totalCost: z.number(),
  provider: z.string(), // 'upstox', 'yahoo', 'binance'
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Order = z.infer<typeof orderSchema>;
export type OrderLeg = z.infer<typeof orderLegSchema>;

// ============================================
// Position Schema
// ============================================

export const positionSchema = z.object({
  _id: z.string().optional(),
  userId: z.string(),
  strategy: z.string().optional(),
  instrument: z.string(),
  instrumentKey: z.string(),
  exchange: ExchangeEnum,
  legs: z.array(
    z.object({
      instrument: z.string(),
      side: TransactionTypeEnum,
      quantity: z.number(),
      entryPrice: z.number(),
      currentPrice: z.number(),
      pnl: z.number(),
    })
  ),
  greeks: z
    .object({
      delta: z.number(),
      gamma: z.number(),
      vega: z.number(),
      theta: z.number(),
      rho: z.number().optional(),
    })
    .optional(),
  entryDate: z.date(),
  exitDate: z.date().optional(),
  status: z.enum(["OPEN", "CLOSED"]),
  realizedPnL: z.number().optional(),
  unrealizedPnL: z.number(),
  costs: z.object({
    brokerage: z.number(),
    stt: z.number(),
    slippage: z.number(),
    total: z.number(),
  }),
  provider: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Position = z.infer<typeof positionSchema>;

// ============================================
// Strategy Schema
// ============================================

export const strategySchema = z.object({
  _id: z.string().optional(),
  name: z.string(),
  type: z.enum([
    "LONG_STRADDLE",
    "SHORT_STRADDLE",
    "LONG_STRANGLE",
    "SHORT_STRANGLE",
    "IRON_CONDOR",
    "IRON_BUTTERFLY",
    "BULL_CALL_SPREAD",
    "BEAR_PUT_SPREAD",
    "BULL_PUT_SPREAD",
    "BEAR_CALL_SPREAD",
    "CALENDAR_SPREAD",
    "DIAGONAL_SPREAD",
  ]),
  description: z.string().optional(),
  legs: z.array(orderLegSchema),
  riskProfile: z.object({
    maxProfit: z.number(),
    maxLoss: z.number(),
    breakeven: z.array(z.number()),
    probabilityOfProfit: z.number().optional(),
  }),
  entryConditions: z
    .object({
      minConfidence: z.number(),
      maxVIX: z.number().optional(),
      minVIX: z.number().optional(),
      prediction: z.enum(["VOL_UP", "VOL_DOWN", "NEUTRAL"]).optional(),
    })
    .optional(),
  exitConditions: z
    .object({
      profitTarget: z.number().optional(),
      stopLoss: z.number().optional(),
      timeBasedExit: z.number().optional(), // Hours
    })
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Strategy = z.infer<typeof strategySchema>;

// ============================================
// Performance Metrics Schema
// ============================================

export const performanceMetricsSchema = z.object({
  _id: z.string().optional(),
  userId: z.string(),
  period: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  startDate: z.date(),
  endDate: z.date(),
  metrics: z.object({
    sharpeRatio: z.number(),
    sortinoRatio: z.number(),
    maxDrawdown: z.number(),
    calmarRatio: z.number(),
    totalReturn: z.number(),
    volatility: z.number(),
    winRate: z.number(),
    profitFactor: z.number(),
  }),
  trades: z.object({
    total: z.number(),
    wins: z.number(),
    losses: z.number(),
    avgWin: z.number(),
    avgLoss: z.number(),
  }),
  costs: z.object({
    totalBrokerage: z.number(),
    totalSTT: z.number(),
    totalSlippage: z.number(),
    costsAsPercentOfPnL: z.number(),
  }),
  provider: z.string().optional(),
  createdAt: z.date(),
});

export type PerformanceMetrics = z.infer<typeof performanceMetricsSchema>;

// ============================================
// RL Agent State Schema
// ============================================

export const rlAgentStateSchema = z.object({
  _id: z.string().optional(),
  agentType: z.enum(["DELTA_HEDGING", "OPTIMAL_EXECUTION"]),
  userId: z.string(),
  modelVersion: z.string(),
  stateSnapshot: z.object({
    weights: z.any().optional(), // Buffer or serialized weights
    qTable: z.record(z.string(), z.unknown()).optional(),
    experienceBuffer: z.array(z.unknown()).optional(),
    episodeCount: z.number(),
    epsilon: z.number(),
  }),
  performance: z.object({
    avgReward: z.number(),
    successRate: z.number(),
    lastEpisodeReward: z.number(),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RLAgentState = z.infer<typeof rlAgentStateSchema>;

// ============================================
// Feature Snapshot Schema (for MongoDB time-series)
// ============================================

export const featureSnapshotSchema = z.object({
  timestamp: z.date(),
  instrument: z.string(),
  features: z.object({
    // Underlying
    realizedVol5d: z.number().optional(),
    realizedVol10d: z.number().optional(),
    realizedVol20d: z.number().optional(),
    rsi14: z.number().optional(),
    macd: z
      .object({
        value: z.number(),
        signal: z.number(),
        histogram: z.number(),
      })
      .optional(),
    // Sentiment
    indiaVix: z.number().optional(),
    indiaVixMA5: z.number().optional(),
    pcrVolume: z.number().optional(),
    pcrOI: z.number().optional(),
    maxPain: z.number().optional(),
    // Options
    atmIV: z.number().optional(),
    volSkew: z.number().optional(),
    termStructure: z.number().optional(),
  }),
  metadata: z.object({
    dataQuality: z.enum(["good", "filled", "anomalous"]),
    missingFields: z.array(z.string()),
    version: z.string(),
  }),
});

export type FeatureSnapshot = z.infer<typeof featureSnapshotSchema>;
