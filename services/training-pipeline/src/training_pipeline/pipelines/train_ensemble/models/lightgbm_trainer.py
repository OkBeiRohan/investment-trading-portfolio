# services/training-pipeline/src/training_pipeline/pipelines/train_ensemble/models/lightgbm_trainer.py
"""
Production-grade LightGBM Level-0 Model Trainer
Implements walk-forward validation with volatility-adjusted labeling
"""

import logging
from typing import Dict, List, Optional, Tuple

import lightgbm as lgb
import mlflow
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,  # pyright: ignore[reportUnknownVariableType]
    confusion_matrix,
    precision_recall_fscore_support,  # pyright: ignore[reportUnknownVariableType]
    roc_auc_score,
)
from sklearn.model_selection import TimeSeriesSplit

logger = logging.getLogger(__name__)


class LightGBMTrainer:
    """
    State-of-the-art LightGBM trainer for index options trading

    Features:
    - Walk-forward validation with purging/embargoing
    - Volatility-adjusted labeling
    - Production-safe hyperparameters
    - Multi-class classification (UP, NEUTRAL, DOWN)
    - MLflow experiment tracking
    - Out-of-fold predictions for meta-learner
    """

    def __init__(
        self,
        n_splits: int = 12,
        purge_window: int = 375,  # 1 day @ 1s candles
        embargo_window: int = 375,
        parameters: Optional[Dict] = None,
    ):
        """
        Initialize LightGBM trainer

        Args:
            n_splits: Number of walk-forward splits
            purge_window: Timesteps to purge between train/test (prevent leakage)
            embargo_window: Timesteps to embargo after test (account for long memory)
            parameters: Model hyperparameters (uses safe defaults if None)
        """
        self.n_splits = n_splits
        self.purge_window = purge_window
        self.embargo_window = embargo_window

        # Production-safe hyperparameters (aligned with blueprint)
        self.parameters = parameters or {
            "objective": "multiclass",
            "num_class": 3,
            "metric": "multi_logloss",
            "boosting_type": "gbdt",
            "num_leaves": 31,
            "learning_rate": 0.05,
            "n_estimators": 400,
            "min_data_in_leaf": 80,
            "feature_fraction": 0.8,
            "bagging_fraction": 0.8,
            "bagging_freq": 5,
            "lambda_l1": 0.5,
            "lambda_l2": 1.0,
            "max_depth": -1,
            "verbose": -1,
            "device": "gpu",  # Use GPU if available
            "gpu_platform_id": 0,
            "gpu_device_id": 0,
        }

        self.model = None
        self.oof_predictions = None
        self.fold_metrics = []

    def create_volatility_adjusted_labels(
        self,
        features: pd.DataFrame,
        prices: pd.Series,
        horizon: int = 5,  # 5 minutes
        k: float = 1.0,
        atr_column: str = "atr_percent",
    ) -> pd.Series:
        """
        Create volatility-adjusted labels

        This is CRITICAL for proper trading signal generation.
        Labels based on whether future return exceeds volatility threshold.

        Args:
            features: Feature DataFrame with ATR
            prices: Price series
            horizon: Forward-looking horizon (minutes)
            k: Multiplier for ATR threshold
            atr_column: ATR feature name

        Returns:
            Series with labels: 1 (UP), 0 (NEUTRAL), -1 (DOWN)
        """
        logger.info(f"Creating volatility-adjusted labels (horizon={horizon}, k={k})")

        # Future returns
        future_returns = (prices.shift(-horizon) - prices) / prices

        # Volatility-based threshold
        atr_threshold = k * features[atr_column]

        # Label logic (from blueprint)
        labels = pd.Series(0, index=features.index)  # Default NEUTRAL
        labels[future_returns > atr_threshold] = 1  # UP
        labels[future_returns < -atr_threshold] = -1  # DOWN

        # Remove NaN at end (can't compute future returns)
        labels = labels.iloc[:-horizon]

        label_dist = labels.value_counts(normalize=True)
        logger.info(
            f"Label distribution: UP={label_dist.get(1, 0):.2%}, "
            f"NEUTRAL={label_dist.get(0, 0):.2%}, DOWN={label_dist.get(-1, 0):.2%}"
        )

        return labels

    def walk_forward_split(
        self,
        features: pd.DataFrame,
        labels: pd.Series,
    ) -> List[Tuple[np.ndarray, np.ndarray]]:
        """
        Walk-forward cross-validation with purging and embargoing

        Prevents temporal leakage by:
        1. Expanding training window (not shuffled)
        2. Purging data immediately before test
        3. Embargoing data immediately after test

        Args:
            features: Feature DataFrame
            labels: Label Series

        Returns:
            List of (train_idx, test_idx) tuples
        """
        logger.info(
            f"Creating {self.n_splits} walk-forward splits with "
            f"purge={self.purge_window}, embargo={self.embargo_window}"
        )

        tscv = TimeSeriesSplit(n_splits=self.n_splits)
        splits = []

        for fold, (train_idx, test_idx) in enumerate(tscv.split(features), 1):
            # Purge: Remove data immediately before test set
            purged_train_idx = train_idx[train_idx < test_idx[0] - self.purge_window]

            # Embargo: Remove data immediately after test set
            max_test_idx = test_idx[-1]
            if max_test_idx + self.embargo_window < len(features):
                embargoed_test_idx = test_idx[
                    test_idx < len(features) - self.embargo_window
                ]
            else:
                embargoed_test_idx = test_idx

            logger.info(
                f"Fold {fold}: Train={len(purged_train_idx)}, Test={len(embargoed_test_idx)}"
            )
            splits.append((purged_train_idx, embargoed_test_idx))

        return splits

    def train_fold(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_val: pd.DataFrame,
        y_val: pd.Series,
        fold: int,
    ) -> Tuple[lgb.LGBMClassifier, Dict]:
        """
        Train LightGBM on a single fold

        Args:
            X_train: Training features
            y_train: Training labels
            X_val: Validation features
            y_val: Validation labels
            fold: Fold number (for logging)

        Returns:
            Trained model and metrics dict
        """
        logger.info(f"Training fold {fold}: Train={len(X_train)}, Val={len(X_val)}")

        # Convert labels to 0, 1, 2 for multiclass
        y_train_encoded = y_train + 1  # -1 → 0, 0 → 1, 1 → 2
        y_val_encoded = y_val + 1

        # Initialize model
        model = lgb.LGBMClassifier(**self.parameters)

        # Train with early stopping
        model.fit(
            X_train,
            y_train_encoded,
            eval_set=[(X_val, y_val_encoded)],
            eval_metric="multi_logloss",
            callbacks=[
                lgb.early_stopping(stopping_rounds=50, verbose=False),
                lgb.log_evaluation(period=50),
            ],
        )

        # Predict probabilities
        y_pred_proba = model.predict_proba(X_val)
        y_pred = np.argmax(y_pred_proba, axis=1) - 1  # Back to -1, 0, 1

        # Compute metrics
        metrics = self._compute_metrics(y_val, y_pred, y_pred_proba, fold)

        logger.info(
            f"Fold {fold} complete: "
            f"Accuracy={metrics['accuracy']:.3f}, "
            f"Precision(UP)={metrics['precision_up']:.3f}, "
            f"Precision(DOWN)={metrics['precision_down']:.3f}"
        )

        return model, metrics

    def _compute_metrics(
        self,
        y_true: pd.Series,
        y_pred: np.ndarray,
        y_pred_proba: np.ndarray,
        fold: int,
    ) -> Dict:
        """Compute comprehensive metrics for a fold"""

        # Convert to encoded labels for sklearn
        y_true_encoded = y_true + 1
        y_pred_encoded = y_pred + 1

        # Overall accuracy
        accuracy = accuracy_score(y_true_encoded, y_pred_encoded)

        # Per-class metrics
        precision, recall, f1, support = precision_recall_fscore_support(
            y_true_encoded, y_pred_encoded, labels=[0, 1, 2], zero_division=0
        )

        # Confusion matrix
        cm = confusion_matrix(y_true_encoded, y_pred_encoded, labels=[0, 1, 2])

        # Multi-class AUC (ovr = one-vs-rest)
        try:
            auc = roc_auc_score(y_true_encoded, y_pred_proba, multi_class="ovr")
        except ValueError:
            auc = 0.0

        # Trade expectancy (focus on UP and DOWN only)
        up_mask = y_true == 1
        down_mask = y_true == -1

        precision_up = precision[2] if len(precision) > 2 else 0.0  # Label 2 = UP
        precision_down = precision[0] if len(precision) > 0 else 0.0  # Label 0 = DOWN

        # Neutral accuracy (important for NOT trading)
        neutral_mask = y_true == 0
        if neutral_mask.sum() > 0:
            neutral_accuracy = (y_pred[neutral_mask] == 0).mean()
        else:
            neutral_accuracy = 0.0

        metrics = {
            "fold": fold,
            "accuracy": accuracy,
            "auc": auc,
            "precision_up": precision_up,
            "precision_neutral": precision[1] if len(precision) > 1 else 0.0,
            "precision_down": precision_down,
            "recall_up": recall[2] if len(recall) > 2 else 0.0,
            "recall_neutral": recall[1] if len(recall) > 1 else 0.0,
            "recall_down": recall[0] if len(recall) > 0 else 0.0,
            "f1_up": f1[2] if len(f1) > 2 else 0.0,
            "f1_neutral": f1[1] if len(f1) > 1 else 0.0,
            "f1_down": f1[0] if len(f1) > 0 else 0.0,
            "neutral_accuracy": neutral_accuracy,
            "confusion_matrix": cm.tolist(),
        }

        return metrics

    def train(
        self,
        features: pd.DataFrame,
        labels: pd.Series,
        mlflow_run_name: Optional[str] = None,
    ) -> Tuple[lgb.LGBMClassifier, np.ndarray]:
        """
        Train LightGBM with walk-forward validation

        Args:
            features: Feature DataFrame (33 features as per blueprint)
            labels: Volatility-adjusted labels (-1, 0, 1)
            mlflow_run_name: Optional MLflow run name

        Returns:
            Final trained model and out-of-fold predictions
        """
        logger.info("Starting LightGBM training with walk-forward validation")

        # Initialize OOF predictions
        self.oof_predictions = np.zeros((len(features), 3))  # 3 classes

        # Walk-forward splits
        splits = self.walk_forward_split(features, labels)

        # Start MLflow run
        with mlflow.start_run(run_name=mlflow_run_name or "lightgbm_walk_forward"):
            # Log hyperparameters
            mlflow.log_params(self.parameters)
            mlflow.log_param("n_splits", self.n_splits)
            mlflow.log_param("purge_window", self.purge_window)
            mlflow.log_param("embargo_window", self.embargo_window)

            # Train each fold
            for fold, (train_idx, test_idx) in enumerate(splits, 1):
                X_train = features.iloc[train_idx]
                y_train = labels.iloc[train_idx]
                X_val = features.iloc[test_idx]
                y_val = labels.iloc[test_idx]

                # Train fold
                fold_model, fold_metrics = self.train_fold(
                    X_train, y_train, X_val, y_val, fold
                )

                # Store OOF predictions
                self.oof_predictions[test_idx] = fold_model.predict_proba(X_val)

                # Store metrics
                self.fold_metrics.append(fold_metrics)

                # Log fold metrics to MLflow
                for metric_name, metric_value in fold_metrics.items():
                    if isinstance(metric_value, (int, float)):
                        mlflow.log_metric(f"fold_{fold}_{metric_name}", metric_value)

            # Compute average metrics across folds
            avg_metrics = self._aggregate_fold_metrics()

            # Log average metrics
            for metric_name, metric_value in avg_metrics.items():
                if isinstance(metric_value, (int, float)):
                    mlflow.log_metric(f"avg_{metric_name}", metric_value)

            logger.info(
                f"Walk-forward validation complete: "
                f"Avg Accuracy={avg_metrics['accuracy']:.3f}, "
                f"Avg AUC={avg_metrics['auc']:.3f}"
            )

            # Train final model on full dataset
            logger.info("Training final model on full dataset")
            y_encoded = labels + 1
            self.model = lgb.LGBMClassifier(**self.parameters)
            self.model.fit(features, y_encoded)

            # Log feature importance
            feature_importance = pd.DataFrame(
                {
                    "feature": features.columns,
                    "importance": self.model.feature_importances_,
                }
            ).sort_values("importance", ascending=False)

            logger.info("Top 10 features:")
            for idx, row in feature_importance.head(10).iterrows():
                logger.info(f"  {row['feature']}: {row['importance']:.2f}")

            # Save feature importance as artifact
            feature_importance.to_csv("feature_importance.csv", index=False)
            mlflow.log_artifact("feature_importance.csv")

            # Log model
            mlflow.lightgbm.log_model(self.model, "lightgbm")

        return self.model, self.oof_predictions

    def _aggregate_fold_metrics(self) -> Dict:
        """Aggregate metrics across all folds"""
        avg_metrics = {}

        for key in self.fold_metrics[0].keys():
            if key in ["fold", "confusion_matrix"]:
                continue

            values = [m[key] for m in self.fold_metrics]
            avg_metrics[key] = np.mean(values)
            avg_metrics[f"{key}_std"] = np.std(values)

        return avg_metrics

    def save_model(self, filepath: str) -> None:
        """Save trained model to disk"""
        if self.model is None:
            raise ValueError("No model trained yet")

        self.model.booster_.save_model(filepath)
        logger.info(f"Model saved to {filepath}")

    def save_oof_predictions(self, filepath: str) -> None:
        """Save out-of-fold predictions for meta-learner"""
        if self.oof_predictions is None:
            raise ValueError("No OOF predictions available")

        oof_df = pd.DataFrame(
            self.oof_predictions, columns=["prob_down", "prob_neutral", "prob_up"]
        )
        oof_df.to_parquet(filepath)
        logger.info(f"OOF predictions saved to {filepath}")


def validate_features(features: pd.DataFrame) -> None:
    """
    Validate feature DataFrame matches blueprint specification

    Expected 33 features in correct order:
    - Market Structure (8)
    - Momentum & Trend (8)
    - Volatility (5)
    - Options (9)
    - Time Context (3)
    """
    expected_features = [
        # Market Structure (8)
        "price_vs_vwap",
        "price_vs_day_high",
        "price_vs_day_low",
        "range_position",
        "prev_day_high_dist",
        "prev_day_low_dist",
        "weekly_high_dist",
        "weekly_low_dist",
        # Momentum & Trend (8)
        "rsi_5",
        "rsi_14",
        "rsi_21",
        "macd_hist",
        "ema_9_slope",
        "ema_21_slope",
        "adx",
        "roc_5",
        # Volatility (5)
        "atr_percent",
        "realized_vol_5m",
        "realized_vol_15m",
        "vol_expansion_ratio",
        "india_vix",
        # Options (9)
        "atm_iv",
        "atm_iv_change",
        "delta_atm",
        "gamma_atm",
        "vega_atm",
        "theta_atm",
        "pcr_oi",
        "pcr_volume",
        "max_pain_dist",
        # Time Context (3)
        "minutes_from_open",
        "minutes_to_close",
        "day_of_week",
    ]

    missing = set(expected_features) - set(features.columns)
    extra = set(features.columns) - set(expected_features)

    if missing:
        raise ValueError(f"Missing required features: {missing}")

    if extra:
        logger.warning(f"Extra features (will be ignored): {extra}")

    # Reorder to match blueprint
    features_ordered = features[expected_features]

    logger.info(f"Feature validation passed: {len(expected_features)} features")
    return features_ordered


# Example usage
if __name__ == "__main__":
    # This would be called from a Kedro pipeline node

    # Load features and prices
    features = pd.read_parquet("data/04_feature/features.parquet")
    prices = pd.read_parquet("data/01_raw/prices.parquet")["close"]

    # Validate features match blueprint
    features = validate_features(features)

    # Initialize trainer
    trainer = LightGBMTrainer(
        n_splits=12,
        purge_window=375,
        embargo_window=375,
    )

    # Create volatility-adjusted labels
    labels = trainer.create_volatility_adjusted_labels(
        features=features,
        prices=prices,
        horizon=5,  # 5 minutes
        k=1.0,
    )

    # Align features with labels (remove last horizon rows)
    features_aligned = features.iloc[:-5]

    # Train with walk-forward validation
    model, oof_predictions = trainer.train(
        features=features_aligned,
        labels=labels,
        mlflow_run_name="lightgbm_v1",
    )

    # Save outputs
    trainer.save_model("data/06_models/lightgbm.txt")
    trainer.save_oof_predictions("data/07_model_output/oof_lightgbm.parquet")

    logger.info("LightGBM training complete!")
