/**
 * Trading Enums
 * Centralized enum definitions for all trading-related types
 */

import { z } from "zod";

// ============================================
// Exchange & Market
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

// ============================================
// Order & Transaction
// ============================================

export const TransactionTypeEnum = z.enum(["BUY", "SELL"]);
export type TransactionType = z.infer<typeof TransactionTypeEnum>;

export const OrderTypeEnum = z.enum([
  "MARKET",
  "LIMIT",
  "STOP_LOSS",
  "STOP_LOSS_MARKET",
]);
export type OrderType = z.infer<typeof OrderTypeEnum>;

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

export const ProductTypeEnum = z.enum([
  "INTRADAY", // I
  "DELIVERY", // D
  "CARRYFORWARD", // CNC
  "MARGIN_INTRADAY", // MTF
]);
export type ProductType = z.infer<typeof ProductTypeEnum>;

export const ValidityEnum = z.enum([
  "DAY",
  "IOC", // Immediate or Cancel
  "GTC", // Good Till Cancelled
]);
export type Validity = z.infer<typeof ValidityEnum>;

// ============================================
// Options
// ============================================

export const OptionTypeEnum = z.enum(["CALL", "PUT"]);
export type OptionType = z.infer<typeof OptionTypeEnum>;

// ============================================
// Market Data
// ============================================

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
// Trading Signals
// ============================================

export const PredictionEnum = z.enum(["VOL_UP", "VOL_DOWN", "NEUTRAL"]);
export type Prediction = z.infer<typeof PredictionEnum>;

// ============================================
// Position & Strategy
// ============================================

export const PositionStatusEnum = z.enum(["OPEN", "CLOSED"]);
export type PositionStatus = z.infer<typeof PositionStatusEnum>;

export const StrategyTypeEnum = z.enum([
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
]);
export type StrategyType = z.infer<typeof StrategyTypeEnum>;

// ============================================
// Performance & Analytics
// ============================================

export const PeriodEnum = z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);
export type Period = z.infer<typeof PeriodEnum>;

export const DataQualityEnum = z.enum(["good", "filled", "anomalous"]);
export type DataQuality = z.infer<typeof DataQualityEnum>;

// ============================================
// RL Agent
// ============================================

export const RLAgentTypeEnum = z.enum(["DELTA_HEDGING", "OPTIMAL_EXECUTION"]);
export type RLAgentType = z.infer<typeof RLAgentTypeEnum>;
