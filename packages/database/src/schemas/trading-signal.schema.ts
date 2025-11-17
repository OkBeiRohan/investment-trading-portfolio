/**
 * Trading Signal Schema for NestJS Mongoose
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { TradingSignal as ITradingSignal } from "@repo/schema";

export type TradingSignalDocument = HydratedDocument<TradingSignal>;

@Schema({ timestamps: true, collection: "trading_signals" })
export class TradingSignal
  implements Omit<ITradingSignal, "_id" | "createdAt" | "updatedAt">
{
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  timestamp: Date;

  @Prop({ required: true, enum: ["VOL_UP", "VOL_DOWN", "NEUTRAL"] })
  prediction: "VOL_UP" | "VOL_DOWN" | "NEUTRAL";

  @Prop({ required: true, min: 0, max: 1 })
  confidence: number;

  @Prop({ required: true, min: 0, max: 1 })
  probability: number;

  @Prop({
    required: true,
    type: {
      xgboost: { type: Number, required: true },
      cnnLstm: { type: Number, required: true },
      ginn: { type: Number, required: true },
      svm: { type: Number, required: true },
    },
  })
  modelContributions: {
    xgboost: number;
    cnnLstm: number;
    ginn: number;
    svm: number;
  };

  @Prop({ required: true, type: Object })
  features: Record<string, any>;

  @Prop({
    type: {
      modelVersions: { type: Object },
      latencyMs: Number,
    },
  })
  metadata?: {
    modelVersions: Record<string, string>;
    latencyMs: number;
  };
}

export const TradingSignalSchema = SchemaFactory.createForClass(TradingSignal);

// Compound indexes
TradingSignalSchema.index({ userId: 1, timestamp: -1 });
TradingSignalSchema.index({ prediction: 1, createdAt: -1 });
