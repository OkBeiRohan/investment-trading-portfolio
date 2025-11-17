/**
 * Performance Metrics Schemas
 * Trading performance analytics and statistics
 */

import { z } from "zod";
import { PeriodEnum } from "./enums";
import { mongoDocumentSchema, userScopedSchema, providerSchema } from "./base";

// ============================================
// Performance Metrics
// ============================================

export const metricsSchema = z.object({
  sharpeRatio: z.number(),
  sortinoRatio: z.number(),
  maxDrawdown: z.number(),
  calmarRatio: z.number(),
  totalReturn: z.number(),
  volatility: z.number(),
  winRate: z.number(),
  profitFactor: z.number(),
});

export type Metrics = z.infer<typeof metricsSchema>;

// ============================================
// Trade Statistics
// ============================================

export const tradeStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  avgWin: z.number(),
  avgLoss: z.number(),
});

export type TradeStats = z.infer<typeof tradeStatsSchema>;

// ============================================
// Cost Analysis
// ============================================

export const costAnalysisSchema = z.object({
  totalBrokerage: z.number(),
  totalSTT: z.number(),
  totalSlippage: z.number(),
  costsAsPercentOfPnL: z.number(),
});

export type CostAnalysis = z.infer<typeof costAnalysisSchema>;

// ============================================
// Performance Metrics Document
// ============================================

export const performanceMetricsSchema = mongoDocumentSchema
  .merge(userScopedSchema)
  .extend({
    period: PeriodEnum,
    startDate: z.date(),
    endDate: z.date(),
    metrics: metricsSchema,
    trades: tradeStatsSchema,
    costs: costAnalysisSchema,
    provider: z.string().optional(),
    createdAt: z.date(),
  });

export type PerformanceMetrics = z.infer<typeof performanceMetricsSchema>;

// ============================================
// Type Utilities
// ============================================

export type PerformanceMetricsCreateInput = Omit<PerformanceMetrics, "_id">;
