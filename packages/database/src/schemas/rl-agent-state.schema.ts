/**
 * RL Agent State Schema for NestJS Mongoose
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { RLAgentState as IRLAgentState } from "@repo/schema";

export type RLAgentStateDocument = HydratedDocument<RLAgentState>;

class StateSnapshot {
  @Prop({ type: Object })
  weights?: any;

  @Prop({ type: Object })
  qTable?: Record<string, unknown>;

  @Prop({ type: [Object] })
  experienceBuffer?: unknown[];

  @Prop({ required: true })
  episodeCount: number;

  @Prop({ required: true })
  epsilon: number;
}

class Performance {
  @Prop({ required: true })
  avgReward: number;

  @Prop({ required: true })
  successRate: number;

  @Prop({ required: true })
  lastEpisodeReward: number;
}

@Schema({ timestamps: true, collection: "rl_agent_states" })
export class RLAgentState
  implements Omit<IRLAgentState, "_id" | "createdAt" | "updatedAt">
{
  @Prop({ required: true, enum: ["DELTA_HEDGING", "OPTIMAL_EXECUTION"] })
  agentType: "DELTA_HEDGING" | "OPTIMAL_EXECUTION";

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  modelVersion: string;

  @Prop({ type: StateSnapshot, required: true })
  stateSnapshot: StateSnapshot;

  @Prop({ type: Performance, required: true })
  performance: Performance;
}

export const RLAgentStateSchema = SchemaFactory.createForClass(RLAgentState);

// Compound indexes
RLAgentStateSchema.index({ agentType: 1, userId: 1, updatedAt: -1 });
