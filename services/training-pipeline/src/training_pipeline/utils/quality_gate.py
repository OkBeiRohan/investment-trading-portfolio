"""
Quality gate — enforces institutional-grade metric thresholds per tier.

If a model fails the gate, the run is marked failed and ONNX export is
skipped.
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

QUALITY_THRESHOLDS: dict[int | str, dict[str, float]] = {
    0: {"direction_accuracy": 0.65, "mae": 0.003},
    1: {"hmm_avg_persistence_days": 5.0},
    2: {"auc_5m": 0.68, "auc_std_5m": 0.05},
    3: {"lit_direction_accuracy": 0.65},
    4: {"meta_val_loss": 0.5},
    "meta": {"meta_val_loss": 0.5},
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
            # Also check nested keys (e.g. tier_2_auc_5m from flat_metrics)
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
        else:
            logger.info("QUALITY GATE OK: %s=%.4f %s%.4f", metric_name, actual, cmp, threshold_val)

    if failures:
        reason = "; ".join(failures)
        logger.error("Quality gate FAILED for tier %s: %s", tier, reason)
        return False, reason

    logger.info("Quality gate PASSED for tier %s", tier)
    return True, "all thresholds met"
