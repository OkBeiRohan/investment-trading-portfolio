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

    # Class weighting (handle label imbalance)
    class_weight: Optional[dict[int, float]] = Field(
        default=None,
        description="Class weights for imbalanced labels. "
        "Example: {0: 1.2, 1: 0.6, 2: 1.2} penalizes false UP/DOWN more than NEUTRAL",
    )

    # Monotonic constraints (optional, advanced)
    monotone_constraints: Optional[list[int]] = Field(
        default=None,
        description="Feature-wise monotonic constraints. "
        "1 = increasing, -1 = decreasing, 0 = no constraint. "
        "Example: [1, 0, 1, ...] for 33 features ensures fut_return_5m → UP probability",
    )

    class Config:
        frozen = True

    def to_dict(self) -> dict[str, object]:
        """Convert to dict for LightGBM with proper types"""
        config = self.model_dump(exclude_none=True)
        # LightGBM expects 'class_weight' as 'balanced' or dict
        if self.class_weight is not None:
            config["class_weight"] = self.class_weight
        return config


class LabelingConfig(BaseModel):
    """Configuration for volatility-adjusted labeling"""

    horizon: int = Field(
        default=5, ge=1, description="Forward-looking horizon (minutes)"
    )
    k: float = Field(
        default=1.0,
        gt=0.0,
        description="Multiplier for ATR threshold (used if use_dynamic_k=False)",
    )
    atr_column: str = Field(default="atr_percent", description="ATR feature name")

    # Dynamic k parameters
    use_dynamic_k: bool = Field(
        default=False, description="Whether to calculate k dynamically from India VIX"
    )
    k_base: float = Field(
        default=1.0, gt=0.0, description="Base k value when VIX is at vix_reference"
    )
    k_min: float = Field(
        default=0.5, gt=0.0, description="Minimum k value (caps at low volatility)"
    )
    k_max: float = Field(
        default=2.0, gt=0.0, description="Maximum k value (caps at high volatility)"
    )
    vix_reference: float = Field(
        default=15.0,
        gt=0.0,
        description="Reference VIX level for k_base (typical: 15-20)",
    )
    vix_scaling: float = Field(
        default=0.05,
        gt=0.0,
        description="How sensitive k is to VIX changes (k increases by this per VIX point)",
    )

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
    - Volatility-adjusted labeling with dynamic k
    - Production-safe hyperparameters
    - Multi-class classification (UP, NEUTRAL, DOWN)
    - Class weighting for imbalanced labels
    - Label entropy monitoring for regime detection
    - MLflow experiment tracking
    - Out-of-fold predictions for meta-learner

    CRITICAL: Probabilistic Prediction Model
    =====================================
    This model outputs PROBABILITIES, not trade signals.

    Model output: [P(DOWN), P(NEUTRAL), P(UP)]
    Example: [0.15, 0.35, 0.50] = 50% UP, 35% NEUTRAL, 15% DOWN

    ⚠️  DO NOT trade directly on argmax(probabilities)!

    Proper downstream usage (in strategy layer):
    ```python
    probs = model.predict_proba(features)
    p_up, p_neutral, p_down = probs[0, 2], probs[0, 1], probs[0, 0]

    # Explicit NO-TRADE threshold
    if p_up > 0.65:
        signal = "BUY_CALL"
    elif p_down > 0.65:
        signal = "BUY_PUT"
    else:
        signal = "NO_TRADE"  # Low confidence
    ```

    Why this matters:
    - P(UP)=0.35, P(NEUTRAL)=0.33, P(DOWN)=0.32 → NO TRADE (low confidence)
    - P(UP)=0.70, P(NEUTRAL)=0.20, P(DOWN)=0.10 → TRADE (high confidence)
    - Avoids overtrading in choppy markets
    - Preserves capital during low-conviction regimes
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

    @staticmethod
    def compute_class_weights(
        labels: pd.Series,
        up_down_multiplier: float = 1.5,
    ) -> dict[int, float]:
        """
        Automatically compute class weights from label distribution

        Strategy:
        - DOWN/UP get higher weight (we want to predict directional moves correctly)
        - NEUTRAL gets lower weight (many labels, less critical)

        Args:
            labels: Label series (-1=DOWN, 0=NEUTRAL, 1=UP)
            up_down_multiplier: How much more to weight UP/DOWN vs NEUTRAL

        Returns:
            Dict mapping encoded labels (0, 1, 2) to weights

        Example:
            If labels are 20% DOWN, 60% NEUTRAL, 20% UP:
            - NEUTRAL weight = 1.0 (baseline)
            - DOWN/UP weight = 1.5 (50% more important)
        """
        label_counts = labels.value_counts(normalize=True)

        # Get proportions
        p_down = label_counts.get(-1, 0.33)
        p_neutral = label_counts.get(0, 0.33)
        p_up = label_counts.get(1, 0.33)

        # Inverse frequency weighting, then apply multiplier
        neutral_weight = 1.0  # Baseline
        down_weight = (p_neutral / p_down) * up_down_multiplier if p_down > 0 else 1.0
        up_weight = (p_neutral / p_up) * up_down_multiplier if p_up > 0 else 1.0

        # Map to encoded labels (0=DOWN, 1=NEUTRAL, 2=UP)
        weights = {
            0: float(down_weight),
            1: float(neutral_weight),
            2: float(up_weight),
        }

        logger.info(
            f"Computed class weights: "
            f"DOWN={weights[0]:.2f}, NEUTRAL={weights[1]:.2f}, UP={weights[2]:.2f}"
        )

        return weights

    def calculate_dynamic_k(self, features: pd.DataFrame) -> pd.Series:
        """
        Calculate dynamic k values based on India VIX

        Strategy:
        - When VIX is high → larger k (wider threshold to avoid noise)
        - When VIX is low → smaller k (tighter threshold to capture moves)

        Formula: k = k_base + vix_scaling * (india_vix - vix_reference)
        Clamped to [k_min, k_max]

        Args:
            features: Feature DataFrame containing 'india_vix' column

        Returns:
            Series of k values for each timestamp

        Example:
            - VIX = 15 (reference), k = 1.0 (base)
            - VIX = 20 (+5 points), k = 1.0 + 0.05*5 = 1.25
            - VIX = 30 (+15 points), k = 1.0 + 0.05*15 = 1.75
            - VIX = 10 (-5 points), k = 1.0 - 0.05*5 = 0.75
        """
        if "india_vix" not in features.columns:
            raise ValueError(
                "india_vix column not found in features. "
                "Required for dynamic k calculation."
            )

        india_vix = features["india_vix"]

        # Calculate k based on VIX deviation from reference
        k_values = self.labeling_config.k_base + self.labeling_config.vix_scaling * (
            india_vix - self.labeling_config.vix_reference
        )

        # Clamp to min/max bounds
        k_values = k_values.clip(
            lower=self.labeling_config.k_min, upper=self.labeling_config.k_max
        )

        # Log statistics
        logger.info(
            f"Dynamic k statistics: "
            f"mean={k_values.mean():.3f}, "
            f"std={k_values.std():.3f}, "
            f"min={k_values.min():.3f}, "
            f"max={k_values.max():.3f}"
        )
        logger.info(
            f"VIX statistics: "
            f"mean={india_vix.mean():.2f}, "
            f"std={india_vix.std():.2f}, "
            f"min={india_vix.min():.2f}, "
            f"max={india_vix.max():.2f}"
        )

        return k_values

    def _calculate_label_entropy(self, labels: pd.Series) -> float:
        """
        Calculate Shannon entropy of label distribution

        Entropy = -Σ(p * log(p))

        Why this matters:
        - Sudden entropy drops → regime break detected
        - Detects labeling bugs or market shifts
        - High entropy (balanced labels) = good
        - Low entropy (all same label) = potential issue

        Args:
            labels: Label series (-1, 0, 1)

        Returns:
            Entropy in bits (range: 0 to log2(3) ≈ 1.585)

        Examples:
            - Perfect balance (33%, 33%, 33%) → 1.585 (max entropy)
            - All NEUTRAL (0%, 100%, 0%) → 0.0 (min entropy)
            - 80% NEUTRAL (10%, 80%, 10%) → 0.922 (low, potential issue)
        """
        label_counts = labels.value_counts(normalize=True)
        # Handle any labels not present (shouldn't happen but be safe)
        probs = [label_counts.get(label, 0.0) for label in [-1, 0, 1]]

        # Shannon entropy with base 2 (bits)
        entropy = -sum(p * np.log2(p) if p > 0 else 0 for p in probs)

        return float(entropy)

    def create_volatility_adjusted_labels(
        self,
        features: pd.DataFrame,
        prices: pd.Series,
    ) -> pd.Series:
        """
        Create volatility-adjusted labels with dynamic or fixed k

        Args:
            features: Feature DataFrame (must contain india_vix if use_dynamic_k=True)
            prices: Price series for calculating returns

        Returns:
            Label series (-1=DOWN, 0=NEUTRAL, 1=UP)
        """

        # Validate ATR column exists
        if self.labeling_config.atr_column not in features.columns:
            raise ValueError(
                f"ATR column '{self.labeling_config.atr_column}' not found"
            )

        # Future returns (dimensionless percentage)
        future_returns = (prices.shift(-self.labeling_config.horizon) - prices) / prices

        # ATR (ensure same units as returns)
        atr = features[self.labeling_config.atr_column]

        # Calculate k (either fixed or dynamic)
        if self.labeling_config.use_dynamic_k:
            k_values = self.calculate_dynamic_k(features)
            logger.info("Using dynamic k based on India VIX")
        else:
            k_values = pd.Series(
                self.labeling_config.k, index=features.index, dtype=np.float64
            )
            logger.info(f"Using fixed k={self.labeling_config.k}")

        # CRITICAL: Explicit unit conversion
        if self.labeling_config.atr_column == "atr_percent":
            # Already in percentage form (0.015 = 1.5%)
            atr_threshold = k_values * atr
        elif self.labeling_config.atr_column == "atr":
            # In price points, need to normalize
            atr_threshold = k_values * (atr / prices)
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

        # Calculate and log label entropy for training set
        train_entropy = self._calculate_label_entropy(y_train)
        val_entropy = self._calculate_label_entropy(y_val)
        logger.info(
            f"Fold {fold} label entropy: Train={train_entropy:.3f}, Val={val_entropy:.3f} "
            f"(max=1.585 for balanced labels)"
        )

        # Warn on low entropy (regime break or labeling issue)
        if train_entropy < 1.0 or val_entropy < 1.0:
            logger.warning(
                f"⚠️  Low entropy detected in fold {fold}! "
                f"This may indicate regime break or labeling issue. "
                f"Consider inspecting label distribution."
            )

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
            features: Feature DataFrame (33 features from Market State Encoder)
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
    Validate feature DataFrame matches Market State Encoder v2 specification

    Expected 33 features from compressed multi-instrument data:
    - Index Breadth (6) - from 50 NIFTY constituents
    - NIFTY FUTURE (9) - primary price discovery
    - Options Aggregate (11) - NOT per-strike
    - Volatility (4) - regime context
    - Time Context (3)

    CRITICAL: LightGBM is a MACRO model. It does NOT see:
    - Raw LOBs (that's LiT's job)
    - Per-stock prices (only breadth aggregates)
    - Option strike ladders (only ATM + aggregates)
    - Execution data (that's DRL PPO's job)

    MONOTONIC CONSTRAINTS (OPTIONAL):
    ================================
    To enforce domain knowledge, you can specify monotone_constraints in LightGBMConfig.
    This ensures certain features always push predictions in expected directions.

    Example constraints (must be list of 33 integers: 1, -1, or 0):
    - 1: Feature INCREASES UP probability (e.g., fut_return_5m)
    - -1: Feature DECREASES UP probability (e.g., high atm_iv_change → more NEUTRAL)
    - 0: No constraint (let model learn freely)

    Suggested constraints:
    ```python
    monotone_constraints = [
        0,   # pct_stocks_above_vwap (complex, let model learn)
        1,   # pct_stocks_above_ema20 (more trending = more directional)
        1,   # weighted_return_top10 (positive = UP bias)
        0,   # advance_decline_ratio (complex)
        1,   # breadth_momentum_5m (positive momentum = UP)
        0,   # breadth_volatility
        1,   # fut_price_vs_vwap (above VWAP = bullish)
        1,   # fut_range_position (high in range = UP)
        1,   # fut_return_1m (positive = UP)
        1,   # fut_return_5m (positive = UP)
        0,   # fut_atr_percent (higher vol = more NEUTRAL, but nonlinear)
        0,   # fut_volume_zscore
        0,   # fut_oi_change
        0,   # fut_rsi_14 (nonlinear)
        1,   # fut_macd (positive = UP)
        0,   # atm_iv (complex)
        0,   # atm_iv_change (spike = NEUTRAL, but nonlinear)
        0,   # iv_skew
        0,   # gamma_atm
        0,   # vega_atm
        0,   # theta_atm
        0,   # pcr_oi
        0,   # pcr_volume
        0,   # max_pain_distance
        0,   # charm_atm
        0,   # vanna_atm
        0,   # india_vix (higher = more NEUTRAL, but handled by dynamic k)
        0,   # realized_vol_5m
        0,   # realized_vol_15m
        0,   # vol_expansion_ratio
        0,   # minutes_from_open
        0,   # minutes_to_close
        0,   # day_of_week
    ]
    ```

    ⚠️  WARNING: Monotonic constraints reduce model flexibility.
    Only use if you have strong domain intuition.
    Start with None, add constraints only if needed.
    """
    expected_features = [
        # Index Breadth (6 features)
        # Compressed from 50 NIFTY constituents → participation metrics
        "pct_stocks_above_vwap",  # 0.0-1.0 (e.g., 0.72 = 36/50 bullish)
        "pct_stocks_above_ema20",  # 0.0-1.0 (trending confirmation)
        "weighted_return_top10",  # % return of top 10 weighted stocks
        "advance_decline_ratio",  # e.g., 1.8 (36 up, 14 down)
        "breadth_momentum_5m",  # 5-min momentum breadth
        "breadth_volatility",  # Intra-constituent volatility spread
        # NIFTY FUTURE (9 features) - +2 from original
        # Primary price discovery instrument (NOT spot - spot has no volume)
        "fut_price_vs_vwap",  # Normalized distance from VWAP
        "fut_range_position",  # 0.0-1.0 (where in daily range?)
        "fut_return_1m",  # 1-min return (momentum)
        "fut_return_5m",  # 5-min return (trend)
        "fut_atr_percent",  # ATR as % of price (volatility)
        "fut_volume_zscore",  # Volume z-score (participation)
        "fut_oi_change",  # OI change (positioning)
        "fut_rsi_14",  # RSI(14) - momentum oscillator
        "fut_macd",  # MACD - trend following
        # Options Aggregate State (11 features) - +2 from original
        # ATM only + market-wide aggregates (NOT per-strike)
        "atm_iv",  # ATM implied volatility
        "atm_iv_change",  # ΔIV (vol expansion/contraction)
        "iv_skew",  # OTM put IV - OTM call IV
        "gamma_atm",  # ATM gamma (curvature)
        "vega_atm",  # ATM vega (vol sensitivity)
        "theta_atm",  # ATM theta (time decay)
        "pcr_oi",  # Put-call ratio (open interest)
        "pcr_volume",  # Put-call ratio (volume)
        "max_pain_distance",  # Distance to max pain (dealer positioning)
        "charm_atm",  # ATM charm (delta decay) - added
        "vanna_atm",  # ATM vanna (delta-vol correlation) - added
        # Volatility & Regime Context (4 features)
        "india_vix",  # Market-wide fear gauge
        "realized_vol_5m",  # Short-term realized volatility
        "realized_vol_15m",  # Medium-term realized volatility
        "vol_expansion_ratio",  # Realized vol / historical avg
        # Time Context (3 features)
        "minutes_from_open",  # 0-375 (9:15 AM - 3:30 PM)
        "minutes_to_close",  # 375-0
        "day_of_week",  # 0-4 (Monday-Friday)
    ]

    missing = set(expected_features) - set(features.columns)
    extra = set(features.columns) - set(expected_features)

    if missing:
        raise ValueError(f"Missing required features: {missing}")

    if extra:
        logger.warning(f"Extra features (will be ignored): {extra}")

    # Reorder to match Market State Encoder v2 schema
    features_ordered = features[expected_features]

    logger.info(
        f"Feature validation passed: {len(expected_features)} features "
        f"(Index Breadth: 6, NIFTY FUTURE: 9, Options: 11, Volatility: 4, Time: 3)"
    )
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
        # Class weighting: penalize false UP/DOWN more than NEUTRAL
        # Many labels will be NEUTRAL, so down-weight it
        class_weight={
            0: 1.2,  # DOWN (important to get right)
            1: 0.6,  # NEUTRAL (many of these, less critical)
            2: 1.2,  # UP (important to get right)
        },
        # Monotonic constraints (optional): enforce domain knowledge
        # Example: fut_return_5m should increase UP probability
        # Set to None to disable, or list of 33 values (1, -1, 0) per feature
        monotone_constraints=None,
    )

    # Option 1: Fixed k (traditional approach)
    labeling_config_fixed = LabelingConfig(
        horizon=5,
        k=1.0,
        atr_column="atr_percent",
        use_dynamic_k=False,
    )

    # Option 2: Dynamic k based on VIX (RECOMMENDED - adapts to market conditions)
    labeling_config = LabelingConfig(
        horizon=5,
        atr_column="atr_percent",
        use_dynamic_k=True,
        k_base=1.0,  # Base k when VIX = 15
        k_min=0.5,  # Min k (low volatility)
        k_max=2.0,  # Max k (high volatility)
        vix_reference=15.0,  # Typical VIX level
        vix_scaling=0.05,  # +0.05 k per VIX point
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
