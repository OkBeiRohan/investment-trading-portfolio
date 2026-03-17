export type TrainingRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TrainingStageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type ArtifactType = 'model' | 'onnx' | 'metrics' | 'plot' | 'data' | 'log';

export interface ITrainingStage {
  name: string;
  status: TrainingStageStatus;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  metrics: Record<string, number>;
  logs: string[];
  error?: string;
}

export interface ITrainingArtifact {
  name: string;
  path: string;
  type: ArtifactType;
  sizeBytes?: number;
  checksum?: string;
}

export interface IHardwareInfo {
  gpuEnabled: boolean;
  gpuName?: string;
  gpuMemoryMb?: number;
  cpuCores?: number;
  ramGb?: number;
  platform?: string;
}

export interface ITrainingRun {
  experimentId: string;
  pipeline: string;
  status: TrainingRunStatus;
  parameters: Record<string, unknown>;
  stages: ITrainingStage[];
  artifacts: ITrainingArtifact[];
  hardware: IHardwareInfo;
  metrics: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
  totalDuration?: number;
  error?: string;
  triggeredBy: string;
  createdAt: Date;
  updatedAt: Date;
}
