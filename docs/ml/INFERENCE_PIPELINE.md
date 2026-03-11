# ONNX Inference Pipeline

> **Production-grade ML inference in NestJS using ONNX Runtime with GPU acceleration.**

**Last Updated**: March 11, 2026  
**Architecture**: 5-Tier Data-Bound Hierarchical

---

## Overview

This document describes how trained models from the **Python training pipeline** are deployed for **real-time inference in NestJS** using ONNX Runtime.

### Why ONNX?

| Consideration | Python Inference | ONNX in NestJS |
|---------------|------------------|----------------|
| Type Safety | ❌ Duck typing | ✅ Full TypeScript types |
| Memory Management | ❌ GC unpredictable | ✅ Controlled allocation |
| Latency | ~100-200ms | ✅ <50ms with GPU |
| Integration | Separate service | ✅ Same process as trading logic |
| Deployment | Python runtime needed | ✅ Single Node.js binary |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TRAINING (Offline)                                 │
│                                                                              │
│   QuestDB ──→ training-pipeline (Kedro/Python) ──→ ONNX Models ──→ Storage  │
│                                                                              │
│   Models exported:                                                           │
│   • lightgbm_macro.onnx (Direction prediction)                              │
│   • tft_multihorizon.onnx (Multi-horizon forecasting)                       │
│   • mamba_regime.onnx (Regime detection)                                    │
│   • meta_learner.onnx (Signal fusion)                                       │
│   • ppo_execution.onnx (Order execution)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INFERENCE (Live)                                   │
│                                                                              │
│   ┌─────────────────┐    ┌──────────────────────────────────────────────┐  │
│   │ compute-engine  │    │              algo-worker (NestJS)             │  │
│   │ (Rust/NAPI)     │    │                                               │  │
│   │                 │    │  ┌─────────────────────────────────────────┐ │  │
│   │ 33 features     │───→│  │ OnnxInferenceService                    │ │  │
│   │ <5ms            │    │  │                                         │ │  │
│   │                 │    │  │ • Load ONNX models at startup           │ │  │
│   └─────────────────┘    │  │ • Worker Thread for GPU inference       │ │  │
│                          │  │ • Model caching and pooling             │ │  │
│                          │  │ • <50ms inference latency               │ │  │
│                          │  └─────────────────────────────────────────┘ │  │
│                          │                     │                         │  │
│                          │                     ▼                         │  │
│                          │  ┌─────────────────────────────────────────┐ │  │
│                          │  │ Trading Decision Engine                 │ │  │
│                          │  │ • Risk validation                       │ │  │
│                          │  │ • Order generation                      │ │  │
│                          │  │ • Execution via Upstox                  │ │  │
│                          │  └─────────────────────────────────────────┘ │  │
│                          └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ONNX Runtime in NestJS

### Installation

```bash
# In apps/algo-worker
pnpm add onnxruntime-node

# For GPU support (CUDA 12+)
pnpm add onnxruntime-node-gpu
```

### Service Implementation

```typescript
// apps/algo-worker/src/layers/03-PREDICTION/onnx-inference.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ort from 'onnxruntime-node';
import { Worker } from 'worker_threads';
import { join } from 'path';

interface ModelConfig {
  name: string;
  path: string;
  inputShape: number[];
  outputShape: number[];
}

@Injectable()
export class OnnxInferenceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OnnxInferenceService.name);
  private sessions: Map<string, ort.InferenceSession> = new Map();
  private inferenceWorker: Worker | null = null;
  
  private readonly modelConfigs: ModelConfig[] = [
    { name: 'lightgbm', path: 'models/lightgbm_macro.onnx', inputShape: [1, 33], outputShape: [1, 3] },
    { name: 'tft', path: 'models/tft_multihorizon.onnx', inputShape: [1, 100, 33], outputShape: [1, 6] },
    { name: 'mamba', path: 'models/mamba_regime.onnx', inputShape: [1, 50, 33], outputShape: [1, 4] },
    { name: 'meta', path: 'models/meta_learner.onnx', inputShape: [1, 13], outputShape: [1, 6] },
  ];
  
  constructor(private config: ConfigService) {}
  
  async onModuleInit() {
    // Configure ONNX Runtime
    ort.env.wasm.numThreads = 4;
    
    // Load all models
    for (const modelConfig of this.modelConfigs) {
      await this.loadModel(modelConfig);
    }
    
    this.logger.log(`Loaded ${this.sessions.size} ONNX models`);
  }
  
  async onModuleDestroy() {
    // Cleanup sessions
    for (const [name, session] of this.sessions) {
      await session.release();
      this.logger.log(`Released ONNX session: ${name}`);
    }
  }
  
  private async loadModel(config: ModelConfig): Promise<void> {
    const modelPath = join(process.cwd(), config.path);
    
    try {
      const session = await ort.InferenceSession.create(modelPath, {
        executionProviders: [
          'CUDAExecutionProvider',  // GPU first
          'CPUExecutionProvider',   // CPU fallback
        ],
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true,
        enableMemPattern: true,
      });
      
      this.sessions.set(config.name, session);
      this.logger.log(`Loaded model: ${config.name} from ${config.path}`);
    } catch (error) {
      this.logger.error(`Failed to load model ${config.name}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Run inference on a single model
   */
  async runInference(
    modelName: string,
    features: Float32Array,
    shape: number[]
  ): Promise<Float32Array> {
    const session = this.sessions.get(modelName);
    if (!session) {
      throw new Error(`Model not found: ${modelName}`);
    }
    
    const start = performance.now();
    
    // Create input tensor
    const inputTensor = new ort.Tensor('float32', features, shape);
    
    // Run inference
    const results = await session.run({ input: inputTensor });
    
    const duration = performance.now() - start;
    this.logger.debug(`${modelName} inference: ${duration.toFixed(2)}ms`);
    
    // Extract output
    const output = results.output;
    return output.data as Float32Array;
  }
  
  /**
   * Run ensemble inference (all tier-1 models)
   */
  async runEnsemble(features: Float32Array): Promise<EnsembleResult> {
    const start = performance.now();
    
    // Run tier-1 models in parallel
    const [lgbResult, tftResult, mambaResult] = await Promise.all([
      this.runInference('lightgbm', features, [1, 33]),
      this.runInference('tft', this.prepareSequence(features, 100), [1, 100, 33]),
      this.runInference('mamba', this.prepareSequence(features, 50), [1, 50, 33]),
    ]);
    
    // Combine predictions for meta-learner
    const metaInput = new Float32Array([
      ...lgbResult,
      ...tftResult,
      ...mambaResult,
      features[31], // India VIX (regime indicator)
    ]);
    
    const metaResult = await this.runInference('meta', metaInput, [1, 13]);
    
    const duration = performance.now() - start;
    this.logger.log(`Ensemble inference: ${duration.toFixed(2)}ms`);
    
    return {
      predictions: {
        direction: this.argmax(metaResult.slice(0, 3)),
        confidence: Math.max(...metaResult.slice(0, 3)),
        horizonPredictions: Array.from(metaResult.slice(3, 9)),
      },
      modelOutputs: {
        lightgbm: Array.from(lgbResult),
        tft: Array.from(tftResult),
        mamba: Array.from(mambaResult),
      },
      latencyMs: duration,
    };
  }
  
  private prepareSequence(features: Float32Array, length: number): Float32Array {
    // This would use historical feature cache
    // Simplified: repeat current features
    const sequence = new Float32Array(length * 33);
    for (let i = 0; i < length; i++) {
      sequence.set(features, i * 33);
    }
    return sequence;
  }
  
  private argmax(arr: Float32Array): number {
    let maxIdx = 0;
    let maxVal = arr[0];
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] > maxVal) {
        maxVal = arr[i];
        maxIdx = i;
      }
    }
    return maxIdx;
  }
}

interface EnsembleResult {
  predictions: {
    direction: number;  // 0=DOWN, 1=FLAT, 2=UP
    confidence: number;
    horizonPredictions: number[];
  };
  modelOutputs: {
    lightgbm: number[];
    tft: number[];
    mamba: number[];
  };
  latencyMs: number;
}
```

---

## Worker Thread Architecture

For CPU-bound inference, use Worker Threads to avoid blocking the event loop:

```typescript
// apps/algo-worker/src/workers/inference.worker.ts
import { parentPort, workerData } from 'worker_threads';
import * as ort from 'onnxruntime-node';

let session: ort.InferenceSession;

async function init() {
  session = await ort.InferenceSession.create(workerData.modelPath, {
    executionProviders: ['CUDAExecutionProvider', 'CPUExecutionProvider'],
  });
  parentPort?.postMessage({ type: 'ready' });
}

parentPort?.on('message', async (msg) => {
  if (msg.type === 'inference') {
    const tensor = new ort.Tensor('float32', msg.features, msg.shape);
    const results = await session.run({ input: tensor });
    parentPort?.postMessage({
      type: 'result',
      id: msg.id,
      output: Array.from(results.output.data as Float32Array),
    });
  }
});

init();
```

```typescript
// apps/algo-worker/src/services/inference-pool.service.ts
import { Worker } from 'worker_threads';
import { join } from 'path';

export class InferencePool {
  private workers: Worker[] = [];
  private roundRobin = 0;
  
  async initialize(modelPath: string, poolSize = 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(join(__dirname, 'inference.worker.js'), {
        workerData: { modelPath },
      });
      
      await new Promise<void>((resolve) => {
        worker.once('message', (msg) => {
          if (msg.type === 'ready') resolve();
        });
      });
      
      this.workers.push(worker);
    }
  }
  
  async infer(features: Float32Array, shape: number[]): Promise<number[]> {
    const worker = this.workers[this.roundRobin++ % this.workers.length];
    const id = Date.now();
    
    return new Promise((resolve) => {
      const handler = (msg: any) => {
        if (msg.type === 'result' && msg.id === id) {
          worker.off('message', handler);
          resolve(msg.output);
        }
      };
      worker.on('message', handler);
      worker.postMessage({ type: 'inference', id, features: Array.from(features), shape });
    });
  }
}
```

---

## ONNX Export from Training Pipeline

### Kedro Node for ONNX Export

```python
# services/training-pipeline/src/pipelines/export/nodes.py
import torch
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

def export_pytorch_to_onnx(
    model: torch.nn.Module,
    model_name: str,
    input_shape: tuple,
    output_path: str,
    quantize: bool = True
) -> Dict[str, Any]:
    """
    Export PyTorch model to ONNX format.
    
    Args:
        model: Trained PyTorch model
        model_name: Name for the exported model
        input_shape: Expected input shape (e.g., (1, 33) for features)
        output_path: Directory to save ONNX files
        quantize: Whether to apply dynamic quantization
    
    Returns:
        Dict with export metadata
    """
    model.eval()
    
    # Create dummy input
    dummy_input = torch.randn(*input_shape)
    
    # Export paths
    onnx_path = f"{output_path}/{model_name}.onnx"
    quantized_path = f"{output_path}/{model_name}_quantized.onnx"
    
    # Export to ONNX
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={
            'input': {0: 'batch_size'},
            'output': {0: 'batch_size'}
        },
        opset_version=17,
        do_constant_folding=True,
    )
    
    logger.info(f"Exported ONNX model to {onnx_path}")
    
    # Validate ONNX model
    onnx_model = onnx.load(onnx_path)
    onnx.checker.check_model(onnx_model)
    
    # Quantize for faster inference
    final_path = onnx_path
    if quantize:
        quantize_dynamic(
            onnx_path,
            quantized_path,
            weight_type=QuantType.QUInt8
        )
        final_path = quantized_path
        logger.info(f"Quantized model saved to {quantized_path}")
    
    return {
        "model_name": model_name,
        "onnx_path": final_path,
        "input_shape": list(input_shape),
        "quantized": quantize,
    }


def export_lightgbm_to_onnx(
    model,  # LightGBM Booster
    model_name: str,
    num_features: int,
    output_path: str
) -> Dict[str, Any]:
    """
    Export LightGBM model to ONNX using sklearn-onnx.
    """
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType
    
    initial_type = [('input', FloatTensorType([None, num_features]))]
    
    onnx_model = convert_sklearn(
        model,
        initial_types=initial_type,
        target_opset=17
    )
    
    onnx_path = f"{output_path}/{model_name}.onnx"
    with open(onnx_path, "wb") as f:
        f.write(onnx_model.SerializeToString())
    
    logger.info(f"Exported LightGBM to ONNX: {onnx_path}")
    
    return {
        "model_name": model_name,
        "onnx_path": onnx_path,
        "input_shape": [1, num_features],
    }
```

### Kedro Pipeline

```python
# services/training-pipeline/src/pipelines/export/pipeline.py
from kedro.pipeline import Pipeline, node
from .nodes import export_pytorch_to_onnx, export_lightgbm_to_onnx

def create_pipeline(**kwargs) -> Pipeline:
    return Pipeline([
        node(
            func=export_lightgbm_to_onnx,
            inputs=["lightgbm_model", "params:lightgbm_name", "params:num_features", "params:output_path"],
            outputs="lightgbm_export_metadata",
            name="export_lightgbm_onnx",
        ),
        node(
            func=export_pytorch_to_onnx,
            inputs=["tft_model", "params:tft_name", "params:tft_input_shape", "params:output_path"],
            outputs="tft_export_metadata",
            name="export_tft_onnx",
        ),
        node(
            func=export_pytorch_to_onnx,
            inputs=["mamba_model", "params:mamba_name", "params:mamba_input_shape", "params:output_path"],
            outputs="mamba_export_metadata",
            name="export_mamba_onnx",
        ),
        node(
            func=export_pytorch_to_onnx,
            inputs=["meta_learner", "params:meta_name", "params:meta_input_shape", "params:output_path"],
            outputs="meta_export_metadata",
            name="export_meta_onnx",
        ),
    ])
```

---

## Performance Optimization

### GPU Acceleration (CUDA EP)

```typescript
// Enable CUDA Execution Provider
const session = await ort.InferenceSession.create(modelPath, {
  executionProviders: [
    {
      name: 'cuda',
      deviceId: 0,  // GPU index
      cudnnConvAlgoSearch: 'EXHAUSTIVE',
    },
    'cpu',  // Fallback
  ],
});
```

### Model Warmup

```typescript
async warmupModels() {
  // Run dummy inference to warm up GPU
  const dummyFeatures = new Float32Array(33).fill(0);
  
  for (const modelName of this.sessions.keys()) {
    await this.runInference(modelName, dummyFeatures, [1, 33]);
  }
  
  this.logger.log('Model warmup complete');
}
```

### Memory Optimization

```typescript
// Reuse tensors to avoid allocation
class TensorPool {
  private pool: Map<string, ort.Tensor[]> = new Map();
  
  acquire(dtype: string, shape: number[]): ort.Tensor {
    const key = `${dtype}-${shape.join('x')}`;
    const available = this.pool.get(key) || [];
    
    if (available.length > 0) {
      return available.pop()!;
    }
    
    const data = new Float32Array(shape.reduce((a, b) => a * b, 1));
    return new ort.Tensor(dtype as ort.Tensor.Type, data, shape);
  }
  
  release(tensor: ort.Tensor) {
    const key = `${tensor.type}-${tensor.dims.join('x')}`;
    const pool = this.pool.get(key) || [];
    pool.push(tensor);
    this.pool.set(key, pool);
  }
}
```

---

## Integration with Compute Engine

```typescript
// apps/algo-worker/src/trading/trading-orchestrator.service.ts
import { Injectable } from '@nestjs/common';
import { computeFeatures, FeatureOutput } from '@repo/compute-engine';
import { OnnxInferenceService } from '../layers/03-PREDICTION/onnx-inference.service';

@Injectable()
export class TradingOrchestratorService {
  constructor(
    private inference: OnnxInferenceService,
    private riskManager: RiskManagerService,
    private executionService: ExecutionService,
  ) {}
  
  async processTick(marketData: MarketData): Promise<void> {
    // Step 1: Compute features (Rust, <5ms)
    const featureResult = computeFeatures(this.toFeatureInput(marketData));
    const features = this.toFloat32Array(featureResult.features);
    
    // Step 2: Run ML inference (ONNX, <50ms)
    const prediction = await this.inference.runEnsemble(features);
    
    // Step 3: Risk validation
    if (!this.riskManager.validateSignal(prediction)) {
      return;
    }
    
    // Step 4: Execute if confident
    if (prediction.predictions.confidence > 0.7) {
      await this.executionService.executeSignal(prediction);
    }
  }
  
  private toFloat32Array(features: FeatureOutput): Float32Array {
    return new Float32Array([
      features.pctStocksAboveVwap,
      features.pctStocksAboveEma20,
      features.weightedReturnTop10,
      // ... all 33 features
    ]);
  }
}
```

---

## Performance Targets

| Metric | Target | Typical |
|--------|--------|---------|
| Feature computation (Rust) | <5ms | ~2-3ms |
| LightGBM inference | <5ms | ~2ms |
| TFT inference (GPU) | <30ms | ~15-25ms |
| Mamba inference (GPU) | <20ms | ~10-15ms |
| Meta-learner inference | <5ms | ~2ms |
| **Total tick-to-decision** | **<100ms** | **~50-70ms** |

---

## Model Versioning

```typescript
// Model registry integration
interface ModelVersion {
  name: string;
  version: string;
  path: string;
  metrics: {
    accuracy: number;
    auc: number;
    latencyMs: number;
  };
  createdAt: Date;
}

// Load specific version
await inference.loadModel({
  name: 'lightgbm',
  path: `models/lightgbm_v${version}.onnx`,
});
```

---

## Related Documentation

- [AI_TRADING_ARCHITECTURE.md](./AI_TRADING_ARCHITECTURE.md) - Overall ML architecture
- [TIER1_MODELS.md](./TIER1_MODELS.md) - Model specifications
- [TRAINING_PIPELINE.md](./TRAINING_PIPELINE.md) - Training and export
- [algo-worker README](../../apps/algo-worker/README.md) - Trading engine
- [compute-engine README](../../packages/compute-engine/README.md) - Feature computation
