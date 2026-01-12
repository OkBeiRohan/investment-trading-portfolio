# Layer 4: Signal/Prediction Engine

**Purpose**: ML model ensemble for forecasting short-term price direction and volatility

---

## Overview

The Prediction Engine runs ensemble of ML models in Worker Threads to generate trading signals without blocking the event loop. Uses ONNX Runtime with GPU acceleration.

---

## Components

### ModelLoaderService

- Loads ONNX models from disk
- Initializes ONNX Runtime sessions
- Manages TensorRT/OpenVINO execution providers

### PredictionWorkerPool

- Worker Thread pool for GPU inference
- SharedArrayBuffer for zero-copy data transfer
- Load balancing across workers

### EnsembleService

- Aggregates predictions from multiple models
- Weighted voting based on recent performance
- Confidence calibration

---

## Model Ensemble

### Level-0 Models (6 Core + 4 Optional)

**Core Models**:

1. **XGBoost**: Gradient boosting for tabular features
2. **LightGBM**: Fast gradient boosting with GPU support
3. **CNN-LSTM**: Convolutional + recurrent for sequences
4. **GINN**: Graph-Informed Neural Network
5. **SVM**: Support Vector Machine with RBF kernel
6. **Transformer**: Autoformer/Informer for long sequences

**Optional Models**: 7. **TimesNet-MLP**: Time-series with MLP backbone 8. **WFTNet-MLP**: Wavelet + Fourier transforms 9. **PatchTST**: Patching for time-series 10. **KAN**: Kolmogorov-Arnold Networks (interpretable)

### Level-1 Meta-Learner

- Stacking ensemble (XGBoost meta-model)
- Trained on out-of-fold predictions
- Learns which models to trust in which regimes

---

## Inference Pipeline

```typescript
// Worker Thread (runs on GPU)
class PredictionWorker {
  private session: ort.InferenceSession;

  async initialize(modelPath: string) {
    this.session = await ort.InferenceSession.create(modelPath, {
      executionProviders: [
        'TensorrtExecutionProvider', // NVIDIA GPU
        'OpenVINOExecutionProvider', // Intel fallback
        'CPUExecutionProvider', // Universal fallback
      ],
      graphOptimizationLevel: 'all',
    });
  }

  /**
   * Infer from features (SharedArrayBuffer for zero-copy)
   * @param featuresBuffer - Float32Array [Batch=1, Seq=60, Feat=50]
   * @returns Prediction [Batch=1, Classes=3] (UP, NEUTRAL, DOWN)
   */
  async infer(featuresBuffer: SharedArrayBuffer): Promise<Float32Array> {
    const features = new Float32Array(featuresBuffer);
    const inputTensor = new ort.Tensor('float32', features, [1, 60, 50]);

    const output = await this.session.run({ input: inputTensor });
    return output.output.data as Float32Array;
  }
}

// Main Thread
class PredictionService {
  private workerPool: PredictionWorkerPool;

  async predict(features: Float32Array): Promise<Signal> {
    // Copy to SharedArrayBuffer
    const sharedBuffer = new SharedArrayBuffer(features.byteLength);
    new Float32Array(sharedBuffer).set(features);

    // Distribute to workers
    const predictions = await this.workerPool.inferAll(sharedBuffer);

    // Ensemble
    return this.ensemble.aggregate(predictions);
  }
}
```

---

## Signal Types

```typescript
interface TradingSignal {
  timestamp: number;
  prediction: 'VOL_UP' | 'VOL_DOWN' | 'NEUTRAL';
  confidence: number; // 0-1
  regime: RegimeType; // From Layer 3
  modelPredictions: {
    xgboost: number;
    lightgbm: number;
    cnn_lstm: number;
    ginn: number;
    svm: number;
    transformer: number;
    // ... optional models
  };
  metaLearnerPrediction: number;
  features: Float32Array; // For explainability
}
```

---

## Ensemble Strategies

### 1. Weighted Voting

```typescript
function weightedVote(predictions: ModelPredictions): Signal {
  const weights = this.getWeights(); // Based on recent performance

  const votesUp = predictions.models
    .map((p, i) => (p === 'UP' ? weights[i] : 0))
    .reduce((a, b) => a + b, 0);

  const votesDown = predictions.models
    .map((p, i) => (p === 'DOWN' ? weights[i] : 0))
    .reduce((a, b) => a + b, 0);

  const confidence = Math.max(votesUp, votesDown) / weights.sum();

  return {
    prediction: votesUp > votesDown ? 'VOL_UP' : 'VOL_DOWN',
    confidence,
  };
}
```

### 2. Meta-Learner Stacking

```typescript
// Level-1 XGBoost takes Level-0 predictions as features
const metaFeatures = [
  predictions.xgboost,
  predictions.lightgbm,
  predictions.cnn_lstm,
  predictions.ginn,
  predictions.svm,
  predictions.transformer,
  ...regimeFeatures,
];

const metaPrediction = await metaLearner.predict(metaFeatures);
```

### 3. Regime-Specific Ensembles

```typescript
// Different model weights for different regimes
const weights = regimeWeights[currentRegime];
// Example: In volatile regime, CNN-LSTM gets higher weight
```

---

## Model Performance Tracking

```typescript
interface ModelPerformance {
  modelId: string;
  accuracy: number; // Rolling 1-hour accuracy
  sharpeRatio: number; // Backtest sharpe
  latency: number; // Inference time
  lastUpdated: number;
}

class PerformanceTracker {
  updateMetrics(modelId: string, prediction: number, actual: number) {
    const correct = Math.sign(prediction) === Math.sign(actual);
    this.metrics[modelId].accuracy = this.ema(
      this.metrics[modelId].accuracy,
      correct ? 1 : 0,
      0.05, // Alpha
    );
  }

  getWeights(): number[] {
    // Higher weight to better-performing models
    const accuracies = Object.values(this.metrics).map((m) => m.accuracy);
    return softmax(accuracies);
  }
}
```

---

## Drift Detection

```typescript
class DriftDetector {
  private baseline: FeatureDistribution;

  detectDrift(features: Float32Array): boolean {
    const current = this.computeDistribution(features);
    const kl = this.klDivergence(this.baseline, current);

    if (kl > this.threshold) {
      this.logger.warn('Feature drift detected', { kl });
      this.eventBus.emit(new DriftDetectedEvent({ kl }));
      return true;
    }
    return false;
  }
}
```

---

## Configuration

```typescript
export const predictionEngineConfig = {
  models: {
    enabled: ['xgboost', 'lightgbm', 'cnn_lstm', 'ginn', 'svm', 'transformer'],
    paths: {
      xgboost: 'models/xgboost_classifier.onnx',
      lightgbm: 'models/lightgbm_classifier.onnx',
      // ...
    },
  },
  workers: {
    poolSize: 4, // Number of Worker Threads
    gpuMemory: 2048, // MB per worker
  },
  ensemble: {
    strategy: 'meta_learner', // 'weighted_vote' | 'meta_learner'
    minConfidence: 0.6, // Filter low-confidence signals
  },
  drift: {
    enabled: true,
    checkInterval: 3600000, // 1 hour
    klThreshold: 0.1,
  },
};
```

---

## Performance Targets

- **Inference Latency**: <50ms p95 (GPU)
- **Throughput**: >100 predictions/second
- **Accuracy**: >60% directional accuracy (1-min horizon)
- **Sharpe Ratio**: >1.5 (backtest)

---

## Monitoring Metrics

- `prediction_engine.inference_duration_ms` (per model)
- `prediction_engine.predictions_generated_total`
- `prediction_engine.ensemble_confidence` (histogram)
- `prediction_engine.model_accuracy` (per model, rolling)
- `prediction_engine.drift_detected_total`

---

## Testing

```typescript
describe('PredictionEngine', () => {
  it('should infer in <50ms with GPU', async () => {
    const features = new Float32Array(1 * 60 * 50);
    const start = performance.now();

    const signal = await predictionEngine.predict(features);

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50);
  });

  it('should aggregate ensemble predictions correctly', () => {
    const predictions = {
      xgboost: 0.7,
      lightgbm: 0.6,
      cnn_lstm: 0.8,
      // ... all models vote UP
    };

    const signal = ensemble.aggregate(predictions);
    expect(signal.prediction).toBe('VOL_UP');
    expect(signal.confidence).toBeGreaterThan(0.6);
  });
});
```

---

**See Also**:

- [03-REGIME-DETECTOR.md](./03-REGIME-DETECTOR.md) - Previous layer
- [05-STRATEGY-MANAGER.md](./05-STRATEGY-MANAGER.md) - Next layer
- [PERFORMANCE_OPTIMIZATION.md](../PERFORMANCE_OPTIMIZATION.md) - Worker Thread patterns
