"""
Tier 2: Intraday Navigator — LightGBM with Combinatorial Purged
Cross-Validation (CPCV), multi-horizon targets, OOF collection, and SHAP.

Trains separate models for 5m / 15m / 30m direction classification using
fold definitions from the QuestDB ``dataset_folds`` table via
@repo/schema SQL.
"""

import logging
import os
import pickle
from typing import Any

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

import mlflow
import mlflow.lightgbm
from ...utils.mlflow_tracking import (
    log_model_params, log_shap_artifact, fold_run,
    log_training_dataset, log_evaluation_dataset, log_checkpoint,
    log_metric_for_checkpoint, infer_model_signature, TIER_MODEL_NAMES,
)
from ...utils.observability import TRAINING_FOLD_AUC, TRAINING_RUN_TOTAL, TRAINING_DATA_ROWS

logger = logging.getLogger(__name__)

TIER2_FEATURE_COLUMNS = [
    "pct_stocks_above_vwap", "pct_stocks_above_ema20",
    "weighted_return_top10", "advance_decline_ratio",
    "breadth_momentum_5m", "breadth_volatility",
    "fut_price_vs_vwap", "fut_range_position",
    "fut_return_1m", "fut_return_5m", "fut_atr_percent",
    "fut_volume_zscore", "fut_oi_change", "fut_rsi_14", "fut_macd",
    "atm_iv", "atm_iv_change", "iv_skew",
    "gamma_atm", "vega_atm", "theta_atm",
    "pcr_oi", "pcr_volume", "max_pain_distance",
    "charm_atm", "vanna_atm",
    "india_vix", "realized_vol_5m", "realized_vol_15m",
    "vol_expansion_ratio",
    "minutes_from_open", "minutes_to_close", "day_of_week",
]

HORIZONS = {
    "5m": "target_direction_5m",
    "15m": "target_direction_15m",
    "30m": "target_direction_30m",
}


def train_lightgbm_cpcv(
    loader,
    config: dict[str, Any],
    instrument_key: str,
    start_date: str,
    end_date: str,
) -> dict:
    """
    Multi-horizon LightGBM CPCV training.

    Returns dict with: models, metrics, oof, artifacts.
    """
    logger.info("=== Tier 2: LightGBM CPCV (multi-horizon) ===")
    mlflow.lightgbm.autolog(
        log_datasets=True, log_models=True,
        log_input_examples=True, log_model_signatures=True,
        extra_tags={"tier": "2", "model_type": "cpcv_classifier"},
    )

    tier2_cfg = config.get("tier2", config)
    lgb_params = tier2_cfg.get("lightgbm", config.get("lightgbm", {}))
    dataset_name = tier2_cfg.get("dataset_name", "nse_index_nifty_50_cpcv_25folds")
    features_list = config.get("features") or TIER2_FEATURE_COLUMNS

    folds_df = loader.load_cpcv_folds(instrument_key, dataset_name)
    if folds_df.empty:
        logger.error("No CPCV folds found for %s / %s", instrument_key, dataset_name)
        return {"metrics": {}, "oof": pd.DataFrame(), "artifacts": {}}

    unique_folds = sorted(folds_df["fold_id"].unique())
    logger.info("Found %d CPCV folds", len(unique_folds))

    raw_features = loader.load_features(
        instrument_key, start_date, end_date,
        interval_value=1, interval_unit="minute",
    )
    raw_labels = loader.load_labels(instrument_key, start_date, end_date)

    if not raw_features.empty:
        log_training_dataset(
            raw_features, name="tier2_features",
            source=f"questdb://instrument_features?start={start_date}&end={end_date}&interval=1m",
            targets="target_direction_5m",
        )
    if not raw_labels.empty:
        log_training_dataset(
            raw_labels, name="tier2_labels",
            source=f"questdb://training_labels?start={start_date}&end={end_date}",
            targets="target_direction_5m",
        )

    if raw_features.empty or raw_labels.empty:
        logger.error("No feature/label data for Tier 2")
        return {"metrics": {}, "oof": pd.DataFrame(), "artifacts": {}}

    df = pd.merge(
        raw_features, raw_labels,
        on=["timestamp", "instrument_key"],
        how="inner",
        suffixes=("", "_lbl"),
    )

    available_feats = [f for f in features_list if f in df.columns]
    if not available_feats:
        logger.error("No Tier 2 features found in data")
        return {"metrics": {}, "oof": pd.DataFrame(), "artifacts": {}}

    TRAINING_DATA_ROWS.labels(tier="2", table="features").inc(len(raw_features))
    TRAINING_DATA_ROWS.labels(tier="2", table="labels").inc(len(raw_labels))
    log_model_params({
        "tier": 2,
        "model_type": "lightgbm",
        "dataset_name": dataset_name,
        "n_folds": len(unique_folds),
        "horizons": list(HORIZONS.keys()),
        "n_features": len(available_feats),
        **{k: v for k, v in lgb_params.items() if not isinstance(v, (dict, list))},
    }, prefix="tier2")

    all_models: dict[str, dict[str, lgb.Booster]] = {}
    all_oof_records: list[dict] = []
    all_metrics: dict[str, Any] = {}

    for horizon_key, target_col in HORIZONS.items():
        if target_col not in df.columns:
            logger.warning("Target %s not in data, skipping horizon %s", target_col, horizon_key)
            continue

        logger.info("--- Horizon: %s (target: %s) ---", horizon_key, target_col)
        horizon_df = df.dropna(subset=available_feats + [target_col]).copy()
        horizon_df["_ts"] = pd.to_datetime(horizon_df["timestamp"])

        fold_models: dict[str, lgb.Booster] = {}
        fold_aucs: list[float] = []

        for fold in unique_folds:
            fold_rows = folds_df[folds_df["fold_id"] == fold]
            train_ranges = fold_rows[fold_rows["split_type"] == "TRAIN"]
            test_ranges = fold_rows[fold_rows["split_type"] == "TEST"]

            train_mask = _build_range_mask(horizon_df, train_ranges)
            test_mask = _build_range_mask(horizon_df, test_ranges)

            df_train = horizon_df[train_mask]
            df_test = horizon_df[test_mask]

            if len(df_train) < 100 or len(df_test) < 50:
                logger.warning("Fold %d: insufficient data (train=%d, test=%d)", fold, len(df_train), len(df_test))
                continue

            X_train = df_train[available_feats].values
            y_train = df_train[target_col].values
            X_test = df_test[available_feats].values
            y_test = df_test[target_col].values

            dtrain = lgb.Dataset(X_train, label=y_train)
            dtest = lgb.Dataset(X_test, label=y_test, reference=dtrain)

            params = {
                "objective": lgb_params.get("objective", "binary"),
                "metric": lgb_params.get("metric", "auc"),
                "boosting_type": lgb_params.get("boosting_type", "gbdt"),
                "num_leaves": lgb_params.get("num_leaves", 31),
                "learning_rate": lgb_params.get("learning_rate", 0.01),
                "feature_fraction": lgb_params.get("feature_fraction", 0.8),
                "bagging_fraction": lgb_params.get("bagging_fraction", 0.8),
                "bagging_freq": lgb_params.get("bagging_freq", 5),
                "max_depth": lgb_params.get("max_depth", 6),
                "min_data_in_leaf": lgb_params.get("min_data_in_leaf", 20),
                "verbose": -1,
            }

            model = lgb.train(
                params, dtrain,
                num_boost_round=lgb_params.get("num_boost_round", 500),
                valid_sets=[dtrain, dtest],
                valid_names=["train", "eval"],
                callbacks=[
                    lgb.early_stopping(stopping_rounds=lgb_params.get("early_stopping_rounds", 30)),
                    lgb.log_evaluation(period=100),
                ],
            )

            preds = model.predict(X_test)
            try:
                auc = float(roc_auc_score(y_test, preds))
            except ValueError:
                auc = 0.5
            fold_aucs.append(auc)
            TRAINING_FOLD_AUC.labels(tier="2", horizon=horizon_key, fold_id=str(fold)).set(auc)
            mlflow.log_metric(f"auc_{horizon_key}_fold_{fold}", auc, step=fold)
            fold_models[f"fold_{fold}"] = model
            logger.info("Fold %d [%s] AUC=%.4f", fold, horizon_key, auc)

            for ts, prob in zip(df_test["timestamp"].values, preds):
                all_oof_records.append({
                    "timestamp": ts,
                    "fold_id": fold,
                    "horizon": horizon_key,
                    f"tier2_prob_{horizon_key}": float(prob),
                })

            del dtrain, dtest, X_train, y_train, X_test, y_test

        all_models[horizon_key] = fold_models

        if fold_aucs:
            avg_auc = float(np.mean(fold_aucs))
            std_auc = float(np.std(fold_aucs))
            all_metrics[f"auc_{horizon_key}"] = avg_auc
            all_metrics[f"auc_std_{horizon_key}"] = std_auc
            mlflow.log_metrics({
                f"avg_auc_{horizon_key}": avg_auc,
                f"std_auc_{horizon_key}": std_auc,
            })
            logger.info(
                "Horizon %s — avg AUC=%.4f std=%.4f (%s)",
                horizon_key, avg_auc, std_auc,
                "STABLE" if std_auc < 0.05 else "UNSTABLE",
            )

    shap_importance = _compute_shap_lgb(all_models, available_feats)

    os.makedirs("data/06_models", exist_ok=True)
    artifact_paths = {}
    for hz, fold_models in all_models.items():
        for fold_name, model in fold_models.items():
            path = f"data/06_models/tier2_lgb_{hz}_{fold_name}.txt"
            model.save_model(path)
            artifact_paths[f"tier2_{hz}_{fold_name}"] = path

    all_metrics["shap_top20"] = shap_importance[:20]
    all_metrics["n_horizons"] = len(all_models)
    log_shap_artifact(shap_importance, available_feats, "tier2_shap")
    TRAINING_RUN_TOTAL.labels(tier="2", status="completed").inc()

    oof_df = pd.DataFrame(all_oof_records)
    if not oof_df.empty:
        pivot_cols = [c for c in oof_df.columns if c.startswith("tier2_prob_")]
        oof_agg = oof_df.groupby("timestamp")[pivot_cols].mean().reset_index()
        oof_agg["tier2_direction_prob"] = oof_agg[pivot_cols].mean(axis=1)
    else:
        oof_agg = pd.DataFrame()

    logger.info("Tier 2 complete — %d horizons, %d total models", len(all_models), sum(len(v) for v in all_models.values()))

    return {
        "models": all_models,
        "metrics": all_metrics,
        "oof": oof_agg,
        "artifacts": artifact_paths,
    }


def _build_range_mask(df: pd.DataFrame, ranges_df: pd.DataFrame) -> pd.Series:
    """Build a boolean mask for rows whose timestamp falls in any range."""
    mask = pd.Series(False, index=df.index)
    for _, row in ranges_df.iterrows():
        rs = pd.to_datetime(row["range_start"])
        re = pd.to_datetime(row["range_end"])
        mask |= (df["_ts"] >= rs) & (df["_ts"] <= re)
    return mask


def _compute_shap_lgb(
    all_models: dict[str, dict[str, lgb.Booster]],
    feature_names: list[str],
) -> list[dict]:
    """Aggregate feature importance across all folds/horizons."""
    importance = np.zeros(len(feature_names))
    count = 0
    for hz, fold_models in all_models.items():
        for fname, model in fold_models.items():
            imp = model.feature_importance(importance_type="gain")
            if len(imp) == len(feature_names):
                importance += imp
                count += 1
    if count > 0:
        importance /= count
    ranked = sorted(zip(feature_names, importance.tolist()), key=lambda x: -x[1])
    return [{"feature": f, "importance": round(v, 4)} for f, v in ranked]
