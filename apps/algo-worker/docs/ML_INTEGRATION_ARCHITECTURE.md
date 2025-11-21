# ML Integration Architecture Analysis

## Executive Summary

**Recommendation**: Use **Option 2 (ONNX Runtime in TypeScript)** for production deployment with **Option 3 (Python Microservice)** for model training and experimentation.

This approach gives you:

- ✅ Type safety across the entire codebase
- ✅ Low latency (<10ms inference)
- ✅ No Python runtime dependency in production
- ✅ Flexibility to train models in Python
- ✅ Single deployment artifact (NestJS)
- ✅ Proper monorepo integration

---

## Architecture Options Evaluated

### Option 1: Python Child Process (Initial Proposal)

**Architecture:**

```
NestJS (TypeScript)
    ↓ child_process.spawn()
Python Script
    ↓
TensorFlow/XGBoost Models
```

**Pros:**

- Direct use of Python ML libraries
- Familiar ML ecosystem (scikit-learn, pandas, etc.)
- Easy to prototype

**Cons:**

- ❌ Inter-process communication overhead (50-200ms latency)
- ❌ No type safety between TS and Python
- ❌ Complex deployment (need Python runtime + dependencies)
- ❌ Difficult error handling across process boundary
- ❌ Resource management complexity (orphaned processes)
- ❌ Not suitable for real-time trading (<50ms requirement)

**Verdict:** ❌ **Not recommended** for production trading system

---

### Option 2: ONNX Runtime in TypeScript ⭐ **RECOMMENDED**

**Architecture:**

```
NestJS (TypeScript)
    ↓
ONNX Runtime (onnxruntime-node)
    ↓
.onnx Model Files
    ↑
Python (Training Only)
```

**How It Works:**

1. Train models in Python (TensorFlow, XGBoost, scikit-learn)
2. Export models to ONNX format (.onnx files)
3. Load models in TypeScript using `onnxruntime-node`
4. Run inference directly in NestJS

**Pros:**

- ✅ **Sub-10ms inference latency** (native performance)
- ✅ **Full type safety** - TypeScript end-to-end
- ✅ **Single deployment** - No Python runtime needed
- ✅ **Native integration** with NestJS modules
- ✅ **Cross-platform** - Works on CPU/GPU/WASM
- ✅ **Industry standard** - Used by Microsoft, Meta, AWS
- ✅ **Monorepo friendly** - Pure TypeScript package
- ✅ **Proper error handling** - No IPC complexity

**Cons:**

- ⚠️ One-time model export step (Python → ONNX)
- ⚠️ Some Python libraries need conversion helpers
- ⚠️ Limited support for custom Python code in models

**Implementation:**

```typescript
// apps/algo-worker/src/engines/signal/model-loader.service.ts
import * as ort from 'onnxruntime-node';

@Injectable()
export class ModelLoaderService {
  private models: Map<string, ort.InferenceSession> = new Map();

  async loadModel(name: string, path: string): Promise<void> {
    const session = await ort.InferenceSession.create(path);
    this.models.set(name, session);
  }

  async predict(modelName: string, features: Float32Array): Promise<number> {
    const session = this.models.get(modelName);
    const tensor = new ort.Tensor('float32', features, [1, features.length]);
    const results = await session.run({ input: tensor });
    return results.output.data[0] as number;
  }
}
```

**Model Export (Python):**

```python
# Training script (Python)
import xgboost as xgb
import onnxmltools
from skl2onnx.common.data_types import FloatTensorType

# Train model
model = xgb.XGBClassifier().fit(X_train, y_train)

# Export to ONNX
initial_type = [('input', FloatTensorType([None, n_features]))]
onnx_model = onnxmltools.convert_xgboost(model, initial_types=initial_type)

# Save
with open('models/xgboost.onnx', 'wb') as f:
    f.write(onnx_model.SerializeToString())
```

**Verdict:** ✅ **Highly recommended** for production

---

### Option 3: Separate Python FastAPI Microservice

**Architecture:**

```
NestJS (algo-worker)
    ↓ HTTP/gRPC
FastAPI Service (Python)
    ↓
TensorFlow/XGBoost Models
```

**Pros:**

- ✅ Full Python ML ecosystem access
- ✅ Independent scaling (can scale ML service separately)
- ✅ Clear separation of concerns
- ✅ Can reuse models across multiple clients

**Cons:**

- ❌ Network latency (10-50ms per request)
- ❌ Additional deployment complexity (2 services)
- ❌ Need container orchestration
- ❌ API versioning between services
- ❌ More failure points (network, service downtime)
- ❌ Type safety only within each service

**When to Use:**

- Multiple apps need the same models
- Models are too large (>500MB)
- Need to scale inference independently
- Team has strong Python expertise

**Verdict:** ⚠️ **Consider for specific use cases**, not as primary approach

---

### Option 4: TensorFlow.js (Pure JavaScript)

**Architecture:**

```
NestJS (TypeScript)
    ↓
TensorFlow.js
    ↓
.json Model Files
```

**Pros:**

- ✅ Pure JavaScript/TypeScript
- ✅ No dependencies outside npm
- ✅ Browser + Node.js compatible

**Cons:**

- ❌ Limited algorithm support (no XGBoost, SVM)
- ❌ Slower than ONNX Runtime
- ❌ Large bundle sizes
- ❌ Can't use scikit-learn models

**Verdict:** ❌ **Not suitable** - Need XGBoost, SVM, GARCH models

---

## Recommended Hybrid Approach

### Phase 1: Training (Python) 🐍

**Location:** `/apps/algo-worker/ml/` (Python scripts)

**Purpose:** Model development, training, backtesting

**Stack:**

- Python 3.11
- TensorFlow 2.17
- XGBoost 2.1
- scikit-learn 1.5
- ARCH (GARCH models)

**Output:**

- Trained models in `.onnx` format
- Model metadata (accuracy, feature importance, etc.)
- Training logs

```bash
apps/algo-worker/
├── ml/                          # Python training scripts
│   ├── requirements.txt         # Python dependencies
│   ├── data/
│   │   ├── loader.py
│   │   └── preprocessor.py
│   ├── models/
│   │   ├── xgboost_model.py
│   │   ├── cnn_lstm_model.py
│   │   ├── ginn_model.py
│   │   └── svm_model.py
│   ├── training/
│   │   ├── train_all.py
│   │   └── export_to_onnx.py   # Export trained models
│   └── notebooks/
└── trained_models/              # Exported ONNX models
    ├── xgboost.onnx
    ├── cnn_lstm.onnx
    ├── ginn.onnx
    ├── svm.onnx
    └── stacking.onnx
```

### Phase 2: Inference (TypeScript) ⚡

**Location:** `/apps/algo-worker/src/engines/signal/` (NestJS modules)

**Purpose:** Real-time inference in production

**Stack:**

- NestJS 11
- onnxruntime-node
- TypeScript 5.9

**Integration:**

```typescript
// apps/algo-worker/src/engines/signal/signal-engine.module.ts
import { Module } from '@nestjs/common';
import { SignalEngineService } from './signal-engine.service';
import { ModelLoaderService } from './model-loader.service';
import { FeatureEngineeringService } from '../data/feature-engineering.service';

@Module({
  providers: [
    SignalEngineService,
    ModelLoaderService,
    FeatureEngineeringService,
  ],
  exports: [SignalEngineService],
})
export class SignalEngineModule {}
```

```typescript
// apps/algo-worker/src/engines/signal/signal-engine.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModelLoaderService } from './model-loader.service';
import { collections } from '@repo/database';
import type { TradingSignal } from '@repo/schema';

@Injectable()
export class SignalEngineService implements OnModuleInit {
  constructor(private readonly modelLoader: ModelLoaderService) {}

  async onModuleInit() {
    // Load all models at startup
    await this.modelLoader.loadModel('xgboost', 'trained_models/xgboost.onnx');
    await this.modelLoader.loadModel(
      'cnn_lstm',
      'trained_models/cnn_lstm.onnx',
    );
    await this.modelLoader.loadModel('ginn', 'trained_models/ginn.onnx');
    await this.modelLoader.loadModel('svm', 'trained_models/svm.onnx');
    await this.modelLoader.loadModel(
      'stacking',
      'trained_models/stacking.onnx',
    );
  }

  async generateSignal(features: Float32Array): Promise<TradingSignal> {
    // Get Level-0 predictions
    const xgboostProb = await this.modelLoader.predict('xgboost', features);
    const cnnLstmProb = await this.modelLoader.predict('cnn_lstm', features);
    const ginnProb = await this.modelLoader.predict('ginn', features);
    const svmProb = await this.modelLoader.predict('svm', features);

    // Stack predictions for meta-learner
    const metaFeatures = new Float32Array([
      xgboostProb,
      cnnLstmProb,
      ginnProb,
      svmProb,
    ]);

    const finalProbability = await this.modelLoader.predict(
      'stacking',
      metaFeatures,
    );

    // Create signal
    const signal: TradingSignal = {
      userId: 'system',
      timestamp: new Date(),
      prediction: finalProbability > 0.55 ? 'VOL_UP' : 'VOL_DOWN',
      confidence: finalProbability,
      probability: finalProbability,
      modelContributions: {
        xgboost: xgboostProb,
        cnnLstm: cnnLstmProb,
        ginn: ginnProb,
        svm: svmProb,
      },
      features: Array.from(features).reduce(
        (acc, val, idx) => {
          acc[`feature_${idx}`] = val;
          return acc;
        },
        {} as Record<string, unknown>,
      ),
      metadata: {
        modelVersions: {
          xgboost: '1.0.0',
          cnnLstm: '1.0.0',
          ginn: '1.0.0',
          svm: '1.0.0',
          stacking: '1.0.0',
        },
        latencyMs: 0, // Will be calculated
      },
    };

    // Persist to MongoDB
    await collections.tradingSignals.create(signal);

    return signal;
  }
}
```

---

## Model Export Guide

### 1. XGBoost → ONNX

```python
# ml/training/export_to_onnx.py
import xgboost as xgb
import onnxmltools
from onnxconverter_common import FloatTensorType

def export_xgboost(model, n_features: int, output_path: str):
    initial_type = [('input', FloatTensorType([None, n_features]))]
    onnx_model = onnxmltools.convert_xgboost(
        model,
        initial_types=initial_type,
        target_opset=12
    )
    onnxmltools.utils.save_model(onnx_model, output_path)
```

### 2. TensorFlow/Keras → ONNX

```python
import tf2onnx
import tensorflow as tf

def export_keras(model, output_path: str):
    spec = (tf.TensorSpec(model.input_shape, tf.float32, name="input"),)
    output_path = output_path.replace('.onnx', '')
    tf2onnx.convert.from_keras(
        model,
        input_signature=spec,
        opset=13,
        output_path=f"{output_path}.onnx"
    )
```

### 3. Scikit-learn (SVM) → ONNX

```python
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

def export_sklearn(model, n_features: int, output_path: str):
    initial_type = [('float_input', FloatTensorType([None, n_features]))]
    onx = convert_sklearn(model, initial_types=initial_type, target_opset=12)
    with open(output_path, "wb") as f:
        f.write(onx.SerializeToString())
```

### 4. Complete Export Script

```python
# ml/training/export_all_models.py
#!/usr/bin/env python3
"""
Export all trained models to ONNX format
Run after training: python ml/training/export_all_models.py
"""

import joblib
from tensorflow import keras
from export_to_onnx import export_xgboost, export_keras, export_sklearn

def main():
    print("Exporting models to ONNX format...")

    # 1. XGBoost
    print("\n1. Exporting XGBoost...")
    xgb_model = joblib.load('trained_models/xgboost/model.pkl')
    export_xgboost(xgb_model, n_features=20, output_path='trained_models/xgboost.onnx')

    # 2. CNN-LSTM
    print("2. Exporting CNN-LSTM...")
    cnn_lstm = keras.models.load_model('trained_models/cnn_lstm/model.h5')
    export_keras(cnn_lstm, output_path='trained_models/cnn_lstm.onnx')

    # 3. GINN (LSTM part)
    print("3. Exporting GINN...")
    ginn_lstm = keras.models.load_model('trained_models/ginn/lstm.h5')
    export_keras(ginn_lstm, output_path='trained_models/ginn.onnx')

    # 4. SVM
    print("4. Exporting SVM...")
    svm_model = joblib.load('trained_models/svm/model.pkl')
    export_sklearn(svm_model, n_features=20, output_path='trained_models/svm.onnx')

    # 5. Stacking Meta-learner
    print("5. Exporting Stacking...")
    stacking_model = joblib.load('trained_models/stacking/model.pkl')
    export_sklearn(stacking_model, n_features=4, output_path='trained_models/stacking.onnx')

    print("\n✅ All models exported successfully!")
    print("Models are ready for TypeScript inference.")

if __name__ == '__main__':
    main()
```

---

## NestJS Package Configuration

### Update package.json

```json
{
  "name": "algo-worker",
  "dependencies": {
    "@nestjs/common": "^11.1.9",
    "@nestjs/core": "^11.1.9",
    "@repo/schema": "workspace:*",
    "@repo/database": "workspace:*",
    "@repo/market-sdk": "workspace:*",
    "onnxruntime-node": "^1.20.1",
    "rxjs": "^7.8.2"
  },
  "devDependencies": {
    "@types/node": "^22.10.1",
    "typescript": "^5.9.3"
  }
}
```

### Install ONNX Runtime

```bash
cd apps/algo-worker
pnpm add onnxruntime-node
```

---

## Deployment Architecture

### Development:

```
┌─────────────────────────────────────┐
│  Developer Machine                   │
│                                      │
│  1. Train models (Python)            │
│     ml/training/train_all.py         │
│                                      │
│  2. Export to ONNX                   │
│     ml/training/export_all_models.py │
│                                      │
│  3. Run NestJS (TypeScript)          │
│     pnpm run start:dev               │
│     - Loads .onnx models             │
│     - Runs inference                 │
└─────────────────────────────────────┘
```

### Production:

```
┌────────────────────────────────────────┐
│  Docker Container (algo-worker)        │
│                                        │
│  Node.js Runtime                       │
│  ├── NestJS Application                │
│  ├── onnxruntime-node                  │
│  └── trained_models/                   │
│      ├── xgboost.onnx                  │
│      ├── cnn_lstm.onnx                 │
│      ├── ginn.onnx                     │
│      ├── svm.onnx                      │
│      └── stacking.onnx                 │
│                                        │
│  No Python Runtime Required ✅         │
└────────────────────────────────────────┘
```

---

## Performance Comparison

| Approach                      | Latency   | Type Safety | Deployment      | Complexity |
| ----------------------------- | --------- | ----------- | --------------- | ---------- |
| Python Child Process          | 50-200ms  | ❌ Low      | ⚠️ Complex      | High       |
| **ONNX Runtime (TypeScript)** | **<10ms** | **✅ Full** | **✅ Simple**   | **Low**    |
| FastAPI Microservice          | 10-50ms   | ⚠️ Medium   | ❌ Very Complex | High       |
| TensorFlow.js                 | 20-100ms  | ✅ Full     | ✅ Simple       | Medium     |

---

## Migration Path

### Step 1: Train Models in Python (Current ML_SETUP_GUIDE.md)

- Use existing Python training scripts
- Train all 5 models as documented
- Save to `.pkl` and `.h5` format

### Step 2: Add ONNX Export Layer

- Install export dependencies: `pip install onnxmltools tf2onnx skl2onnx`
- Create `ml/training/export_to_onnx.py`
- Export all models to `.onnx` format

### Step 3: Create TypeScript Inference Layer

- Install `onnxruntime-node`
- Create `ModelLoaderService` in NestJS
- Create `SignalEngineService` for inference

### Step 4: Test End-to-End

- Load ONNX models in NestJS
- Run inference with test data
- Verify predictions match Python output

### Step 5: Integrate with 4-Engine System

- Connect to DataEngine for features
- Feed signals to PolicyEngine
- Persist to MongoDB via @repo/database

---

## Monorepo Integration Benefits

### Shared Types (@repo/schema)

```typescript
// All apps use the same types
import type { TradingSignal } from '@repo/schema';

// Type-safe across entire stack
const signal: TradingSignal = await signalEngine.generateSignal(features);
```

### Shared Database (@repo/database)

```typescript
// Consistent data access
import { collections } from '@repo/database';

await collections.tradingSignals.create(signal);
```

### No Cross-Language Type Sync

- ✅ No need to maintain Python + TypeScript type definitions
- ✅ Zod schemas ensure runtime validation
- ✅ TypeScript compiler catches errors at build time

---

## When to Use Python Microservice Instead

Consider FastAPI microservice if:

1. **Model Size**: Models exceed 1GB (rare for trading ML)
2. **Multiple Consumers**: 3+ apps need the same models
3. **Real-time Retraining**: Need to update models without redeploying
4. **GPU Requirements**: Models require GPU inference (ONNX supports GPU too)
5. **Python-Specific Libraries**: Using libraries without ONNX export

For this project: **Not needed**. ONNX Runtime handles everything.

---

## Conclusion

**Recommended Stack:**

1. **Training**: Python + TensorFlow + XGBoost + scikit-learn
2. **Export**: ONNX format (.onnx files)
3. **Inference**: TypeScript + onnxruntime-node in NestJS
4. **Storage**: MongoDB via @repo/database
5. **Types**: Zod schemas via @repo/schema

**Benefits:**

- ✅ Sub-10ms inference latency
- ✅ Full type safety across monorepo
- ✅ Single deployment (NestJS only)
- ✅ Best of both worlds (Python training, TypeScript inference)
- ✅ Production-ready and maintainable

**Next Steps:**

1. Update ML_SETUP_GUIDE.md with ONNX export instructions
2. Create ModelLoaderService in NestJS
3. Test ONNX inference with sample data
4. Integrate with 4-engine architecture
