import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MlflowServingEndpoints {
  tier0_xgb: string;
  tier1_patchtst: string;
  tier1_hmm: string;
  tier2_lgb: string;
  tier3_lit: string;
  meta_learner: string;
}

export interface ModelPrediction {
  predictions: number[];
}

@Injectable()
export class ModelPoolService implements OnModuleInit {
  private readonly logger = new Logger(ModelPoolService.name);
  private endpoints: MlflowServingEndpoints;
  private healthy: Record<string, boolean> = {};

  constructor(private readonly configService: ConfigService) {
    const baseUrl = this.configService.get<string>(
      'MLFLOW_SERVING_BASE_URL',
      'http://mlflow-model-server',
    );
    this.endpoints = {
      tier0_xgb: `${baseUrl}:5001/invocations`,
      tier1_patchtst: `${baseUrl}:5002/invocations`,
      tier1_hmm: `${baseUrl}:5006/invocations`,
      tier2_lgb: `${baseUrl}:5003/invocations`,
      tier3_lit: `${baseUrl}:5004/invocations`,
      meta_learner: `${baseUrl}:5005/invocations`,
    };
  }

  async onModuleInit() {
    this.logger.log('Initializing Model Pool (MLflow Serving)...');
    await this.checkHealth();
  }

  private async checkHealth(): Promise<void> {
    for (const [name, url] of Object.entries(this.endpoints)) {
      const healthUrl = url.replace('/invocations', '/health');
      try {
        const res = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
        this.healthy[name] = res.ok;
        if (res.ok) {
          this.logger.log(`Model ${name} is healthy at ${healthUrl}`);
        } else {
          this.logger.warn(`Model ${name} returned ${res.status} at ${healthUrl}`);
        }
      } catch {
        this.healthy[name] = false;
        this.logger.warn(`Model ${name} not reachable at ${healthUrl}`);
      }
    }
    const healthyCount = Object.values(this.healthy).filter(Boolean).length;
    this.logger.log(`MLflow Serving: ${healthyCount}/${Object.keys(this.endpoints).length} models healthy`);
  }

  async predict(tier: keyof MlflowServingEndpoints, features: number[]): Promise<number[]> {
    const url = this.endpoints[tier];
    if (!url) {
      throw new Error(`Unknown tier: ${tier}`);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: [features] }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`MLflow serving error (${response.status}): ${text}`);
    }

    const result = await response.json() as ModelPrediction;
    return result.predictions ?? [];
  }

  async predictMeta(
    modelPreds: number[],
    regimeOneHot: number[],
  ): Promise<{ finalPred: number[]; weights: number[] }> {
    const url = this.endpoints.meta_learner;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: { model_preds: [modelPreds], regime_one_hot: [regimeOneHot] },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`MLflow meta serving error (${response.status}): ${text}`);
    }

    const result = await response.json() as Record<string, number[]>;
    return {
      finalPred: result.final_pred ?? result.predictions ?? [],
      weights: result.weights ?? [],
    };
  }

  isHealthy(tier: keyof MlflowServingEndpoints): boolean {
    return this.healthy[tier] ?? false;
  }

  getEndpoints(): MlflowServingEndpoints {
    return { ...this.endpoints };
  }
}
