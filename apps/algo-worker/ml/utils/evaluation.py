"""
Model evaluation utilities
"""

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
)
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, Optional
import xgboost as xgb


def calculate_metrics(
    y_true: np.ndarray, y_pred_proba: np.ndarray, threshold: float = 0.5
) -> Dict[str, float]:
    """
    Calculate classification metrics

    Args:
        y_true: True labels
        y_pred_proba: Predicted probabilities
        threshold: Classification threshold

    Returns:
        Dictionary of metrics
    """
    y_pred = (y_pred_proba >= threshold).astype(int)

    metrics = {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "f1": f1_score(y_true, y_pred, zero_division=0),
        "auc": (
            roc_auc_score(y_true, y_pred_proba) if len(np.unique(y_true)) > 1 else 0.0
        ),
    }

    return metrics


def plot_confusion_matrix(
    y_true: np.ndarray,
    y_pred_proba: np.ndarray,
    output_path: str,
    threshold: float = 0.5,
    class_names: Optional[list] = None,
):
    """
    Plot confusion matrix

    Args:
        y_true: True labels
        y_pred_proba: Predicted probabilities
        output_path: Path to save plot
        threshold: Classification threshold
        class_names: Names of classes
    """
    y_pred = (y_pred_proba >= threshold).astype(int)
    cm = confusion_matrix(y_true, y_pred)

    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=class_names or ["Class 0", "Class 1"],
        yticklabels=class_names or ["Class 0", "Class 1"],
    )
    plt.title("Confusion Matrix")
    plt.ylabel("True Label")
    plt.xlabel("Predicted Label")
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.close()

    print(f"Confusion matrix saved to {output_path}")


def plot_feature_importance(
    model,
    feature_names: list,
    output_path: str,
    top_n: int = 20,
    importance_type: str = "gain",
):
    """
    Plot feature importance for XGBoost model

    Args:
        model: Trained XGBoost model
        feature_names: List of feature names
        output_path: Path to save plot
        top_n: Number of top features to show
        importance_type: 'gain', 'weight', or 'cover'
    """
    # Get feature importance
    importance_dict = model.get_score(importance_type=importance_type)

    # Convert to DataFrame
    importance_df = pd.DataFrame(
        [
            {"feature": feature_names[int(k.replace("f", ""))], "importance": v}
            for k, v in importance_dict.items()
        ]
    )

    # Sort and get top N
    importance_df = importance_df.sort_values("importance", ascending=False).head(top_n)

    # Plot
    plt.figure(figsize=(10, 8))
    plt.barh(range(len(importance_df)), importance_df["importance"].values)
    plt.yticks(range(len(importance_df)), importance_df["feature"].values)
    plt.xlabel(f"Importance ({importance_type})")
    plt.title(f"Top {top_n} Feature Importance")
    plt.gca().invert_yaxis()
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.close()

    print(f"Feature importance plot saved to {output_path}")


def plot_roc_curve(
    y_true: np.ndarray,
    y_pred_proba: np.ndarray,
    output_path: str,
    model_name: str = "Model",
):
    """
    Plot ROC curve

    Args:
        y_true: True labels
        y_pred_proba: Predicted probabilities
        output_path: Path to save plot
        model_name: Name of model for title
    """
    from sklearn.metrics import roc_curve

    fpr, tpr, thresholds = roc_curve(y_true, y_pred_proba)
    auc = roc_auc_score(y_true, y_pred_proba)

    plt.figure(figsize=(8, 6))
    plt.plot(fpr, tpr, label=f"{model_name} (AUC = {auc:.4f})", linewidth=2)
    plt.plot([0, 1], [0, 1], "k--", label="Random", linewidth=1)
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curve")
    plt.legend()
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.close()

    print(f"ROC curve saved to {output_path}")


def plot_training_history(
    history: Dict, output_path: str, metrics: Optional[list] = None
):
    """
    Plot training history for neural networks

    Args:
        history: Training history dictionary
        output_path: Path to save plot
        metrics: List of metrics to plot
    """
    if metrics is None:
        metrics = ["loss", "accuracy"]

    n_metrics = len(metrics)
    fig, axes = plt.subplots(1, n_metrics, figsize=(6 * n_metrics, 5))

    if n_metrics == 1:
        axes = [axes]

    for ax, metric in zip(axes, metrics):
        if metric in history:
            ax.plot(history[metric], label=f"Train {metric}")
        if f"val_{metric}" in history:
            ax.plot(history[f"val_{metric}"], label=f"Val {metric}")
        ax.set_xlabel("Epoch")
        ax.set_ylabel(metric.capitalize())
        ax.set_title(f"Model {metric.capitalize()}")
        ax.legend()
        ax.grid(alpha=0.3)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.close()

    print(f"Training history plot saved to {output_path}")


def print_classification_report(
    y_true: np.ndarray,
    y_pred_proba: np.ndarray,
    threshold: float = 0.5,
    class_names: Optional[list] = None,
):
    """
    Print detailed classification report

    Args:
        y_true: True labels
        y_pred_proba: Predicted probabilities
        threshold: Classification threshold
        class_names: Names of classes
    """
    y_pred = (y_pred_proba >= threshold).astype(int)

    print("\n" + "=" * 60)
    print("CLASSIFICATION REPORT")
    print("=" * 60)
    print(
        classification_report(
            y_true, y_pred, target_names=class_names or ["Class 0", "Class 1"], digits=4
        )
    )
    print("=" * 60 + "\n")


def calculate_sharpe_ratio(returns: np.ndarray, risk_free_rate: float = 0.0) -> float:
    """
    Calculate Sharpe ratio for strategy returns

    Args:
        returns: Array of returns
        risk_free_rate: Risk-free rate (annualized)

    Returns:
        Sharpe ratio
    """
    excess_returns = returns - risk_free_rate / 252  # Daily risk-free rate
    if excess_returns.std() == 0:
        return 0.0
    sharpe = np.sqrt(252) * excess_returns.mean() / excess_returns.std()
    return sharpe


def calculate_sortino_ratio(
    returns: np.ndarray, risk_free_rate: float = 0.0, mar: float = 0.0
) -> float:
    """
    Calculate Sortino ratio

    Args:
        returns: Array of returns
        risk_free_rate: Risk-free rate (annualized)
        mar: Minimum acceptable return

    Returns:
        Sortino ratio
    """
    excess_returns = returns - risk_free_rate / 252
    downside_returns = returns[returns < mar]

    if len(downside_returns) == 0 or downside_returns.std() == 0:
        return 0.0

    sortino = np.sqrt(252) * excess_returns.mean() / downside_returns.std()
    return sortino


def calculate_max_drawdown(equity_curve: np.ndarray) -> float:
    """
    Calculate maximum drawdown

    Args:
        equity_curve: Array of cumulative equity

    Returns:
        Maximum drawdown (as negative percentage)
    """
    cummax = np.maximum.accumulate(equity_curve)
    drawdown = (equity_curve - cummax) / cummax
    max_dd = drawdown.min()
    return max_dd
