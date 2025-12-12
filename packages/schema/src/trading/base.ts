/**
 * Base Trading Schemas
 * Reusable base schemas that other schemas extend from
 */

import { z } from "zod";
import {
  TransactionTypeEnum,
  OrderTypeEnum,
  InstrumentTypeEnum,
} from "./enums";

// ============================================
// Timestamp Tracking (Mixin)
// ============================================

export const timestampSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const optionalTimestampSchema = z.object({
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// ============================================
// MongoDB Document Base
// ============================================

export const mongoDocumentSchema = z.object({
  _id: z.string().optional(),
});

export const userScopedSchema = z.object({
  userId: z.string(),
});

// ============================================
// Instrument Base
// ============================================

export const baseInstrumentSchema = z.object({
  instrument: z.string(),
  instrumentKey: z.string(),
  instrumentType: InstrumentTypeEnum.optional(),
});

// ============================================
// Order Leg Base (reusable for orders and strategies)
// ============================================

export const baseOrderLegSchema = z.object({
  instrumentKey: z.string(),
  transactionType: TransactionTypeEnum,
  quantity: z.number().positive(),
  orderType: OrderTypeEnum,
  price: z.number().nonnegative().optional(),
  triggerPrice: z.number().nonnegative().optional(),
  disclosedQuantity: z.number().nonnegative().optional(),
});

export type BaseOrderLeg = z.infer<typeof baseOrderLegSchema>;

// ============================================
// Greeks Base (for options)
// ============================================

export const greeksSchema = z.object({
  delta: z.number(),
  gamma: z.number(),
  vega: z.number(),
  theta: z.number(),
  rho: z.number().optional(),
});

export type Greeks = z.infer<typeof greeksSchema>;

// ============================================
// Cost Breakdown Base
// ============================================

export const costBreakdownSchema = z.object({
  brokerage: z.number(),
  stt: z.number(),
  slippage: z.number(),
  total: z.number(),
});

export type CostBreakdown = z.infer<typeof costBreakdownSchema>;

// ============================================
// Risk Profile Base (for strategies)
// ============================================

export const riskProfileSchema = z.object({
  maxProfit: z.number(),
  maxLoss: z.number(),
  breakeven: z.array(z.number()),
  probabilityOfProfit: z.number().optional(),
});

export type RiskProfile = z.infer<typeof riskProfileSchema>;

// ============================================
// Provider Tracking
// ============================================

export const providerSchema = z.object({
  provider: z.string(), // 'upstox', 'yahoo', 'binance'
});
