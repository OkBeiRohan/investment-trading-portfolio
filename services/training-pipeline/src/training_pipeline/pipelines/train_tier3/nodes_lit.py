"""
Tier 3: Microstructure Scalper — Linear Transformer (LiT) with rolling-window
validation, z-score normalisation, data sufficiency checks, and progressive
activation.
"""

import logging
import os
from typing import Any

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.preprocessing import StandardScaler
from torch.utils.data import DataLoader, TensorDataset

import mlflow
import mlflow.pytorch
from ...utils.mlflow_tracking import log_model_params
from ...utils.observability import TRAINING_EPOCH_LOSS, TRAINING_EPOCH_DURATION, TRAINING_RUN_TOTAL

logger = logging.getLogger(__name__)

TIER3_FEATURES = [
    "bid_ask_spread_bps",
    "depth_imbalance_5",
    "ofi_1s",
    "ofi_5s",
    "trade_imbalance",
]

MIN_DAYS_REQUIRED = 90


class SimpleLinearTransformer(nn.Module):
    """GRU-based proxy for a Linear Transformer (LiT) for ultra-low-latency tick data."""

    def __init__(self, num_features: int, d_model: int = 32, n_layers: int = 2, forecast_horizon: int = 1):
        super().__init__()
        self.encoder = nn.Linear(num_features, d_model)
        self.recurrent_block = nn.GRU(d_model, d_model, num_layers=n_layers, batch_first=True)
        self.decoder = nn.Linear(d_model, forecast_horizon)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.encoder(x)
        out, _ = self.recurrent_block(x)
        return self.decoder(out[:, -1, :])


def train_lit_model(
    loader,
    config: dict[str, Any],
    instrument_key: str,
    start_date: str,
    end_date: str,
) -> dict:
    """
    90-day rolling-window LiT training with data sufficiency checks.

    Returns dict with: model, scaler, metrics, oof, artifacts.
    """
    logger.info("=== Tier 3: LiT Microstructure (rolling window) ===")
    mlflow.pytorch.autolog(log_models=True)

    tier3_cfg = config.get("tier3", config)
    lit_cfg = tier3_cfg.get("lit", {})
    features_list = tier3_cfg.get("features") or config.get("features") or TIER3_FEATURES

    seq_len = lit_cfg.get("sequence_length", 20)
    epochs = lit_cfg.get("epochs", 5)
    batch_size = lit_cfg.get("batch_size", 256)
    lr = lit_cfg.get("learning_rate", 5e-3)
    forecast_horizon = lit_cfg.get("forecast_horizon", 1)
    target_col = "target_direction_5m"

    raw_features = loader.load_features(
        instrument_key, start_date, end_date,
        interval_value=1, interval_unit="minute",
    )
    raw_labels = loader.load_labels(instrument_key, start_date, end_date)

    if raw_features.empty or raw_labels.empty:
        logger.warning("No tick/feature data for Tier 3")
        return _neutral_result()

    df = pd.merge(raw_features, raw_labels, on=["timestamp", "instrument_key"], how="inner", suffixes=("", "_lbl"))
    available = [f for f in features_list if f in df.columns]
    if not available:
        logger.error("No Tier 3 features found in data")
        return _neutral_result()

    if target_col not in df.columns:
        logger.error("Target %s missing", target_col)
        return _neutral_result()

    log_model_params({
        "tier": 3,
        "model_type": "lit",
        "input_dim": len(available),
        "hidden_dim": lit_cfg.get("d_model", 32),
        "n_layers": lit_cfg.get("n_layers", 2),
        "forecast_horizon": forecast_horizon,
        "sequence_length": seq_len,
        "epochs": epochs,
        "batch_size": batch_size,
        "learning_rate": lr,
    }, prefix="tier3")

    df = df.dropna(subset=available + [target_col]).sort_values("timestamp").reset_index(drop=True)
    df["_date"] = pd.to_datetime(df["timestamp"]).dt.date
    unique_dates = sorted(df["_date"].unique())

    if len(unique_dates) < MIN_DAYS_REQUIRED:
        logger.warning(
            "Insufficient data for Tier 3: %d days < %d required. Returning neutral.",
            len(unique_dates), MIN_DAYS_REQUIRED,
        )
        return _neutral_result()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    train_days = 90
    test_days = 10
    oof_records: list[dict] = []
    fold_metrics: list[dict] = []
    best_model = None
    best_scaler = None
    fold_idx = 0
    start_idx = 0

    while start_idx + train_days + test_days <= len(unique_dates):
        train_dates = unique_dates[start_idx : start_idx + train_days]
        test_dates = unique_dates[start_idx + train_days : start_idx + train_days + test_days]
        fold_idx += 1

        df_train = df[df["_date"].isin(train_dates)]
        df_test = df[df["_date"].isin(test_dates)]

        if len(df_train) < seq_len * 3 or len(df_test) < seq_len * 2:
            start_idx += test_days
            continue

        scaler = StandardScaler()
        train_vals = scaler.fit_transform(df_train[available].values)
        train_targets = df_train[target_col].values
        test_vals = scaler.transform(df_test[available].values)
        test_targets = df_test[target_col].values

        X_tr, y_tr = _build_seqs(train_vals, train_targets, seq_len, forecast_horizon)
        X_te, y_te = _build_seqs(test_vals, test_targets, seq_len, forecast_horizon)

        if len(X_tr) < batch_size:
            start_idx += test_days
            continue

        ds = TensorDataset(
            torch.tensor(np.array(X_tr), dtype=torch.float32),
            torch.tensor(np.array(y_tr), dtype=torch.float32),
        )
        dl = DataLoader(ds, batch_size=batch_size, shuffle=True)

        model = SimpleLinearTransformer(
            num_features=len(available), forecast_horizon=forecast_horizon,
        ).to(device)
        optimizer = torch.optim.Adam(model.parameters(), lr=lr)
        criterion = nn.MSELoss()

        model.train()
        for epoch in range(epochs):
            epoch_losses = []
            for bx, by in dl:
                bx, by = bx.to(device), by.to(device)
                optimizer.zero_grad()
                loss = criterion(model(bx), by)
                loss.backward()
                optimizer.step()
                epoch_losses.append(loss.item())
            train_loss = float(np.mean(epoch_losses))
            model.eval()
            with torch.no_grad():
                if len(X_te) > 0:
                    val_preds = model(torch.tensor(np.array(X_te), dtype=torch.float32).to(device))
                    val_loss = float(criterion(val_preds, torch.tensor(np.array(y_te), dtype=torch.float32).to(device)))
                else:
                    val_loss = float("nan")
            mlflow.log_metrics({"train_loss": train_loss, "val_loss": val_loss}, step=epoch)
            TRAINING_EPOCH_LOSS.labels(tier="3", model_type="lit", loss_type="train").set(train_loss)
            TRAINING_EPOCH_LOSS.labels(tier="3", model_type="lit", loss_type="val").set(val_loss)
            model.train()

        model.eval()
        if len(X_te) > 0:
            with torch.no_grad():
                preds = model(torch.tensor(np.array(X_te), dtype=torch.float32).to(device)).cpu().numpy()
            mse = float(np.mean((np.array(y_te) - preds) ** 2))
            direction_acc = float(np.mean(
                (np.array(y_te).flatten() > 0.5) == (preds.flatten() > 0.5)
            ))
        else:
            mse, direction_acc = float("nan"), float("nan")

        fold_metrics.append({"fold": fold_idx, "mse": mse, "direction_accuracy": direction_acc})
        logger.info("LiT Fold %d | MSE=%.6f DirAcc=%.3f", fold_idx, mse, direction_acc)

        test_ts = df_test["timestamp"].values
        if len(X_te) > 0:
            for i, p in enumerate(preds):
                ts_idx = seq_len + i
                if ts_idx < len(test_ts):
                    oof_records.append({"timestamp": test_ts[ts_idx], "tier3_direction_prob": float(p[0])})

        best_model = model
        best_scaler = scaler
        start_idx += test_days

    if not fold_metrics:
        logger.warning("No LiT folds executed")
        return _neutral_result()

    avg_mse = float(np.nanmean([m["mse"] for m in fold_metrics]))
    avg_dir = float(np.nanmean([m["direction_accuracy"] for m in fold_metrics]))

    os.makedirs("data/06_models", exist_ok=True)
    model_path = "data/06_models/tier3_lit.pt"
    scaler_path = "data/06_models/tier3_lit_scaler.pkl"
    torch.save(best_model.state_dict(), model_path)
    mlflow.pytorch.log_model(best_model, name="tier3_lit_model")
    import pickle
    with open(scaler_path, "wb") as f:
        pickle.dump(best_scaler, f)

    metrics = {"lit_avg_mse": avg_mse, "lit_direction_accuracy": avg_dir, "lit_n_folds": fold_idx}
    TRAINING_RUN_TOTAL.labels(tier="3", status="completed").inc()
    logger.info("Tier 3 complete — avg MSE=%.6f DirAcc=%.3f over %d folds", avg_mse, avg_dir, fold_idx)

    return {
        "model": best_model,
        "scaler": best_scaler,
        "metrics": metrics,
        "oof": pd.DataFrame(oof_records),
        "artifacts": {"tier3_lit": model_path, "tier3_lit_scaler": scaler_path},
    }


def _neutral_result() -> dict:
    """Progressive activation: return neutral predictions when data is insufficient."""
    return {"metrics": {"lit_status": "neutral_insufficient_data"}, "oof": pd.DataFrame(), "artifacts": {}}


def _build_seqs(values, targets, seq_len, horizon):
    X, y = [], []
    for i in range(len(values) - seq_len - horizon):
        X.append(values[i : i + seq_len])
        y.append(targets[i + seq_len : i + seq_len + horizon])
    return X, y
