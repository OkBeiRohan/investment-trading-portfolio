"""
MLflow 3.x model evaluation for the institutional trading pipeline.

Wraps ``mlflow.models.evaluate()`` with trading-specific metrics, tier validation
via ``mlflow.validate_evaluation_results()``, and dataset-only evaluation for
pre-computed predictions.
"""

from __future__ import annotations

import logging
from typing import Any, Mapping, Optional, Union

import mlflow
from mlflow.models import make_metric, MetricThreshold
from mlflow.metrics.base import MetricValue
import numpy as np
import pandas as pd
from scipy.stats import spearmanr

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Custom trading metrics (classic evaluation: predictions, targets, metrics)
# ---------------------------------------------------------------------------


def _direction_accuracy_fn(
    predictions: np.ndarray,
    targets: np.ndarray,
    metrics: dict[str, Any],
) -> MetricValue:
    """Sign agreement between predictions and targets (regression / continuous)."""
    p = np.asarray(predictions, dtype=float).ravel()
    t = np.asarray(targets, dtype=float).ravel()
    if len(p) != len(t) or len(p) == 0:
        logger.warning(
            "direction_accuracy: length mismatch or empty (pred=%s, target=%s)",
            len(p),
            len(t),
        )
        return MetricValue(aggregate_results={"direction_accuracy": float("nan")})
    acc = float(np.mean(np.sign(p) == np.sign(t)))
    logger.debug("direction_accuracy=%s (n=%s)", acc, len(p))
    return MetricValue(aggregate_results={"direction_accuracy": acc})


def _direction_accuracy_classifier_fn(
    predictions: np.ndarray,
    targets: np.ndarray,
    metrics: dict[str, Any],
) -> MetricValue:
    """Direction / label agreement for discrete classification predictions."""
    p = np.asarray(predictions).ravel()
    t = np.asarray(targets).ravel()
    if len(p) != len(t) or len(p) == 0:
        logger.warning(
            "direction_accuracy (cls): length mismatch or empty (pred=%s, target=%s)",
            len(p),
            len(t),
        )
        return MetricValue(aggregate_results={"direction_accuracy": float("nan")})
    acc = float(np.mean(p == t))
    logger.debug("direction_accuracy (cls)=%s (n=%s)", acc, len(p))
    return MetricValue(aggregate_results={"direction_accuracy": acc})


def _information_coefficient_fn(
    predictions: np.ndarray,
    targets: np.ndarray,
    metrics: dict[str, Any],
) -> MetricValue:
    """Spearman rank correlation between predictions and targets."""
    p = np.asarray(predictions, dtype=float).ravel()
    t = np.asarray(targets, dtype=float).ravel()
    if len(p) != len(t) or len(p) < 2:
        return MetricValue(
            aggregate_results={"information_coefficient": float("nan")}
        )
    if np.nanstd(p) == 0 or np.nanstd(t) == 0:
        logger.debug("information_coefficient: zero variance in pred or target")
        return MetricValue(
            aggregate_results={"information_coefficient": float("nan")}
        )
    ic, _ = spearmanr(p, t, nan_policy="omit")
    ic_f = float(ic) if ic is not None and not np.isnan(ic) else float("nan")
    logger.debug("information_coefficient=%s", ic_f)
    return MetricValue(aggregate_results={"information_coefficient": ic_f})


def _profit_factor_fn(
    predictions: np.ndarray,
    targets: np.ndarray,
    metrics: dict[str, Any],
) -> MetricValue:
    """
    Sum of positive strategy returns divided by absolute sum of negative returns,
    where strategy return is sign(prediction) * realized target return.
    """
    p = np.asarray(predictions, dtype=float).ravel()
    t = np.asarray(targets, dtype=float).ravel()
    if len(p) != len(t) or len(p) == 0:
        return MetricValue(aggregate_results={"profit_factor": float("nan")})
    strat_ret = np.sign(p) * t
    pos = strat_ret[strat_ret > 0].sum()
    neg = strat_ret[strat_ret < 0].sum()
    if neg == 0:
        pf = float("inf") if pos > 0 else 0.0
    else:
        pf = float(pos / abs(neg))
    logger.debug("profit_factor=%s (pos=%s, neg=%s)", pf, pos, neg)
    return MetricValue(aggregate_results={"profit_factor": pf})


def _max_drawdown_fn(
    predictions: np.ndarray,
    targets: np.ndarray,
    metrics: dict[str, Any],
) -> MetricValue:
    """
    Maximum relative drawdown on the cumulative PnL curve from a sign(pred)*target
    strategy (peak-to-trough vs running peak of cumulative sum).
    """
    p = np.asarray(predictions, dtype=float).ravel()
    t = np.asarray(targets, dtype=float).ravel()
    if len(p) != len(t) or len(p) == 0:
        return MetricValue(aggregate_results={"max_drawdown": float("nan")})
    strat_ret = np.sign(p) * t
    cum = np.cumsum(strat_ret.astype(float))
    peak = np.maximum.accumulate(cum)
    with np.errstate(divide="ignore", invalid="ignore"):
        denom = np.where(np.abs(peak) > 1e-15, np.abs(peak), 1.0)
        dd = (peak - cum) / denom
    max_dd = float(np.nanmax(dd)) if dd.size else 0.0
    logger.debug("max_drawdown=%s", max_dd)
    return MetricValue(aggregate_results={"max_drawdown": max_dd})


def _hit_rate_regression_fn(
    predictions: np.ndarray,
    targets: np.ndarray,
    metrics: dict[str, Any],
) -> MetricValue:
    """Fraction of predictions with the same sign as the target (regression)."""
    p = np.asarray(predictions, dtype=float).ravel()
    t = np.asarray(targets, dtype=float).ravel()
    if len(p) != len(t) or len(p) == 0:
        return MetricValue(aggregate_results={"hit_rate": float("nan")})
    hr = float(np.mean(np.sign(p) == np.sign(t)))
    logger.debug("hit_rate (reg)=%s", hr)
    return MetricValue(aggregate_results={"hit_rate": hr})


def _hit_rate_classification_fn(
    predictions: np.ndarray,
    targets: np.ndarray,
    metrics: dict[str, Any],
) -> MetricValue:
    """Fraction of predictions equal to the label (classification)."""
    p = np.asarray(predictions).ravel()
    t = np.asarray(targets).ravel()
    if len(p) != len(t) or len(p) == 0:
        return MetricValue(aggregate_results={"hit_rate": float("nan")})
    hr = float(np.mean(p == t))
    logger.debug("hit_rate (cls)=%s", hr)
    return MetricValue(aggregate_results={"hit_rate": hr})


def _regression_trading_metrics():
    return [
        make_metric(
            eval_fn=_direction_accuracy_fn,
            greater_is_better=True,
            name="direction_accuracy",
        ),
        make_metric(
            eval_fn=_information_coefficient_fn,
            greater_is_better=True,
            name="information_coefficient",
        ),
        make_metric(
            eval_fn=_profit_factor_fn,
            greater_is_better=True,
            name="profit_factor",
        ),
        make_metric(
            eval_fn=_max_drawdown_fn,
            greater_is_better=False,
            name="max_drawdown",
        ),
        make_metric(
            eval_fn=_hit_rate_regression_fn,
            greater_is_better=True,
            name="hit_rate",
        ),
    ]


def _classifier_trading_metrics():
    return [
        make_metric(
            eval_fn=_direction_accuracy_classifier_fn,
            greater_is_better=True,
            name="direction_accuracy",
        ),
        make_metric(
            eval_fn=_information_coefficient_fn,
            greater_is_better=True,
            name="information_coefficient",
        ),
        make_metric(
            eval_fn=_hit_rate_classification_fn,
            greater_is_better=True,
            name="hit_rate",
        ),
    ]


def _ensure_dataframe(eval_data: Union[pd.DataFrame, Any]) -> pd.DataFrame:
    if isinstance(eval_data, pd.DataFrame):
        return eval_data
    logger.info("Coercing eval_data to pandas.DataFrame")
    return pd.DataFrame(eval_data)


def _merge_evaluator_config(
    base: Optional[Mapping[str, Any]], extra: Optional[Mapping[str, Any]]
) -> dict[str, Any]:
    out: dict[str, Any] = {}
    if base:
        out.update(dict(base))
    if extra:
        out.update(dict(extra))
    return out


def evaluate_classifier(
    model_uri: str,
    eval_data: Union[pd.DataFrame, Any],
    targets: str,
    evaluator_config: Optional[Mapping[str, Any]] = None,
):
    """
    Evaluate a binary (or multi-class) direction classifier with MLflow built-in
    classification metrics and plots, optional SHAP, and trading-oriented add-ons.

    Built-ins include accuracy, precision, recall, F1, ROC-AUC, confusion matrix,
    and ROC curve (for applicable problem types). Enable SHAP with
    ``evaluator_config={"log_explainer": True}`` (merged with any other options).
    """
    df = _ensure_dataframe(eval_data)
    logger.info(
        "Starting classifier evaluation model_uri=%s rows=%s targets=%s",
        model_uri,
        len(df),
        targets,
    )
    cfg = _merge_evaluator_config(None, evaluator_config)
    if cfg.get("log_explainer"):
        logger.info("Classifier evaluation: SHAP explainer logging enabled")

    result = mlflow.models.evaluate(
        model_uri,
        df,
        targets=targets,
        model_type="classifier",
        evaluator_config=cfg or None,
        extra_metrics=_classifier_trading_metrics(),
    )
    logger.info(
        "Classifier evaluation complete; metrics keys sample: %s",
        list(result.metrics.keys())[:12],
    )
    return result


def evaluate_regressor(
    model_uri: str,
    eval_data: Union[pd.DataFrame, Any],
    targets: str,
    evaluator_config: Optional[Mapping[str, Any]] = None,
):
    """
    Evaluate a gap/return regressor: built-in MSE, MAE, R², residual plots, plus
    custom trading metrics (direction accuracy, IC, profit factor, max drawdown,
    hit rate).
    """
    df = _ensure_dataframe(eval_data)
    logger.info(
        "Starting regressor evaluation model_uri=%s rows=%s targets=%s",
        model_uri,
        len(df),
        targets,
    )
    cfg = _merge_evaluator_config(None, evaluator_config)

    result = mlflow.models.evaluate(
        model_uri,
        df,
        targets=targets,
        model_type="regressor",
        evaluator_config=cfg or None,
        extra_metrics=_regression_trading_metrics(),
    )
    logger.info(
        "Regressor evaluation complete; metrics keys sample: %s",
        list(result.metrics.keys())[:12],
    )
    return result


def evaluate_dataset(
    predictions: Union[np.ndarray, list, pd.Series],
    targets: Union[np.ndarray, list, pd.Series],
    model_type: str,
    evaluator_config: Optional[Mapping[str, Any]] = None,
):
    """
    Evaluate pre-computed predictions without a model URI using ``data=``.

    ``model_type`` must be ``\"classifier\"`` or ``\"regressor\"``.
    """
    if model_type not in ("classifier", "regressor"):
        raise ValueError('model_type must be "classifier" or "regressor"')

    pred_arr = np.asarray(predictions).ravel()
    targ_arr = np.asarray(targets).ravel()
    if len(pred_arr) != len(targ_arr):
        raise ValueError(
            f"predictions and targets length mismatch: {len(pred_arr)} vs {len(targ_arr)}"
        )

    eval_df = pd.DataFrame({"prediction": pred_arr, "target": targ_arr})
    logger.info(
        "Dataset-only evaluation model_type=%s n=%s",
        model_type,
        len(eval_df),
    )

    extra = (
        _classifier_trading_metrics()
        if model_type == "classifier"
        else _regression_trading_metrics()
    )
    cfg = _merge_evaluator_config(None, evaluator_config)

    result = mlflow.models.evaluate(
        data=eval_df,
        predictions="prediction",
        targets="target",
        model_type=model_type,
        evaluator_config=cfg or None,
        extra_metrics=extra,
    )
    logger.info(
        "Dataset evaluation complete; metric count=%s",
        len(result.metrics),
    )
    return result


def _threshold_key(metric_name: str, result_keys: list[str]) -> Optional[str]:
    """Resolve logged metric key (handles 'name/subkey' convention)."""
    candidate = f"{metric_name}/{metric_name}"
    if candidate in result_keys:
        return candidate
    if metric_name in result_keys:
        return metric_name
    for k in result_keys:
        if k.startswith(metric_name + "/"):
            return k
    return None


def validate_model(eval_result: Any, tier: Union[int, str]) -> None:
    """
    Validate an evaluation result against tier-specific ``MetricThreshold`` rules
    using ``mlflow.validate_evaluation_results``.

    Tier 0: direction_accuracy >= 0.65, mean_absolute_error <= 0.003
    Tier 2: accuracy_score >= 0.55, roc_auc >= 0.68
    Tier 3: accuracy_score >= 0.55
    Meta (tier 4 / \"meta\"): mean_squared_error <= 0.5
    """
    keys = list(eval_result.metrics.keys())
    logger.info("Validating evaluation result for tier=%s", tier)

    thresholds: dict[str, MetricThreshold] = {}

    if isinstance(tier, str) and tier.isdigit():
        tnorm: Union[int, str] = int(tier)
    elif isinstance(tier, str):
        tnorm = tier.lower()
    else:
        tnorm = tier

    if tnorm == 0:
        da_key = _threshold_key("direction_accuracy", keys)
        if da_key:
            thresholds[da_key] = MetricThreshold(
                threshold=0.65,
                greater_is_better=True,
            )
        else:
            logger.warning(
                "Tier 0: direction_accuracy not present in metrics; validating MAE only"
            )
        thresholds["mean_absolute_error"] = MetricThreshold(
            threshold=0.003,
            greater_is_better=False,
        )
        logger.debug("Tier 0 thresholds: %s", list(thresholds.keys()))
    elif tnorm == 2:
        thresholds["accuracy_score"] = MetricThreshold(
            threshold=0.55,
            greater_is_better=True,
        )
        thresholds["roc_auc"] = MetricThreshold(
            threshold=0.68,
            greater_is_better=True,
        )
        logger.debug("Tier 2 thresholds: %s", list(thresholds.keys()))
    elif tnorm == 3:
        thresholds["accuracy_score"] = MetricThreshold(
            threshold=0.55,
            greater_is_better=True,
        )
        logger.debug("Tier 3 thresholds: %s", list(thresholds.keys()))
    elif tnorm in (4, "meta"):
        thresholds["mean_squared_error"] = MetricThreshold(
            threshold=0.5,
            greater_is_better=False,
        )
        logger.debug("Meta thresholds: %s", list(thresholds.keys()))
    else:
        logger.warning("No validation thresholds defined for tier=%s; skipping", tier)
        return

    mlflow.validate_evaluation_results(
        candidate_result=eval_result,
        validation_thresholds=thresholds,
    )
    logger.info("Evaluation passed validation for tier=%s", tier)


__all__ = [
    "evaluate_classifier",
    "evaluate_dataset",
    "evaluate_regressor",
    "validate_model",
]
