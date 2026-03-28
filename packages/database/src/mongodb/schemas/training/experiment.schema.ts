import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";
import type { IDataConfig, IExperimentMetrics, IExperiment, ExperimentStatus, ExperimentModelType, ValidationType, ModelServingFormat } from "@repo/schema";

@Schema({ _id: false })
export class DataConfig implements IDataConfig {
  @Prop({ type: Date })
  startDate: Date;

  @Prop({ type: Date })
  endDate: Date;

  @Prop({ type: [String], default: [] })
  instruments: string[];

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({
    enum: ["cpcv", "walk_forward", "time_split"],
    default: "cpcv",
  })
  validationType: ValidationType;

  @Prop({ default: 5 })
  nFolds: number;

  @Prop({ default: 0.2 })
  testSize: number;
}

export const DataConfigSchema = SchemaFactory.createForClass(DataConfig);

@Schema({ _id: false })
export class ExperimentMetrics implements IExperimentMetrics {
  @Prop()
  accuracy?: number;

  @Prop()
  sharpe?: number;

  @Prop()
  sortino?: number;

  @Prop()
  maxDrawdown?: number;

  @Prop()
  winRate?: number;

  @Prop()
  profitFactor?: number;

  @Prop()
  calmarRatio?: number;

  @Prop()
  avgReturn?: number;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  extraMetrics: Record<string, any>;
}

export const ExperimentMetricsSchema =
  SchemaFactory.createForClass(ExperimentMetrics);

@Schema({ timestamps: true, collection: "experiments" })
export class Experiment extends Document implements IExperiment {
  @Prop({ required: true, index: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({
    enum: [
      "draft",
      "pending",
      "running",
      "completed",
      "failed",
      "cancelled",
    ],
    default: "draft",
    index: true,
  })
  status: ExperimentStatus;

  @Prop({ required: true, enum: [0, 1, 2, 3, 4], index: true })
  tier: number;

  @Prop({
    required: true,
    enum: [
      "xgboost",
      "lightgbm",
      "hmm",
      "patchtst",
      "tft",
      "mamba",
      "lit",
      "meta_learner",
    ],
  })
  modelType: ExperimentModelType;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  hyperparameters: Record<string, any>;

  @Prop({ type: DataConfigSchema })
  dataConfig: DataConfig;

  @Prop({ type: ExperimentMetricsSchema })
  metrics: ExperimentMetrics;

  @Prop({ ref: "TrainingRun" })
  bestRunId?: string;

  @Prop()
  modelPath?: string;

  @Prop({ index: true })
  mlflowExperimentId?: string;

  @Prop()
  mlflowRunId?: string;

  @Prop()
  mlflowModelName?: string;

  @Prop()
  mlflowModelUri?: string;

  @Prop()
  mlflowChampionVersion?: string;

  @Prop({ enum: ["mlflow_native", "pyfunc"] })
  modelFormat?: ModelServingFormat;

  @Prop({ default: false })
  isDeployed: boolean;

  @Prop({ type: Date })
  deployedAt?: Date;

  @Prop({ required: true, index: true })
  createdBy: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const ExperimentSchema = SchemaFactory.createForClass(Experiment);

ExperimentSchema.index({ tier: 1, status: 1 });
ExperimentSchema.index({ createdBy: 1 });
ExperimentSchema.index({ isDeployed: 1 });
ExperimentSchema.index({ mlflowExperimentId: 1 });
