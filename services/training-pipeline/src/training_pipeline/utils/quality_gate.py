"""
Quality gate — enforces institutional-grade metric thresholds per tier.

Uses both custom threshold checks and MLflow 3.x MetricThreshold
validation. If a model fails the gate, the run is marked failed and
ONNX export is skipped.
"""

import logging
from typing import Any, Optional

import mlflow
from mlflow.models import MetricThreshold

from .observability import MODEL_QUALITY_GATE

logger = logging.getLogger(__name__)

QUALITY_THRESHOLDS: dict[int | str, dict[str, float]] = {
    0: {"direction_accuracy": 0.65, "mae": 0.003},
    1: {"hmm_avg_persistence_days": 5.0},
    2: {"auc_5m": 0.68, "auc_std_5m": 0.05},
    3: {"lit_direction_accuracy": 0.65},
    4: {"meta_val_loss": 0.5},
    "meta": {"meta_val_loss": 0.5},
}

MLFLOW_VALIDATION_THRESHOLDS: dict[int | str, dict[str, MetricThreshold]] = {
    0: {
        "mean_absolute_error": MetricThreshold(threshold=0.003, greater_is_better=False),
    },
    2: {
        "accuracy_score": MetricThreshold(threshold=0.55, greater_is_better=True),
    },
    3: {
        "accuracy_score": MetricThreshold(threshold=0.55, greater_is_better=True),
    },
    4: {
        "mean_squared_error": MetricThreshold(threshold=0.5, greater_is_better=False),
    },
    "meta": {
        "mean_squared_error": MetricThreshold(threshold=0.5, greater_is_better=False),
    },
}


def check_quality_gate(
    tier: int | str,
    metrics: dict[str, Any],
    custom_thresholds: dict | None = None,
) -> tuple[bool, str]:
    """
    Check whether *metrics* satisfy the quality thresholds for *tier*.

    Returns
    -------
    (passed, reason) : tuple[bool, str]
        ``passed`` is True if all thresholds are met.
        ``reason`` is a human-readable summary.
    """
    thresholds = (custom_thresholds or {}).copy()
    thresholds.update(QUALITY_THRESHOLDS.get(tier, {}))

    if not thresholds:
        logger.info("No quality thresholds defined for tier %s — auto-pass", tier)
        return True, "no thresholds defined"

    failures: list[str] = []

    for metric_name, threshold_val in thresholds.items():
        actual = metrics.get(metric_name)
        if actual is None:
            for k, v in metrics.items():
                if k.endswith(metric_name):
                    actual = v
                    break

        if actual is None:
            logger.warning("Metric '%s' not found in results — skipping check", metric_name)
            continue

        if metric_name.endswith("_std") or metric_name == "mae" or metric_name.endswith("_loss"):
            passed = actual <= threshold_val
            cmp = "<="
        else:
            passed = actual >= threshold_val
            cmp = ">="

        if not passed:
            msg = f"{metric_name}={actual:.4f} (need {cmp}{threshold_val})"
            failures.append(msg)
            logger.warning("QUALITY GATE FAIL: %s", msg)
            MODEL_QUALITY_GATE.labels(tier=str(tier), metric_name=metric_name).set(0.0)
        else:
            logger.info("QUALITY GATE OK: %s=%.4f %s%.4f", metric_name, actual, cmp, threshold_val)
            MODEL_QUALITY_GATE.labels(tier=str(tier), metric_name=metric_name).set(1.0)

    try:
        if mlflow.active_run():
            gate_metrics = {f"qg_{k}": float(v) for k, v in metrics.items() if isinstance(v, (int, float))}
            gate_metrics["quality_gate_passed"] = 1.0 if not failures else 0.0
            mlflow.log_metrics(gate_metrics)
            mlflow.set_tag("quality_gate_passed", str(not bool(failures)))
            if failures:
                mlflow.set_tag("quality_gate_failures", "; ".join(failures))
    except Exception:
        pass

    if failures:
        reason = "; ".join(failures)
        logger.error("Quality gate FAILED for tier %s: %s", tier, reason)
        return False, reason

    logger.info("Quality gate PASSED for tier %s", tier)
    return True, "all thresholds met"


def validate_with_mlflow(
    eval_result: Any,
    tier: int | str,
) -> tuple[bool, str]:
    """
    Validate MLflow evaluation results against MetricThreshold definitions.

    Intended to be called after ``mlflow.models.evaluate()`` returns an
    EvaluationResult.  Complements the manual ``check_quality_gate``.

    Returns (passed, reason).
    """
    thresholds = MLFLOW_VALIDATION_THRESHOLDS.get(tier, {})
    if not thresholds:
        logger.info("No MLflow validation thresholds for tier %s", tier)
        return True, "no mlflow thresholds defined"

    available = {k: v for k, v in thresholds.items() if k in eval_result.metrics}
    if not available:
        logger.warning("None of the threshold metrics found in eval_result for tier %s", tier)
        return True, "threshold metrics not in eval_result"

    try:
        mlflow.validate_evaluation_results(
            candidate_result=eval_result,
            validation_thresholds=available,
        )
        logger.info("MLflow MetricThreshold validation PASSED for tier %s", tier)
        if mlflow.active_run():
            mlflow.set_tag("mlflow_validation_passed", "true")
        return True, "mlflow thresholds met"
    except mlflow.exceptions.ModelValidationFailedException as e:
        reason = str(e)[:500]
        logger.error("MLflow MetricThreshold validation FAILED for tier %s: %s", tier, reason)
        if mlflow.active_run():
            mlflow.set_tag("mlflow_validation_passed", "false")
            mlflow.set_tag("mlflow_validation_failure", reason[:250])
        return False, reason
