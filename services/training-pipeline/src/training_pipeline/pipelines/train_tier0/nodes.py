"""
Tier 0: Pre-Market Gap Predictor (XGBoost) with walk-forward validation.

Predicts the opening gap magnitude from overnight global indices.
Uses walk-forward (6-month train / 1-month test, rolling) for temporal
validity and SHAP for institutional interpretability.
"""

import logging
from typing import Any

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import StandardScaler

import mlflow
import mlflow.xgboost
from ...utils.mlflow_tracking import (
    log_model_params, log_shap_artifact, log_fold_metrics, get_xgboost_signature,
    log_training_dataset, log_evaluation_dataset, log_checkpoint, log_metric_for_checkpoint,
    infer_model_signature, TIER_MODEL_NAMES,
)
from ...utils.observability import TRAINING_EPOCH_DURATION, TRAINING_RUN_TOTAL, TRAINING_DATA_ROWS, traced_stage, update_gpu_metrics

logger = logging.getLogger(__name__)

TIER0_FEATURES = [
    "gift_nifty_premium",
    "sp500_overnight_return",
    "nasdaq_overnight_return",
    "nikkei_return",
    "ftse_return",
    "brent_crude_change",
    "wti_crude_change",
    "gold_change",
    "usd_inr_change",
    "us_10y_yield_change",
]
TIER0_TARGET = "actual_gap_pct"


def train_xgboost_gap_model(
    loader,
    config: dict[str, Any],
    instrument_key: str,
    start_date: str,
    end_date: str,
) -> dict:
    """
    Walk-forward XGBoost training for gap prediction.

    Returns dict with keys: model, scaler, metrics, oof, artifacts.
    """
    mlflow.xgboost.autolog(
        log_datasets=True, log_models=True,
        log_input_examples=True, log_model_signatures=True,
        model_format="json",
        extra_tags={"tier": "0", "model_type": "gap_predictor"},
    )

    logger.info("=== Tier 0: XGBoost Gap Predictor (walk-forward) ===")

    features_list = config.get("features") or TIER0_FEATURES
    target = config.get("target", TIER0_TARGET)
    xgb_params = config.get("xgboost", config.get("tier0", {}).get("xgboost", {}))
    train_months = config.get("walk_forward_train_months", 6)
    test_months = config.get("walk_forward_test_months", 1)

    log_model_params({
        "tier": 0,
        "model_type": "xgboost",
        "objective": xgb_params.get("objective", "reg:squarederror"),
        "max_depth": xgb_params.get("max_depth", 4),
        "learning_rate": xgb_params.get("learning_rate", 0.05),
        "n_estimators": xgb_params.get("n_estimators", 200),
        "walk_forward_train_months": train_months,
        "walk_forward_test_months": test_months,
        "features": features_list,
    }, prefix="tier0")

    raw_features = loader.load_features(
        instrument_key, start_date, end_date,
        interval_value=1, interval_unit="day",
    )
    raw_labels = loader.load_labels(instrument_key, start_date, end_date)

    TRAINING_DATA_ROWS.labels(tier="0", table="features").inc(len(raw_features))
    TRAINING_DATA_ROWS.labels(tier="0", table="labels").inc(len(raw_labels))

    if not raw_features.empty:
        log_training_dataset(
            raw_features, name="tier0_features",
            source=f"questdb://instrument_features?start={start_date}&end={end_date}",
            targets=target,
        )
    if not raw_labels.empty:
        log_training_dataset(
            raw_labels, name="tier0_labels",
            source=f"questdb://training_labels?start={start_date}&end={end_date}",
            targets=target,
        )

    if raw_features.empty or raw_labels.empty:
        logger.warning("No data available for Tier 0 training")
        return {"metrics": {}, "oof": pd.DataFrame()}

    df = pd.merge(raw_features, raw_labels, on=["timestamp", "instrument_key"], how="inner", suffixes=("", "_lbl"))

    available_feats = [f for f in features_list if f in df.columns]
    if not available_feats:
        logger.error("None of the requested features found in data. Available: %s", list(df.columns)[:20])
        return {"metrics": {}, "oof": pd.DataFrame()}

    if target not in df.columns:
        logger.error("Target '%s' not in data columns", target)
        return {"metrics": {}, "oof": pd.DataFrame()}

    df = df.dropna(subset=available_feats + [target])
    df = df.sort_values("timestamp").reset_index(drop=True)
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

        train_mask = df["_date"].isin(train_dates)
        test_mask = df["_date"].isin(test_dates)
        df_train = df[train_mask]
        df_test = df[test_mask]

        if len(df_train) < 50 or len(df_test) < 10:
            start_idx += test_days
            continue

        scaler = StandardScaler()
        X_train = scaler.fit_transform(df_train[available_feats].values)
        y_train = df_train[target].values
        X_test = scaler.transform(df_test[available_feats].values)
        y_test = df_test[target].values

        params = {
            "objective": xgb_params.get("objective", "reg:squarederror"),
            "eval_metric": xgb_params.get("eval_metric", "rmse"),
            "max_depth": xgb_params.get("max_depth", 4),
            "learning_rate": xgb_params.get("learning_rate", 0.05),
            "verbosity": 0,
        }
        n_rounds = xgb_params.get("n_estimators", 200)

        dtrain = xgb.DMatrix(X_train, label=y_train)
        dtest = xgb.DMatrix(X_test, label=y_test)
        model = xgb.train(
            params, dtrain,
            num_boost_round=n_rounds,
            evals=[(dtest, "eval")],
            early_stopping_rounds=20,
            verbose_eval=False,
        )

        preds = model.predict(dtest)
        mae = float(mean_absolute_error(y_test, preds))
        rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
        direction_acc = float(np.mean(np.sign(preds) == np.sign(y_test)))

        mlflow.log_metrics({
            f"fold_{fold_idx}_mae": mae,
            f"fold_{fold_idx}_rmse": rmse,
            f"fold_{fold_idx}_direction_accuracy": direction_acc,
        }, step=fold_idx)

        fold_metrics.append({"fold": fold_idx, "mae": mae, "rmse": rmse, "direction_accuracy": direction_acc})
        logger.info("Fold %d | MAE=%.5f RMSE=%.5f DirAcc=%.3f", fold_idx, mae, rmse, direction_acc)

        for ts, pred in zip(df_test["timestamp"].values, preds):
            oof_records.append({"timestamp": ts, "tier0_gap_pred": float(pred)})

        best_model = model
        best_scaler = scaler
        start_idx += test_days

    if not fold_metrics:
        logger.warning("No walk-forward folds executed for Tier 0")
        return {"metrics": {}, "oof": pd.DataFrame()}

    avg_mae = float(np.mean([m["mae"] for m in fold_metrics]))
    avg_rmse = float(np.mean([m["rmse"] for m in fold_metrics]))
    avg_dir_acc = float(np.mean([m["direction_accuracy"] for m in fold_metrics]))

    shap_importance = _compute_shap(best_model, df[available_feats].tail(500), available_feats)

    import pickle, os
    os.makedirs("data/06_models", exist_ok=True)
    model_path = "data/06_models/tier0_xgboost.json"
    best_model.save_model(model_path)
    scaler_path = "data/06_models/tier0_scaler.pkl"
    with open(scaler_path, "wb") as f:
        pickle.dump(best_scaler, f)

    mlflow.log_metrics({
        "avg_mae": avg_mae,
        "avg_rmse": avg_rmse,
        "avg_direction_accuracy": avg_dir_acc,
        "n_folds": float(fold_idx),
    })
    log_shap_artifact(shap_importance, available_feats, "tier0_shap")
    signature = infer_model_signature(
        X_train[:5] if X_train is not None else np.zeros((1, len(available_feats))),
        preds[:5] if preds is not None else np.zeros(1),
    )
    model_info = log_checkpoint(
        best_model, flavor="xgboost", name="tier0_gap_predictor",
        step=fold_idx, signature=signature,
        input_example=X_train[:5] if X_train is not None else None,
        registered_model_name=TIER_MODEL_NAMES[0],
    )
    log_metric_for_checkpoint("avg_mae", avg_mae, step=fold_idx, model_id=model_info.model_id)
    log_metric_for_checkpoint("avg_direction_accuracy", avg_dir_acc, step=fold_idx, model_id=model_info.model_id)
    mlflow.log_artifact(scaler_path)
    TRAINING_RUN_TOTAL.labels(tier="0", status="completed").inc()

    metrics = {
        "mae": avg_mae,
        "rmse": avg_rmse,
        "direction_accuracy": avg_dir_acc,
        "n_folds": fold_idx,
        "shap_top10": shap_importance[:10],
    }
    logger.info("Tier 0 complete — avg MAE=%.5f, avg DirAcc=%.3f over %d folds", avg_mae, avg_dir_acc, fold_idx)

    return {
        "model": best_model,
        "scaler": best_scaler,
        "metrics": metrics,
        "oof": pd.DataFrame(oof_records),
        "artifacts": {"tier0_xgboost": model_path, "tier0_scaler": scaler_path},
    }


def _compute_shap(model, X_df: pd.DataFrame, feature_names: list[str]) -> list[dict]:
    """SHAP feature importance — returns list of {feature, importance} dicts."""
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        dmatrix = xgb.DMatrix(X_df.values)
        shap_values = explainer.shap_values(dmatrix)
        mean_abs = np.abs(shap_values).mean(axis=0)
        ranked = sorted(zip(feature_names, mean_abs.tolist()), key=lambda x: -x[1])
        return [{"feature": f, "importance": round(v, 6)} for f, v in ranked]
    except Exception as e:
        logger.warning("SHAP computation failed (non-critical): %s", e)
        score = model.get_score(importance_type="gain")
        ranked = sorted(score.items(), key=lambda x: -x[1])
        return [{"feature": f, "importance": round(v, 6)} for f, v in ranked[:10]]
