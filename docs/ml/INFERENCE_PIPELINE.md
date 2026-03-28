# MLflow Model Serving Pipeline

> **Production inference via MLflow Model Serving with REST endpoints, loaded from the MLflow Registry @champion alias.**

**Last Updated**: March 28, 2026
**Architecture**: 5-Tier Data-Bound Hierarchical

---

## Overview

Trained models from the Python training pipeline are served via **MLflow Model Serving** — a FastAPI-based inference server that loads models directly from the MLflow Registry using `@champion` aliases. The NestJS algo-worker calls these REST endpoints for predictions.

### Why MLflow Serving?

| Consideration     | In-Process (old)        | MLflow Model Serving              |
| ----------------- | ----------------------- | --------------------------------- |
| Model Formats     | ONNX only               | All native flavors (XGBoost, PyTorch, LightGBM, pyfunc) |
| Model Updates     | File copy + restart     | Alias-based hot-swap via @champion |
| Type Safety       | Manual tensor shapes    | Signature validation automatic     |
| Dependencies      | onnxruntime-node        | None in algo-worker (HTTP client)  |
| Latency           | <50ms (in-process)      | <5ms (Docker bridge network)       |
| Deployment        | Bind mount ONNX files   | Registry-backed, no file sync      |

---

## Architecture

```
Training Pipeline (Python)
    │
    ├── mlflow.xgboost.log_model(registered_model_name="trading-tier0-xgboost-gap")
    ├── mlflow.pytorch.log_model(registered_model_name="trading-tier1-patchtst")
    ├── mlflow.pyfunc.log_model(registered_model_name="trading-tier1-hmm-regime")
    ├── mlflow.lightgbm.log_model(registered_model_name="trading-tier2-lightgbm-cpcv")
    ├── mlflow.pytorch.log_model(registered_model_name="trading-tier3-lit-microstructure")
    └── mlflow.pytorch.log_model(registered_model_name="trading-meta-learner")
         │
         ▼
    MLflow Registry (PostgreSQL + MinIO)
         │
         ▼  models:/ModelName@champion
    MLflow Model Server (Docker container)
    ├── Port 5001: trading-tier0-xgboost-gap@champion
    ├── Port 5002: trading-tier1-patchtst@champion
    ├── Port 5003: trading-tier2-lightgbm-cpcv@champion
    ├── Port 5004: trading-tier3-lit-microstructure@champion
    ├── Port 5005: trading-meta-learner@champion
    └── Port 5006: trading-tier1-hmm-regime@champion
         │
         ▼  POST /invocations
    NestJS Algo-Worker (HTTP client)
    └── ModelPoolService → InferenceWorkerService → signal.generated event
```

---

## Model Serving Endpoints

Each model is served as an independent FastAPI instance with these endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/invocations` | POST | Run prediction |
| `/health` | GET | Health check |
| `/ping` | GET | Liveness probe |
| `/version` | GET | MLflow version |

### Request Format

```json
{
  "inputs": [[1.2, 0.5, -0.3, 2.1, ...]]
}
```

For the meta-learner (multiple named inputs):

```json
{
  "inputs": {
    "model_preds": [[0.6, 0.4, 0.7, 0.5]],
    "regime_one_hot": [[0, 1, 0, 0]]
  }
}
```

### Response Format

```json
{
  "predictions": [0.72]
}
```

---

## Algo-Worker Integration

The `ModelPoolService` in the algo-worker sends HTTP requests to the MLflow serving endpoints:

```typescript
async predict(tier: keyof MlflowServingEndpoints, features: number[]): Promise<number[]> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: [features] }),
  });
  const result = await response.json();
  return result.predictions;
}
```

Health checks are performed on startup to verify model availability.

---

## Model Update Flow

1. Training pipeline trains and promotes a new model via `register_and_promote(..., alias="champion")`
2. The MLflow Model Server container is restarted (or uses `mlflow models serve` hot-reload)
3. `mlflow models serve` loads the new `@champion` version from the MLflow Registry
4. Algo-worker health check detects the updated model

---

## Docker Compose Service

```yaml
mlflow-model-server:
  build:
    dockerfile: infrastructure/docker/mlflow-serving/Dockerfile
  environment:
    MLFLOW_TRACKING_URI: http://mlflow-server:5000
    AWS_ACCESS_KEY_ID: mlflow_user
    AWS_SECRET_ACCESS_KEY: mlflow_password
    MLFLOW_S3_ENDPOINT_URL: http://mlflow-artifacts:9000
  ports:
    - "5001-5006:5001-5006"
  depends_on:
    mlflow-server:
      condition: service_healthy
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://localhost:5001/health"]
```

---

## Related Documentation

- [MLFLOW_PLATFORM.md](./MLFLOW_PLATFORM.md) — Full MLflow 3.x platform documentation
- [TRAINING_PIPELINE.md](./TRAINING_PIPELINE.md) — Training with native MLflow model logging
- [MODEL_PIPELINE_WORKFLOW.md](./MODEL_PIPELINE_WORKFLOW.md) — Session-by-session timing
