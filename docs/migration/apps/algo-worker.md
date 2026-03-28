# Algo Worker Migration Guide

> **Last Updated**: March 29, 2026  
> **Package**: `apps/algo-worker`  
> **Architecture**: 5-tier data-bound hierarchy, 6-layer processing pipeline

## Key Changes

### MLflow Model Serving
- Models fetched at runtime from MLflow Model Registry via `@champion` aliases
- No local model files -- algo-worker calls MLflow Serving REST endpoints
- GPU acceleration handled by the MLflow serving infrastructure

### Redis Streams Consumer
- Consumer group `algo-worker-group` on `market.features.live`
- 117 features from Rust compute-engine

### Execution Layer
- Upstox order placement via `@repo/market-sdk`
- All trading parameters configurable via MongoDB `trading_configs`

## Step-by-Step

1. Set `MLFLOW_SERVING_BASE_URL` to point at the MLflow serving instance
2. Verify `@champion` aliases are registered for each model in MLflow Model Registry
3. Configure MongoDB trading configs
4. Verify Redis Streams connection
5. Test inference by sending sample features to the MLflow serving endpoint
6. Test order placement in sandbox mode

## Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/quantum
REDIS_HOST=localhost
MLFLOW_SERVING_BASE_URL=http://localhost:5002
```
