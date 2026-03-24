# MLflow 3.x Platform: Experiment Tracking, HPO, Evaluation & Model Registry

**Last Updated:** March 24, 2026

## Overview

The institutional training pipeline uses **MLflow 3.x** as the primary experiment store: runs, parameters, metrics, artifacts, and the Model Registry are centralized while MongoDB still receives a dual-write summary for compatibility with the NestJS API.

The platform supports:

- **Experiment tracking** with nested runs, hardware tags, and MLflow 3.x **system metrics** (GPU, CPU, memory, disk, network).
- **Hyperparameter optimization** via **Optuna** (TPE sampler) with each trial logged as a nested MLflow child run.
- **Model evaluation** through `mlflow.models.evaluate()` plus **custom trading metrics** built with `mlflow.models.make_metric()`.
- **Champion / challenger** comparison and **alias-based** Model Registry workflows (no deprecated stage transitions).
- **HTML and JSON reporting** logged under run artifacts, and **Grafana** dashboards for operational visibility.

**Infrastructure:** The tracking server listens on **port 5000**. The backend store is **PostgreSQL**; artifacts are stored in **MinIO** (S3-compatible). Docker Compose defines **`mlflow-db`**, **`mlflow-artifacts`**, **`mlflow-init`** (bucket bootstrap), and **`mlflow-server`**. Training jobs receive `MLFLOW_TRACKING_URI=http://mlflow-server:5000` and S3 credentials pointed at the MinIO endpoint.

Implementation root: `services/training-pipeline/src/training_pipeline/`.

## Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                    MLflow 3.x PLATFORM                                │
│                                                                       │
│  runner.py                                                            │
│  ├── init_mlflow() → System metrics, tracking URI                    │
│  ├── [--tune] → hyperparameter_tuner.py → Optuna + nested runs       │
│  ├── pipeline_run() → Parent run with hardware tags                   │
│  │   ├── tier_run(0) → XGBoost autolog + walk-forward                │
│  │   ├── tier_run(1) → PyTorch autolog + PatchTST checkpoints        │
│  │   ├── tier_run(2) → LightGBM autolog + CPCV folds                │
│  │   ├── tier_run(3) → LiT autolog + rolling window                 │
│  │   └── tier_run(meta) → Gating network + epoch checkpoints         │
│  ├── model_evaluator.py → mlflow.models.evaluate() + custom metrics  │
│  ├── quality_gate.py → MetricThreshold validation                    │
│  ├── model_comparator.py → Champion vs Challenger                    │
│  └── reporting.py → HTML + JSON reports → MLflow artifacts            │
│                                                                       │
│  Infrastructure:                                                      │
│  ├── Postgres (MLflow backend store)                                  │
│  ├── MinIO (S3 artifact store)                                        │
│  └── Grafana (ml-model-comparison dashboard)                          │
└───────────────────────────────────────────────────────────────────────┘
```

## Experiment Tracking

### Experiment Organization

Experiments use the prefix `trading/` and map each training tier to a stable name (`EXPERIMENT_PREFIX`, `TIER_EXPERIMENT_MAP` in `mlflow_tracking.py`):

| Tier key | MLflow experiment name |
|----------|-------------------------|
| 0 | `trading/tier-0-xgboost-gap` |
| 1 | `trading/tier-1-hmm-patchtst` |
| 2 | `trading/tier-2-lightgbm-cpcv` |
| 3 | `trading/tier-3-lit-microstructure` |
| 4 / `meta` | `trading/tier-4-meta-learner` |
| `full` | `trading/full-pipeline` |

Additional experiment keys exist for auxiliary pipelines (for example `iv_surface` → `trading/iv-surface-ssvi`, `backtest` → `trading/evaluate-strategy`).

### Run Hierarchy

Runs are structured so the UI shows a clear tree:

1. **`pipeline_run`** — top-level run for an end-to-end or single-tier execution (tags include Mongo experiment/run IDs, date range, `hpo_enabled`).
2. **`tier_run`** — child run per tier under the pipeline (when applicable).
3. **`fold_run` / walk-forward segments** — logged inside tier training code where cross-validation or rolling windows apply.
4. **`hpo_study_run`** — parent run for an Optuna study when `--tune` is used.
5. **`hpo_trial_run`** — one nested run per Optuna trial, storing sampled params and `objective_value`.

### System Metrics

On startup, `init_mlflow()` calls `mlflow.config.enable_system_metrics_logging()` and `mlflow.config.set_system_metrics_sampling_interval(5)`, so MLflow 3.x records system telemetry at **5-second** intervals where the deployment supports it (GPU utilization/memory/temperature when available, CPU, memory, disk I/O, network I/O). If the SDK or environment cannot enable system metrics, initialization logs a warning and continues.

### Autologging

Framework autolog is enabled per tier:

| Tier | Framework | Autolog |
|------|-----------|---------|
| 0 | XGBoost | `mlflow.xgboost.autolog(log_datasets=True, log_models=True)` |
| 1 | PyTorch (PatchTST) | `mlflow.pytorch.autolog(log_models=True)` |
| 2 | LightGBM | `mlflow.lightgbm.autolog(log_datasets=True, log_models=True)` |
| 3 | PyTorch (LiT) | `mlflow.pytorch.autolog(log_models=True)` |
| Meta | PyTorch (gating network) | `mlflow.pytorch.autolog(log_models=True)` |

PyTorch tiers rely on `log_models=True` for checkpoint and model artifacts; dataset logging is enabled explicitly on XGBoost and LightGBM.

## Hyperparameter Optimization

### Optuna Integration

Module: `utils/hyperparameter_tuner.py`.

- **Sampler:** `TPESampler` with `seed=42` and `n_startup_trials=min(10, n_trials // 3)`.
- **Study:** `optuna.create_study(..., study_name=f"tier_{tier}_hpo")`.
- **MLflow:** `hpo_study_run` wraps the whole study; each trial runs inside `hpo_trial_run`, logging params and `objective_value`. Best params, `param_importance.json`, and `study_summary.json` are logged on the study run.

### Search Spaces

Definitions match `SEARCH_SPACES` / `TIER*_SEARCH_SPACE` in `hyperparameter_tuner.py` (Optuna `suggest_int`, `suggest_float` with `log=True` where marked as log-uniform in code).

**Tier 0 (XGBoost)**  
`max_depth` [2, 8], `learning_rate` [0.01, 0.3] (log), `n_estimators` [100, 500], `min_child_weight` [1, 10], `subsample` [0.5, 1.0], `colsample_bytree` [0.5, 1.0], `gamma` [0, 5], `reg_alpha` [1e-3, 10] (log), `reg_lambda` [1e-3, 10] (log).

**Tier 1 (PatchTST)**  
`d_model` [32, 128] step 16, `n_heads` ∈ {2, 4, 8}, `e_layers` [1, 4], `learning_rate` [1e-4, 1e-2] (log), `patch_length` [3, 10], `dropout` [0, 0.3], `batch_size` ∈ {32, 64, 128}, `epochs` [5, 20].

**Tier 2 (LightGBM)**  
`num_leaves` [15, 63], `learning_rate` [0.005, 0.1] (log), `feature_fraction` [0.5, 1.0], `bagging_fraction` [0.5, 1.0], `bagging_freq` [1, 10], `max_depth` [3, 10], `min_data_in_leaf` [10, 50], `num_boost_round` [200, 1000], `early_stopping_rounds` [20, 60].

**Tier 3 (LiT)**  
`d_model` [16, 64] step 16, `n_layers` [1, 4], `learning_rate` [1e-4, 1e-2] (log), `batch_size` ∈ {64, 128, 256, 512}, `epochs` [3, 10], `sequence_length` [10, 30].

**Meta (gating network)**  
`hidden_size` [16, 64] step 16, `learning_rate` [5e-4, 5e-3] (log), `regime_penalty` [1, 5], `temporal_weight` [0.01, 0.5] (log), `epochs` [10, 40], `batch_size` ∈ {64, 128, 256}, `dropout` [0.05, 0.3].

### CLI Usage

From an environment where the `training_pipeline` package is importable (for example the training Docker image or an editable install):

```bash
python -m training_pipeline.runner --experiment-id <id> --tier 0 --tune --n-trials 30
```

`--tune` runs HPO for the selected tier (`--tier`); full-pipeline mode does not run HPO in the same way. `--n-trials` defaults to 30.

## Model Evaluation

### `mlflow.models.evaluate()`

Module: `utils/model_evaluator.py`.

Two high-level entry points:

- **`evaluate_classifier`** — `model_type="classifier"`. Built-in metrics and plots typically include accuracy, precision, recall, F1, ROC-AUC (where applicable), confusion matrix, and ROC curve. Optional SHAP via `evaluator_config={"log_explainer": True}`.
- **`evaluate_regressor`** — `model_type="regressor"`. Built-in metrics and artifacts include MSE, MAE, R², and residual plots.

**`evaluate_dataset`** evaluates pre-computed prediction/target columns without a `model_uri`, using the same extra metrics as the corresponding model type.

### Custom Trading Metrics

Implemented with `mlflow.models.make_metric()`:

| Metric | Regressor | Classifier | Notes |
|--------|-----------|------------|--------|
| Direction accuracy | Yes | Yes | Sign agreement (regression); label equality (classification). |
| Information coefficient | Yes | Yes | Spearman rank correlation between predictions and targets. |
| Profit factor | Yes | No | Sum(positive PnL) / |sum(negative PnL)| for returns `sign(pred) * target`. |
| Max drawdown | Yes | No | Worst peak-to-trough on cumulative strategy returns (relative to running peak). |
| Hit rate | Yes | Yes | Same as direction accuracy for regression; label match rate for classification. |

### Model Validation

`quality_gate.py` defines `MLFLOW_VALIDATION_THRESHOLDS` and passes them into `mlflow.validate_evaluation_results()` (via `validate_model` in `model_evaluator.py`) using `MetricThreshold`:

| Tier | Metric | Rule |
|------|--------|------|
| 0 | `mean_absolute_error` | ≤ 0.003 |
| 2 | `accuracy_score` | ≥ 0.55 |
| 3 | `accuracy_score` | ≥ 0.55 |
| 4 / `meta` | `mean_squared_error` | ≤ 0.5 |

Separate **custom** `QUALITY_THRESHOLDS` (direction accuracy, AUC, meta loss, etc.) are enforced by `check_quality_gate()` for operational gating and observability.

## Model Registry

### Alias-Based Workflow (MLflow 3.x)

The pipeline uses **registered model aliases** (`@champion`, `@challenger`) instead of deprecated stage transitions. Helpers in `mlflow_tracking.py` include `register_and_promote()`, `set_model_alias()`, and `get_champion_run_id()`.

**Registered model names** (`TIER_MODEL_NAMES`):

- `trading-tier0-xgboost-gap`
- `trading-tier1-patchtst`
- `trading-tier2-lightgbm-cpcv`
- `trading-tier3-lit-microstructure`
- `trading-meta-learner`

### Champion / Challenger Flow

1. Train and register a new candidate (typically as **`@challenger`**).
2. **`challenger_vs_champion()`** in `model_comparator.py` loads the current **`@champion`** version (if any), reads the agreed **primary metric** from both runs (`PRIMARY_METRICS` maps tier → metric name and whether higher is better), and computes whether the challenger clears the champion by a configurable **margin** (default `0.01`).
3. **`auto_promote_if_better()`** can register the challenger and move aliases when promotion criteria are met.

### Checkpoint Tracking (MLflow 3.x)

PyTorch training logs multiple **named** models per run, for example:

- Tier 1: `mlflow.pytorch.log_model(..., name=f"tier1_checkpoint_fold{fold_idx}")` per fold.
- Meta: `mlflow.pytorch.log_model(..., name=f"meta_checkpoint_epoch{epoch+1}")` during training.

`model_comparator.compare_checkpoints()` ranks checkpoints for a run using **`mlflow.search_logged_models()`** with `order_by` on a metric such as `val_loss`.

## Reporting & Dashboards

### HTML Reports

`utils/reporting.py` builds structured **HTML** reports (summary cards, per-tier metrics, artifact references, quality gate status) and writes **JSON** alongside them. When an MLflow run is active, artifacts are logged under **`reports/`** (and summary dicts may also be logged as `report_summary.json`).

### Grafana Dashboard

Dashboard JSON: `infrastructure/observability/grafana/provisioning/dashboards/ml-model-comparison.json` (**ml-model-comparison**).

Typical panels include:

- Tier 2 AUC by horizon/fold (gauge-style views).
- Quality gate status.
- PatchTST / LiT / Meta training loss time series.
- Meta-learner gating weight evolution (stacked area).
- Feature drift percentage over time and top drifted features.
- Training run counts and duration by tier.

## File Reference

Paths are relative to the Python package root: `services/training-pipeline/src/training_pipeline/`.

| File | Purpose |
|------|---------|
| `utils/mlflow_tracking.py` | Core MLflow integration: `init_mlflow`, experiment names, nested run context managers (`pipeline_run`, `tier_run`, HPO runs), signatures, alias-based registry helpers. |
| `utils/hyperparameter_tuner.py` | Optuna studies, per-tier search spaces, nested trial logging. |
| `utils/model_evaluator.py` | `evaluate_classifier` / `evaluate_regressor` / `evaluate_dataset`, custom metrics, `validate_model` + `MetricThreshold`. |
| `utils/model_comparator.py` | Run search, champion vs challenger, checkpoint ranking, comparison reports, auto-promotion. |
| `utils/quality_gate.py` | `check_quality_gate`, `MLFLOW_VALIDATION_THRESHOLDS`, `validate_with_mlflow`. |
| `utils/reporting.py` | HTML + JSON report generation and MLflow artifact logging. |
| `runner.py` | CLI entry point: `--experiment-id`, `--tier`, `--tune`, `--n-trials`, `--dry-run`, orchestration hooks. |

For infrastructure definitions, see `infrastructure/docker/docker-compose.yml` (MLflow-related services and volumes).
