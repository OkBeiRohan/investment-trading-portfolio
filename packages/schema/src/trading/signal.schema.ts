/**
 * Trading Signal Schemas
 * ML model predictions and confidence scores
 */

import { z } from "zod";
import { PredictionEnum } from "./enums";
import { mongoDocumentSchema, userScopedSchema, timestampSchema } from "./base";

// ============================================
// Model Contributions
// ============================================

export const modelContributionsSchema = z.object({
  xgboost: z.number(),
  cnnLstm: z.number(),
  ginn: z.number(),
  svm: z.number(),
});

export type ModelContributions = z.infer<typeof modelContributionsSchema>;

// ============================================
// Signal Metadata
// ============================================

export const signalMetadataSchema = z.object({
  modelVersions: z.record(z.string(), z.string()),
  latencyMs: z.number(),
});

export type SignalMetadata = z.infer<typeof signalMetadataSchema>;

// ============================================
// Trading Signal
// ============================================

export const tradingSignalSchema = mongoDocumentSchema
  .merge(userScopedSchema)
  .extend({
    timestamp: z.date(),
    prediction: PredictionEnum,
    confidence: z.number().min(0).max(1),
    probability: z.number().min(0).max(1),
    modelContributions: modelContributionsSchema,
    features: z.record(z.string(), z.unknown()),
    metadata: signalMetadataSchema.optional(),
  })
  .merge(timestampSchema);

export type TradingSignal = z.infer<typeof tradingSignalSchema>;

// ============================================
// Type Utilities
// ============================================

export type TradingSignalCreateInput = Omit<
  TradingSignal,
  "_id" | "createdAt" | "updatedAt"
>;

export type TradingSignalUpdateInput = Partial<
  Omit<TradingSignal, "_id" | "userId" | "createdAt" | "updatedAt">
>;
