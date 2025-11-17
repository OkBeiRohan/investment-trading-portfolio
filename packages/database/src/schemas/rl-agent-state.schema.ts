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

  @Prop({ type: Map, of: Object })
  qTable?: Map<string, any>;

  @Prop({ type: [Object] })
  experienceBuffer?: any[];

  @Prop()
  episodeCount?: number;

  @Prop()
  epsilon?: number;
}

class Performance {
  @Prop()
  avgReward?: number;

  @Prop()
  successRate?: number;

  @Prop()
  lastEpisodeReward?: number;
}

@Schema({ timestamps: true, collection: "rl_agent_states" })
export class RLAgentState
  implements Omit<IRLAgentState, "_id" | "createdAt" | "updatedAt">
{
  @Prop({ required: true, enum: ["DELTA_HEDGING", "OPTIMAL_EXECUTION"] })
  agentType: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  modelVersion: string;

  @Prop({ type: StateSnapshot })
  stateSnapshot?: StateSnapshot;

  @Prop({ type: Performance })
  performance?: Performance;
}

export const RLAgentStateSchema = SchemaFactory.createForClass(RLAgentState);

// Compound indexes
RLAgentStateSchema.index({ agentType: 1, userId: 1, updatedAt: -1 });
