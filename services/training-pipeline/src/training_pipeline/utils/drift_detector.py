"""
Feature drift detection using the Kolmogorov-Smirnov test.

Compares training-window feature distributions against a recent window
(default 7 days) to flag significant distribution shifts.
"""

import logging
from typing import Optional

import mlflow
import numpy as np
import pandas as pd
from scipy.stats import ks_2samp

from .observability import FEATURE_DRIFT_PCT, FEATURE_DRIFT_PER_FEATURE

logger = logging.getLogger(__name__)


def detect_drift(
    train_df: pd.DataFrame,
    recent_df: pd.DataFrame,
    feature_cols: Optional[list[str]] = None,
    p_threshold: float = 0.05,
    drift_pct_threshold: float = 0.20,
) -> dict:
    """
    Run a KS test on each feature column between training and recent data.

    Parameters
    ----------
    train_df : pd.DataFrame
        Feature data from the training window.
    recent_df : pd.DataFrame
        Feature data from the recent window (e.g. last 7 days).
    feature_cols : list[str], optional
        Columns to test.  Defaults to all shared numeric columns.
    p_threshold : float
        p-value below which a feature is considered drifted.
    drift_pct_threshold : float
        If more than this fraction of features drift, flag the dataset.

    Returns
    -------
    dict
        ``{"drifted": bool, "pct_drifted": float, "details": [...], "recommendation": str}``
    """
    if train_df.empty or recent_df.empty:
        logger.warning("Cannot run drift detection on empty DataFrames")
        return {"drifted": False, "pct_drifted": 0.0, "details": [], "recommendation": "insufficient_data"}

    if feature_cols is None:
        shared = set(train_df.select_dtypes(include=[np.number]).columns) & set(
            recent_df.select_dtypes(include=[np.number]).columns
        )
        feature_cols = sorted(shared)

    if not feature_cols:
        return {"drifted": False, "pct_drifted": 0.0, "details": [], "recommendation": "no_numeric_features"}

    details: list[dict] = []
    n_drifted = 0

    for col in feature_cols:
        a = train_df[col].dropna().values
        b = recent_df[col].dropna().values
        if len(a) < 30 or len(b) < 30:
            continue
        stat, p = ks_2samp(a, b)
        is_drift = p < p_threshold
        if is_drift:
            n_drifted += 1
            FEATURE_DRIFT_PER_FEATURE.labels(feature_name=col).set(float(stat))
        details.append({
            "feature": col,
            "ks_stat": round(float(stat), 6),
            "p_value": round(float(p), 6),
            "drifted": is_drift,
        })

    tested = len(details)
    pct = n_drifted / tested if tested > 0 else 0.0
    drifted = pct > drift_pct_threshold
    FEATURE_DRIFT_PCT.labels(instrument_key="global").set(pct)

    if drifted:
        recommendation = "retrain_recommended"
        logger.warning(
            "DRIFT DETECTED: %.1f%% of features drifted (threshold %.0f%%)",
            pct * 100, drift_pct_threshold * 100,
        )
    else:
        recommendation = "no_action"
        logger.info("Drift check OK: %.1f%% drifted", pct * 100)

    try:
        if mlflow.active_run():
            mlflow.log_metrics({
                "drift_pct": round(pct, 4),
                "drift_n_drifted": float(n_drifted),
                "drift_n_tested": float(tested),
            })
            mlflow.set_tag("drift_detected", str(drifted))
            mlflow.set_tag("drift_recommendation", recommendation)
            mlflow.log_dict(
                {"drifted": drifted, "pct_drifted": round(pct, 4), "details": details[:20]},
                "drift_report.json",
            )
    except Exception:
        pass

    return {
        "drifted": drifted,
        "pct_drifted": round(pct, 4),
        "n_drifted": n_drifted,
        "n_tested": tested,
        "details": details,
        "recommendation": recommendation,
    }
