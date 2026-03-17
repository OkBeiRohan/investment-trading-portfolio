export type ExperimentStatus = 'draft' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ExperimentModelType = 'xgboost' | 'lightgbm' | 'hmm' | 'patchtst' | 'tft' | 'mamba' | 'lit' | 'meta_learner';
export type ValidationType = 'cpcv' | 'walk_forward' | 'time_split';

export interface IDataConfig {
  startDate: Date;
  endDate: Date;
  instruments: string[];
  features: string[];
  validationType: ValidationType;
  nFolds: number;
  testSize: number;
}

export interface IExperimentMetrics {
  accuracy?: number;
  sharpe?: number;
  sortino?: number;
  maxDrawdown?: number;
  winRate?: number;
  profitFactor?: number;
  calmarRatio?: number;
  avgReturn?: number;
  extraMetrics: Record<string, unknown>;
}

export interface IExperiment {
  name: string;
  description?: string;
  status: ExperimentStatus;
  tier: number;
  modelType: ExperimentModelType;
  hyperparameters: Record<string, unknown>;
  dataConfig: IDataConfig;
  metrics: IExperimentMetrics;
  bestRunId?: string;
  modelPath?: string;
  onnxPath?: string;
  isDeployed: boolean;
  deployedAt?: Date;
  createdBy: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
