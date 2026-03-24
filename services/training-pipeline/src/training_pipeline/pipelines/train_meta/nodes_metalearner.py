"""
Meta-Learner: Regime-Conditioned Gating Network trained on **real** OOF
predictions from Tiers 0-3.

Replaces the previous mock-tensor implementation with actual timestamp-
aligned out-of-fold predictions, temporal consistency loss, gradient
clipping, and early stopping.
"""

import logging
import os
from typing import Any, Optional

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset

import mlflow
import mlflow.pytorch
from ...utils.mlflow_tracking import log_model_params
from ...utils.observability import (
    TRAINING_EPOCH_LOSS, TRAINING_RUN_TOTAL, META_GATING_WEIGHT, update_gpu_metrics
)

logger = logging.getLogger(__name__)


class RegimeConditionedGatingNetwork(nn.Module):
    """Fuses 4 tier outputs via regime-aware dynamic weighting."""

    def __init__(self, num_models: int = 4, num_regimes: int = 4, hidden_size: int = 32):
        super().__init__()
        self.num_models = num_models
        self.gating = nn.Sequential(
            nn.Linear(num_models + num_regimes, hidden_size),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_size, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, num_models),
        )

    def forward(self, model_predictions: torch.Tensor, regime_one_hot: torch.Tensor):
        gate_in = torch.cat([model_predictions, regime_one_hot], dim=-1)
        weights = F.softmax(self.gating(gate_in), dim=-1)
        weighted = model_predictions * weights
        final = torch.sum(weighted, dim=-1, keepdim=True)
        return final, weights


class RegimeTemporalLoss(nn.Module):
    """
    MSE + regime penalty (higher loss in volatile regimes) + temporal
    consistency penalty (penalises rapid prediction flipping).
    """

    def __init__(self, volatile_regime_idx: int = 3, regime_penalty: float = 2.0, temporal_weight: float = 0.1):
        super().__init__()
        self.volatile_idx = volatile_regime_idx
        self.regime_penalty = regime_penalty
        self.temporal_weight = temporal_weight
        self.mse = nn.MSELoss(reduction="none")

    def forward(
        self,
        predictions: torch.Tensor,
        targets: torch.Tensor,
        regime_one_hot: torch.Tensor,
        prev_predictions: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        base = self.mse(predictions, targets)

        is_volatile = (regime_one_hot[:, self.volatile_idx] > 0.5).unsqueeze(-1).float()
        penalty = 1.0 + is_volatile * (self.regime_penalty - 1.0)
        loss = (base * penalty).mean()

        if prev_predictions is not None:
            flip_penalty = ((predictions - prev_predictions) ** 2).mean()
            loss = loss + self.temporal_weight * flip_penalty

        return loss


def train_meta_learner(
    all_oof: dict[str, pd.DataFrame],
    config: dict[str, Any],
) -> dict:
    """
    Train the Gating Network on timestamp-aligned OOF predictions
    from Tiers 0-3.

    Parameters
    ----------
    all_oof : dict
        Keys like ``tier_0``, ``tier_1``, … each value a DataFrame with
        ``timestamp`` and the tier's prediction column.
    config : dict
        Contains ``meta`` sub-dict with epochs, batch_size, learning_rate,
        num_regimes, volatile_regime_idx.

    Returns dict with: model, metrics, artifacts.
    """
    logger.info("=== Meta-Learner: Regime-Conditioned Gating Network ===")

    meta_cfg = config.get("meta", {})
    epochs = meta_cfg.get("epochs", 20)
    batch_size = meta_cfg.get("batch_size", 128)
    lr = meta_cfg.get("learning_rate", 1e-3)
    num_regimes = meta_cfg.get("num_regimes", 4)
    volatile_idx = meta_cfg.get("volatile_regime_idx", 3)

    mlflow.pytorch.autolog(log_models=False)
    log_model_params({
        "tier": "meta",
        "model_type": "gating_network",
        "epochs": epochs,
        "batch_size": batch_size,
        "learning_rate": lr,
        "num_regimes": num_regimes,
        "volatile_regime_idx": volatile_idx,
        "num_models": 4,
        "hidden_size": meta_cfg.get("hidden_size", 32),
    }, prefix="meta")

    merged = _merge_oof(all_oof, num_regimes)
    if merged is None or len(merged) < 100:
        logger.warning("Insufficient OOF data for meta-learner (%s rows)", len(merged) if merged is not None else 0)
        model = RegimeConditionedGatingNetwork(num_models=4, num_regimes=num_regimes)
        return {"model": model, "metrics": {"meta_status": "insufficient_oof"}, "artifacts": {}}

    pred_cols = ["tier0_pred", "tier1_pred", "tier2_pred", "tier3_pred"]
    regime_cols = [f"regime_{i}" for i in range(num_regimes)]
    target_col = "meta_target"

    X_preds = torch.tensor(merged[pred_cols].values, dtype=torch.float32)
    X_regime = torch.tensor(merged[regime_cols].values, dtype=torch.float32)
    y = torch.tensor(merged[target_col].values.reshape(-1, 1), dtype=torch.float32)

    n = len(merged)
    split = int(n * 0.8)
    train_ds = TensorDataset(X_preds[:split], X_regime[:split], y[:split])
    val_ds = TensorDataset(X_preds[split:], X_regime[split:], y[split:])
    train_dl = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_dl = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = RegimeConditionedGatingNetwork(num_models=4, num_regimes=num_regimes).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    criterion = RegimeTemporalLoss(volatile_regime_idx=volatile_idx)

    best_val_loss = float("inf")
    patience = 5
    patience_counter = 0
    gate_weights_log: list[dict] = []

    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        prev_preds = None
        for preds_b, regime_b, target_b in train_dl:
            preds_b, regime_b, target_b = preds_b.to(device), regime_b.to(device), target_b.to(device)
            optimizer.zero_grad()
            final, weights = model(preds_b, regime_b)
            loss = criterion(final, target_b, regime_b, prev_preds)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            train_loss += loss.item()
            prev_preds = final.detach()

        model.eval()
        val_loss = 0.0
        all_weights = []
        with torch.no_grad():
            for preds_b, regime_b, target_b in val_dl:
                preds_b, regime_b, target_b = preds_b.to(device), regime_b.to(device), target_b.to(device)
                final, weights = model(preds_b, regime_b)
                val_loss += criterion(final, target_b, regime_b).item()
                all_weights.append(weights.cpu().numpy())

        avg_train = train_loss / max(len(train_dl), 1)
        avg_val = val_loss / max(len(val_dl), 1)

        mlflow.log_metrics({
            "meta_train_loss": avg_train,
            "meta_val_loss": avg_val,
        }, step=epoch)
        TRAINING_EPOCH_LOSS.labels(tier="meta", model_type="gating", loss_type="train").set(avg_train)
        TRAINING_EPOCH_LOSS.labels(tier="meta", model_type="gating", loss_type="val").set(avg_val)
        update_gpu_metrics()

        if all_weights:
            w = np.concatenate(all_weights, axis=0).mean(axis=0)
            gate_weights_log.append({
                "epoch": epoch + 1,
                **{f"tier{i}_weight": round(float(w[i]), 4) for i in range(len(w))},
            })
            for i in range(len(w)):
                META_GATING_WEIGHT.labels(tier_index=str(i)).set(float(w[i]))
                mlflow.log_metric(f"gate_weight_tier{i}", float(w[i]), step=epoch + 1)

        logger.info("Meta Epoch %d/%d | train=%.4f val=%.4f", epoch + 1, epochs, avg_train, avg_val)

        if avg_val < best_val_loss:
            best_val_loss = avg_val
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                logger.info("Early stopping at epoch %d", epoch + 1)
                break

    os.makedirs("data/06_models", exist_ok=True)
    model_path = "data/06_models/meta_learner.pt"
    torch.save(model.state_dict(), model_path)

    mlflow.pytorch.log_model(model, "meta_learner_model")
    mlflow.log_dict(gate_weights_log, "gate_weights_evolution.json")
    TRAINING_RUN_TOTAL.labels(tier="meta", status="completed").inc()

    metrics = {
        "meta_val_loss": best_val_loss,
        "meta_epochs_run": epoch + 1,
        "meta_n_samples": n,
        "gate_weights_final": gate_weights_log[-1] if gate_weights_log else {},
    }
    mlflow.log_metrics({
        "meta_val_loss_final": best_val_loss,
        "meta_epochs_run": float(epoch + 1),
        "meta_n_samples": float(n),
    })
    logger.info("Meta-learner complete — val_loss=%.4f, %d samples, %d epochs", best_val_loss, n, epoch + 1)

    return {
        "model": model,
        "metrics": metrics,
        "artifacts": {"meta_learner": model_path},
        "gate_weights_log": gate_weights_log,
    }


def _merge_oof(all_oof: dict, num_regimes: int) -> Optional[pd.DataFrame]:
    """
    Align OOF predictions from all tiers on timestamp.

    Produces columns: tier0_pred, tier1_pred, tier2_pred, tier3_pred,
    regime_0..regime_N, meta_target.
    """
    frames = {}

    tier0 = all_oof.get("tier_0", pd.DataFrame())
    if not tier0.empty and "tier0_gap_pred" in tier0.columns:
        frames["tier0_pred"] = tier0.set_index("timestamp")["tier0_gap_pred"]

    tier1 = all_oof.get("tier_1", pd.DataFrame())
    if not tier1.empty:
        t1 = tier1.set_index("timestamp")
        if "tier1_return_pred" in t1.columns:
            frames["tier1_pred"] = t1["tier1_return_pred"]
        for i in range(num_regimes):
            col = f"hmm_regime_{i}"
            if col in t1.columns:
                frames[f"regime_{i}"] = t1[col]

    tier2 = all_oof.get("tier_2", pd.DataFrame())
    if not tier2.empty and "tier2_direction_prob" in tier2.columns:
        frames["tier2_pred"] = tier2.set_index("timestamp")["tier2_direction_prob"]

    tier3 = all_oof.get("tier_3", pd.DataFrame())
    if not tier3.empty and "tier3_direction_prob" in tier3.columns:
        frames["tier3_pred"] = tier3.set_index("timestamp")["tier3_direction_prob"]

    if len(frames) < 2:
        logger.warning("Need at least 2 tier OOF sources, got %d", len(frames))
        return None

    merged = pd.DataFrame(frames)
    merged = merged.dropna()

    for col in ["tier0_pred", "tier1_pred", "tier2_pred", "tier3_pred"]:
        if col not in merged.columns:
            merged[col] = 0.0
    for i in range(num_regimes):
        rc = f"regime_{i}"
        if rc not in merged.columns:
            merged[rc] = 1.0 / num_regimes

    if "tier2_pred" in merged.columns:
        merged["meta_target"] = merged["tier2_pred"]
    else:
        merged["meta_target"] = merged[["tier0_pred", "tier1_pred"]].mean(axis=1)

    merged = merged.reset_index().rename(columns={"index": "timestamp"})
    logger.info("Merged OOF: %d rows, columns=%s", len(merged), list(merged.columns))
    return merged
