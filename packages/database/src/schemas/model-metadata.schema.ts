/**
 * Model Metadata Mongoose Schema
 * Stores ML model version history in MongoDB
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument } from "mongoose";

export type ModelMetadataDocument = HydratedDocument<ModelMetadata>;

@Schema({ collection: "model_metadata", timestamps: true })
export class ModelMetadata extends Document {
  @Prop({ required: true, index: true })
  modelName!: string;

  @Prop({
    required: true,
    enum: [
      "XGBOOST",
      "CNN_LSTM",
      "GINN",
      "SVM",
      "LOGISTIC_REGRESSION",
      "ENSEMBLE",
    ],
  })
  modelType!: string;

  @Prop({
    required: true,
    enum: ["ONNX", "PICKLE", "TENSORFLOW", "PYTORCH", "JOBLIB"],
  })
  modelFormat!: string;

  @Prop({ required: true, index: true })
  version!: string;

  @Prop({
    required: true,
    enum: ["ACTIVE", "INACTIVE", "TRAINING", "DEPRECATED", "FAILED"],
    default: "INACTIVE",
  })
  status!: string;

  @Prop({ required: true })
  filePath!: string;

  @Prop({ required: true })
  checksum!: string;

  @Prop({ required: true })
  fileSizeBytes!: number;

  @Prop({ type: Object })
  performanceMetrics?: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
    sharpeRatio?: number;
    sortinoRatio?: number;
    maxDrawdown?: number;
    calmarRatio?: number;
  };

  @Prop({ type: Object })
  trainingConfig?: {
    hyperparameters: Record<string, unknown>;
    trainingDataPeriod: {
      start: Date;
      end: Date;
    };
    validationDataPeriod?: {
      start: Date;
      end: Date;
    };
    features: string[];
    targetVariable: string;
    trainingDurationMs?: number;
  };

  @Prop()
  description?: string;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ default: "system" })
  createdBy!: string;

  @Prop()
  deployedAt?: Date;

  // Timestamps automatically added by MongoDB
  createdAt!: Date;
  updatedAt!: Date;
}

export const ModelMetadataSchema = SchemaFactory.createForClass(ModelMetadata);

// Compound index for efficient queries
ModelMetadataSchema.index({ modelName: 1, version: 1 }, { unique: true });
ModelMetadataSchema.index({ status: 1, createdAt: -1 });
ModelMetadataSchema.index({ modelType: 1, status: 1 });
