/**
 * PythonInferenceService
 * Runs Python ML models via child_process spawn
 * Handles XGBoost, SVM, and other joblib-based models
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface ModelMetadata {
  model_type: string;
  n_features: number;
  feature_names: string[];
  threshold: number;
}

interface PredictionResult {
  prediction: number; // 0 or 1
  probability: number; // 0.0 to 1.0
  probabilities: [number, number]; // [prob_class_0, prob_class_1]
}

@Injectable()
export class PythonInferenceService implements OnModuleInit {
  private readonly logger = new Logger(PythonInferenceService.name);
  private pythonPath: string;
  private modelsDir: string;
  private modelMetadata: Map<string, ModelMetadata> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.pythonPath = this.configService.get<string>(
      'PYTHON_PATH',
      'ml/venv/bin/python',
    );
    this.modelsDir = this.configService.get<string>('MODELS_DIR', 'models');
  }

  async onModuleInit() {
    this.logger.log('Initializing Python inference service...');
    await this.loadModelMetadata();
  }

  /**
   * Load model metadata from JSON files
   */
  private async loadModelMetadata(): Promise<void> {
    const models = ['xgboost', 'svm'];

    for (const modelName of models) {
      try {
        const metadataPath =
          modelName === 'xgboost'
            ? path.join(this.modelsDir, 'metadata.json')
            : path.join(this.modelsDir, modelName, 'metadata.json');

        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          this.modelMetadata.set(modelName, metadata);
          this.logger.log(`Loaded metadata for ${modelName}`);
        } else {
          this.logger.warn(`Metadata not found for ${modelName}`);
        }
      } catch (error) {
        this.logger.error(`Failed to load metadata for ${modelName}:`, error);
      }
    }
  }

  /**
   * Run inference on a model
   */
  async runInference(
    modelName: string,
    features: Record<string, number>,
  ): Promise<PredictionResult> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, '../../../ml/utils/inference.py');
      const modelPath =
        modelName === 'xgboost'
          ? path.join(this.modelsDir, 'xgboost.pkl')
          : path.join(this.modelsDir, modelName, `${modelName}_model.pkl`);

      // Convert features to JSON string
      const featuresJson = JSON.stringify(features);

      const python = spawn(this.pythonPath, [
        scriptPath,
        modelPath,
        featuresJson,
      ]);

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`Python inference failed for ${modelName}:`, {
            code,
            stderr,
          });
          reject(new Error(`Python inference failed: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (error) {
          this.logger.error('Failed to parse Python output:', {
            stdout,
            error,
          });
          reject(new Error(`Failed to parse output: ${stdout}`));
        }
      });

      python.on('error', (error) => {
        this.logger.error(`Failed to spawn Python process:`, error);
        reject(error);
      });
    });
  }

  /**
   * Get model metadata
   */
  getModelMetadata(modelName: string): ModelMetadata | undefined {
    return this.modelMetadata.get(modelName);
  }

  /**
   * Check if model is loaded
   */
  isModelLoaded(modelName: string): boolean {
    const modelPath =
      modelName === 'xgboost'
        ? path.join(this.modelsDir, 'xgboost.pkl')
        : path.join(this.modelsDir, modelName, `${modelName}_model.pkl`);

    return fs.existsSync(modelPath);
  }

  /**
   * Get all available models
   */
  getAvailableModels(): string[] {
    return Array.from(this.modelMetadata.keys());
  }
}
