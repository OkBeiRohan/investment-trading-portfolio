/**
 * Performance Metrics Schema for NestJS Mongoose
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { PerformanceMetrics as IPerformanceMetrics } from "@repo/schema";

export type PerformanceMetricsDocument = HydratedDocument<PerformanceMetrics>;

class Metrics {
  @Prop({ required: true })
  sharpeRatio: number;

  @Prop({ required: true })
  sortinoRatio: number;

  @Prop({ required: true })
  maxDrawdown: number;

  @Prop({ required: true })
  calmarRatio: number;

  @Prop({ required: true })
  totalReturn: number;

  @Prop({ required: true })
  volatility: number;

  @Prop({ required: true })
  winRate: number;

  @Prop({ required: true })
  profitFactor: number;
}

class Trades {
  @Prop({ required: true })
  total: number;

  @Prop({ required: true })
  wins: number;

  @Prop({ required: true })
  losses: number;

  @Prop({ required: true })
  avgWin: number;

  @Prop({ required: true })
  avgLoss: number;
}

class Costs {
  @Prop({ required: true })
  totalBrokerage: number;

  @Prop({ required: true })
  totalSTT: number;

  @Prop({ required: true })
  totalSlippage: number;

  @Prop({ required: true })
  costsAsPercentOfPnL: number;
}

@Schema({ timestamps: true, collection: "performance_metrics" })
export class PerformanceMetrics
  implements Omit<IPerformanceMetrics, "_id" | "createdAt">
{
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] })
  period: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ type: Metrics, required: true })
  metrics: Metrics;

  @Prop({ type: Trades, required: true })
  trades: Trades;

  @Prop({ type: Costs, required: true })
  costs: Costs;

  @Prop()
  provider?: string;
}

export const PerformanceMetricsSchema =
  SchemaFactory.createForClass(PerformanceMetrics);

// Compound indexes
PerformanceMetricsSchema.index({ userId: 1, period: 1, startDate: -1 });
