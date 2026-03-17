"""
Tier 1: Macro Director — Regime HMM with StandardScaler and walk-forward.

Classifies daily market regimes (Bull/Bear × Volatile/Ranging) using a
4-state Gaussian HMM.  Walk-forward validation ensures temporal integrity.
"""

import logging
import pickle
import os
from typing import Any

import numpy as np
import pandas as pd
from hmmlearn.hmm import GaussianHMM
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

TIER1_FEATURES = [
    "return_1d", "range_hl", "macd", "rsi_14",
    "realized_vol_20d", "india_vix", "sma_50", "sma_200",
]


def train_regime_hmm_model(
    loader,
    config: dict[str, Any],
    instrument_key: str,
    start_date: str,
    end_date: str,
) -> dict:
    """
    Walk-forward HMM regime training with StandardScaler.

    Returns dict with: model, scaler, metrics, oof, artifacts.
    """
    logger.info("=== Tier 1: Regime HMM (walk-forward) ===")

    tier1_cfg = config.get("tier1", config)
    hmm_cfg = tier1_cfg.get("hmm", {})
    features_list = tier1_cfg.get("features") or config.get("features") or TIER1_FEATURES
    n_components = hmm_cfg.get("n_components", 4)
    covariance_type = hmm_cfg.get("covariance_type", "full")
    n_iter = hmm_cfg.get("n_iter", 200)
    train_months = config.get("walk_forward_train_months", 6)
    test_months = config.get("walk_forward_test_months", 1)

    raw = loader.load_features(
        instrument_key, start_date, end_date,
        interval_value=1, interval_unit="day",
    )
    if raw.empty:
        logger.warning("No daily data for HMM training")
        return {"metrics": {}, "oof": pd.DataFrame(), "artifacts": {}}

    available = [f for f in features_list if f in raw.columns]
    if not available:
        logger.error("No HMM features found in data")
        return {"metrics": {}, "oof": pd.DataFrame(), "artifacts": {}}

    df = raw.dropna(subset=available).sort_values("timestamp").reset_index(drop=True)
    df["_date"] = pd.to_datetime(df["timestamp"]).dt.date

    oof_records = []
    fold_metrics = []
    best_model = None
    best_scaler = None

    unique_dates = sorted(df["_date"].unique())
    train_days = train_months * 21
    test_days = test_months * 21

    fold_idx = 0
    start_idx = 0

    while start_idx + train_days + test_days <= len(unique_dates):
        train_dates = unique_dates[start_idx : start_idx + train_days]
        test_dates = unique_dates[start_idx + train_days : start_idx + train_days + test_days]
        fold_idx += 1

        df_train = df[df["_date"].isin(train_dates)]
        df_test = df[df["_date"].isin(test_dates)]

        if len(df_train) < 60 or len(df_test) < 10:
            start_idx += test_days
            continue

        scaler = StandardScaler()
        X_train = scaler.fit_transform(df_train[available].values)
        X_test = scaler.transform(df_test[available].values)

        model = GaussianHMM(
            n_components=n_components,
            covariance_type=covariance_type,
            n_iter=n_iter,
            random_state=42,
        )
        model.fit(X_train)
        converged = model.monitor_.converged

        train_states = model.predict(X_train)
        test_states = model.predict(X_test)

        state_changes = np.sum(np.diff(test_states) != 0)
        persistence = len(test_states) / max(state_changes + 1, 1)

        fold_metrics.append({
            "fold": fold_idx,
            "converged": bool(converged),
            "state_persistence_days": round(float(persistence), 2),
            "n_states_used": len(set(test_states)),
        })
        logger.info(
            "HMM Fold %d | converged=%s persistence=%.1f days",
            fold_idx, converged, persistence,
        )

        for ts, state in zip(df_test["timestamp"].values, test_states):
            one_hot = [0.0] * n_components
            one_hot[int(state)] = 1.0
            oof_records.append({
                "timestamp": ts,
                "hmm_regime": int(state),
                **{f"hmm_regime_{i}": one_hot[i] for i in range(n_components)},
            })

        best_model = model
        best_scaler = scaler
        start_idx += test_days

    if not fold_metrics:
        logger.warning("No HMM folds executed")
        return {"metrics": {}, "oof": pd.DataFrame(), "artifacts": {}}

    avg_persistence = float(np.mean([m["state_persistence_days"] for m in fold_metrics]))

    os.makedirs("data/06_models", exist_ok=True)
    hmm_path = "data/06_models/tier1_hmm.pkl"
    scaler_path = "data/06_models/tier1_hmm_scaler.pkl"
    with open(hmm_path, "wb") as f:
        pickle.dump(best_model, f)
    with open(scaler_path, "wb") as f:
        pickle.dump(best_scaler, f)

    metrics = {
        "hmm_avg_persistence_days": avg_persistence,
        "hmm_n_folds": fold_idx,
        "hmm_converged": all(m["converged"] for m in fold_metrics),
    }
    logger.info("HMM complete — avg persistence=%.1f days over %d folds", avg_persistence, fold_idx)

    return {
        "model": best_model,
        "scaler": best_scaler,
        "metrics": metrics,
        "oof": pd.DataFrame(oof_records),
        "artifacts": {"tier1_hmm": hmm_path, "tier1_hmm_scaler": scaler_path},
    }
