/**
 * Performance Metrics Schema for NestJS Mongoose
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { PerformanceMetrics as IPerformanceMetrics } from "@repo/schema";

export type PerformanceMetricsDocument = HydratedDocument<PerformanceMetrics>;

class Metrics {
  @Prop()
  sharpeRatio?: number;

  @Prop()
  sortinoRatio?: number;

  @Prop()
  maxDrawdown?: number;

  @Prop()
  calmarRatio?: number;

  @Prop()
  totalReturn?: number;

  @Prop()
  volatility?: number;

  @Prop()
  winRate?: number;

  @Prop()
  profitFactor?: number;
}

class Trades {
  @Prop()
  total?: number;

  @Prop()
  wins?: number;

  @Prop()
  losses?: number;

  @Prop()
  avgWin?: number;

  @Prop()
  avgLoss?: number;
}

class Costs {
  @Prop()
  totalBrokerage?: number;

  @Prop()
  totalSTT?: number;

  @Prop()
  totalSlippage?: number;

  @Prop()
  costsAsPercentOfPnL?: number;
}

@Schema({ timestamps: true, collection: "performance_metrics" })
export class PerformanceMetrics
  implements Omit<IPerformanceMetrics, "_id" | "createdAt">
{
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] })
  period: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ type: Metrics })
  metrics?: Metrics;

  @Prop({ type: Trades })
  trades?: Trades;

  @Prop({ type: Costs })
  costs?: Costs;

  @Prop()
  provider?: string;
}

export const PerformanceMetricsSchema =
  SchemaFactory.createForClass(PerformanceMetrics);

// Compound indexes
PerformanceMetricsSchema.index({ userId: 1, period: 1, startDate: -1 });
