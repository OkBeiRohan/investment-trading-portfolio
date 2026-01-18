# Data Processor (DEPRECATED)

> ⚠️ **DEPRECATED**: This service is being replaced by [compute-engine](../../packages/compute-engine/README.md) (Rust/NAPI-RS) for feature computation.

**Port**: 3003  
**Status**: Deprecated - Migration in Progress

---

## Deprecation Notice

The `data-processor` service is being deprecated in favor of the **compute-engine** package which provides:

| Aspect | data-processor (Old) | compute-engine (New) |
|--------|---------------------|---------------------|
| Language | TypeScript | **Rust (NAPI-RS)** |
| Performance | ~20-50ms | **<5ms** |
| Type Safety | Runtime Zod | **Compile-time Rust** |
| Parallelism | Single-threaded | **Rayon (parallel)** |
| Memory | GC pauses | **Zero-copy** |

---

## Migration Guide

### Before (data-processor)

```typescript
// services/data-processor
const features = await featureService.compute(candle);
```

### After (compute-engine)

```typescript
// packages/compute-engine (Rust)
import { computeFeatures } from '@repo/compute-engine';

const result = computeFeatures(marketTick);
// result.features contains 33 features
// result.totalDurationMicros shows ~2000-3000µs
```

---

## What This Service Did

- ✅ Real-time feature computation
- ✅ Technical indicators (RSI, MACD, SMA, EMA)
- ✅ Option market features (PCR, Max Pain, ATM IV)
- ✅ Batch storage to QuestDB
- ✅ Redis pub/sub for distribution

---

## What to Use Instead

| Feature | New Location |
|---------|-------------|
| Technical indicators | `@repo/compute-engine` |
| Options features | `@repo/compute-engine` |
| Feature publishing | `market-feeder` + `compute-engine` |
| QuestDB storage | `market-feeder` |

---

## Timeline

- **January 2026**: Deprecated, feature-frozen
- **February 2026**: Remove from production
- **March 2026**: Delete from repository

---

## Related Documentation

- [compute-engine README](../../packages/compute-engine/README.md) - **Replacement**
- [market-feeder README](../market-feeder/README.md) - Uses compute-engine
- [ML Architecture](../../docs/ml/README.md) - Feature engineering docs
