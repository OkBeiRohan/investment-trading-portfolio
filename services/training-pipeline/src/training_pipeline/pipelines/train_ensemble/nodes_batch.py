"""
Batch training nodes for RAM-efficient model training.

These nodes load data in batches to avoid memory overflow.
"""

import logging
import pandas as pd
import lightgbm as lgb
from typing import Dict, Any
from kedro.io import DataCatalog

from training_pipeline.utils.batch_loader import BatchDataLoader

logger = logging.getLogger(__name__)


def train_lightgbm_batch(
    catalog: DataCatalog,
    parameters: Dict[str, Any],
) -> lgb.Booster:
    """
    Train LightGBM model using batch loading.

    This approach loads data in time-based batches to reduce RAM usage.
    Uses LightGBM's incremental learning (partial_fit equivalent).

    Args:
        catalog: Kedro data catalog
        parameters: Training parameters including:
            - training_start: Start date for training (YYYY-MM-DD)
            - training_end: End date for training (YYYY-MM-DD)
            - batch_days: Number of days per batch (default: 30)
            - lightgbm: LightGBM hyperparameters

    Returns:
        Trained LightGBM Booster model
    """
    # Extract parameters
    train_params = parameters["training"]
    lgb_params = parameters["lightgbm"]

    start_date = train_params["training_start"]
    end_date = train_params["training_end"]
    batch_days = train_params.get("batch_days", 30)

    logger.info(
        f"Starting batch training: {start_date} to {end_date}, "
        f"{batch_days} days per batch"
    )

    # Initialize batch loader
    loader = BatchDataLoader(
        catalog=catalog,
        start_date=start_date,
        end_date=end_date,
        batch_days=batch_days,
    )

    # Initialize LightGBM model (will be trained incrementally)
    model = None
    train_data_list = []

    # Process each batch
    for batch_num, (features, labels) in enumerate(loader, start=1):
        logger.info(f"Processing batch {batch_num}")

        # Align features and labels by timestamp
        merged = features.merge(labels, on="timestamp", how="inner")

        if len(merged) == 0:
            logger.warning(f"Batch {batch_num}: No aligned data, skipping")
            continue

        # Prepare training data
        X = merged[parameters["features"]["feature_columns"]]
        y = merged[parameters["features"]["target_column"]]

        logger.info(
            f"Batch {batch_num}: {len(X)} samples, "
            f"target distribution: {y.value_counts().to_dict()}"
        )

        # Create LightGBM Dataset
        train_data = lgb.Dataset(
            X,
            label=y,
            free_raw_data=False,  # Keep data for validation
        )

        if model is None:
            # First batch: train initial model
            logger.info("Training initial model on first batch")
            model = lgb.train(
                lgb_params,
                train_data,
                num_boost_round=lgb_params.get("num_boost_round", 100),
                valid_sets=[train_data],
                valid_names=["train"],
                callbacks=[
                    lgb.log_evaluation(period=10),
                    lgb.early_stopping(stopping_rounds=20),
                ],
            )
        else:
            # Continue training on subsequent batches
            logger.info(f"Continuing training on batch {batch_num}")
            model = lgb.train(
                lgb_params,
                train_data,
                num_boost_round=lgb_params.get("num_boost_round", 100),
                init_model=model,  # Continue from previous model
                valid_sets=[train_data],
                valid_names=["train"],
                callbacks=[
                    lgb.log_evaluation(period=10),
                    lgb.early_stopping(stopping_rounds=20),
                ],
            )

        logger.info(
            f"Batch {batch_num} complete. "
            f"Best score: {model.best_score.get('train', {})}"
        )

        # Clear memory
        del features, labels, merged, X, y, train_data

    if model is None:
        raise ValueError("No data available for training")

    logger.info("Batch training complete")

    return model


def validate_model_batch(
    model: lgb.Booster,
    catalog: DataCatalog,
    parameters: Dict[str, Any],
) -> Dict[str, float]:
    """
    Validate trained model using batch loading.

    Args:
        model: Trained LightGBM model
        catalog: Kedro data catalog
        parameters: Validation parameters

    Returns:
        Dictionary of validation metrics
    """
    from sklearn.metrics import roc_auc_score, accuracy_score, f1_score

    val_params = parameters["validation"]

    loader = BatchDataLoader(
        catalog=catalog,
        start_date=val_params["validation_start"],
        end_date=val_params["validation_end"],
        batch_days=val_params.get("batch_days", 30),
    )

    all_predictions = []
    all_labels = []

    for batch_num, (features, labels) in enumerate(loader, start=1):
        # Align data
        merged = features.merge(labels, on="timestamp", how="inner")

        if len(merged) == 0:
            continue

        X = merged[parameters["features"]["feature_columns"]]
        y = merged[parameters["features"]["target_column"]]

        # Predict
        predictions = model.predict(X)

        all_predictions.extend(predictions)
        all_labels.extend(y)

        logger.info(f"Validated batch {batch_num}: {len(X)} samples")

    # Calculate metrics
    predictions_array = pd.Series(all_predictions)
    labels_array = pd.Series(all_labels)

    predictions_binary = (predictions_array > 0.5).astype(int)

    metrics = {
        "auc": roc_auc_score(labels_array, predictions_array),
        "accuracy": accuracy_score(labels_array, predictions_binary),
        "f1_score": f1_score(labels_array, predictions_binary),
    }

    logger.info(f"Validation metrics: {metrics}")

    return metrics
