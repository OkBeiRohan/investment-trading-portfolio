import { Injectable, Logger } from '@nestjs/common';
import { ModelPoolService } from './model-pool.service';
import * as ort from 'onnxruntime-node';
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
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Executes the full multi-tier ONNX ensemble dynamically.
   * Target execution time: <50ms.
   */
  async executeEnsemble(
    instrumentKey: string,
    timestamp: string,
    features: number[] // Standard 117 feature array
  ): Promise<InferenceResult> {
    const startTime = performance.now();
    const models = this.modelPool.getModels();

    try {
      // 1. Convert features to ONNX Tensor
      // The exact shape depends on PyTorch/LightGBM inputs
      const featureArray = Float32Array.from(features);
      const featureTensor = new ort.Tensor('float32', featureArray, [1, features.length]);
      
      const predictions = [];
      const dummyModelResult = 0.5; // Default neutral if model missing

      // ==========================================
      // Tier 2: LightGBM Intraday Navigator
      // ==========================================
      if (models.tier2_lgb) {
        const lgbResults = await models.tier2_lgb.run({ input: featureTensor });
        // Assume 'label' or 'probabilities' output
        const lgbScore = lgbResults[Object.keys(lgbResults)[0]].data[0];
        predictions.push(Number(lgbScore));
      } else {
        predictions.push(dummyModelResult);
      }

      // ==========================================
      // Tier 3: LiT Microstructure
      // ==========================================
      if (models.tier3_lit) {
        // PyTorch LiT wants [batch, seq_len, features]. Mock sequence dimension.
        // Assuming sequence length 20, features 5 for illustration
        const litArray = new Float32Array(20 * 5).fill(0);
        // Fill the last element with true data for mock simulation
        litArray.set(featureArray.slice(0, 5), (19*5)); 
        const litTensor = new ort.Tensor('float32', litArray, [1, 20, 5]);
        
        const litResults = await models.tier3_lit.run({ input: litTensor });
        const litScore = litResults['output'].data[0];
        predictions.push(Number(litScore));
      } else {
         predictions.push(dummyModelResult);
      }
      
      // Assume Tiers 0 & 1 aren't evaluated intraday tick-by-tick but cached daily
      // Mocking their inputs to the MetaLearner for now
      predictions.push(dummyModelResult); // Tier 0 Mock
      predictions.push(dummyModelResult); // Tier 1 Mock

      // ==========================================
      // Meta-Learner Fused Gating Network
      // ==========================================
      let finalScore = 0.5;
      let confidenceWeights = [0.25, 0.25, 0.25, 0.25];

      if (models.meta_learner) {
        const predTensor = new ort.Tensor('float32', Float32Array.from(predictions), [1, 4]);
        // Dummy default regime (Regime 1)
        const regimeTensor = new ort.Tensor('float32', Float32Array.from([0, 1, 0, 0]), [1, 4]);
        
        const metaResults = await models.meta_learner.run({ 
          model_preds: predTensor, 
          regime_one_hot: regimeTensor 
        });
        
        finalScore = Number(metaResults['final_pred'].data[0]);
        confidenceWeights = Array.from(metaResults['weights'].data as Float32Array);
      } else {
        // Average ensemble fallback
        finalScore = predictions.reduce((a, b) => a + b, 0) / predictions.length;
      }

      const latencyMs = performance.now() - startTime;
      
      const inferenceResult = {
        instrumentKey,
        timestamp,
        finalScore,
        confidenceWeights,
        latencyMs
      };
      
      // Dispatch Inference Event to Layer 4 (Strategy & Risk)
      this.eventEmitter.emit('signal.generated', inferenceResult);
      
      return inferenceResult;

    } catch (error: any) {
      this.logger.error(`Inference ensemble failed for ${instrumentKey}: ${error.message}`);
      throw error;
    }
  }
}
