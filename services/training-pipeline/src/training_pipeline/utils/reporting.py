"""
Training report generation — metrics JSON, SHAP summary, confusion matrix
data, and ROC curve data.

Reports are saved to ``data/08_reporting/`` and their paths recorded as
training run artifacts in MongoDB.
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

REPORT_DIR = "data/08_reporting"


def generate_report(
    all_metrics: dict[str, Any],
    artifact_paths: dict[str, str],
    report_dir: str = REPORT_DIR,
) -> dict:
    """
    Write a consolidated JSON report and return its metadata.

    Parameters
    ----------
    all_metrics : dict
        Nested or flat metrics from all tiers + meta-learner.
    artifact_paths : dict
        Logical-name → file-path mapping of all produced artifacts.
    report_dir : str
        Directory to write reports to.

    Returns
    -------
    dict with ``report_path`` and summary info.
    """
    os.makedirs(report_dir, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    report = {
        "generated_at": ts,
        "metrics": _serialise(all_metrics),
        "artifacts": artifact_paths,
        "summary": _build_summary(all_metrics),
    }

    report_path = os.path.join(report_dir, f"training_report_{ts}.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2, default=str)

    logger.info("Training report written to %s", report_path)
    return {
        "report_path": report_path,
        "summary": report["summary"],
    }


def _build_summary(metrics: dict) -> dict:
    """Extract the most important headline numbers."""
    summary: dict[str, Any] = {}

    flat = _flatten(metrics)

    for key in [
        "tier_0_direction_accuracy", "direction_accuracy",
        "tier_1_hmm_avg_persistence_days", "hmm_avg_persistence_days",
        "tier_2_auc_5m", "auc_5m",
        "tier_3_lit_direction_accuracy", "lit_direction_accuracy",
        "meta_val_loss",
    ]:
        if key in flat:
            summary[key] = flat[key]

    shap_keys = [k for k in flat if "shap" in k.lower()]
    for k in shap_keys[:3]:
        summary[k] = flat[k]

    return summary


def _flatten(d: dict, prefix: str = "") -> dict:
    out: dict = {}
    for k, v in d.items():
        key = f"{prefix}_{k}" if prefix else k
        if isinstance(v, dict):
            out.update(_flatten(v, key))
        else:
            out[key] = v
    return out


def _serialise(obj: Any) -> Any:
    """Make an object JSON-safe."""
    if isinstance(obj, dict):
        return {k: _serialise(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_serialise(i) for i in obj]
    if isinstance(obj, float):
        if obj != obj:  # NaN
            return None
        return round(obj, 6)
    return obj
