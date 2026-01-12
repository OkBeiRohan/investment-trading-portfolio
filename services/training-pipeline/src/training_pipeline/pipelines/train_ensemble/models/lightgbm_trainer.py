"""
Production-grade LightGBM Level-0 Model Trainer
Implements walk-forward validation with volatility-adjusted labeling
"""

import logging
from pathlib import Path
from typing import Literal, Optional

import lightgbm as lgb
import mlflow
import numpy as np
import numpy.typing as npt
import pandas as pd
from pydantic import BaseModel, Field
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    precision_recall_fscore_support,  # type: ignore
    roc_auc_score,
)
from sklearn.model_selection import TimeSeriesSplit  # type: ignore

from training_pipeline.types import (  # type: ignore[import]
    FoldMetrics,
    TrainingConfig,
    TrainingResult,
    ValidationMetrics,
)

logger = logging.getLogger(__name__)


# ============================================================================
# Internal Type Definitions (Pydantic Models)
# ============================================================================


class LightGBMConfig(BaseModel):
    """LightGBM-specific hyperparameters"""

    objective: Literal["multiclass"] = "multiclass"
    num_class: Literal[3] = 3
    metric: str = "multi_logloss"
    boosting_type: Literal["gbdt", "dart", "goss"] = "gbdt"
    num_leaves: int = Field(default=31, ge=2, le=131072)
    learning_rate: float = Field(default=0.05, gt=0.0, le=1.0)
    n_estimators: int = Field(default=400, ge=1)
    min_data_in_leaf: int = Field(default=80, ge=1)
    feature_fraction: float = Field(default=0.8, gt=0.0, le=1.0)
    bagging_fraction: float = Field(default=0.8, gt=0.0, le=1.0)
    bagging_freq: int = Field(default=5, ge=0)
    lambda_l1: float = Field(default=0.5, ge=0.0)
    lambda_l2: float = Field(default=1.0, ge=0.0)
    max_depth: int = Field(default=-1, ge=-1)
    verbose: int = Field(default=-1)
    device: Literal["cpu", "gpu", "cuda"] = "gpu"
    gpu_platform_id: int = Field(default=0, ge=0)
    gpu_device_id: int = Field(default=0, ge=0)

    class Config:
        frozen = True

    def to_dict(self) -> dict[str, object]:
        """Convert to dict for LightGBM with proper types"""
        return self.model_dump()


class LabelingConfig(BaseModel):
    """Configuration for volatility-adjusted labeling"""

    horizon: int = Field(
        default=5, ge=1, description="Forward-looking horizon (minutes)"
    )
    k: float = Field(default=1.0, gt=0.0, description="Multiplier for ATR threshold")
    atr_column: str = Field(default="atr_percent", description="ATR feature name")

    class Config:
        frozen = True


class SplitIndices(BaseModel):
    """Train/test split indices"""

    train_idx: list[int] = Field(description="Training indices")
    test_idx: list[int] = Field(description="Test indices")

    class Config:
        frozen = True


class FeatureImportance(BaseModel):
    """Feature importance scores"""

    feature: str
    importance: float = Field(ge=0.0)

    class Config:
        frozen = True


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
        training_config: Optional[TrainingConfig] = None,
        lightgbm_config: Optional[LightGBMConfig] = None,
        labeling_config: Optional[LabelingConfig] = None,
    ):
        """
        Initialize LightGBM trainer

        Args:
            training_config: Walk-forward training configuration
            lightgbm_config: LightGBM hyperparameters
            labeling_config: Labeling configuration
        """
        self.training_config = training_config or TrainingConfig()
        self.lightgbm_config = lightgbm_config or LightGBMConfig()
        self.labeling_config = labeling_config or LabelingConfig()

        self.model: Optional[lgb.LGBMClassifier] = None
        self.oof_predictions: Optional[npt.NDArray[np.float64]] = None
        self.fold_metrics: list[FoldMetrics] = []

    def create_volatility_adjusted_labels(
        self,
        features: pd.DataFrame,
        prices: pd.Series,
    ) -> pd.Series:
        """Create volatility-adjusted labels with explicit unit handling"""

        # Validate ATR column exists
        if self.labeling_config.atr_column not in features.columns:
            raise ValueError(
                f"ATR column '{self.labeling_config.atr_column}' not found"
            )

        # Future returns (dimensionless percentage)
        future_returns = (prices.shift(-self.labeling_config.horizon) - prices) / prices

        # ATR threshold (ensure same units as returns)
        atr = features[self.labeling_config.atr_column]

        # CRITICAL: Explicit unit conversion
        if self.labeling_config.atr_column == "atr_percent":
            # Already in percentage form (0.015 = 1.5%)
            atr_threshold = self.labeling_config.k * atr
        elif self.labeling_config.atr_column == "atr":
            # In price points, need to normalize
            atr_threshold = self.labeling_config.k * (atr / prices)
        else:
            raise ValueError(
                f"Unknown ATR column format: {self.labeling_config.atr_column}. "
                "Expected 'atr_percent' (normalized) or 'atr' (price points)"
            )

        # Validate threshold is reasonable
        if (atr_threshold < 0).any() or (atr_threshold > 0.1).any():
            raise ValueError(f"ATR threshold out of bounds: {atr_threshold.describe()}")

        # Label logic
        labels = pd.Series(0, index=features.index, dtype=np.int8)
        labels[future_returns > atr_threshold] = 1  # UP
        labels[future_returns < -atr_threshold] = -1  # DOWN

        # Remove NaN at end
        labels = labels.iloc[: -self.labeling_config.horizon]

        # Log statistics
        label_dist = labels.value_counts(normalize=True)
        logger.info(
            f"Label distribution: UP={label_dist.get(1, 0):.2%}, "
            f"NEUTRAL={label_dist.get(0, 0):.2%}, DOWN={label_dist.get(-1, 0):.2%}"
        )
        logger.info(
            f"ATR threshold stats: mean={atr_threshold.mean():.4f}, "
            f"std={atr_threshold.std():.4f}"
        )

        return labels

    def walk_forward_split(
        self,
        features: pd.DataFrame,
        labels: pd.Series,
    ) -> list[SplitIndices]:
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
            List of SplitIndices with train/test indices
        """
        logger.info(
            f"Creating {self.training_config.n_splits} walk-forward splits with "
            f"purge={self.training_config.purge_window}, "
            f"embargo={self.training_config.embargo_window}"
        )

        tscv = TimeSeriesSplit(n_splits=self.training_config.n_splits)
        splits: list[SplitIndices] = []

        for fold, (train_idx, test_idx) in enumerate(tscv.split(features), 1):
            # Purge: Remove data immediately before test set
            purged_train_idx = train_idx[
                train_idx < test_idx[0] - self.training_config.purge_window
            ]

            # Embargo: Remove data immediately after test set
            max_test_idx = test_idx[-1]
            if max_test_idx + self.training_config.embargo_window < len(features):
                embargoed_test_idx = test_idx[
                    test_idx < len(features) - self.training_config.embargo_window
                ]
            else:
                embargoed_test_idx = test_idx

            logger.info(
                f"Fold {fold}: Train={len(purged_train_idx)}, Test={len(embargoed_test_idx)}"
            )

            splits.append(
                SplitIndices(
                    train_idx=purged_train_idx.tolist(),
                    test_idx=embargoed_test_idx.tolist(),
                )
            )

        return splits

    def train_fold(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_val: pd.DataFrame,
        y_val: pd.Series,
        fold: int,
    ) -> tuple[lgb.LGBMClassifier, FoldMetrics]:
        """
        Train LightGBM on a single fold

        Args:
            X_train: Training features
            y_train: Training labels
            X_val: Validation features
            y_val: Validation labels
            fold: Fold number (for logging)

        Returns:
            Trained model and fold metrics
        """
        logger.info(f"Training fold {fold}: Train={len(X_train)}, Val={len(X_val)}")

        # Convert labels to 0, 1, 2 for multiclass
        y_train_encoded = y_train + 1  # -1 → 0, 0 → 1, 1 → 2
        y_val_encoded = y_val + 1

        # Initialize model
        model = lgb.LGBMClassifier(**self.lightgbm_config.to_dict())  # type: ignore[arg-type]

        # Train with early stopping
        model.fit(  # type: ignore
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
        y_pred_proba: npt.NDArray[np.float64] = model.predict_proba(X_val)  # type: ignore
        y_pred: npt.NDArray[np.int64] = (
            np.argmax(y_pred_proba, axis=1) - 1
        )  # Back to -1, 0, 1

        # Compute metrics
        metrics = self._compute_metrics(y_val, y_pred, y_pred_proba, fold)

        logger.info(
            f"Fold {fold} complete: "
            f"Accuracy={metrics.accuracy:.3f}, "
            f"Precision(UP)={metrics.precision_up:.3f}, "
            f"Precision(DOWN)={metrics.precision_down:.3f}"
        )

        return model, metrics

    def _compute_metrics(
        self,
        y_true: pd.Series,
        y_pred: npt.NDArray[np.int64],
        y_pred_proba: npt.NDArray[np.float64],
        fold: int,
    ) -> FoldMetrics:
        """Compute comprehensive metrics for a fold"""

        # Convert to encoded labels for sklearn
        y_true_encoded = y_true + 1
        y_pred_encoded = y_pred + 1

        # Overall accuracy
        accuracy = float(accuracy_score(y_true_encoded, y_pred_encoded))

        # Per-class metrics
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_true_encoded, y_pred_encoded, labels=[0, 1, 2], zero_division=0
        )

        # Confusion matrix
        cm = confusion_matrix(y_true_encoded, y_pred_encoded, labels=[0, 1, 2])

        # Multi-class AUC (ovr = one-vs-rest)
        try:
            auc = float(roc_auc_score(y_true_encoded, y_pred_proba, multi_class="ovr"))
        except ValueError:
            auc = 0.0

        # Neutral accuracy (important for NOT trading)
        neutral_mask = y_true == 0
        if neutral_mask.sum() > 0:
            neutral_accuracy = float((y_pred[neutral_mask] == 0).mean())
        else:
            neutral_accuracy = 0.0

        # Extract per-class metrics (guaranteed to be arrays of length 3)
        # precision[0]=DOWN, precision[1]=NEUTRAL, precision[2]=UP
        precision_arr = np.asarray(precision)
        recall_arr = np.asarray(recall)
        f1_arr = np.asarray(f1)

        return FoldMetrics(
            fold=fold,
            accuracy=accuracy,
            auc=auc,
            precision_up=float(precision_arr[2]),
            precision_neutral=float(precision_arr[1]),
            precision_down=float(precision_arr[0]),
            recall_up=float(recall_arr[2]),
            recall_neutral=float(recall_arr[1]),
            recall_down=float(recall_arr[0]),
            f1_up=float(f1_arr[2]),
            f1_neutral=float(f1_arr[1]),
            f1_down=float(f1_arr[0]),
            neutral_accuracy=neutral_accuracy,
            confusion_matrix=cm.tolist(),
        )

    def train(
        self,
        features: pd.DataFrame,
        labels: pd.Series,
        mlflow_run_name: Optional[str] = None,
    ) -> TrainingResult:
        """
        Train LightGBM with walk-forward validation

        Args:
            features: Feature DataFrame (33 features as per blueprint)
            labels: Volatility-adjusted labels (-1, 0, 1)
            mlflow_run_name: Optional MLflow run name

        Returns:
            TrainingResult with model, metrics, and feature importance
        """
        logger.info("Starting LightGBM training with walk-forward validation")

        # Validate features
        validate_features(features)

        # Initialize OOF predictions
        self.oof_predictions = np.zeros(
            (len(features), 3), dtype=np.float64
        )  # 3 classes
        self.fold_metrics = []

        # Walk-forward splits
        splits = self.walk_forward_split(features, labels)

        # Start MLflow run
        with mlflow.start_run(run_name=mlflow_run_name or "lightgbm_walk_forward"):
            # Log hyperparameters
            mlflow.log_params(self.lightgbm_config.to_dict())
            mlflow.log_param("n_splits", self.training_config.n_splits)
            mlflow.log_param("purge_window", self.training_config.purge_window)
            mlflow.log_param("embargo_window", self.training_config.embargo_window)

            # Train each fold
            for fold, split in enumerate(splits, 1):
                X_train = features.iloc[np.array(split.train_idx)]
                y_train = labels.iloc[np.array(split.train_idx)]
                X_val = features.iloc[np.array(split.test_idx)]
                y_val = labels.iloc[np.array(split.test_idx)]

                # Train fold
                fold_model, fold_metrics = self.train_fold(
                    X_train, y_train, X_val, y_val, fold
                )

                # Store OOF predictions (convert to dense array)
                self.oof_predictions[np.array(split.test_idx)] = np.asarray(
                    fold_model.predict_proba(X_val)  # type: ignore
                )

                # Store metrics
                self.fold_metrics.append(fold_metrics)

                # Log fold metrics to MLflow
                mlflow.log_metric(f"fold_{fold}_accuracy", fold_metrics.accuracy)
                mlflow.log_metric(f"fold_{fold}_auc", fold_metrics.auc)
                mlflow.log_metric(
                    f"fold_{fold}_precision_up", fold_metrics.precision_up
                )
                mlflow.log_metric(
                    f"fold_{fold}_precision_down", fold_metrics.precision_down
                )

            # Compute average metrics across folds
            validation_metrics = self._aggregate_fold_metrics()

            # Log average metrics
            mlflow.log_metric("avg_accuracy", validation_metrics.accuracy_mean)
            mlflow.log_metric("avg_auc", validation_metrics.auc_mean)
            mlflow.log_metric("avg_precision_up", validation_metrics.precision_up_mean)
            mlflow.log_metric(
                "avg_precision_down", validation_metrics.precision_down_mean
            )

            logger.info(
                f"Walk-forward validation complete: "
                f"Avg Accuracy={validation_metrics.accuracy_mean:.3f}±{validation_metrics.accuracy_std:.3f}, "
                f"Avg AUC={validation_metrics.auc_mean:.3f}±{validation_metrics.auc_std:.3f}"
            )

            # Train final model on full dataset
            logger.info("Training final model on full dataset")
            y_encoded = labels + 1
            self.model = lgb.LGBMClassifier(**self.lightgbm_config.to_dict())  # type: ignore[arg-type]
            self.model.fit(features, y_encoded)  # type: ignore

            # Compute feature importance
            feature_importance_scores = self._compute_feature_importance()

            # Save feature importance as artifact
            feature_importance_df = pd.DataFrame(
                [(fi.feature, fi.importance) for fi in feature_importance_scores],
                columns=["feature", "importance"],
            )
            feature_importance_df.to_csv("feature_importance.csv", index=False)
            mlflow.log_artifact("feature_importance.csv")

            # Log model
            mlflow.lightgbm.log_model(self.model, "lightgbm")  # type: ignore

        return TrainingResult(
            model_type="lightgbm",
            fold_metrics=self.fold_metrics,
            validation_metrics=validation_metrics,
            feature_importance=[
                (fi.feature, fi.importance) for fi in feature_importance_scores
            ],
            oof_predictions_shape=self.oof_predictions.shape,
        )

    def _aggregate_fold_metrics(self) -> ValidationMetrics:
        """Aggregate metrics across all folds"""
        # Extract metric arrays
        accuracies = [m.accuracy for m in self.fold_metrics]
        aucs = [m.auc for m in self.fold_metrics]
        precision_ups = [m.precision_up for m in self.fold_metrics]
        precision_neutrals = [m.precision_neutral for m in self.fold_metrics]
        precision_downs = [m.precision_down for m in self.fold_metrics]
        recall_ups = [m.recall_up for m in self.fold_metrics]
        recall_neutrals = [m.recall_neutral for m in self.fold_metrics]
        recall_downs = [m.recall_down for m in self.fold_metrics]
        f1_ups = [m.f1_up for m in self.fold_metrics]
        f1_neutrals = [m.f1_neutral for m in self.fold_metrics]
        f1_downs = [m.f1_down for m in self.fold_metrics]
        neutral_accuracies = [m.neutral_accuracy for m in self.fold_metrics]

        return ValidationMetrics(
            accuracy_mean=float(np.mean(accuracies)),
            accuracy_std=float(np.std(accuracies)),
            auc_mean=float(np.mean(aucs)),
            auc_std=float(np.std(aucs)),
            precision_up_mean=float(np.mean(precision_ups)),
            precision_up_std=float(np.std(precision_ups)),
            precision_neutral_mean=float(np.mean(precision_neutrals)),
            precision_neutral_std=float(np.std(precision_neutrals)),
            precision_down_mean=float(np.mean(precision_downs)),
            precision_down_std=float(np.std(precision_downs)),
            recall_up_mean=float(np.mean(recall_ups)),
            recall_up_std=float(np.std(recall_ups)),
            recall_neutral_mean=float(np.mean(recall_neutrals)),
            recall_neutral_std=float(np.std(recall_neutrals)),
            recall_down_mean=float(np.mean(recall_downs)),
            recall_down_std=float(np.std(recall_downs)),
            f1_up_mean=float(np.mean(f1_ups)),
            f1_up_std=float(np.std(f1_ups)),
            f1_neutral_mean=float(np.mean(f1_neutrals)),
            f1_neutral_std=float(np.std(f1_neutrals)),
            f1_down_mean=float(np.mean(f1_downs)),
            f1_down_std=float(np.std(f1_downs)),
            neutral_accuracy_mean=float(np.mean(neutral_accuracies)),
            neutral_accuracy_std=float(np.std(neutral_accuracies)),
        )

    def _compute_feature_importance(self) -> list[FeatureImportance]:
        """Compute feature importance from final model"""
        if self.model is None:
            raise ValueError("No model trained yet")

        feature_importance_scores = [
            FeatureImportance(
                feature=feature,
                importance=float(importance),
            )
            for feature, importance in zip(
                self.model.feature_name_,
                self.model.feature_importances_,
            )
        ]

        # Sort by importance descending
        feature_importance_scores.sort(key=lambda x: x.importance, reverse=True)

        # Log top 10 features
        logger.info("Top 10 features:")
        for fi in feature_importance_scores[:10]:
            logger.info(f"  {fi.feature}: {fi.importance:.2f}")

        return feature_importance_scores

    def save_model(self, filepath: Path) -> None:
        """Save trained model to disk"""
        if self.model is None:
            raise ValueError("No model trained yet")

        # Ensure parent directory exists
        filepath.parent.mkdir(parents=True, exist_ok=True)

        self.model.booster_.save_model(str(filepath))
        logger.info(f"Model saved to {filepath}")

    def save_oof_predictions(self, filepath: Path) -> None:
        """Save out-of-fold predictions for meta-learner"""
        if self.oof_predictions is None:
            raise ValueError("No OOF predictions available")

        # Ensure parent directory exists
        filepath.parent.mkdir(parents=True, exist_ok=True)

        oof_df = pd.DataFrame(
            self.oof_predictions, columns=["prob_down", "prob_neutral", "prob_up"]
        )
        oof_df.to_parquet(str(filepath))
        logger.info(f"OOF predictions saved to {filepath}")


def validate_features(features: pd.DataFrame) -> pd.DataFrame:
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
    from pathlib import Path

    # This would be called from a Kedro pipeline node

    # Load features and prices
    features = pd.read_parquet("data/04_feature/features.parquet")
    prices = pd.read_parquet("data/01_raw/prices.parquet")["close"]

    # Validate features match blueprint
    features = validate_features(features)

    # Initialize configs
    training_config = TrainingConfig(
        n_splits=12,
        purge_window=375,
        embargo_window=375,
        random_state=42,
    )

    lightgbm_config = LightGBMConfig(
        objective="multiclass",
        num_class=3,
        metric="multi_logloss",
        boosting_type="gbdt",
        num_leaves=31,
        learning_rate=0.05,
        n_estimators=400,
        min_data_in_leaf=80,
        feature_fraction=0.8,
        bagging_fraction=0.8,
        bagging_freq=5,
        lambda_l1=0.5,
        lambda_l2=1.0,
        max_depth=-1,
        verbose=-1,
        device="gpu",
        gpu_platform_id=0,
        gpu_device_id=0,
    )

    labeling_config = LabelingConfig(
        horizon=5,  # 5 minutes
        k=1.0,
        atr_column="atr_percent",
    )

    # Initialize trainer
    trainer = LightGBMTrainer(
        training_config=training_config,
        lightgbm_config=lightgbm_config,
        labeling_config=labeling_config,
    )

    # Create volatility-adjusted labels
    labels = trainer.create_volatility_adjusted_labels(
        features=features,
        prices=prices,
    )

    # Align features with labels (remove last horizon rows)
    features_aligned = features.iloc[: -labeling_config.horizon]

    # Train with walk-forward validation
    result = trainer.train(
        features=features_aligned,
        labels=labels,
        mlflow_run_name="lightgbm_v1",
    )

    # Save outputs
    trainer.save_model(Path("data/06_models/lightgbm.txt"))
    trainer.save_oof_predictions(Path("data/07_model_output/oof_lightgbm.parquet"))

    logger.info(f"LightGBM training complete!")
    logger.info(f"Model type: {result.model_type}")
    logger.info(
        f"Validation AUC: {result.validation_metrics.auc_mean:.3f}±{result.validation_metrics.auc_std:.3f}"
    )
    logger.info(
        f"Top 3 features: {', '.join([f'{feat}: {imp:.2f}' for feat, imp in result.feature_importance[:3]])}"
    )
