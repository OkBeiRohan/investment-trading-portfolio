import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as ort from 'onnxruntime-node';
import * as path from 'path';

export interface ModelCache {
  tier0_xgb?: ort.InferenceSession;
  tier1_patchtst?: ort.InferenceSession;
  tier2_lgb?: ort.InferenceSession;
  tier3_lit?: ort.InferenceSession;
  meta_learner?: ort.InferenceSession;
}

@Injectable()
export class ModelPoolService implements OnModuleInit {
  private readonly logger = new Logger(ModelPoolService.name);
  private models: ModelCache = {};
  
  // Execution providers for ONNX
  private readonly executionProviders = ['cpu']; // For GPU, use ['cuda', 'cpu']

  async onModuleInit() {
    this.logger.log('Initializing Model Pool (ONNX Runtime)...');
    await this.loadAllModels();
  }

  private async loadAllModels() {
    const modelsDir = path.join(process.cwd(), 'models');
    
    try {
      this.logger.log(`Loading ONNX models from ${modelsDir}`);
      
      this.models.tier0_xgb = await this.loadModelSafe(path.join(modelsDir, 'tier0_gap_predictor.onnx'));
      this.models.tier1_patchtst = await this.loadModelSafe(path.join(modelsDir, 'tier1_patchtst.onnx'));
      this.models.tier2_lgb = await this.loadModelSafe(path.join(modelsDir, 'tier2_lightgbm_fold_1.onnx'));
      this.models.tier3_lit = await this.loadModelSafe(path.join(modelsDir, 'tier3_lit.onnx'));
      this.models.meta_learner = await this.loadModelSafe(path.join(modelsDir, 'meta_learner.onnx'));

      // Check loaded
      const loadedCount = Object.values(this.models).filter((m) => m !== undefined).length;
      this.logger.log(`ONNX runtime initialized successfully with ${loadedCount}/5 models.`);

    } catch (e: any) {
      this.logger.error(`Critical error loading ONNX models: ${e.message}`, e.stack);
    }
  }

  private async loadModelSafe(filePath: string): Promise<ort.InferenceSession | undefined> {
    try {
      return await ort.InferenceSession.create(filePath, { 
        executionProviders: this.executionProviders,
        graphOptimizationLevel: 'extended'
      });
    } catch (e: any) {
      this.logger.warn(`Could not load model at ${filePath}: ${e.message}. Inference for this tier will be skipped.`);
      return undefined;
    }
  }

  getModels(): ModelCache {
    return this.models;
  }
}
