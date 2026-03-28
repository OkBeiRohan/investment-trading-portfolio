import { Injectable, Logger } from '@nestjs/common';
import { ModelPoolService } from './model-pool.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface InferenceResult {
  instrumentKey: string;
  timestamp: string;
  finalScore: number;
  confidenceWeights: number[];
  latencyMs: number;
}

@Injectable()
export class InferenceWorkerService {
  private readonly logger = new Logger(InferenceWorkerService.name);

  constructor(
    private readonly modelPool: ModelPoolService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Executes the full multi-tier ensemble via MLflow Model Serving.
   * Each tier model is served as a REST endpoint by the mlflow-model-server
   * container, loaded from the MLflow Registry @champion alias.
   */
  async executeEnsemble(
    instrumentKey: string,
    timestamp: string,
    features: number[],
  ): Promise<InferenceResult> {
    const startTime = performance.now();
    const dummyScore = 0.5;

    try {
      const predictions: number[] = [];

      // Tier 2: LightGBM Intraday Navigator
      if (this.modelPool.isHealthy('tier2_lgb')) {
        const tier2Preds = await this.modelPool.predict('tier2_lgb', features);
        predictions.push(tier2Preds[0] ?? dummyScore);
      } else {
        predictions.push(dummyScore);
      }

      // Tier 3: LiT Microstructure
      if (this.modelPool.isHealthy('tier3_lit')) {
        const microFeatures = features.slice(0, 5);
        const tier3Preds = await this.modelPool.predict('tier3_lit', microFeatures);
        predictions.push(tier3Preds[0] ?? dummyScore);
      } else {
        predictions.push(dummyScore);
      }

      // Tier 0 + Tier 1: Cached daily, not evaluated intraday tick-by-tick
      if (this.modelPool.isHealthy('tier0_xgb')) {
        const tier0Preds = await this.modelPool.predict('tier0_xgb', features.slice(0, 10));
        predictions.push(tier0Preds[0] ?? dummyScore);
      } else {
        predictions.push(dummyScore);
      }

      if (this.modelPool.isHealthy('tier1_patchtst')) {
        const tier1Preds = await this.modelPool.predict('tier1_patchtst', features.slice(0, 8));
        predictions.push(tier1Preds[0] ?? dummyScore);
      } else {
        predictions.push(dummyScore);
      }

      // Meta-Learner: Fused Gating Network
      let finalScore = dummyScore;
      let confidenceWeights = [0.25, 0.25, 0.25, 0.25];

      if (this.modelPool.isHealthy('meta_learner')) {
        const regimeOneHot = [0, 1, 0, 0]; // Default regime 1
        const metaResult = await this.modelPool.predictMeta(predictions, regimeOneHot);
        finalScore = metaResult.finalPred[0] ?? dummyScore;
        confidenceWeights = metaResult.weights.length === 4 ? metaResult.weights : confidenceWeights;
      } else {
        finalScore = predictions.reduce((a, b) => a + b, 0) / predictions.length;
      }

      const latencyMs = performance.now() - startTime;

      const inferenceResult: InferenceResult = {
        instrumentKey,
        timestamp,
        finalScore,
        confidenceWeights,
        latencyMs,
      };

      this.eventEmitter.emit('signal.generated', inferenceResult);

      return inferenceResult;
    } catch (error: any) {
      this.logger.error(`Inference ensemble failed for ${instrumentKey}: ${error.message}`);
      throw error;
    }
  }
}
