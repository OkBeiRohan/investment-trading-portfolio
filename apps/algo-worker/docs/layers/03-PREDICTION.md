# Layer 3: Prediction Engine

**Purpose**: Multi-model ONNX ensemble inference with regime detection and adaptive signal fusion

---

## Overview

The Prediction layer runs parallel inference on ONNX models, classifies market regime, and fuses signals via a meta-learner. It operates on 117 features computed by the Rust compute-engine.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 3: PREDICTION ENGINE                          │
│                                                                              │
│  [54 Features] ──┬──→ [LightGBM] ──┐                                        │
│                  ├──→ [LiT] ───────┼──→ [Meta-Learner] ──→ [Trading Signal] │
│                  └──→ [TFT] ───────┘          ↑                             │
│                                         [Regime Weights]                     │
│                                                                              │
│  Latency Target: <50ms (GPU)                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### Model Pool

Pre-loaded ONNX models at startup (zero cold-start):

| Model | Features | Horizon | Purpose | Latency |
|-------|----------|---------|---------|---------|
| **LightGBM** | 46 | 5-15 min | Macro direction | ~20ms |
| **LiT** | 14 (Order Flow) | 10s-1 min | Microstructure | ~8ms |
| **TFT** | 46 × 120 | Multi-horizon | Regime/volatility | ~35ms |
| **Meta-Learner** | 3 (model outputs) | - | Adaptive fusion | ~2ms |

```typescript
@Injectable()
export class ModelPoolService implements OnModuleInit {
  private models: Map<string, onnxruntime.InferenceSession> = new Map();
  
  async onModuleInit() {
    // Pre-load all models at startup
    await Promise.all([
      this.loadModel('lightgbm', 'models/lightgbm_54.onnx'),
      this.loadModel('lit', 'models/lit_14.onnx'),
      this.loadModel('tft', 'models/tft_sequence.onnx'),
      this.loadModel('meta', 'models/meta_learner.onnx'),
    ]);
  }
  
  async runInference(modelName: string, input: Float32Array): Promise<Float32Array> {
    const session = this.models.get(modelName);
    const tensor = new onnxruntime.Tensor('float32', input, [1, input.length]);
    const result = await session.run({ input: tensor });
    return result.output.data as Float32Array;
  }
}
```

### Inference Workers

Parallel inference using Worker Threads to avoid blocking event loop:

```typescript
@Injectable()
export class InferenceWorkerService {
  private workerPool: StaticPool<InferenceData, InferenceResult>;
  
  constructor() {
    this.workerPool = new StaticPool({
      size: 4, // 4 parallel workers
      task: './inference.worker.js',
    });
  }
  
  async runParallelInference(features: FeatureOutput): Promise<EnsembleResult> {
    // Run models in parallel
    const [lgbm, lit, tft] = await Promise.all([
      this.workerPool.exec({ model: 'lightgbm', features: features.macro46 }),
      this.workerPool.exec({ model: 'lit', features: features.orderFlow14 }),
      this.workerPool.exec({ model: 'tft', features: features.sequence }),
    ]);
    
    // Fuse with meta-learner
    const metaInput = new Float32Array([lgbm.prob, lit.prob, tft.prob]);
    const finalProb = await this.runMeta(metaInput);
    
    return {
      signal: this.probToSignal(finalProb),
      confidence: finalProb,
      modelWeights: { lgbm: 0.5, lit: 0.3, tft: 0.2 },
    };
  }
}
```

### Regime Detector

Real-time market regime classification for model weighting:

```typescript
type MarketRegime = 'TRENDING' | 'RANGING' | 'VOLATILE' | 'LOW_VOLATILITY';

@Injectable()
export class RegimeDetectorService {
  detectRegime(features: FeatureOutput): RegimeResult {
    const { fut_atr_pct, india_vix, pct_stocks_above_vwap } = features;
    
    // Volatile: VIX spike
    if (india_vix > 20) {
      return { regime: 'VOLATILE', confidence: 0.85 };
    }
    
    // Trending: Strong breadth
    if (pct_stocks_above_vwap > 0.7 || pct_stocks_above_vwap < 0.3) {
      const direction = pct_stocks_above_vwap > 0.5 ? 'UP' : 'DOWN';
      return { regime: 'TRENDING', direction, confidence: 0.75 };
    }
    
    // Low volatility: VIX low, ATR low
    if (india_vix < 12 && fut_atr_pct < 0.01) {
      return { regime: 'LOW_VOLATILITY', confidence: 0.70 };
    }
    
    return { regime: 'RANGING', confidence: 0.60 };
  }
  
  getModelWeights(regime: MarketRegime): ModelWeights {
    switch (regime) {
      case 'TRENDING':
        return { lgbm: 0.6, lit: 0.2, tft: 0.2 }; // Trust macro
      case 'VOLATILE':
        return { lgbm: 0.3, lit: 0.4, tft: 0.3 }; // Trust microstructure
      case 'RANGING':
        return { lgbm: 0.4, lit: 0.3, tft: 0.3 }; // Balanced
      case 'LOW_VOLATILITY':
        return { lgbm: 0.3, lit: 0.3, tft: 0.4 }; // Trust TFT
    }
  }
}
```

---

## Model Architecture

### LightGBM (Macro Direction)

**Purpose**: 5-15 minute directional forecast

**Input**: 46 features (excluding 8 Order Flow features)
- Index Breadth (8), Futures (12), Options (14), Volatility (6), Time Context (6)

**Output**: 3-class probabilities `[VOL_DOWN, NEUTRAL, VOL_UP]`

```python
# Training configuration
params = {
    'objective': 'multiclass',
    'num_class': 3,
    'learning_rate': 0.01,
    'num_leaves': 64,
    'max_depth': 8,
    'feature_fraction': 0.8,
    'bagging_fraction': 0.8,
}
```

### LiT (Microstructure)

**Purpose**: 10s-1min order flow signal

**Input**: 14 Order Flow features
- `ofi_1s`, `ofi_5s`, `ofi_30s`
- `trade_imbalance`, `depth_imbalance_5`
- `bid_ask_slope`, `volume_at_bid_pct`
- etc.

**Output**: 3-class probabilities `[SELL_PRESSURE, NEUTRAL, BUY_PRESSURE]`

### TFT (Regime & Volatility)

**Purpose**: Multi-horizon regime classification

**Input**: 46 features × 120 timesteps (2 min history @ 1s)

**Output**: 
- Regime probabilities: `[TRENDING, RANGING, VOLATILE, LOW_VOL]`
- Volatility forecast: 15min ahead

---

## Signal Generation

### Trading Signal

```typescript
interface TradingSignal {
  timestamp: number;
  direction: 'VOL_UP' | 'VOL_DOWN' | 'NEUTRAL';
  confidence: number; // 0-1
  modelOutputs: {
    lgbm: { probs: number[]; prediction: string };
    lit: { probs: number[]; prediction: string };
    tft: { regime: string; volForecast: number };
  };
  regime: MarketRegime;
  fusionWeights: { lgbm: number; lit: number; tft: number };
}
```

### Signal Thresholds

| Confidence | Action |
|------------|--------|
| >0.70 | Strong signal → Execute |
| 0.60-0.70 | Medium signal → Smaller position |
| <0.60 | Weak signal → Skip |

---

## Performance Optimization

### GPU Inference (TensorRT)

```typescript
const sessionOptions: onnxruntime.InferenceSession.SessionOptions = {
  executionProviders: ['tensorrt', 'cuda', 'cpu'],
  enableCpuMemArena: true,
  enableMemPattern: true,
  graphOptimizationLevel: 'all',
};
```

### Batch Processing

```typescript
// Batch multiple timesteps for TFT
const batchSize = 4;
const batchTensor = new onnxruntime.Tensor('float32', batchData, [batchSize, 120, 46]);
```

### Latency Breakdown

| Stage | Target | Actual |
|-------|--------|--------|
| Feature preparation | <1ms | 0.5ms |
| LightGBM inference | <25ms | 20ms |
| LiT inference | <10ms | 8ms |
| TFT inference | <40ms | 35ms |
| Meta-learner | <5ms | 2ms |
| **Total (parallel)** | **<50ms** | **~45ms** |

---

## Event Output

```typescript
interface PredictionCompletedEvent {
  timestamp: number;
  signal: TradingSignal;
  latency: {
    totalMs: number;
    lgbmMs: number;
    litMs: number;
    tftMs: number;
    metaMs: number;
  };
  metadata: {
    modelVersions: Record<string, string>;
    regime: MarketRegime;
  };
}
```

---

## Monitoring Metrics

- `prediction.inference_duration_ms` (histogram by model)
- `prediction.signals_generated_total` (counter by direction)
- `prediction.regime_changes_total` (counter by regime)
- `prediction.model_agreement_ratio` (gauge)
- `prediction.confidence_score` (histogram)

---

## Testing

```typescript
describe('PredictionLayer', () => {
  it('should complete inference in <50ms', async () => {
    const features = generateMockFeatures();
    const start = performance.now();
    const signal = await predictionService.predict(features);
    expect(performance.now() - start).toBeLessThan(50);
  });
  
  it('should detect trending regime correctly', () => {
    const features = { pct_stocks_above_vwap: 0.85, india_vix: 15 };
    const regime = regimeDetector.detectRegime(features);
    expect(regime.regime).toBe('TRENDING');
  });
});
```

---

**See Also**:
- [02-FEATURE-ENGINE.md](./02-FEATURE-ENGINE.md) - Previous layer
- [04-STRATEGY-RISK.md](./04-STRATEGY-RISK.md) - Next layer
- [INFERENCE_ENGINE.md](../INFERENCE_ENGINE.md) - Detailed inference docs
