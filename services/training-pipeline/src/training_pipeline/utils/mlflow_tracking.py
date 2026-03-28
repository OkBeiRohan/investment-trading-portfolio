"""
MLflow integration module for the institutional training pipeline.

Provides centralized experiment management, nested run tracking,
model signature inference, system metrics monitoring, alias-based
model registry, dataset tracking via mlflow.data, checkpoint
versioning with model_id linkage, and dual-write to MongoDB for
backward compatibility with the NestJS API and web frontend.
"""

import logging
import os
import platform
import shutil
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Optional

import mlflow
import mlflow.data
from mlflow.models import ModelSignature, infer_signature
from mlflow.types.schema import ColSpec, Schema, TensorSpec

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

EXPERIMENT_PREFIX = "trading"

TIER_EXPERIMENT_MAP = {
    0: "tier-0-xgboost-gap",
    1: "tier-1-hmm-patchtst",
    2: "tier-2-lightgbm-cpcv",
    3: "tier-3-lit-microstructure",
    4: "tier-4-meta-learner",
    "meta": "tier-4-meta-learner",
    "full": "full-pipeline",
    "iv_surface": "iv-surface-ssvi",
    "backtest": "evaluate-strategy",
}

TIER_MODEL_NAMES = {
    0: "trading-tier0-xgboost-gap",
    1: "trading-tier1-patchtst",
    2: "trading-tier2-lightgbm-cpcv",
    3: "trading-tier3-lit-microstructure",
    "meta": "trading-meta-learner",
}


def init_mlflow(tracking_uri: Optional[str] = None) -> None:
    """Initialize MLflow tracking URI, system metrics, and logging."""
    uri = tracking_uri or os.environ.get(
        "MLFLOW_TRACKING_URI", "http://localhost:5000"
    )
    mlflow.set_tracking_uri(uri)

    try:
        mlflow.enable_system_metrics_logging()
        mlflow.set_system_metrics_sampling_interval(5)
        mlflow.set_system_metrics_samples_before_logging(2)
        logger.info(
            "MLflow system metrics logging enabled (5s interval, 2-sample aggregation)"
        )
    except Exception as e:
        logger.warning("Could not enable system metrics logging: %s", e)

    logger.info("MLflow tracking URI set to %s", uri)


def get_or_create_experiment(tier: int | str) -> str:
    """
    Get or create an MLflow experiment for the given tier.

    Returns the experiment ID.
    """
    name = f"{EXPERIMENT_PREFIX}/{TIER_EXPERIMENT_MAP.get(tier, f'tier-{tier}')}"
    experiment = mlflow.get_experiment_by_name(name)
    if experiment is not None:
        return experiment.experiment_id
    experiment_id = mlflow.create_experiment(name)
    logger.info("Created MLflow experiment '%s' (id=%s)", name, experiment_id)
    return experiment_id


def _hardware_tags() -> dict[str, str]:
    """Collect hardware information for run tagging."""
    tags: dict[str, str] = {
        "platform": platform.platform(),
        "cpu_count": str(os.cpu_count() or 0),
        "python_version": platform.python_version(),
    }
    try:
        disk = shutil.disk_usage("/")
        tags["disk_total_gb"] = f"{disk.total / (1024 ** 3):.1f}"
    except OSError:
        disk = shutil.disk_usage(".")
        tags["disk_total_gb"] = f"{disk.total / (1024 ** 3):.1f}"

    try:
        import torch

        tags["torch_version"] = torch.__version__
        if torch.cuda.is_available():
            tags["gpu_enabled"] = "true"
            tags["gpu_name"] = torch.cuda.get_device_name(0)
            mem = torch.cuda.get_device_properties(0).total_mem
            tags["gpu_memory_mb"] = str(mem // (1024 * 1024))
            tags["cuda_version"] = torch.version.cuda or "unknown"
        else:
            tags["gpu_enabled"] = "false"
    except ImportError:
        tags["gpu_enabled"] = "false"

    return tags


@contextmanager
def pipeline_run(
    experiment_id: str,
    run_name: str,
    tier: int | str,
    instrument_key: str = "",
    start_date: str = "",
    end_date: str = "",
    extra_tags: Optional[dict[str, str]] = None,
):
    """
    Context manager for a top-level pipeline MLflow run.

    Automatically sets hardware tags, tier info, and date range.
    Yields the active run object for nested child runs.
    """
    tags = _hardware_tags()
    tags["tier"] = str(tier)
    tags["instrument_key"] = instrument_key
    tags["date_range"] = f"{start_date}..{end_date}"
    tags["triggered_at"] = datetime.now(timezone.utc).isoformat()
    if extra_tags:
        tags.update(extra_tags)

    with mlflow.start_run(
        experiment_id=experiment_id,
        run_name=run_name,
        tags=tags,
        log_system_metrics=True,
    ) as run:
        mlflow.log_params(
            {
                "tier": str(tier),
                "instrument_key": instrument_key,
                "start_date": start_date,
                "end_date": end_date,
            }
        )
        yield run


@contextmanager
def tier_run(
    tier: int | str,
    run_name: Optional[str] = None,
    nested: bool = True,
):
    """
    Context manager for a per-tier child run (nested under pipeline_run).
    """
    name = run_name or f"tier_{tier}"
    with mlflow.start_run(
        run_name=name,
        nested=nested,
        tags={"tier": str(tier)},
    ) as run:
        yield run


@contextmanager
def fold_run(
    fold_id: int | str,
    horizon: str = "",
    nested: bool = True,
):
    """
    Context manager for a per-fold grandchild run (nested under tier_run).
    Used for CPCV fold tracking in Tier 2.
    """
    name = f"fold_{fold_id}" + (f"_{horizon}" if horizon else "")
    with mlflow.start_run(
        run_name=name,
        nested=nested,
        tags={"fold_id": str(fold_id), "horizon": horizon},
    ) as run:
        yield run


@contextmanager
def hpo_study_run(
    tier: int | str,
    n_trials: int,
    nested: bool = True,
):
    """Context manager for a hyperparameter optimization study run."""
    name = f"hpo_study_tier_{tier}"
    with mlflow.start_run(
        run_name=name,
        nested=nested,
        tags={"tier": str(tier), "run_type": "hpo_study", "n_trials": str(n_trials)},
    ) as run:
        mlflow.log_param("n_trials", n_trials)
        yield run


@contextmanager
def hpo_trial_run(
    trial_number: int,
    nested: bool = True,
):
    """Context manager for an individual HPO trial child run."""
    with mlflow.start_run(
        run_name=f"trial_{trial_number}",
        nested=nested,
        tags={"run_type": "hpo_trial", "trial_number": str(trial_number)},
    ) as run:
        yield run


def log_model_params(config: dict[str, Any], prefix: str = "") -> None:
    """Log a dict of hyperparameters with optional key prefix."""
    flat = _flatten_dict(config, prefix)
    if len(flat) > 100:
        flat = dict(list(flat.items())[:100])
    mlflow.log_params(flat)


def log_fold_metrics(
    fold_id: int,
    metrics: dict[str, float],
    step: Optional[int] = None,
) -> None:
    """Log metrics for a specific fold, using step for fold index."""
    prefixed = {f"fold_{fold_id}_{k}": v for k, v in metrics.items()}
    mlflow.log_metrics(prefixed, step=step)


def log_shap_artifact(
    shap_values: Any,
    feature_names: list[str],
    artifact_name: str = "shap_importance",
) -> None:
    """Log SHAP feature importance as a JSON artifact."""
    if isinstance(shap_values, list) and len(shap_values) > 0:
        data = shap_values
    elif hasattr(shap_values, "tolist"):
        mean_abs = np.abs(shap_values).mean(axis=0)
        ranked = sorted(
            zip(feature_names, mean_abs.tolist()), key=lambda x: -x[1]
        )
        data = [{"feature": f, "importance": round(v, 6)} for f, v in ranked]
    else:
        data = shap_values

    mlflow.log_dict(data, f"{artifact_name}.json")


def log_training_figure(fig: Any, name: str) -> None:
    """Log a matplotlib figure as an MLflow artifact."""
    mlflow.log_figure(fig, f"{name}.png")


def get_xgboost_signature(n_features: int) -> ModelSignature:
    """Infer model signature for XGBoost gap predictor."""
    input_schema = Schema(
        [TensorSpec(np.dtype("float32"), (-1, n_features), "input")]
    )
    output_schema = Schema(
        [TensorSpec(np.dtype("float32"), (-1,), "prediction")]
    )
    return ModelSignature(inputs=input_schema, outputs=output_schema)


def get_lightgbm_signature(n_features: int) -> ModelSignature:
    """Infer model signature for LightGBM classifier."""
    input_schema = Schema(
        [TensorSpec(np.dtype("float64"), (-1, n_features), "input")]
    )
    output_schema = Schema(
        [TensorSpec(np.dtype("float64"), (-1,), "probability")]
    )
    return ModelSignature(inputs=input_schema, outputs=output_schema)


def get_pytorch_signature(
    input_shape: tuple, output_shape: tuple
) -> ModelSignature:
    """Infer model signature for a PyTorch model."""
    input_schema = Schema(
        [TensorSpec(np.dtype("float32"), input_shape, "input")]
    )
    output_schema = Schema(
        [TensorSpec(np.dtype("float32"), output_shape, "output")]
    )
    return ModelSignature(inputs=input_schema, outputs=output_schema)


def get_meta_learner_signature() -> ModelSignature:
    """Signature for the Regime-Conditioned Gating Network."""
    input_schema = Schema(
        [
            TensorSpec(np.dtype("float32"), (-1, 4), "model_preds"),
            TensorSpec(np.dtype("float32"), (-1, 4), "regime_one_hot"),
        ]
    )
    output_schema = Schema(
        [
            TensorSpec(np.dtype("float32"), (-1, 1), "final_pred"),
            TensorSpec(np.dtype("float32"), (-1, 4), "weights"),
        ]
    )
    return ModelSignature(inputs=input_schema, outputs=output_schema)


def register_and_promote(
    model_name: str,
    run_id: str,
    artifact_path: str = "model",
    alias: str = "champion",
) -> Optional[str]:
    """
    Register a model version in MLflow Model Registry and assign
    it the specified alias (e.g. @champion, @challenger).

    Uses the modern alias-based workflow instead of deprecated stages.
    Returns the model version string or None on failure.
    """
    try:
        client = mlflow.MlflowClient()
        model_uri = f"runs:/{run_id}/{artifact_path}"

        try:
            client.get_registered_model(model_name)
        except mlflow.exceptions.MlflowException:
            client.create_registered_model(
                model_name,
                description=f"Production model for {model_name}",
            )
            logger.info("Created registered model '%s'", model_name)

        mv = client.create_model_version(
            name=model_name,
            source=model_uri,
            run_id=run_id,
        )
        client.set_registered_model_alias(
            name=model_name,
            alias=alias,
            version=mv.version,
        )
        logger.info(
            "Registered model '%s' version %s with alias @%s",
            model_name, mv.version, alias,
        )
        return mv.version
    except Exception as e:
        logger.error("Failed to register model '%s': %s", model_name, e)
        return None


def set_model_alias(
    model_name: str,
    alias: str,
    version: str,
) -> None:
    """Set an alias on a registered model version."""
    try:
        client = mlflow.MlflowClient()
        client.set_registered_model_alias(
            name=model_name, alias=alias, version=version,
        )
        logger.info("Set alias @%s on '%s' version %s", alias, model_name, version)
    except Exception as e:
        logger.error("Failed to set alias @%s on '%s': %s", alias, model_name, e)


def get_champion_run_id(model_name: str) -> Optional[str]:
    """Retrieve the run_id of the current @champion version."""
    try:
        client = mlflow.MlflowClient()
        mv = client.get_model_version_by_alias(model_name, "champion")
        return mv.run_id
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Dataset tracking helpers (mlflow.data)
# ---------------------------------------------------------------------------


def log_training_dataset(
    df: pd.DataFrame,
    name: str,
    source: str,
    targets: str,
) -> Any:
    """Create a PandasDataset and log it as a training input."""
    dataset = mlflow.data.from_pandas(df, source=source, name=name, targets=targets)
    mlflow.log_input(dataset, context="training")
    logger.debug("Logged training dataset '%s' (%d rows)", name, len(df))
    return dataset


def log_evaluation_dataset(
    df: pd.DataFrame,
    name: str,
    targets: str,
    predictions: Optional[str] = None,
    context: str = "validation",
) -> Any:
    """Create a PandasDataset (optionally with predictions) and log it."""
    kwargs: dict[str, Any] = {"source": "computed", "name": name, "targets": targets}
    if predictions:
        kwargs["predictions"] = predictions
    dataset = mlflow.data.from_pandas(df, **kwargs)
    mlflow.log_input(dataset, context=context)
    logger.debug("Logged evaluation dataset '%s' (%d rows, context=%s)", name, len(df), context)
    return dataset


# ---------------------------------------------------------------------------
# Checkpoint tracking helpers (MLflow 3.x)
# ---------------------------------------------------------------------------


def log_checkpoint(
    model: Any,
    flavor: str,
    name: str,
    step: int,
    signature: Optional[ModelSignature] = None,
    input_example: Any = None,
    registered_model_name: Optional[str] = None,
) -> Any:
    """
    Log a model checkpoint using the appropriate MLflow flavor.

    Returns the ModelInfo object containing model_id for metric linkage.
    Supported flavors: 'xgboost', 'lightgbm', 'pytorch', 'sklearn', 'pyfunc'.
    """
    log_fn_map = {
        "xgboost": _log_xgboost_checkpoint,
        "lightgbm": _log_lightgbm_checkpoint,
        "pytorch": _log_pytorch_checkpoint,
        "sklearn": _log_sklearn_checkpoint,
        "pyfunc": _log_pyfunc_checkpoint,
    }
    log_fn = log_fn_map.get(flavor)
    if not log_fn:
        raise ValueError(f"Unsupported flavor: {flavor}")

    model_info = log_fn(
        model, name=name, step=step,
        signature=signature, input_example=input_example,
        registered_model_name=registered_model_name,
    )
    logger.info("Logged checkpoint '%s' step=%d (model_id=%s)", name, step, model_info.model_id)
    return model_info


def _log_xgboost_checkpoint(model, *, name, step, signature, input_example, registered_model_name):
    import mlflow.xgboost
    return mlflow.xgboost.log_model(
        xgb_model=model, name=name, step=step,
        signature=signature, input_example=input_example,
        registered_model_name=registered_model_name,
        model_format="json",
    )


def _log_lightgbm_checkpoint(model, *, name, step, signature, input_example, registered_model_name):
    import mlflow.lightgbm
    return mlflow.lightgbm.log_model(
        lgb_model=model, name=name, step=step,
        signature=signature, input_example=input_example,
        registered_model_name=registered_model_name,
    )


def _log_pytorch_checkpoint(model, *, name, step, signature, input_example, registered_model_name):
    import mlflow.pytorch
    return mlflow.pytorch.log_model(
        pytorch_model=model, name=name, step=step,
        signature=signature, input_example=input_example,
        registered_model_name=registered_model_name,
    )


def _log_sklearn_checkpoint(model, *, name, step, signature, input_example, registered_model_name):
    import mlflow.sklearn
    return mlflow.sklearn.log_model(
        sk_model=model, name=name, step=step,
        signature=signature, input_example=input_example,
        registered_model_name=registered_model_name,
    )


def _log_pyfunc_checkpoint(model, *, name, step, signature, input_example, registered_model_name):
    return mlflow.pyfunc.log_model(
        python_model=model, name=name, step=step,
        signature=signature, input_example=input_example,
        registered_model_name=registered_model_name,
    )


def log_metric_for_checkpoint(
    key: str,
    value: float,
    step: int,
    model_id: str,
    dataset: Any = None,
) -> None:
    """Log a metric linked to a specific model checkpoint and optional dataset."""
    kwargs: dict[str, Any] = {"key": key, "value": value, "step": step, "model_id": model_id}
    if dataset is not None:
        kwargs["dataset"] = dataset
    mlflow.log_metric(**kwargs)


# ---------------------------------------------------------------------------
# Model loading helpers
# ---------------------------------------------------------------------------


def load_champion_model(model_name: str) -> Any:
    """Load the @champion version of a registered model via pyfunc."""
    uri = f"models:/{model_name}@champion"
    logger.info("Loading champion model from %s", uri)
    return mlflow.pyfunc.load_model(uri)


def load_model_by_id(model_id: str) -> Any:
    """Load a specific logged model by its model_id."""
    uri = f"models:/{model_id}"
    return mlflow.pyfunc.load_model(uri)


def get_best_checkpoint(
    run_id: str,
    metric: str,
    ascending: bool = True,
) -> Optional[Any]:
    """
    Find the best model checkpoint in a run by a metric.

    Uses mlflow.search_logged_models() with order_by.
    Returns the best LoggedModel or None.
    """
    try:
        order_dir = "ASC" if ascending else "DESC"
        results = mlflow.search_logged_models(
            filter_string=f"source_run_id='{run_id}'",
            order_by=[{"field_name": f"metrics.{metric}", "ascending": ascending}],
            max_results=1,
            output_format="list",
        )
        if results:
            best = results[0]
            logger.info(
                "Best checkpoint in run %s by %s: %s",
                run_id, metric, best.name,
            )
            return best
        return None
    except Exception as e:
        logger.warning("Could not search logged models for run %s: %s", run_id, e)
        return None


def infer_model_signature(
    input_data: Any,
    output_data: Any = None,
) -> ModelSignature:
    """Convenience wrapper around mlflow.models.infer_signature."""
    return infer_signature(input_data, output_data)


def _flatten_dict(
    d: dict, prefix: str = "", sep: str = "."
) -> dict[str, str]:
    """Flatten a nested dict for MLflow param logging."""
    items: dict[str, str] = {}
    for k, v in d.items():
        key = f"{prefix}{sep}{k}" if prefix else k
        if isinstance(v, dict):
            items.update(_flatten_dict(v, key, sep))
        elif isinstance(v, (list, tuple)):
            items[key] = str(v)[:250]
        else:
            items[key] = str(v)[:250]
    return items
