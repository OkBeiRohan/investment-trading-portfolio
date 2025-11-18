/**
 * SignalEngineService
 * Runs ML inference and generates trading signals
 * Uses Python-based inference for joblib models (XGBoost, SVM)
 */

import { Injectable, Logger } from '@nestjs/common';
import { PythonInferenceService } from './python-inference.service';
import { SignalRepository } from '../../persistence/repositories/signal.repository';
import type { TradingSignalCreateInput, Prediction } from '@repo/schema';

interface Features {
  realizedVol5d: number;
  realizedVol10d: number;
  realizedVol20d: number;
  rsi14: number;
  macdValue: number;
  macdSignal: number;
  macdHistogram: number;
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  indiaVix: number;
  indiaVixMA5: number;
  pcrVolume: number;
  pcrOI: number;
  maxPain: number;
  atmIV: number;
  volSkew: number;
  termStructure: number;
  callIVSpread: number;
  putIVSpread: number;
  hour: number;
  dayOfWeek: number;
  isMarketOpen: number;
}

@Injectable()
export class SignalEngineService {
  private readonly logger = new Logger(SignalEngineService.name);

  constructor(
    private readonly pythonInference: PythonInferenceService,
    private readonly signalRepository: SignalRepository,
  ) {}

  /**
   * Generate trading signal from features
   * Runs ensemble prediction with XGBoost and SVM
   */
  async generateSignal(
    features: Features,
    userId: string,
  ): Promise<TradingSignalCreateInput> {
    const startTime = Date.now();

    // Run both models in parallel
    const [xgboostResult, svmResult] = await Promise.all([
      this.pythonInference.runInference('xgboost', features),
      this.pythonInference.runInference('svm', features),
    ]);

    // Simple averaging for now (can be replaced with trained meta-model)
    const avgProbability =
      (xgboostResult.probability + svmResult.probability) / 2;
    const prediction = this.determinePrediction(avgProbability);

    const modelContributions = {
      xgboost: xgboostResult.probability,
      cnnLstm: 0.5, // Not trained yet
      ginn: 0.5, // Not trained yet
      svm: svmResult.probability,
    };

    // Calculate confidence (distance from neutral 0.5)
    const confidence = Math.abs(avgProbability - 0.5) * 2; // Scale to 0-1

    const latencyMs = Date.now() - startTime;

    const signal: TradingSignalCreateInput = {
      userId,
      timestamp: new Date(),
      prediction,
      confidence,
      probability: avgProbability,
      modelContributions,
      features: this.serializeFeatures(features),
      metadata: {
        modelVersions: {
          xgboost: '1.0.0',
          svm: '1.0.0',
          cnnLstm: 'not_trained',
          ginn: 'not_trained',
        },
        latencyMs,
      },
    };

    return signal;
  }

  /**
   * Generate and persist signal to MongoDB
   */
  async generateAndPersistSignal(
    features: Features,
    userId: string,
  ): Promise<string> {
    const signal = await this.generateSignal(features, userId);

    // Save to MongoDB
    const signalId = await this.signalRepository.create(signal);

    this.logger.log(
      `Signal generated and persisted: ${signalId} - ${signal.prediction} (confidence: ${signal.confidence.toFixed(2)})`,
    );

    return signalId;
  }

  /**
   * Determine prediction label from probability
   */
  private determinePrediction(probability: number): Prediction {
    const threshold = 0.55;

    if (probability > threshold) return 'VOL_UP';
    if (probability < 1 - threshold) return 'VOL_DOWN';
    return 'NEUTRAL';
  }

  /**
   * Serialize features to plain object
   */
  private serializeFeatures(features: Features): Record<string, unknown> {
    return { ...features };
  }
}
