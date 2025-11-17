/**
 * ModelLoaderService
 * Loads and manages ONNX models using onnxruntime-node
 * Handles model versioning and caching
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ort from 'onnxruntime-node';

interface LoadedModel {
  session: ort.InferenceSession;
  version: string;
  loadedAt: Date;
}

@Injectable()
export class ModelLoaderService implements OnModuleInit {
  private readonly logger = new Logger(ModelLoaderService.name);
  private models: Map<string, LoadedModel> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('Initializing model loader...');
    // Load models on startup
    await this.loadAllModels();
  }

  /**
   * Load all ML models from disk
   */
  private async loadAllModels(): Promise<void> {
    const modelDir = this.configService.get<string>('ML_MODELS_DIR', '/models');

    const models = [
      { name: 'xgboost', path: `${modelDir}/xgboost.onnx` },
      { name: 'cnn_lstm', path: `${modelDir}/cnn_lstm.onnx` },
      { name: 'ginn', path: `${modelDir}/ginn.onnx` },
      { name: 'svm', path: `${modelDir}/svm.onnx` },
      { name: 'stacking', path: `${modelDir}/stacking.onnx` },
    ];

    for (const model of models) {
      try {
        await this.loadModel(model.name, model.path);
      } catch (error) {
        this.logger.warn(
          `Failed to load model ${model.name}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Load a single ONNX model
   */
  async loadModel(name: string, path: string): Promise<void> {
    this.logger.log(`Loading model: ${name} from ${path}`);

    try {
      const session = await ort.InferenceSession.create(path, {
        executionProviders: ['cuda', 'cpu'], // Try CUDA first, fallback to CPU
        graphOptimizationLevel: 'all',
      });

      this.models.set(name, {
        session,
        version: '1.0.0', // TODO: Read from model metadata
        loadedAt: new Date(),
      });

      this.logger.log(`Successfully loaded model: ${name}`);
    } catch (error) {
      this.logger.error(`Error loading model ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get a loaded model
   */
  getModel(name: string): LoadedModel | undefined {
    return this.models.get(name);
  }

  /**
   * Run inference on a model
   */
  async runInference(
    modelName: string,
    inputTensor: ort.Tensor,
  ): Promise<ort.Tensor> {
    const model = this.models.get(modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not loaded`);
    }

    try {
      const feeds = { input: inputTensor }; // Adjust input name based on model
      const results = await model.session.run(feeds);

      // Return the output tensor (adjust output name based on model)
      return results.output || Object.values(results)[0];
    } catch (error) {
      this.logger.error(`Inference error for model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Get model metadata
   */
  getModelInfo(name: string): {
    name: string;
    version: string;
    loadedAt: Date;
    inputNames: readonly string[];
    outputNames: readonly string[];
  } | null {
    const model = this.models.get(name);
    if (!model) return null;

    return {
      name,
      version: model.version,
      loadedAt: model.loadedAt,
      inputNames: model.session.inputNames,
      outputNames: model.session.outputNames,
    };
  }

  /**
   * Reload a model (for hot-swapping)
   */
  async reloadModel(name: string, path: string): Promise<void> {
    this.logger.log(`Reloading model: ${name}`);

    // Unload existing model
    const existing = this.models.get(name);
    if (existing) {
      this.models.delete(name);
    }

    // Load new version
    await this.loadModel(name, path);
  }

  /**
   * Get all loaded models
   */
  getAllModels(): string[] {
    return Array.from(this.models.keys());
  }
}
