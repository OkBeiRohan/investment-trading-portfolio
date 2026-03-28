import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface MlflowExperiment {
  experiment_id: string;
  name: string;
  artifact_location: string;
  lifecycle_stage: string;
}

export interface MlflowRun {
  info: {
    run_id: string;
    experiment_id: string;
    status: string;
    start_time: number;
    end_time?: number;
    run_name?: string;
  };
  data: {
    metrics: Record<string, number>;
    params: Record<string, string>;
    tags: Record<string, string>;
  };
}

export interface MlflowModelVersion {
  name: string;
  version: string;
  creation_timestamp: number;
  last_updated_timestamp: number;
  current_stage: string;
  source: string;
  run_id: string;
  status: string;
  aliases?: string[];
}

export interface MlflowMetricHistory {
  key: string;
  value: number;
  timestamp: number;
  step: number;
}

@Injectable()
export class MlflowProxyService implements OnModuleInit {
  private readonly logger = new Logger(MlflowProxyService.name);
  private baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      "MLFLOW_TRACKING_URI",
      "http://mlflow-server:5000",
    );
  }

  async onModuleInit() {
    this.logger.log(`MLflow proxy initialized (${this.baseUrl})`);
  }

  private async mlflowGet<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}/api/2.0/mlflow${path}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      throw new Error(`MLflow API error: ${res.status} ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  private async mlflowPost<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}/api/2.0/mlflow${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(`MLflow API error: ${res.status} ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  async searchExperiments(): Promise<MlflowExperiment[]> {
    const result = await this.mlflowGet<{ experiments: MlflowExperiment[] }>(
      "/experiments/search?max_results=100",
    );
    return result.experiments ?? [];
  }

  async getExperiment(experimentId: string): Promise<MlflowExperiment | null> {
    try {
      const result = await this.mlflowGet<{ experiment: MlflowExperiment }>(
        `/experiments/get?experiment_id=${experimentId}`,
      );
      return result.experiment;
    } catch {
      return null;
    }
  }

  async searchRuns(
    experimentIds: string[],
    maxResults = 50,
  ): Promise<MlflowRun[]> {
    const result = await this.mlflowPost<{ runs: MlflowRun[] }>(
      "/runs/search",
      {
        experiment_ids: experimentIds,
        max_results: maxResults,
        order_by: ["start_time DESC"],
      },
    );
    return result.runs ?? [];
  }

  async getRunMetrics(runId: string): Promise<Record<string, number>> {
    const result = await this.mlflowGet<{
      run: MlflowRun;
    }>(`/runs/get?run_id=${runId}`);
    return result.run?.data?.metrics ?? {};
  }

  async getMetricHistory(
    runId: string,
    metricKey: string,
  ): Promise<MlflowMetricHistory[]> {
    const result = await this.mlflowGet<{
      metrics: MlflowMetricHistory[];
    }>(
      `/metrics/get-history?run_id=${runId}&metric_key=${encodeURIComponent(metricKey)}`,
    );
    return result.metrics ?? [];
  }

  async getRegisteredModel(
    name: string,
  ): Promise<{ name: string; latest_versions: MlflowModelVersion[] } | null> {
    try {
      const result = await this.mlflowGet<{
        registered_model: { name: string; latest_versions: MlflowModelVersion[] };
      }>(`/registered-models/get?name=${encodeURIComponent(name)}`);
      return result.registered_model;
    } catch {
      return null;
    }
  }

  async getModelVersionByAlias(
    name: string,
    alias: string,
  ): Promise<MlflowModelVersion | null> {
    try {
      const result = await this.mlflowGet<{
        model_version: MlflowModelVersion;
      }>(
        `/registered-models/alias?name=${encodeURIComponent(name)}&alias=${alias}`,
      );
      return result.model_version;
    } catch {
      return null;
    }
  }

  async setModelAlias(
    name: string,
    alias: string,
    version: string,
  ): Promise<void> {
    await this.mlflowPost("/registered-models/alias", {
      name,
      alias,
      version,
    });
  }

  async getArtifactUrl(runId: string, artifactPath: string): Promise<string> {
    return `${this.baseUrl}/get-artifact?run_id=${runId}&path=${encodeURIComponent(artifactPath)}`;
  }

  async getRunDatasetInputs(
    runId: string,
  ): Promise<Array<{ dataset: { name: string; digest: string; source_type: string }; context: string }>> {
    try {
      const result = await this.mlflowGet<{
        dataset_inputs: Array<{ dataset: any; tags: Array<{ key: string; value: string }> }>;
      }>(`/runs/get?run_id=${runId}`);
      const run = result as any;
      return run?.run?.inputs?.dataset_inputs ?? [];
    } catch {
      return [];
    }
  }
}
