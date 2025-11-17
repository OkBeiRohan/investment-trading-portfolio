/**
 * Feature Snapshot Schema for NestJS Mongoose
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { FeatureSnapshot as IFeatureSnapshot } from "@repo/schema";

export type FeatureSnapshotDocument = HydratedDocument<FeatureSnapshot>;

class MACD {
  @Prop()
  value?: number;

  @Prop()
  signal?: number;

  @Prop()
  histogram?: number;
}

class Features {
  @Prop()
  realizedVol5d?: number;

  @Prop()
  realizedVol10d?: number;

  @Prop()
  realizedVol20d?: number;

  @Prop()
  rsi14?: number;

  @Prop({ type: MACD })
  macd?: MACD;

  @Prop()
  indiaVix?: number;

  @Prop()
  indiaVixMA5?: number;

  @Prop()
  pcrVolume?: number;

  @Prop()
  pcrOI?: number;

  @Prop()
  maxPain?: number;

  @Prop()
  atmIV?: number;

  @Prop()
  volSkew?: number;

  @Prop()
  termStructure?: number;
}

class Metadata {
  @Prop({ required: true, enum: ["good", "filled", "anomalous"] })
  dataQuality: string;

  @Prop({ type: [String] })
  missingFields?: string[];

  @Prop()
  version?: string;
}

@Schema({ timestamps: false, collection: "feature_snapshots" })
export class FeatureSnapshot implements IFeatureSnapshot {
  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  instrument: string;

  @Prop({ type: Features })
  features?: Features;

  @Prop({ type: Metadata })
  metadata?: Metadata;
}

export const FeatureSnapshotSchema =
  SchemaFactory.createForClass(FeatureSnapshot);

// Compound indexes
FeatureSnapshotSchema.index({ instrument: 1, timestamp: -1 });
