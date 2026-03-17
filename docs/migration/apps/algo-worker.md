# Algo Worker Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `apps/algo-worker`  
> **Architecture**: 5-tier data-bound hierarchy, 6-layer processing pipeline

## Key Changes

### ONNX Runtime 1.24+
- Thread-safe worker support (PR #24366)
- Use `setImmediate` for event loop management
- GPU: CUDA (Linux), DirectML (Windows)

### Redis Streams Consumer
- Consumer group `algo-worker-group` on `market.features.live`
- 117 features from Rust compute-engine

### Execution Layer
- Upstox order placement via `@repo/market-sdk`
- All trading parameters configurable via MongoDB `trading_configs`

## Step-by-Step

1. Update `onnxruntime-node` to >=1.24
2. Place ONNX models in `models/` directory
3. Configure MongoDB trading configs
4. Verify Redis Streams connection
5. Test inference with sample features
6. Test order placement in sandbox mode

## Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/quantum
REDIS_HOST=localhost
ONNX_GPU_ENABLED=false
MODEL_DIR=./models
```
