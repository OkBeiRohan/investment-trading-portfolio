/**
 * RL Agent State Schemas
 * Reinforcement learning agent configuration and state persistence
 */

import { z } from "zod";
import { RLAgentTypeEnum } from "./enums";
import { mongoDocumentSchema, userScopedSchema, timestampSchema } from "./base";

// ============================================
// RL State Snapshot
// ============================================

export const rlStateSnapshotSchema = z.object({
  weights: z.any().optional(), // Buffer or serialized weights
  qTable: z.record(z.string(), z.unknown()).optional(),
  experienceBuffer: z.array(z.unknown()).optional(),
  episodeCount: z.number().int().nonnegative(),
  epsilon: z.number().min(0).max(1),
});

export type RLStateSnapshot = z.infer<typeof rlStateSnapshotSchema>;

// ============================================
// RL Performance
// ============================================

export const rlPerformanceSchema = z.object({
  avgReward: z.number(),
  successRate: z.number().min(0).max(1),
  lastEpisodeReward: z.number(),
});

export type RLPerformance = z.infer<typeof rlPerformanceSchema>;

// ============================================
// RL Agent State
// ============================================

export const rlAgentStateSchema = mongoDocumentSchema
  .merge(userScopedSchema)
  .extend({
    agentType: RLAgentTypeEnum,
    modelVersion: z.string(),
    stateSnapshot: rlStateSnapshotSchema,
    performance: rlPerformanceSchema,
  })
  .merge(timestampSchema);

export type RLAgentState = z.infer<typeof rlAgentStateSchema>;

// ============================================
// Type Utilities
// ============================================

export type RLAgentStateCreateInput = Omit<
  RLAgentState,
  "_id" | "createdAt" | "updatedAt"
>;

export type RLAgentStateUpdateInput = Partial<
  Omit<RLAgentState, "_id" | "userId" | "agentType" | "createdAt" | "updatedAt">
>;
