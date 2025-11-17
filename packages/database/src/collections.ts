/**
 * MongoDB Collection Models
 * Mongoose schemas for all trading collections
 */

import { Schema, model, Model } from "mongoose";
import type {
  TradingSignal,
  Order,
  Position,
  Strategy,
  PerformanceMetrics,
  RLAgentState,
  FeatureSnapshot,
} from "@repo/schema";

// ============================================
// Trading Signal Model
// ============================================

const tradingSignalSchema = new Schema<TradingSignal>(
  {
    userId: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    prediction: {
      type: String,
      enum: ["VOL_UP", "VOL_DOWN", "NEUTRAL"],
      required: true,
    },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    probability: { type: Number, required: true, min: 0, max: 1 },
    modelContributions: {
      xgboost: { type: Number, required: true },
      cnnLstm: { type: Number, required: true },
      ginn: { type: Number, required: true },
      svm: { type: Number, required: true },
    },
    features: { type: Schema.Types.Mixed, required: true },
    metadata: {
      modelVersions: { type: Map, of: String },
      latencyMs: Number,
    },
  },
  { timestamps: true }
);

// Indexes
tradingSignalSchema.index({ userId: 1, timestamp: -1 });
tradingSignalSchema.index({ prediction: 1, createdAt: -1 });

export const TradingSignalModel: Model<TradingSignal> = model<TradingSignal>(
  "TradingSignal",
  tradingSignalSchema
);

// ============================================
// Order Model
// ============================================

const orderSchema = new Schema<Order>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    signalId: { type: String, index: true },
    strategy: String,
    legs: [
      {
        instrument: String,
        instrumentKey: String,
        side: { type: String, enum: ["BUY", "SELL"] },
        quantity: Number,
        orderType: {
          type: String,
          enum: ["MARKET", "LIMIT", "STOP_LOSS", "STOP_LOSS_MARKET"],
        },
        price: Number,
        triggerPrice: Number,
        status: {
          type: String,
          enum: [
            "PENDING",
            "OPEN",
            "COMPLETE",
            "CANCELLED",
            "REJECTED",
            "TRIGGER_PENDING",
            "PARTIALLY_FILLED",
          ],
        },
        filledQuantity: Number,
        averagePrice: Number,
        filledAt: Date,
      },
    ],
    status: {
      type: String,
      enum: [
        "PENDING",
        "OPEN",
        "COMPLETE",
        "CANCELLED",
        "REJECTED",
        "TRIGGER_PENDING",
        "PARTIALLY_FILLED",
      ],
      required: true,
      index: true,
    },
    totalCost: Number,
    provider: { type: String, required: true },
  },
  { timestamps: true }
);

// Indexes
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, userId: 1 });
orderSchema.index({ provider: 1, createdAt: -1 });

export const OrderModel: Model<Order> = model<Order>("Order", orderSchema);

// ============================================
// Position Model
// ============================================

const positionSchema = new Schema<Position>(
  {
    userId: { type: String, required: true, index: true },
    strategy: String,
    instrument: String,
    instrumentKey: String,
    exchange: {
      type: String,
      enum: [
        "NSE_EQ",
        "NSE_FO",
        "NSE_INDEX",
        "BSE_EQ",
        "BSE_FO",
        "MCX_FO",
        "NYSE",
        "NASDAQ",
        "CRYPTO",
      ],
    },
    legs: [
      {
        instrument: String,
        side: { type: String, enum: ["BUY", "SELL"] },
        quantity: Number,
        entryPrice: Number,
        currentPrice: Number,
        pnl: Number,
      },
    ],
    greeks: {
      delta: Number,
      gamma: Number,
      vega: Number,
      theta: Number,
      rho: Number,
    },
    entryDate: { type: Date, required: true },
    exitDate: Date,
    status: {
      type: String,
      enum: ["OPEN", "CLOSED"],
      required: true,
      index: true,
    },
    realizedPnL: Number,
    unrealizedPnL: Number,
    costs: {
      brokerage: Number,
      stt: Number,
      slippage: Number,
      total: Number,
    },
    provider: String,
  },
  { timestamps: true }
);

// Indexes
positionSchema.index({ userId: 1, status: 1 });
positionSchema.index({ userId: 1, entryDate: -1 });

export const PositionModel: Model<Position> = model<Position>(
  "Position",
  positionSchema
);

// ============================================
// Strategy Model
// ============================================

const strategySchema = new Schema<Strategy>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: [
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
      ],
      required: true,
    },
    description: String,
    legs: [
      {
        instrumentKey: String,
        instrumentType: String,
        transactionType: { type: String, enum: ["BUY", "SELL"] },
        quantity: Number,
        price: Number,
        orderType: String,
        triggerPrice: Number,
        disclosedQuantity: Number,
      },
    ],
    riskProfile: {
      maxProfit: Number,
      maxLoss: Number,
      breakeven: [Number],
      probabilityOfProfit: Number,
    },
    entryConditions: {
      minConfidence: Number,
      maxVIX: Number,
      minVIX: Number,
      prediction: { type: String, enum: ["VOL_UP", "VOL_DOWN", "NEUTRAL"] },
    },
    exitConditions: {
      profitTarget: Number,
      stopLoss: Number,
      timeBasedExit: Number,
    },
  },
  { timestamps: true }
);

export const StrategyModel: Model<Strategy> = model<Strategy>(
  "Strategy",
  strategySchema
);

// ============================================
// Performance Metrics Model
// ============================================

const performanceMetricsSchema = new Schema<PerformanceMetrics>(
  {
    userId: { type: String, required: true, index: true },
    period: {
      type: String,
      enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    metrics: {
      sharpeRatio: Number,
      sortinoRatio: Number,
      maxDrawdown: Number,
      calmarRatio: Number,
      totalReturn: Number,
      volatility: Number,
      winRate: Number,
      profitFactor: Number,
    },
    trades: {
      total: Number,
      wins: Number,
      losses: Number,
      avgWin: Number,
      avgLoss: Number,
    },
    costs: {
      totalBrokerage: Number,
      totalSTT: Number,
      totalSlippage: Number,
      costsAsPercentOfPnL: Number,
    },
    provider: String,
  },
  { timestamps: true }
);

// Indexes
performanceMetricsSchema.index({ userId: 1, period: 1, startDate: -1 });

export const PerformanceMetricsModel: Model<PerformanceMetrics> =
  model<PerformanceMetrics>("PerformanceMetrics", performanceMetricsSchema);

// ============================================
// RL Agent State Model
// ============================================

const rlAgentStateSchema = new Schema<RLAgentState>(
  {
    agentType: {
      type: String,
      enum: ["DELTA_HEDGING", "OPTIMAL_EXECUTION"],
      required: true,
    },
    userId: { type: String, required: true, index: true },
    modelVersion: { type: String, required: true },
    stateSnapshot: {
      weights: Schema.Types.Mixed,
      qTable: { type: Map, of: Schema.Types.Mixed },
      experienceBuffer: [Schema.Types.Mixed],
      episodeCount: Number,
      epsilon: Number,
    },
    performance: {
      avgReward: Number,
      successRate: Number,
      lastEpisodeReward: Number,
    },
  },
  { timestamps: true }
);

// Indexes
rlAgentStateSchema.index({ agentType: 1, userId: 1, updatedAt: -1 });

export const RLAgentStateModel: Model<RLAgentState> = model<RLAgentState>(
  "RLAgentState",
  rlAgentStateSchema
);

// ============================================
// Feature Snapshot Model (Time-Series)
// ============================================

const featureSnapshotSchema = new Schema<FeatureSnapshot>({
  timestamp: { type: Date, required: true },
  instrument: { type: String, required: true },
  features: {
    realizedVol5d: Number,
    realizedVol10d: Number,
    realizedVol20d: Number,
    rsi14: Number,
    macd: {
      value: Number,
      signal: Number,
      histogram: Number,
    },
    indiaVix: Number,
    indiaVixMA5: Number,
    pcrVolume: Number,
    pcrOI: Number,
    maxPain: Number,
    atmIV: Number,
    volSkew: Number,
    termStructure: Number,
  },
  metadata: {
    dataQuality: {
      type: String,
      enum: ["good", "filled", "anomalous"],
      required: true,
    },
    missingFields: [String],
    version: String,
  },
});

// This should be a time-series collection in production
featureSnapshotSchema.index({ instrument: 1, timestamp: -1 });

export const FeatureSnapshotModel: Model<FeatureSnapshot> =
  model<FeatureSnapshot>("FeatureSnapshot", featureSnapshotSchema);

// ============================================
// Export all models
// ============================================

export const collections = {
  tradingSignals: TradingSignalModel,
  orders: OrderModel,
  positions: PositionModel,
  strategies: StrategyModel,
  performanceMetrics: PerformanceMetricsModel,
  rlAgentStates: RLAgentStateModel,
  featureSnapshots: FeatureSnapshotModel,
};
