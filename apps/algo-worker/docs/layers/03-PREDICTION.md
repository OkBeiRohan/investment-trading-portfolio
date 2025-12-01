# Layer 3: Prediction

> **ONNX model ensemble inference with sub-50ms latency**

**Latency Target**: <50ms per prediction (5 L0 models + 1 L1 meta-learner)

---

## Purpose

The Prediction layer runs ML model inference on engineered features from the Cortex layer. It manages an ensemble of 5 Level-0 models (XGBoost, CNN-LSTM, GINN, SVM, Transformer) and 1 Level-1 meta-learner (Logistic Regression stacker) using ONNX Runtime with GPU acceleration.

---

## Components

### **1. ModelLoaderService**

**File**: `src/prediction/model-loader.service.ts`

**Responsibilities**:

- Load ONNX models from `models/` directory on startup
- Initialize ONNX Runtime sessions with TensorRT/OpenVINO execution providers
- Hot-reload models when updated (file watcher)

### **2. EnsembleInferenceService**

**File**: `src/prediction/ensemble-inference.service.ts`

**Responsibilities**:

- Listen to `FeaturesComputedEvent`
- Run Level-0 models in parallel
- Run Level-1 meta-learner on Level-0 predictions
- Emit `PredictionCompletedEvent`

**Example**:

```typescript
@OnEvent('FeaturesComputedEvent')
async handleFeatures(event: FeaturesComputedEvent) {
  // Run Level-0 models in parallel
  const [xgb, cnn, ginn, svm, transformer] = await Promise.all([
    this.xgboostModel.predict(event.features),
    this.cnnLstmModel.predict(event.features),
    this.ginnModel.predict(event.features),
    this.svmModel.predict(event.features),
    this.transformerModel.predict(event.features),
  ]);

  // Stack predictions for meta-learner
  const l1Input = new Float32Array([xgb, cnn, ginn, svm, transformer]);
  const finalPred = await this.metaLearnerModel.predict(l1Input);

  this.eventBus.publish(new PredictionCompletedEvent(
    event.symbol,
    finalPred,
    { xgb, cnn, ginn, svm, transformer } // Individual predictions
  ));
}
```

---

## Models

### **Level-0 Models** (Base Models)

| Model       | File               | Input Shape | Output            | Target AUC |
| ----------- | ------------------ | ----------- | ----------------- | ---------- |
| XGBoost     | `xgboost.onnx`     | (1, 50)     | Probability (0-1) | >0.70      |
| CNN-LSTM    | `cnn_lstm.onnx`    | (1, 60, 50) | Probability (0-1) | >0.68      |
| GINN        | `ginn.onnx`        | (1, 50)     | Probability (0-1) | >0.69      |
| SVM         | `svm.onnx`         | (1, 50)     | Probability (0-1) | >0.67      |
| Transformer | `transformer.onnx` | (1, 60, 50) | Probability (0-1) | >0.70      |

### **Level-1 Model** (Meta-Learner)

| Model               | File                | Input Shape | Output            | Target AUC |
| ------------------- | ------------------- | ----------- | ----------------- | ---------- |
| Logistic Regression | `meta_learner.onnx` | (1, 5)      | Final Probability | >0.73      |

---

## ONNX Runtime Configuration

**File**: `src/prediction/onnx.config.ts`

```typescript
export const onnxConfig = {
  executionProviders: [
    'TensorrtExecutionProvider', // NVIDIA GPU
    'CUDAExecutionProvider', // Fallback GPU
    'CPUExecutionProvider', // Fallback CPU
  ],
  graphOptimizationLevel: 'all',
  enableProfiling: false,
  intraOpNumThreads: 4,
  interOpNumThreads: 2,
};
```

---

## Events Consumed

### **`FeaturesComputedEvent`**

**Source**: Cortex layer

---

## Events Published

### **`PredictionCompletedEvent`**

```typescript
export class PredictionCompletedEvent {
  constructor(
    public readonly symbol: string,
    public readonly timestamp: number,
    public readonly prediction: number, // Final probability (0-1)
    public readonly l0Predictions: {
      // Individual model predictions
      xgboost: number;
      cnnLstm: number;
      ginn: number;
      svm: number;
      transformer: number;
    },
  ) {}
}
```

**Consumed By**: Cognition layer (StrategySelectionService)

---

## Performance Targets

| Model                  | Inference Time (p95) | Throughput              |
| ---------------------- | -------------------- | ----------------------- |
| XGBoost                | <5ms                 | >1000 inferences/sec    |
| CNN-LSTM               | <15ms                | >500 inferences/sec     |
| GINN                   | <12ms                | >600 inferences/sec     |
| SVM                    | <8ms                 | >800 inferences/sec     |
| Transformer            | <20ms                | >400 inferences/sec     |
| **Meta-Learner**       | <3ms                 | >2000 inferences/sec    |
| **Total (End-to-End)** | **<50ms**            | **>100 inferences/sec** |

---

## Monitoring

### **Metrics** (Prometheus)

```typescript
prediction.inference_duration_ms{model="xgboost"}     // Histogram
prediction.inference_duration_ms{model="meta_learner"} // Histogram
prediction.predictions_total{model="..."}             // Counter
prediction.model_load_errors_total{model="..."}       // Counter
prediction.prediction_distribution{bucket="0.0-0.2"}  // Histogram
```

---

## Testing

**File**: `test/prediction.e2e-spec.ts`

```typescript
describe('Prediction Layer (e2e)', () => {
  it('should run ensemble inference', async () => {
    const features = new Float32Array(50).fill(0.5);
    eventBus.publish(new FeaturesComputedEvent('NIFTY', Date.now(), features));

    const event = await waitForEvent(PredictionCompletedEvent, 1000);
    expect(event.prediction).toBeGreaterThan(0);
    expect(event.prediction).toBeLessThan(1);
  });
});
```

---

## Dependencies

- **Upstream**: Cortex layer (`FeaturesComputedEvent`)
- **Downstream**: Cognition layer (`PredictionCompletedEvent`)
- **External**: ONNX Runtime, trained models from training-pipeline

---

## See Also

- [Layer 2: Cortex](./02-CORTEX.md)
- [Layer 4: Cognition](./04-COGNITION.md)
- [Training Pipeline - Export ONNX](../../training-pipeline/docs/pipelines/EXPORT_ONNX.md)
