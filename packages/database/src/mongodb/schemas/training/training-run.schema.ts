import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types, Schema as MongooseSchema } from "mongoose";
import { Experiment } from "./experiment.schema";
import type { ITrainingStage, ITrainingArtifact, IHardwareInfo, ITrainingRun, IQualityGateResult, TrainingRunStatus, TrainingStageStatus, ArtifactType } from "@repo/schema";

@Schema({ _id: false })
export class TrainingStage implements ITrainingStage {
  @Prop()
  name: string;

  @Prop({
    enum: ["pending", "running", "completed", "failed", "skipped"],
    default: "pending",
  })
  status: TrainingStageStatus;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop()
  duration?: number;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metrics: Record<string, any>;

  @Prop({ type: [String], default: [] })
  logs: string[];

  @Prop()
  error?: string;
}

export const TrainingStageSchema =
  SchemaFactory.createForClass(TrainingStage);

@Schema({ _id: false })
export class TrainingArtifact implements ITrainingArtifact {
  @Prop()
  name: string;

  @Prop()
  path: string;

  @Prop({
    required: true,
    enum: ["model", "mlflow_model", "shap_explainer", "evaluation_report", "metrics", "plot", "data", "log"],
  })
  type: ArtifactType;

  @Prop()
  sizeBytes?: number;

  @Prop()
  checksum?: string;
}

export const TrainingArtifactSchema =
  SchemaFactory.createForClass(TrainingArtifact);

@Schema({ _id: false })
export class HardwareInfo implements IHardwareInfo {
  @Prop({ default: false })
  gpuEnabled: boolean;

  @Prop()
  gpuName?: string;

  @Prop()
  gpuMemoryMb?: number;

  @Prop()
  cpuCores?: number;

  @Prop()
  ramGb?: number;

  @Prop()
  platform?: string;
}

export const HardwareInfoSchema =
  SchemaFactory.createForClass(HardwareInfo);

@Schema({ timestamps: true, collection: "training_runs" })
export class TrainingRun extends Document implements ITrainingRun {
  @Prop({
    type: Types.ObjectId,
    ref: Experiment.name,
    required: true,
    index: true,
  })
  experimentId: string;

  @Prop({ required: true })
  pipeline: string;

  @Prop({
    enum: ["queued", "running", "completed", "failed", "cancelled"],
    default: "queued",
    index: true,
  })
  status: TrainingRunStatus;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  parameters: Record<string, any>;

  @Prop({ type: [TrainingStageSchema], default: [] })
  stages: TrainingStage[];

  @Prop({ type: [TrainingArtifactSchema], default: [] })
  artifacts: TrainingArtifact[];

  @Prop({ type: HardwareInfoSchema })
  hardware: HardwareInfo;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metrics: Record<string, any>;

  @Prop({ index: true })
  mlflowRunId?: string;

  @Prop()
  mlflowParentRunId?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  datasetDigests?: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  evaluationResults?: Record<string, number>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  qualityGateResult?: IQualityGateResult;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop()
  totalDuration?: number;

  @Prop()
  error?: string;

  @Prop({ required: true })
  triggeredBy: string;

  createdAt: Date;
  updatedAt: Date;
}

export const TrainingRunSchema =
  SchemaFactory.createForClass(TrainingRun);

TrainingRunSchema.index({ experimentId: 1, status: 1 });
TrainingRunSchema.index({ triggeredBy: 1 });
TrainingRunSchema.index({ mlflowRunId: 1 });
