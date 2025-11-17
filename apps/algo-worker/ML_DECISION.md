# ML Integration Decision Summary

**Date**: November 17, 2025  
**Decision**: Use ONNX Runtime in TypeScript for ML inference  
**Status**: ✅ Approved & Documented

---

## The Question

> "Couldn't we set this up inside the algo-worker inside NestJS? Or do you still suggest creating another app (FastAPI) for running models (which will be controlled by algo-worker)? Since the rest of the code is in TypeScript, using TS would be better for type safety, etc."

## The Answer

**Yes! We CAN and SHOULD integrate ML directly in NestJS using ONNX Runtime.**

---

## Decision: ONNX Runtime in TypeScript ⭐

### Architecture

```
┌─────────────────────────────────────────────┐
│  Python (Development/Training Only)          │
│  ├── Train XGBoost, TensorFlow, SVM         │
│  ├── Export to .onnx format                 │
│  └── No runtime deployment needed           │
└─────────────────────────────────────────────┘
                    ⬇️ .onnx files
┌─────────────────────────────────────────────┐
│  NestJS (Production - TypeScript)            │
│  ├── onnxruntime-node                       │
│  ├── Load .onnx models at startup           │
│  ├── Run inference (<10ms)                  │
│  └── Full type safety with @repo/schema     │
└─────────────────────────────────────────────┘
```

### Why This is Perfect for Our Monorepo

#### ✅ Type Safety Across Everything

```typescript
// Shared types from @repo/schema
import type { TradingSignal } from '@repo/schema';
import { collections } from '@repo/database';

// Type-safe end-to-end
const signal: TradingSignal = await signalEngine.generateSignal(features);
await collections.tradingSignals.create(signal); // ✅ All typed
```

#### ✅ Monorepo Integration

- Uses `@repo/schema` for type definitions
- Uses `@repo/database` for MongoDB operations
- Uses `@repo/market-sdk` for data ingestion
- Everything is TypeScript - no language boundaries!

#### ✅ Performance

- **<10ms inference latency** (vs 50-200ms for Python subprocess)
- Models load in 2-3 seconds at startup
- No IPC overhead, no network calls
- Direct memory access to model tensors

#### ✅ Deployment Simplicity

- **Single Docker container** (just Node.js)
- No Python runtime needed
- ONNX models are just data files (~10-50MB)
- Standard NestJS deployment process

---

## Why NOT FastAPI Microservice?

### Rejected Approach

```
NestJS ──HTTP──> FastAPI (Python) ──> ML Models
  ❌ 10-50ms network latency
  ❌ Two services to deploy/monitor
  ❌ Type sync between TS and Python
  ❌ More failure points
```

### When FastAPI WOULD Make Sense

- Multiple apps need the same models
- Models are huge (>500MB)
- Need independent scaling
- GPU-intensive workloads (though ONNX supports GPU)

**For our case**: None of these apply. We have one app, moderate model sizes, and need low latency.

---

## Implementation Path

### Phase 1: Python Training (One-Time Setup)

```bash
cd apps/algo-worker

# 1. Train models
python ml/training/train_models.py

# 2. Export to ONNX
python ml/training/export_all_models.py

# Output: trained_models/*.onnx
```

### Phase 2: TypeScript Inference (Production)

```bash
# Install ONNX Runtime
pnpm add onnxruntime-node

# Start NestJS
pnpm run start:dev

# ✅ Models load automatically
# ✅ Inference runs in TypeScript
# ✅ Full type safety maintained
```

---

## Code Organization

```
apps/algo-worker/
├── ml/                          # Python (development only)
│   ├── requirements.txt
│   ├── data/
│   ├── models/
│   ├── training/
│   │   ├── train_models.py
│   │   └── export_to_onnx.py   # ⭐ Key file
│   └── notebooks/
├── trained_models/              # ONNX models (gitignored)
│   ├── xgboost.onnx
│   ├── cnn_lstm.onnx
│   ├── ginn.onnx
│   ├── svm.onnx
│   └── stacking.onnx
└── src/                         # TypeScript (production)
    └── engines/
        └── signal/
            ├── model-loader.service.ts    # ⭐ ONNX loader
            ├── signal-engine.service.ts   # ⭐ Inference
            └── signal-engine.module.ts
```

---

## Benefits for This Monorepo

### 1. Shared Packages Integration

```typescript
// Everything uses the same types
import { tradingSignalSchema, type TradingSignal } from '@repo/schema';
import { db, collections } from '@repo/database';
import { UpstoxProvider } from '@repo/market-sdk';

// No type duplication, no sync issues
```

### 2. Developer Experience

```typescript
// Full IntelliSense support
const signal = await signalEngine.generateSignal(features);
//    ^? TradingSignal - fully typed!

// Compile-time error checking
await collections.tradingSignals.create(signal);
//                                       ^? Must match TradingSignal schema
```

### 3. Testing

```typescript
// Can mock/test everything in TypeScript
describe('SignalEngineService', () => {
  it('should generate signals', async () => {
    const features = new Float32Array([...]);
    const signal = await signalEngine.generateSignal(features);

    expect(signal.prediction).toBeDefined();
    expect(signal.confidence).toBeGreaterThan(0);
  });
});
```

---

## Performance Comparison

| Metric      | Python Subprocess | FastAPI Service | **ONNX Runtime (TS)** |
| ----------- | ----------------- | --------------- | --------------------- |
| Latency     | 50-200ms          | 10-50ms         | **<10ms** ✅          |
| Type Safety | ❌ Low            | ⚠️ Medium       | **✅ Full**           |
| Deployment  | ⚠️ Complex        | ❌ Very Complex | **✅ Simple**         |
| Memory      | High              | High            | **Low** ✅            |
| Maintenance | High              | High            | **Low** ✅            |

---

## Documentation Created

1. **ML_INTEGRATION_ARCHITECTURE.md** - Comprehensive analysis of all options
2. **ML_SETUP_GUIDE.md** - Updated with ONNX export workflow
3. **PROJECT_STATUS.md** - Updated with ONNX approach

---

## Next Steps

### Immediate (Training)

1. Set up Python environment (`ml/requirements.txt`)
2. Collect/prepare training data
3. Train all 5 models
4. Export to ONNX format

### Integration (TypeScript)

1. Install `onnxruntime-node` in algo-worker
2. Create `ModelLoaderService`
3. Create `SignalEngineService`
4. Integrate with DataEngine for features
5. Test inference performance

### Production

1. Add ONNX models to Docker image
2. Configure model versioning
3. Set up monitoring/logging
4. Deploy! 🚀

---

## Conclusion

**The ONNX Runtime approach is the clear winner for this monorepo:**

✅ Keeps everything in TypeScript  
✅ Maintains type safety across the stack  
✅ Integrates perfectly with shared packages  
✅ Delivers production-grade performance  
✅ Simplifies deployment significantly

**No separate Python service needed!** Train in Python, deploy in TypeScript. Best of both worlds.

---

**Status**: Ready to implement 🎯
