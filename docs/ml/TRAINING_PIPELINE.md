# Training Pipeline Architecture

> **Institutional-grade training infrastructure with MLflow 3.x tracking, Optuna HPO, automated evaluation, and alias-based model promotion.**

**Last Updated**: March 28, 2026

---

## Overview

The training pipeline is a standard Python package (`services/training-pipeline/`) — no Kedro dependency. It implements:

- **5-tier hierarchical model training** (XGBoost, HMM, PatchTST, LightGBM, LiT, Meta-learner)
- **MLflow 3.x** experiment tracking with system metrics (GPU/CPU/memory), autologging, and checkpoint versioning
- **MLflow Dataset Tracking** via `mlflow.data.from_pandas()` for full data lineage
- **MLflow Model Evaluation** via `mlflow.models.evaluate()` with SHAP explainability and custom trading metrics
- **Native MLflow Model Flavors** — models logged directly via `mlflow.xgboost`, `mlflow.pytorch`, `mlflow.lightgbm`, `mlflow.pyfunc` (no ONNX conversion required)
- **MLflow Model Serving** — production inference via `mlflow models serve` with REST `/invocations` endpoints
- **Optuna HPO** with per-tier search spaces and nested MLflow child runs
- **CPCV / walk-forward** validation for temporal financial data
- **Quality gates** with custom thresholds + `mlflow.validate_evaluation_results()` with `MetricThreshold`
- **Champion/challenger** model comparison with auto-promotion via `@champion` / `@challenger` aliases
- **Checkpoint tracking** with `step` parameter and `model_id` metric linkage
- **Dual-write** to MongoDB with MLflow run IDs, dataset digests, evaluation results, and quality gate status

For the full MLflow platform documentation, see [MLFLOW_PLATFORM.md](./MLFLOW_PLATFORM.md).

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TRAINING PIPELINE (end-to-end)                        │
└─────────────────────────────────────────────────────────────────────────────┘

  1. Data Extraction (QuestDB)
              │
              ▼
  2. Feature Engineering (100+ features)
              │
              ▼
  3. Label Generation (multi-horizon)
              │
              ├──────────────────────────────────────┐
              │                                      │
              ▼                                      ▼
  4. [Optional] Hyperparameter Tuning      (skip if no --tune)
     (Optuna)                              ──────────┘
              │
              ▼
  5. Model Training (Tier 0–3 + Meta)
     + mlflow.data dataset logging
     + native mlflow.flavor.log_model()
              │
              ▼
  6. Model Evaluation (mlflow.models.evaluate + SHAP)
              │
              ▼
  7. Quality Gate (mlflow.validate_evaluation_results)
              │
              ▼
  8. Model Registration (MLflow Registry @champion + MongoDB dual-write)
              │
              ▼
  9. MLflow Model Serving (REST /invocations)
              │
              ▼
  10. Reporting (HTML + JSON + MLflow artifacts)
```

---

## Entry Point

```bash
# Standard training
python -m training_pipeline.runner --experiment-id <mongo_id> --tier 2

# With HPO
python -m training_pipeline.runner --experiment-id <id> --tier 0 --tune --n-trials 30

# Full pipeline (all tiers + meta)
python -m training_pipeline.runner --experiment-id <id> --tier full

# Dry run
python -m training_pipeline.runner --experiment-id <id> --tier 2 --dry-run
```

CLI flags: `--experiment-id` (required, MongoDB ObjectId), `--tier` (0-4, meta, full), `--tune` (enable Optuna), `--n-trials` (HPO trials, default 30), `--dry-run`, `--log-level`.

---

## Tier Training

### Tier 0: XGBoost Gap Predictor
Walk-forward validation (6mo train / 1mo test). SHAP feature importance. Autolog with `log_datasets=True, log_models=True`.

### Tier 1: HMM + PatchTST
HMM regime detection + PatchTST transformer for multi-horizon return forecasting. Per-fold checkpoint tracking. Cosine LR scheduler.

### Tier 2: LightGBM CPCV
Multi-horizon (5m/15m/30m) direction classification with Combinatorial Purged Cross-Validation. Up to 25 folds per horizon.

### Tier 3: LiT Microstructure
GRU-based linear transformer for tick-level direction prediction. 90-day rolling windows. Progressive activation (returns neutral when data insufficient).

### Meta-Learner: Regime-Conditioned Gating Network
Fuses Tier 0-3 OOF predictions via regime-aware dynamic weighting. RegimeTemporalLoss prevents whipsawing. Epoch checkpoints every 5 epochs. Early stopping with patience=5.

---

## MLflow 3.x Integration

### Experiment Organization
All experiments prefixed `trading/`:
- `trading/tier-0-xgboost-gap`
- `trading/tier-1-hmm-patchtst`
- `trading/tier-2-lightgbm-cpcv`
- `trading/tier-3-lit-microstructure`
- `trading/tier-4-meta-learner`

### Model Registry (Alias-Based)
Uses @champion/@challenger aliases (no deprecated stage transitions):
```python
client.set_registered_model_alias(name=model_name, alias="champion", version=mv.version)
```

Load champion: `mlflow.pyfunc.load_model("models:/trading-tier0-xgboost-gap@champion")`

### Model Logging (MLflow 3 name= API)
```python
mlflow.xgboost.log_model(model, name="tier0_model", signature=signature)
mlflow.pytorch.log_model(model, name="tier1_patchtst_model")
mlflow.pytorch.log_model(model, name=f"checkpoint_{epoch}")
```

---

## Quality Gates

Per-tier thresholds enforced before model registration:

| Tier | Metric | Threshold |
|------|--------|-----------|
| 0 | direction_accuracy | >= 0.65 |
| 0 | mae | <= 0.003 |
| 2 | auc_5m | >= 0.68 |
| 2 | auc_std_5m | <= 0.05 |
| 3 | lit_direction_accuracy | >= 0.65 |
| Meta | meta_val_loss | <= 0.5 |

Validated via `mlflow.validate_evaluation_results()` with `MetricThreshold`.

---

## Model Serving

After quality gates pass, models are registered in the MLflow Registry with `@champion` alias and served via the `mlflow-model-server` Docker container:

```bash
mlflow models serve -m "models:/trading-tier0-xgboost-gap@champion" -p 5001 --no-conda
```

The algo-worker calls these endpoints via HTTP `POST /invocations`.

---

## Dependencies

Key dependencies (`pyproject.toml`):
- `mlflow>=3.10.1` (tracking, evaluation, registry, serving)
- `optuna>=4.0.0` (hyperparameter optimization)
- `torch>=2.4.0` (PatchTST, LiT, Meta-learner)
- `xgboost>=2.1.3`, `lightgbm>=4.6.0`, `scikit-learn~=1.5.1`
- `shap>=0.43.0` (feature importance)
- `psutil>=5.9.0`, `nvidia-ml-py>=12.0.0` (system metrics)
- `prometheus-client`, `opentelemetry-*` (observability)

---

## Related Documentation

- [MLFLOW_PLATFORM.md](./MLFLOW_PLATFORM.md) — Full MLflow 3.x platform documentation
- [TRAINING_STRATEGY.md](./TRAINING_STRATEGY.md) — CPCV, walk-forward, drift detection
- [FEATURE_STORE.md](./FEATURE_STORE.md) — Redis + QuestDB feature store
