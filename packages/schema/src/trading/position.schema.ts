/**
 * Position Schemas
 * Active and closed trading positions with P&L tracking
 */

import { z } from "zod";
import { ExchangeEnum, PositionStatusEnum, TransactionTypeEnum } from "./enums";
import {
  mongoDocumentSchema,
  userScopedSchema,
  timestampSchema,
  baseInstrumentSchema,
  greeksSchema,
  costBreakdownSchema,
  providerSchema,
} from "./base";

// ============================================
// Position Leg
// ============================================

export const positionLegSchema = z.object({
  instrument: z.string(),
  side: TransactionTypeEnum,
  quantity: z.number().positive(),
  entryPrice: z.number().nonnegative(),
  currentPrice: z.number().nonnegative(),
  pnl: z.number(),
});

export type PositionLeg = z.infer<typeof positionLegSchema>;

// ============================================
// Position
// ============================================

export const positionSchema = mongoDocumentSchema
  .merge(userScopedSchema)
  .merge(providerSchema)
  .merge(baseInstrumentSchema)
  .extend({
    exchange: ExchangeEnum,
    strategy: z.string().optional(),
    legs: z.array(positionLegSchema),
    greeks: greeksSchema.optional(),
    entryDate: z.date(),
    exitDate: z.date().optional(),
    status: PositionStatusEnum,
    realizedPnL: z.number().optional(),
    unrealizedPnL: z.number(),
    costs: costBreakdownSchema,
  })
  .merge(timestampSchema);

export type Position = z.infer<typeof positionSchema>;

// ============================================
// Type Utilities
// ============================================

export type PositionCreateInput = Omit<
  Position,
  "_id" | "createdAt" | "updatedAt"
>;

export type PositionUpdateInput = Partial<
  Omit<Position, "_id" | "userId" | "createdAt" | "updatedAt">
>;
