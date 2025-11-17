/**
 * SignalEngineService
 * Runs ML inference and generates trading signals
 * Implements ensemble stacking logic
 */

import { Injectable, Logger } from '@nestjs/common';
import { ModelLoaderService } from './model-loader.service';
import * as ort from 'onnxruntime-node';
import type {
  TradingSignal,
  TradingSignalCreateInput,
  Features,
  ModelContributions,
} from '@repo/schema';

@Injectable()
export class SignalEngineService {
  private readonly logger = new Logger(SignalEngineService.name);

  constructor(private readonly modelLoader: ModelLoaderService) {}

  /**
   * Generate trading signal from features
   * Runs ensemble prediction with all L0 models + L1 stacker
   */
  async generateSignal(
    features: Features,
    userId: string,
  ): Promise<TradingSignalCreateInput> {
    const startTime = Date.now();

    // Step 1: Get L0 model predictions
    const l0Predictions = await this.getL0Predictions(features);

    // Step 2: Run L1 stacking model
    const finalPrediction = await this.runStackingModel(l0Predictions);

    // Step 3: Determine prediction label
    const prediction = this.determinePrediction(finalPrediction.probability);

    const latencyMs = Date.now() - startTime;

    return {
      userId,
      timestamp: new Date(),
      prediction,
      confidence: Math.abs(finalPrediction.probability - 0.5) * 2, // Scale to 0-1
      probability: finalPrediction.probability,
      modelContributions: l0Predictions,
      features: this.serializeFeatures(features),
      metadata: {
        modelVersions: this.getModelVersions(),
        latencyMs,
      },
    };
  }

  /**
   * Get predictions from all L0 models
   */
  private async getL0Predictions(
    features: Features,
  ): Promise<ModelContributions> {
    const inputTensor = this.featuresToTensor(features);

    // Run all L0 models in parallel
    const [xgboost, cnnLstm, ginn, svm] = await Promise.all([
      this.runModel('xgboost', inputTensor),
      this.runModel('cnn_lstm', inputTensor),
      this.runModel('ginn', inputTensor),
      this.runModel('svm', inputTensor),
    ]);

    return {
      xgboost,
      cnnLstm,
      ginn,
      svm,
    };
  }

  /**
   * Run L1 stacking model
   */
  private async runStackingModel(
    l0Predictions: ModelContributions,
  ): Promise<{ probability: number }> {
    // Create input tensor from L0 predictions
    const stackingInput = new ort.Tensor(
      'float32',
      [
        l0Predictions.xgboost,
        l0Predictions.cnnLstm,
        l0Predictions.ginn,
        l0Predictions.svm,
      ],
      [1, 4],
    );

    const result = await this.modelLoader.runInference(
      'stacking',
      stackingInput,
    );

    // Extract probability from result tensor
    const probability = result.data[0] as number;

    return { probability };
  }

  /**
   * Run a single model and extract probability
   */
  private async runModel(
    modelName: string,
    inputTensor: ort.Tensor,
  ): Promise<number> {
    try {
      const result = await this.modelLoader.runInference(
        modelName,
        inputTensor,
      );
      // Assuming output is probability (0-1)
      return result.data[0] as number;
    } catch (error) {
      this.logger.warn(`Model ${modelName} inference failed, using 0.5`);
      return 0.5; // Neutral prediction on error
    }
  }

  /**
   * Convert features to ONNX tensor
   */
  private featuresToTensor(features: Features): ort.Tensor {
    // Extract feature values in order
    const values = [
      features.realizedVol5d ?? 0,
      features.realizedVol10d ?? 0,
      features.realizedVol20d ?? 0,
      features.rsi14 ?? 0,
      features.macd?.value ?? 0,
      features.macd?.signal ?? 0,
      features.macd?.histogram ?? 0,
      features.indiaVix ?? 0,
      features.indiaVixMA5 ?? 0,
      features.pcrVolume ?? 0,
      features.pcrOI ?? 0,
      features.maxPain ?? 0,
      features.atmIV ?? 0,
      features.volSkew ?? 0,
      features.termStructure ?? 0,
    ];

    // Create tensor [batch_size=1, num_features]
    return new ort.Tensor('float32', new Float32Array(values), [
      1,
      values.length,
    ]);
  }

  /**
   * Determine prediction label from probability
   */
  private determinePrediction(
    probability: number,
  ): 'VOL_UP' | 'VOL_DOWN' | 'NEUTRAL' {
    if (probability > 0.55) return 'VOL_UP';
    if (probability < 0.45) return 'VOL_DOWN';
    return 'NEUTRAL';
  }

  /**
   * Serialize features to plain object
   */
  private serializeFeatures(features: Features): Record<string, unknown> {
    return JSON.parse(JSON.stringify(features));
  }

  /**
   * Get model versions for metadata
   */
  private getModelVersions(): Record<string, string> {
    const models = ['xgboost', 'cnn_lstm', 'ginn', 'svm', 'stacking'];
    const versions: Record<string, string> = {};

    for (const modelName of models) {
      const info = this.modelLoader.getModelInfo(modelName);
      versions[modelName] = info?.version ?? 'unknown';
    }

    return versions;
  }
}
