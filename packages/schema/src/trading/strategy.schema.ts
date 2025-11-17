/**
 * Strategy Schemas
 * Options strategy definitions and configurations
 */

import { z } from "zod";
import { StrategyTypeEnum, PredictionEnum } from "./enums";
import {
  mongoDocumentSchema,
  timestampSchema,
  baseOrderLegSchema,
  riskProfileSchema,
} from "./base";

// ============================================
// Strategy Entry Conditions
// ============================================

export const entryConditionsSchema = z.object({
  minConfidence: z.number().min(0).max(1),
  maxVIX: z.number().optional(),
  minVIX: z.number().optional(),
  prediction: PredictionEnum.optional(),
});

export type EntryConditions = z.infer<typeof entryConditionsSchema>;

// ============================================
// Strategy Exit Conditions
// ============================================

export const exitConditionsSchema = z.object({
  profitTarget: z.number().optional(),
  stopLoss: z.number().optional(),
  timeBasedExit: z.number().optional(), // Hours
});

export type ExitConditions = z.infer<typeof exitConditionsSchema>;

// ============================================
// Strategy
// ============================================

export const strategySchema = mongoDocumentSchema
  .extend({
    name: z.string(),
    type: StrategyTypeEnum,
    description: z.string().optional(),
    legs: z.array(baseOrderLegSchema),
    riskProfile: riskProfileSchema,
    entryConditions: entryConditionsSchema.optional(),
    exitConditions: exitConditionsSchema.optional(),
  })
  .merge(timestampSchema);

export type Strategy = z.infer<typeof strategySchema>;

// ============================================
// Type Utilities
// ============================================

export type StrategyCreateInput = Omit<
  Strategy,
  "_id" | "createdAt" | "updatedAt"
>;

export type StrategyUpdateInput = Partial<
  Omit<Strategy, "_id" | "createdAt" | "updatedAt">
>;
