# Training Pipeline Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `services/training-pipeline`  
> **Framework**: Kedro (Python)

## Key Changes

- MongoDB experiment tracking (replaces file-based config)
- Per-stage metrics written back to MongoDB
- Training duration, hardware info, error logging
- Model artifacts tracked with paths
- Admin can create experiments via web UI

## Pipelines

| Pipeline | Tier | Status |
|----------|------|--------|
| train_tier0 | 0 | Production |
| train_tier1 | 1 | Production |
| train_tier2 | 2 | Production |
| train_tier3 | 3 | Production |
| train_meta | 4 | Production |
| train_ensemble | 2 | Partial |
| onnx_export | All | Production |
| evaluate_strategy | All | Production |

## Step-by-Step

1. Install dependencies: `pip install -r requirements.txt`
2. Configure MongoDB connection in `conf/base/catalog.yml`
3. Create experiment via admin API or MongoDB
4. Run pipeline: `kedro run --pipeline=train_tier0`
5. Check MongoDB for experiment metrics
6. Export to ONNX: `kedro run --pipeline=onnx_export`
7. Deploy models to algo-worker `models/` directory
