# Algo-Worker Inference Engine

> **54-feature real-time inference pipeline with ONNX Runtime and compute-engine integration.**

**Last Updated**: January 18, 2026

---

## Overview

The algo-worker receives 54 features from `compute-engine` (Rust) and runs multi-model inference using ONNX Runtime. This document describes the complete inference pipeline.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ALGO-WORKER INFERENCE PIPELINE                       │
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │ compute-engine  │ →  │ Feature Router  │ →  │ Model Pool      │          │
│  │ (54 features)   │    │                 │    │ (ONNX Workers)  │          │
│  │ <5ms            │    │                 │    │                 │          │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘          │
│                                                        │                     │
│                                                        ▼                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │ Strategy        │ ←  │ Meta-Learner    │ ←  │ Tier-1 Outputs  │          │
│  │ Selection       │    │ (Signal Fusion) │    │ (LGB, TFT, LiT) │          │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘          │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                                 │
│  │ Risk Manager    │ →  │ Order Execution │                                 │
│  └─────────────────┘    └─────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Feature Input (54 Features)

The algo-worker receives features from `compute-engine` via Redis:

```typescript
interface FeatureInput {
  timestamp: number;
  
  // === INDEX BREADTH (8) ===
  pctStocksAboveVwap: number;      // [0, 1]
  pctStocksAboveEma20: number;     // [0, 1]
  weightedReturnTop10: number;     // [-0.1, 0.1]
  advanceDeclineRatio: number;     // [0, ∞)
  breadthMomentum5m: number;       // [-0.05, 0.05]
  breadthVolatility: number;       // [0, 0.1]
  breadthThrust: number;           // [0, 1]
  newHighsLowsRatio: number;       // [-1, 1]
  
  // === NIFTY FUTURE (12) ===
  futPriceVsVwap: number;          // [-0.03, 0.03]
  futRangePosition: number;        // [0, 1]
  futReturn1m: number;             // [-0.02, 0.02]
  futReturn5m: number;             // [-0.05, 0.05]
  futReturn15m: number;            // [-0.08, 0.08]
  futAtrPercent: number;           // [0.005, 0.03]
  futVolumeZscore: number;         // [-3, 5]
  futOiChange: number;             // raw
  futOiChangePct: number;          // [-0.1, 0.1]
  futRsi14: number;                // [0, 100]
  futMacd: number;                 // [-200, 200]
  futMacdSignal: number;           // [-200, 200]
  
  // === OPTIONS (14) ===
  atmIv: number;                   // [0.08, 0.50]
  atmIvChange: number;             // [-0.05, 0.05]
  ivSkew: number;                  // [-0.1, 0.1]
  ivTermStructure: number;         // [-0.1, 0.1]
  gammaAtm: number;                // [0, 0.01]
  vegaAtm: number;                 // [0, 100]
  thetaAtm: number;                // [-50, 0]
  pcrOi: number;                   // [0.5, 2.0]
  pcrVolume: number;               // [0.3, 3.0]
  maxPainDistance: number;         // [0, 500]
  totalGammaExposure: number;      // [-100, 100]
  charmAtm: number;                // [-0.001, 0.001]
  vannaAtm: number;                // [-0.01, 0.01]
  ivPercentile30d: number;         // [0, 100]
  
  // === VOLATILITY (6) ===
  indiaVix: number;                // [10, 50]
  realizedVol5m: number;           // [0.05, 0.50]
  realizedVol15m: number;          // [0.05, 0.50]
  volExpansionRatio: number;       // [0.5, 2.0]
  ivRvRatio: number;               // [0.5, 3.0]
  vixPercentile30d: number;        // [0, 100]
  
  // === ORDER FLOW (8) ===
  bidAskSpreadBps: number;         // [1, 50]
  depthImbalance5: number;         // [-1, 1]
  ofi1s: number;                   // [-1, 1]
  ofi5s: number;                   // [-1, 1]
  ofi30s: number;                  // [-1, 1]
  tradeImbalance: number;          // [-1, 1]
  bidSlope: number;                // [0, 1000]
  askSlope: number;                // [0, 1000]
  
  // === TIME CONTEXT (6) ===
  minutesFromOpen: number;         // [0, 375]
  minutesToClose: number;          // [0, 375]
  dayOfWeek: number;               // [1, 5]
  isExpiryDay: number;             // {0, 1}
  daysToExpiry: number;            // [0, 30]
  sessionPhase: number;            // {1, 2, 3}
}
```

---

## Model Architecture

### Tier-1 Models (Base Predictions)

| Model | Input Features | Output | Horizon | Latency |
|-------|----------------|--------|---------|---------|
| **LightGBM** | 46 (excl. Order Flow) | Direction + Confidence | 5-15 min | <10ms |
| **TFT** | 46 + Sequence (120×46) | Multi-horizon quantiles | 1-60 min | <30ms |
| **LiT** | 14 (Order Flow + returns) | Microstructure signal | 10s-1min | <15ms |
| **Mamba** | 54 × 120 sequence | Regime classification | - | <20ms |

### Tier-2 Meta-Learner

Combines Tier-1 outputs with regime context:

```typescript
interface MetaLearnerInput {
  // Tier-1 model outputs
  lightGbmPrediction: number;      // [-1, 1]
  lightGbmConfidence: number;      // [0, 1]
  tftQuantiles: number[];          // [10%, 50%, 90%] × horizons
  litSignal: number;               // [-1, 1]
  mambaRegime: number[];           // softmax over regimes
  
  // Regime context
  currentRegime: string;           // 'TRENDING' | 'RANGING' | 'VOLATILE'
  regimeConfidence: number;        // [0, 1]
  
  // Market state
  atmIv: number;
  vixPercentile30d: number;
}

interface MetaLearnerOutput {
  finalSignal: number;             // [-1, 1]
  signalConfidence: number;        // [0, 1]
  modelWeights: {                  // Adaptive weights
    lightGbm: number;
    tft: number;
    lit: number;
  };
}
```

---

## ONNX Runtime Configuration

```typescript
// services/inference/onnx-config.ts
import * as ort from 'onnxruntime-node';

export const onnxConfig = {
  // GPU acceleration (if available)
  executionProviders: [
    { name: 'cuda', deviceId: 0 },
    { name: 'cpu' }
  ],
  
  // Session options
  graphOptimizationLevel: 'all',
  enableCpuMemArena: true,
  enableMemPattern: true,
  
  // Thread pool
  interOpNumThreads: 4,
  intraOpNumThreads: 2,
};

export async function createSession(modelPath: string): Promise<ort.InferenceSession> {
  return ort.InferenceSession.create(modelPath, {
    executionProviders: onnxConfig.executionProviders,
    graphOptimizationLevel: onnxConfig.graphOptimizationLevel as ort.GraphOptimizationLevel,
    enableCpuMemArena: onnxConfig.enableCpuMemArena,
    enableMemPattern: onnxConfig.enableMemPattern,
    interOpNumThreads: onnxConfig.interOpNumThreads,
    intraOpNumThreads: onnxConfig.intraOpNumThreads,
  });
}
```

---

## Worker Thread Pool

```typescript
// services/inference/model-pool.service.ts
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as ort from 'onnxruntime-node';

interface ModelWorkerConfig {
  modelPath: string;
  modelType: 'lightgbm' | 'tft' | 'lit' | 'mamba' | 'meta';
  inputShape: number[];
}

@Injectable()
export class ModelPoolService {
  private workers: Map<string, Worker[]> = new Map();
  private roundRobin: Map<string, number> = new Map();
  
  async initialize(configs: ModelWorkerConfig[]) {
    for (const config of configs) {
      const pool: Worker[] = [];
      const poolSize = config.modelType === 'lightgbm' ? 4 : 2;
      
      for (let i = 0; i < poolSize; i++) {
        const worker = new Worker(
          path.join(__dirname, 'inference.worker.js'),
          { workerData: config }
        );
        pool.push(worker);
      }
      
      this.workers.set(config.modelType, pool);
      this.roundRobin.set(config.modelType, 0);
    }
  }
  
  async infer(modelType: string, features: Float32Array): Promise<Float32Array> {
    const pool = this.workers.get(modelType)!;
    const idx = this.roundRobin.get(modelType)!;
    const worker = pool[idx % pool.length];
    
    this.roundRobin.set(modelType, idx + 1);
    
    return new Promise((resolve, reject) => {
      worker.once('message', (result) => resolve(result));
      worker.once('error', reject);
      worker.postMessage({ features });
    });
  }
}
```

---

## Feature Router

Routes features to appropriate models based on their requirements:

```typescript
// services/inference/feature-router.service.ts
@Injectable()
export class FeatureRouterService {
  
  routeToLightGBM(features: FeatureInput): Float32Array {
    // LightGBM uses 46 features (excludes Order Flow)
    return new Float32Array([
      // Index Breadth (8)
      features.pctStocksAboveVwap,
      features.pctStocksAboveEma20,
      features.weightedReturnTop10,
      features.advanceDeclineRatio,
      features.breadthMomentum5m,
      features.breadthVolatility,
      features.breadthThrust,
      features.newHighsLowsRatio,
      
      // NIFTY Future (12)
      features.futPriceVsVwap,
      features.futRangePosition,
      features.futReturn1m,
      features.futReturn5m,
      features.futReturn15m,
      features.futAtrPercent,
      features.futVolumeZscore,
      features.futOiChange,
      features.futOiChangePct,
      features.futRsi14,
      features.futMacd,
      features.futMacdSignal,
      
      // Options (14)
      features.atmIv,
      features.atmIvChange,
      features.ivSkew,
      features.ivTermStructure,
      features.gammaAtm,
      features.vegaAtm,
      features.thetaAtm,
      features.pcrOi,
      features.pcrVolume,
      features.maxPainDistance,
      features.totalGammaExposure,
      features.charmAtm,
      features.vannaAtm,
      features.ivPercentile30d,
      
      // Volatility (6)
      features.indiaVix,
      features.realizedVol5m,
      features.realizedVol15m,
      features.volExpansionRatio,
      features.ivRvRatio,
      features.vixPercentile30d,
      
      // Time Context (6)
      features.minutesFromOpen,
      features.minutesToClose,
      features.dayOfWeek,
      features.isExpiryDay,
      features.daysToExpiry,
      features.sessionPhase,
    ]);
  }
  
  routeToLiT(features: FeatureInput): Float32Array {
    // LiT uses 14 features (Order Flow + returns)
    return new Float32Array([
      // Order Flow (8)
      features.bidAskSpreadBps,
      features.depthImbalance5,
      features.ofi1s,
      features.ofi5s,
      features.ofi30s,
      features.tradeImbalance,
      features.bidSlope,
      features.askSlope,
      
      // Returns (6)
      features.futReturn1m,
      features.futReturn5m,
      features.futPriceVsVwap,
      features.futRangePosition,
      features.futVolumeZscore,
      features.futAtrPercent,
    ]);
  }
}
```

---

## Inference Pipeline

```typescript
// services/inference/inference-pipeline.service.ts
@Injectable()
export class InferencePipelineService {
  constructor(
    private modelPool: ModelPoolService,
    private featureRouter: FeatureRouterService,
    private regimeDetector: RegimeDetectorService,
  ) {}
  
  async runInference(features: FeatureInput): Promise<TradingSignal> {
    const startTime = performance.now();
    
    // Run Tier-1 models in parallel
    const [lgbResult, litResult, regimeResult] = await Promise.all([
      this.runLightGBM(features),
      this.runLiT(features),
      this.regimeDetector.detect(features),
    ]);
    
    // Run Meta-Learner
    const metaInput = this.prepareMetaInput(lgbResult, litResult, regimeResult, features);
    const metaOutput = await this.runMetaLearner(metaInput);
    
    const latencyMs = performance.now() - startTime;
    
    return {
      direction: metaOutput.finalSignal > 0.1 ? 'LONG' : 
                 metaOutput.finalSignal < -0.1 ? 'SHORT' : 'NEUTRAL',
      signal: metaOutput.finalSignal,
      confidence: metaOutput.signalConfidence,
      modelWeights: metaOutput.modelWeights,
      regime: regimeResult.regime,
      latencyMs,
      timestamp: features.timestamp,
    };
  }
  
  private async runLightGBM(features: FeatureInput) {
    const input = this.featureRouter.routeToLightGBM(features);
    return this.modelPool.infer('lightgbm', input);
  }
  
  private async runLiT(features: FeatureInput) {
    const input = this.featureRouter.routeToLiT(features);
    return this.modelPool.infer('lit', input);
  }
}
```

---

## Performance Targets

| Component | Target | Typical |
|-----------|--------|---------|
| Feature Receipt (Redis) | <1ms | 0.5ms |
| Feature Routing | <1ms | 0.2ms |
| LightGBM Inference | <10ms | 5-8ms |
| LiT Inference | <15ms | 10-12ms |
| Meta-Learner | <10ms | 5-7ms |
| **Total Pipeline** | **<50ms** | **25-35ms** |

---

## Related Documentation

- [FEATURE_SPECIFICATION.md](../../docs/ml/FEATURE_SPECIFICATION.md) - 54 feature definitions
- [compute-engine README](../../packages/compute-engine/README.md) - Feature computation
- [INFERENCE_PIPELINE.md](../../docs/ml/INFERENCE_PIPELINE.md) - ONNX Runtime details
- [TIER1_MODELS.md](../../docs/ml/TIER1_MODELS.md) - Model architectures
