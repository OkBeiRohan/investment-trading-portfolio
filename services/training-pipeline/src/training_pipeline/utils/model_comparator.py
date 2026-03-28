"""
Cross-model comparison utilities for MLflow 3.x (tiers 0–3 + meta-learner).

Uses experiment search, Model Registry aliases (@champion), and logged-model
search for checkpoint ranking.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

import mlflow
import pandas as pd
from mlflow import MlflowClient
from mlflow.exceptions import MlflowException

from .mlflow_tracking import (
    TIER_MODEL_NAMES,
    register_and_promote,
    set_model_alias,
)

logger = logging.getLogger(__name__)

PRIMARY_METRICS: dict[int | str, tuple[str, bool]] = {
    0: ("avg_direction_accuracy", True),
    1: ("patchtst_avg_mse", False),
    2: ("avg_auc_5m", True),
    3: ("lit_direction_accuracy", True),
    "meta": ("meta_val_loss", False),
}


def _metric_order_clause(metric: str, ascending: bool) -> str:
    direction = "ASC" if ascending else "DESC"
    return f"metrics.{metric} {direction}"


def compare_runs(
    experiment_name: str,
    metric: str,
    n_best: int = 5,
    ascending: bool = False,
) -> pd.DataFrame:
    """
    Return the top ``n_best`` runs for an experiment ordered by ``metric``.

    ``ascending=False`` sorts descending (typical when higher metric is better).
    """
    order_by = [_metric_order_clause(metric, ascending)]
    return mlflow.search_runs(
        experiment_names=[experiment_name],
        order_by=order_by,
        max_results=n_best,
    )


def _get_run_metric(run: Any, metric: str) -> Optional[float]:
    value = run.data.metrics.get(metric)
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def challenger_vs_champion(
    model_name: str,
    challenger_run_id: str,
    metric: str,
    margin: float = 0.01,
    greater_is_better: bool = True,
) -> dict[str, Any]:
    """
    Compare challenger run metrics against the current @champion version.

    Returns ``should_promote``, metric values, and signed ``improvement``
    (positive means the challenger is better under the stated direction).
    """
    client = MlflowClient()
    challenger_run = client.get_run(challenger_run_id)
    challenger_value = _get_run_metric(challenger_run, metric)

    champion_value: Optional[float] = None
    try:
        champion_version = client.get_model_version_by_alias(model_name, "champion")
        champion_run = client.get_run(champion_version.run_id)
        champion_value = _get_run_metric(champion_run, metric)
    except MlflowException:
        logger.info("No @champion for '%s' (or registry error); treating as open", model_name)

    if challenger_value is None:
        return {
            "should_promote": False,
            "champion_value": champion_value,
            "challenger_value": challenger_value,
            "improvement": None,
        }

    if champion_value is None:
        improvement = None
        should_promote = True
    elif greater_is_better:
        improvement = challenger_value - champion_value
        should_promote = challenger_value >= champion_value + margin
    else:
        improvement = champion_value - challenger_value
        should_promote = challenger_value <= champion_value - margin

    return {
        "should_promote": should_promote,
        "champion_value": champion_value,
        "challenger_value": challenger_value,
        "improvement": improvement,
    }


def find_best_run_per_tier(
    tier_experiment_map: dict[int | str, str],
) -> dict[int | str, Optional[dict[str, Any]]]:
    """
    For each ``tier -> experiment_name``, pick the best run using
    :data:`PRIMARY_METRICS` (metric + maximize/minimize).

    Each value includes ``run_id``, ``experiment_id``, primary metric/value,
    and ``model_name`` from :data:`TIER_MODEL_NAMES` when defined.
    """
    out: dict[int | str, Optional[dict[str, Any]]] = {}
    for tier, experiment_name in tier_experiment_map.items():
        spec = PRIMARY_METRICS.get(tier)
        if spec is None:
            logger.warning("No PRIMARY_METRICS entry for tier %s; skipping", tier)
            out[tier] = None
            continue
        primary_metric, greater_is_better = spec
        ascending = not greater_is_better
        df = compare_runs(
            experiment_name,
            primary_metric,
            n_best=1,
            ascending=ascending,
        )
        if df is None or df.empty:
            out[tier] = None
            continue
        row = df.iloc[0]
        info: dict[str, Any] = {
            "run_id": str(row["run_id"]),
            "experiment_id": str(row["experiment_id"]),
            "primary_metric": primary_metric,
            "primary_metric_value": row.get(f"metrics.{primary_metric}"),
            "model_name": TIER_MODEL_NAMES.get(tier),
        }
        name_col = "tags.mlflow.runName"
        if name_col in row.index and pd.notna(row[name_col]):
            info["run_name"] = str(row[name_col])
        out[tier] = info
    return out


def compare_checkpoints(
    run_id: str,
    metric: str = "val_loss",
) -> list[Any]:
    """
    Rank logged model checkpoints linked to ``run_id`` by ``metric``.

    Lower ``metric`` values rank first (typical for loss). Uses MLflow 3
    ``search_logged_models`` dict-style ``order_by``.
    """
    filter_string = f"source_run_id='{run_id}'"
    order_by = [{"field_name": f"metrics.{metric}", "ascending": True}]
    return mlflow.search_logged_models(
        filter_string=filter_string,
        order_by=order_by,
        output_format="list",
    )


def generate_comparison_report(
    runs_df: pd.DataFrame,
    metrics_to_compare: list[str],
) -> dict[str, Any]:
    """
    Build a summary dict across ``metrics_to_compare`` for each run in
    ``runs_df`` and log it as a JSON MLflow artifact when a run is active.
    """
    runs: list[dict[str, Any]] = []
    for _, row in runs_df.iterrows():
        entry: dict[str, Any] = {"run_id": str(row.get("run_id", ""))}
        exp_id = row.get("experiment_id")
        if exp_id is not None and pd.notna(exp_id):
            entry["experiment_id"] = str(exp_id)
        name_col = "tags.mlflow.runName"
        if name_col in row.index and pd.notna(row[name_col]):
            entry["run_name"] = str(row[name_col])
        for m in metrics_to_compare:
            col = f"metrics.{m}"
            if col in row.index and pd.notna(row[col]):
                try:
                    entry[m] = float(row[col])
                except (TypeError, ValueError):
                    entry[m] = row[col]
            else:
                entry[m] = None
        runs.append(entry)

    report: dict[str, Any] = {
        "n_runs": len(runs_df),
        "metrics": list(metrics_to_compare),
        "runs": runs,
    }

    artifact_path = "comparison_reports/summary.json"
    active = mlflow.active_run()
    if active is not None:
        try:
            mlflow.log_dict(report, artifact_path)
        except Exception as e:
            logger.warning("Failed to log comparison report artifact: %s", e)
    else:
        logger.warning(
            "No active MLflow run; comparison report was not logged "
            "(artifact would be %s)",
            artifact_path,
        )

    return report


def auto_promote_if_better(
    model_name: str,
    challenger_run_id: str,
    artifact_path: str,
    metric: str,
    margin: float = 0.01,
) -> dict[str, Any]:
    """
    If ``challenger_vs_champion`` passes, preserve the current @champion as
    @previous_champion (when present) and register the challenger as @champion.

    Comparison uses ``greater_is_better=True``. For metrics to minimize (e.g.
    loss), call ``challenger_vs_champion(..., greater_is_better=False)`` and
    ``register_and_promote`` directly.
    """
    cmp_result = challenger_vs_champion(
        model_name,
        challenger_run_id,
        metric,
        margin=margin,
        greater_is_better=True,
    )
    result = dict(cmp_result)
    result["promoted_version"] = None

    if not cmp_result.get("should_promote"):
        return result

    client = MlflowClient()
    try:
        old = client.get_model_version_by_alias(model_name, "champion")
        set_model_alias(model_name, "previous_champion", str(old.version))
    except MlflowException:
        pass

    promoted = register_and_promote(
        model_name,
        challenger_run_id,
        artifact_path=artifact_path,
        alias="champion",
    )
    result["promoted_version"] = promoted
    return result
