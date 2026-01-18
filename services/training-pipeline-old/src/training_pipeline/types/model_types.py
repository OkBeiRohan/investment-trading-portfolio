"""
Shared type definitions for model training
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class TrainingConfig(BaseModel):
    """Configuration for walk-forward training"""

    n_splits: int = Field(default=12, ge=2, description="Number of walk-forward splits")
    purge_window: int = Field(
        default=375, ge=0, description="Timesteps to purge between train/test"
    )
    embargo_window: int = Field(
        default=375, ge=0, description="Timesteps to embargo after test"
    )
    random_state: Optional[int] = Field(
        default=42, description="Random seed for reproducibility"
    )

    class Config:
        frozen = True  # Immutable


class ModelConfig(BaseModel):
    """Base configuration for ML models"""

    model_type: str = Field(description="Model type identifier")
    parameters: Dict[str, Any] = Field(
        default_factory=dict, description="Model hyperparameters"
    )

    class Config:
        frozen = True


class FoldMetrics(BaseModel):
    """Metrics for a single fold"""

    fold: int = Field(ge=1, description="Fold number")
    accuracy: float = Field(ge=0.0, le=1.0, description="Overall accuracy")
    auc: float = Field(ge=0.0, le=1.0, description="Multi-class AUC")

    # Per-class precision
    precision_up: float = Field(ge=0.0, le=1.0)
    precision_neutral: float = Field(ge=0.0, le=1.0)
    precision_down: float = Field(ge=0.0, le=1.0)

    # Per-class recall
    recall_up: float = Field(ge=0.0, le=1.0)
    recall_neutral: float = Field(ge=0.0, le=1.0)
    recall_down: float = Field(ge=0.0, le=1.0)

    # Per-class F1
    f1_up: float = Field(ge=0.0, le=1.0)
    f1_neutral: float = Field(ge=0.0, le=1.0)
    f1_down: float = Field(ge=0.0, le=1.0)

    # Additional metrics
    neutral_accuracy: float = Field(
        ge=0.0, le=1.0, description="Accuracy on neutral class"
    )
    confusion_matrix: List[List[int]] = Field(
        description="Confusion matrix (3x3 for 3 classes)"
    )

    @field_validator("confusion_matrix")
    @classmethod
    def validate_confusion_matrix(cls, v: List[List[int]]) -> List[List[int]]:
        """Validate confusion matrix shape"""
        if len(v) != 3:
            raise ValueError("Confusion matrix must have 3 rows")
        for row in v:
            if len(row) != 3:
                raise ValueError("Confusion matrix must have 3 columns")
        return v

    class Config:
        frozen = True


class ValidationMetrics(BaseModel):
    """Aggregated metrics across all folds"""

    # Average metrics
    accuracy_mean: float = Field(ge=0.0, le=1.0)
    accuracy_std: float = Field(ge=0.0)
    auc_mean: float = Field(ge=0.0, le=1.0)
    auc_std: float = Field(ge=0.0)

    # Precision averages
    precision_up_mean: float = Field(ge=0.0, le=1.0)
    precision_up_std: float = Field(ge=0.0)
    precision_neutral_mean: float = Field(ge=0.0, le=1.0)
    precision_neutral_std: float = Field(ge=0.0)
    precision_down_mean: float = Field(ge=0.0, le=1.0)
    precision_down_std: float = Field(ge=0.0)

    # Recall averages
    recall_up_mean: float = Field(ge=0.0, le=1.0)
    recall_up_std: float = Field(ge=0.0)
    recall_neutral_mean: float = Field(ge=0.0, le=1.0)
    recall_neutral_std: float = Field(ge=0.0)
    recall_down_mean: float = Field(ge=0.0, le=1.0)
    recall_down_std: float = Field(ge=0.0)

    # F1 averages
    f1_up_mean: float = Field(ge=0.0, le=1.0)
    f1_up_std: float = Field(ge=0.0)
    f1_neutral_mean: float = Field(ge=0.0, le=1.0)
    f1_neutral_std: float = Field(ge=0.0)
    f1_down_mean: float = Field(ge=0.0, le=1.0)
    f1_down_std: float = Field(ge=0.0)

    # Neutral accuracy
    neutral_accuracy_mean: float = Field(ge=0.0, le=1.0)
    neutral_accuracy_std: float = Field(ge=0.0)

    class Config:
        frozen = True


class TrainingResult(BaseModel):
    """Result of model training"""

    model_type: str = Field(description="Model type identifier")
    fold_metrics: List[FoldMetrics] = Field(description="Metrics per fold")
    validation_metrics: ValidationMetrics = Field(
        description="Aggregated validation metrics"
    )
    feature_importance: List[tuple[str, float]] = Field(
        description="Feature importance scores as list of (feature, importance) tuples"
    )
    oof_predictions_shape: tuple[int, int] = Field(
        description="Shape of out-of-fold predictions (n_samples, n_classes)"
    )

    class Config:
        frozen = True
