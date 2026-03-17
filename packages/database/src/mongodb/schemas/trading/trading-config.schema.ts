import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";
import type { IRiskLimits, ISegmentConfig, ITradingConfig } from "@repo/schema";

@Schema({ _id: false })
export class RiskLimits implements IRiskLimits {
  @Prop({ default: 50000 })
  maxDailyLoss: number;

  @Prop({ default: 10 })
  maxPositions: number;

  @Prop({ default: 1800 })
  maxOrderSize: number;

  @Prop({ default: 5 })
  maxDrawdownPercent: number;

  @Prop({ default: 1 })
  maxLeverageMultiple: number;
}

export const RiskLimitsSchema = SchemaFactory.createForClass(RiskLimits);

@Schema({ _id: false })
export class SegmentConfig implements ISegmentConfig {
  @Prop({ default: false })
  equity: boolean;

  @Prop({ default: true })
  fno: boolean;

  @Prop({ default: false })
  mcx: boolean;

  @Prop({ default: false })
  currency: boolean;
}

export const SegmentConfigSchema = SchemaFactory.createForClass(SegmentConfig);

@Schema({ timestamps: true, collection: "trading_configs" })
export class TradingConfig extends Document implements ITradingConfig {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ index: true })
  organizationId?: string;

  @Prop({ default: false })
  enabled: boolean;

  @Prop({ default: true })
  sandboxMode: boolean;

  @Prop({ default: true })
  dailyReAuthRequired: boolean;

  @Prop({ type: Date })
  lastReAuthAt?: Date;

  @Prop({ type: Date })
  reAuthExpiresAt?: Date;

  @Prop({ type: SegmentConfigSchema, default: () => ({}) })
  segments: SegmentConfig;

  @Prop({ type: RiskLimitsSchema, default: () => ({}) })
  riskLimits: RiskLimits;

  @Prop({ type: [String], default: [] })
  allowedInstruments: string[];

  @Prop({ type: [String], default: [] })
  blockedInstruments: string[];

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  strategyConfig: Record<string, any>;

  @Prop({ default: false })
  autoStartTrading: boolean;

  @Prop({ default: "09:15" })
  tradingStartTime: string;

  @Prop({ default: "15:30" })
  tradingEndTime: string;

  @Prop()
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const TradingConfigSchema =
  SchemaFactory.createForClass(TradingConfig);

TradingConfigSchema.index(
  { userId: 1, organizationId: 1 },
  { unique: true },
);
