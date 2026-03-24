"""
MLflow integration module for the institutional training pipeline.

Provides centralized experiment management, nested run tracking,
model signature inference, and dual-write to MongoDB for backward
compatibility with the NestJS API and web frontend.
"""

import logging
import os
import platform
import shutil
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Optional

import mlflow
from mlflow.models import ModelSignature
from mlflow.types.schema import ColSpec, Schema, TensorSpec

import numpy as np

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


def init_mlflow(tracking_uri: Optional[str] = None) -> None:
    """Initialize MLflow tracking URI from environment or argument."""
    uri = tracking_uri or os.environ.get(
        "MLFLOW_TRACKING_URI", "http://localhost:5000"
    )
    mlflow.set_tracking_uri(uri)
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
    disk = shutil.disk_usage("/")
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
    stage: str = "Staging",
) -> Optional[str]:
    """
    Register a model version in MLflow Model Registry and transition
    it to the specified stage.

    Returns the model version string or None on failure.
    """
    try:
        client = mlflow.MlflowClient()
        model_uri = f"runs:/{run_id}/{artifact_path}"
        mv = client.create_model_version(
            name=model_name,
            source=model_uri,
            run_id=run_id,
        )
        client.transition_model_version_stage(
            name=model_name,
            version=mv.version,
            stage=stage,
        )
        logger.info(
            "Registered model '%s' version %s → %s",
            model_name, mv.version, stage,
        )
        return mv.version
    except Exception as e:
        try:
            client.create_registered_model(model_name)
            return register_and_promote(
                model_name, run_id, artifact_path, stage
            )
        except Exception:
            logger.error("Failed to register model '%s': %s", model_name, e)
            return None


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
