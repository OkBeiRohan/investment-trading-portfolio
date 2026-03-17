"""
Tier 1: Macro Director — PatchTST with z-score normalisation, cosine LR,
and walk-forward validation for multi-horizon return forecasting.
"""

import logging
import os
from typing import Any

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.preprocessing import StandardScaler
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.utils.data import DataLoader, TensorDataset

logger = logging.getLogger(__name__)

TIER1_FEATURES = [
    "return_1d", "range_hl", "macd", "rsi_14",
    "realized_vol_20d", "india_vix", "sma_50", "sma_200",
]


class SimplePatchTST(nn.Module):
    """Patch Time-Series Transformer for multi-horizon return forecasting."""

    def __init__(
        self,
        sequence_length: int,
        patch_length: int,
        num_features: int,
        d_model: int = 64,
        n_heads: int = 4,
        e_layers: int = 2,
        forecast_horizon: int = 5,
    ):
        super().__init__()
        self.patch_length = patch_length
        self.num_patches = sequence_length // patch_length
        self.patch_embedding = nn.Linear(patch_length * num_features, d_model)
        encoder_layer = nn.TransformerEncoderLayer(d_model=d_model, nhead=n_heads, batch_first=True)
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=e_layers)
        self.head = nn.Linear(self.num_patches * d_model, forecast_horizon)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        batch_size = x.size(0)
        x = x.view(batch_size, self.num_patches, -1)
        x = self.patch_embedding(x)
        x = self.transformer(x)
        x = x.reshape(batch_size, -1)
        return self.head(x)


def train_patchtst_model(
    loader,
    config: dict[str, Any],
    instrument_key: str,
    start_date: str,
    end_date: str,
) -> dict:
    """
    Walk-forward PatchTST with z-score normalisation and cosine LR scheduler.

    Returns dict with: model, scaler, metrics, oof, artifacts.
    """
    logger.info("=== Tier 1: PatchTST (walk-forward) ===")

    tier1_cfg = config.get("tier1", config)
    patch_cfg = tier1_cfg.get("patchtst", {})
    features_list = tier1_cfg.get("features") or config.get("features") or TIER1_FEATURES

    seq_len = patch_cfg.get("sequence_length", 60)
    patch_len = patch_cfg.get("patch_length", 5)
    epochs = patch_cfg.get("epochs", 10)
    batch_size = patch_cfg.get("batch_size", 64)
    lr = patch_cfg.get("learning_rate", 1e-3)
    forecast_horizon = patch_cfg.get("forecast_horizon", 5)
    train_months = config.get("walk_forward_train_months", 6)
    test_months = config.get("walk_forward_test_months", 1)

    raw = loader.load_features(
        instrument_key, start_date, end_date,
        interval_value=1, interval_unit="day",
    )
    raw_labels = loader.load_labels(instrument_key, start_date, end_date)

    if raw.empty:
        logger.warning("No daily data for PatchTST")
        return {"metrics": {}, "oof": pd.DataFrame(), "artifacts": {}}

    available = [f for f in features_list if f in raw.columns]
    if not available:
        logger.error("No PatchTST features found")
        return {"metrics": {}, "oof": pd.DataFrame(), "artifacts": {}}

    df = pd.merge(raw, raw_labels, on=["timestamp", "instrument_key"], how="inner", suffixes=("", "_lbl"))
    target_col = "target_return_1d" if "target_return_1d" in df.columns else available[0]
    df = df.dropna(subset=available + [target_col]).sort_values("timestamp").reset_index(drop=True)
    df["_date"] = pd.to_datetime(df["timestamp"]).dt.date

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    unique_dates = sorted(df["_date"].unique())
    train_days = train_months * 21
    test_days = test_months * 21

    oof_records = []
    fold_metrics = []
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

        if len(df_train) < seq_len + forecast_horizon + 10:
            start_idx += test_days
            continue

        scaler = StandardScaler()
        train_vals = scaler.fit_transform(df_train[available].values)
        train_targets = df_train[target_col].values

        X_chunks, y_chunks = _build_sequences(train_vals, train_targets, seq_len, forecast_horizon)
        if len(X_chunks) < batch_size:
            start_idx += test_days
            continue

        X_t = torch.tensor(np.array(X_chunks), dtype=torch.float32)
        y_t = torch.tensor(np.array(y_chunks), dtype=torch.float32)
        ds = TensorDataset(X_t, y_t)
        dl = DataLoader(ds, batch_size=batch_size, shuffle=True)

        model = SimplePatchTST(
            sequence_length=seq_len, patch_length=patch_len,
            num_features=len(available), forecast_horizon=forecast_horizon,
        ).to(device)
        optimizer = torch.optim.Adam(model.parameters(), lr=lr)
        scheduler = CosineAnnealingLR(optimizer, T_max=epochs)
        criterion = nn.MSELoss()

        model.train()
        for epoch in range(epochs):
            total_loss = 0.0
            for bx, by in dl:
                bx, by = bx.to(device), by.to(device)
                optimizer.zero_grad()
                out = model(bx)
                loss = criterion(out, by)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
            scheduler.step()

        test_vals = scaler.transform(df_test[available].values)
        test_targets = df_test[target_col].values
        Xt, yt = _build_sequences(test_vals, test_targets, seq_len, forecast_horizon)
        if len(Xt) > 0:
            model.eval()
            with torch.no_grad():
                preds = model(torch.tensor(np.array(Xt), dtype=torch.float32).to(device)).cpu().numpy()
            test_mse = float(np.mean((np.array(yt) - preds) ** 2))
        else:
            test_mse = float("nan")

        fold_metrics.append({"fold": fold_idx, "test_mse": test_mse})
        logger.info("PatchTST Fold %d | test_MSE=%.6f", fold_idx, test_mse)

        test_timestamps = df_test["timestamp"].values
        if len(Xt) > 0:
            for i, pred_row in enumerate(preds):
                ts_idx = seq_len + i
                if ts_idx < len(test_timestamps):
                    oof_records.append({
                        "timestamp": test_timestamps[ts_idx],
                        "tier1_return_pred": float(pred_row[0]),
                    })

        best_model = model
        best_scaler = scaler
        start_idx += test_days

    if not fold_metrics:
        logger.warning("No PatchTST folds executed")
        return {"metrics": {}, "oof": pd.DataFrame(), "artifacts": {}}

    avg_mse = float(np.nanmean([m["test_mse"] for m in fold_metrics]))

    os.makedirs("data/06_models", exist_ok=True)
    model_path = "data/06_models/tier1_patchtst.pt"
    scaler_path = "data/06_models/tier1_patchtst_scaler.pkl"
    torch.save(best_model.state_dict(), model_path)
    import pickle
    with open(scaler_path, "wb") as f:
        pickle.dump(best_scaler, f)

    metrics = {
        "patchtst_avg_mse": avg_mse,
        "patchtst_n_folds": fold_idx,
    }
    logger.info("PatchTST complete — avg MSE=%.6f over %d folds", avg_mse, fold_idx)

    return {
        "model": best_model,
        "scaler": best_scaler,
        "metrics": metrics,
        "oof": pd.DataFrame(oof_records),
        "artifacts": {"tier1_patchtst": model_path, "tier1_patchtst_scaler": scaler_path},
    }


def _build_sequences(values, targets, seq_len, horizon):
    X, y = [], []
    for i in range(len(values) - seq_len - horizon):
        X.append(values[i : i + seq_len])
        y.append(targets[i + seq_len : i + seq_len + horizon])
    return X, y
