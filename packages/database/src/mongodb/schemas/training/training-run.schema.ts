import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types, Schema as MongooseSchema } from "mongoose";
import { Experiment } from "./experiment.schema";

@Schema({ _id: false })
export class TrainingStage {
  @Prop()
  name: string;

  @Prop({
    enum: ["pending", "running", "completed", "failed", "skipped"],
    default: "pending",
  })
  status: string;

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
export class TrainingArtifact {
  @Prop()
  name: string;

  @Prop()
  path: string;

  @Prop({
    required: true,
    enum: ["model", "onnx", "metrics", "plot", "data", "log"],
  })
  type: string;

  @Prop()
  sizeBytes?: number;

  @Prop()
  checksum?: string;
}

export const TrainingArtifactSchema =
  SchemaFactory.createForClass(TrainingArtifact);

@Schema({ _id: false })
export class HardwareInfo {
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
export class TrainingRun extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: Experiment.name,
    required: true,
    index: true,
  })
  experimentId: Types.ObjectId;

  @Prop({ required: true })
  pipeline: string;

  @Prop({
    enum: ["queued", "running", "completed", "failed", "cancelled"],
    default: "queued",
    index: true,
  })
  status: string;

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
