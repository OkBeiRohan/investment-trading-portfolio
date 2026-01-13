"""
Train Ensemble Pipeline Nodes

Orchestrates training of all Level-0 models (LightGBM, XGBoost, etc.)
"""

import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any

import pandas as pd

from training_pipeline.utils.sql_loader import QuestDBLoader
from training_pipeline.pipelines.train_ensemble.models.lightgbm_trainer import (
    LightGBMTrainer,
    LightGBMConfig,
    LabelingConfig,
    validate_features,
)
from training_pipeline.types import TrainingConfig, TrainingResult

logger = logging.getLogger(__name__)


# ============================================================================
# Data Loading Nodes
# ============================================================================


def load_training_data(
    questdb_connection: str,
    training_period_days: int = 730,  # 2 years
    symbol: str = "NIFTY",
) -> Dict[str, pd.DataFrame]:
    """
    Load pre-computed features from QuestDB

    Args:
        questdb_connection: QuestDB connection string
        training_period_days: Number of days of historical data
        symbol: Index symbol

    Returns:
        Dict with 'lightgbm_data' key containing features + prices
    """
    logger.info(f"Loading {training_period_days} days of training data")

    loader = QuestDBLoader(questdb_connection)

    # Get available date range
    min_date, max_date = loader.get_available_date_range()

    # Use last N days
    end_date = max_date
    start_date = end_date - timedelta(days=training_period_days)

    logger.info(f"Training period: {start_date} to {end_date}")

    # Load LightGBM features
    lightgbm_data = loader.load_lightgbm_features(
        start_date=start_date,
        end_date=end_date,
        symbol=symbol,
    )

    loader.close()

    return {
        "lightgbm_data": lightgbm_data,
    }


# ============================================================================
# Training Nodes
# ============================================================================


def train_lightgbm(
    lightgbm_data: pd.DataFrame,
    training_config: Dict[str, Any],
    lightgbm_config: Dict[str, Any],
    labeling_config: Dict[str, Any],
) -> TrainingResult:
    """
    Train LightGBM Level-0 model

    Args:
        lightgbm_data: DataFrame with 33 features + close_price
        training_config: Walk-forward validation config
        lightgbm_config: LightGBM hyperparameters
        labeling_config: Volatility-adjusted labeling config

    Returns:
        TrainingResult with metrics and OOF predictions
    """
    logger.info("Starting LightGBM training")

    # Extract features and prices
    features = lightgbm_data.drop(columns=["timestamp", "close_price"])
    prices = lightgbm_data["close_price"]

    # Validate features
    features = validate_features(features)

    # Initialize configs
    train_cfg = TrainingConfig(**training_config)
    lgbm_cfg = LightGBMConfig(**lightgbm_config)
    label_cfg = LabelingConfig(**labeling_config)

    # Initialize trainer
    trainer = LightGBMTrainer(
        training_config=train_cfg,
        lightgbm_config=lgbm_cfg,
        labeling_config=label_cfg,
    )

    # Create labels
    labels = trainer.create_volatility_adjusted_labels(
        features=features,
        prices=prices,
    )

    # Align features with labels (remove last horizon rows)
    features_aligned = features.iloc[: -label_cfg.horizon]

    # Train with walk-forward validation
    result = trainer.train(
        features=features_aligned,
        labels=labels,
        mlflow_run_name="lightgbm_v2_mse",
    )

    # Save outputs
    output_dir = Path("data/06_models")
    output_dir.mkdir(parents=True, exist_ok=True)

    trainer.save_model(output_dir / "lightgbm.txt")
    trainer.save_oof_predictions(output_dir / "oof_lightgbm.parquet")

    logger.info("LightGBM training complete")
    logger.info(
        f"Validation AUC: {result.validation_metrics.auc_mean:.3f}±"
        f"{result.validation_metrics.auc_std:.3f}"
    )

    return result


def train_xgboost(
    lightgbm_data: pd.DataFrame,
    training_config: Dict[str, Any],
) -> Dict[str, str]:
    """
    Train XGBoost Level-0 model (PLACEHOLDER)

    TODO: Implement XGBoost trainer similar to LightGBM
    """
    logger.info("XGBoost training (PLACEHOLDER)")
    return {"status": "placeholder", "model": "xgboost"}


def train_cnn_lstm(
    lightgbm_data: pd.DataFrame,
    training_config: Dict[str, Any],
) -> Dict[str, str]:
    """
    Train CNN-LSTM Level-0 model (PLACEHOLDER)

    TODO: Implement CNN-LSTM trainer for temporal patterns
    """
    logger.info("CNN-LSTM training (PLACEHOLDER)")
    return {"status": "placeholder", "model": "cnn_lstm"}


def train_ginn(
    lightgbm_data: pd.DataFrame,
    training_config: Dict[str, Any],
) -> Dict[str, str]:
    """
    Train GINN Level-0 model (PLACEHOLDER)

    TODO: Implement GINN trainer for non-linear dynamics
    """
    logger.info("GINN training (PLACEHOLDER)")
    return {"status": "placeholder", "model": "ginn"}


def train_svm(
    lightgbm_data: pd.DataFrame,
    training_config: Dict[str, Any],
) -> Dict[str, str]:
    """
    Train SVM Level-0 model (PLACEHOLDER)

    TODO: Implement SVM trainer with RBF kernel
    """
    logger.info("SVM training (PLACEHOLDER)")
    return {"status": "placeholder", "model": "svm"}


def train_transformer(
    lightgbm_data: pd.DataFrame,
    training_config: Dict[str, Any],
) -> Dict[str, str]:
    """
    Train Transformer Level-0 model (PLACEHOLDER)

    TODO: Implement Transformer trainer for attention-based predictions
    """
    logger.info("Transformer training (PLACEHOLDER)")
    return {"status": "placeholder", "model": "transformer"}


def train_tft(
    tft_data: pd.DataFrame,
    training_config: Dict[str, Any],
) -> Dict[str, str]:
    """
    Train Temporal Fusion Transformer (TIER 2, conditional)

    TODO: Implement TFT trainer when TFT features available from compute-engine
    """
    logger.info("TFT training (PLACEHOLDER - requires TFT features from compute-engine)")
    return {"status": "placeholder", "model": "tft", "tier": "2"}


def train_lit(
    lit_data: pd.DataFrame,
    training_config: Dict[str, Any],
) -> Dict[str, str]:
    """
    Train LOB Informed Transformer (TIER 2, conditional)

    TODO: Implement LiT trainer when LOB tensors available from compute-engine
    """
    logger.info("LiT training (PLACEHOLDER - requires LOB tensors from compute-engine)")
    return {"status": "placeholder", "model": "lit", "tier": "2"}

    TODO: Implement TFT trainer when TFT features available from compute-engine
    """
    logger.info(
        "TFT training (PLACEHOLDER - requires TFT features from compute-engine)"
    )
    return {"status": "placeholder", "model": "tft", "tier": "2"}


def train_lit(
    lit_data: pd.DataFrame,
    training_config: Dict[str, Any],
) -> Dict[str, str]:
    """
    Train LOB Informed Transformer (TIER 2, conditional)

    TODO: Implement LiT trainer when LOB tensors available from compute-engine
    """
    logger.info("LiT training (PLACEHOLDER - requires LOB tensors from compute-engine)")
    return {"status": "placeholder", "model": "lit", "tier": "2"}
