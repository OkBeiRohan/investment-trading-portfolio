"""
Quick Training Script for LightGBM Model

Reads features from QuestDB and trains LightGBM model with walk-forward validation.
This is a simplified standalone script - for full Kedro pipeline, use: kedro run
"""

import logging
import sys
from datetime import timedelta
from pathlib import Path

import pandas as pd

# Add src to path
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from training_pipeline.utils.sql_loader import QuestDBLoader
from training_pipeline.pipelines.train_ensemble.models.lightgbm_trainer import (
    LightGBMTrainer,
    LightGBMConfig,
    LabelingConfig,
)
from training_pipeline.types import TrainingConfig

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


def main():
    """Run LightGBM training"""

    print("=" * 80)
    print("LightGBM Training Pipeline")
    print("=" * 80)
    print()

    # -------------------------------------------------------------------------
    # Step 1: Configuration
    # -------------------------------------------------------------------------

    # QuestDB connection
    questdb_connection = "postgresql://admin:quest@localhost:8812/qdb"

    # Training period
    training_period_days = 730  # 2 years
    symbol = "NIFTY"

    # Walk-forward validation config
    training_config = TrainingConfig(
        n_splits=12,  # 12 folds
        purge_window=375,  # 1 trading day in minutes
        embargo_window=375,  # 1 day embargo
        random_state=42,
    )

    # LightGBM hyperparameters
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
        device="gpu",  # Use RTX GPU - change to "cpu" if no GPU
        gpu_platform_id=0,
        gpu_device_id=0,
    )

    # Labeling config (volatility-adjusted)
    labeling_config = LabelingConfig(
        horizon=5,  # 5-minute forward return
        k=1.0,  # ATR multiplier
        atr_column="atr_percent",  # Updated to match market_state_1m schema
    )

    print(f"Configuration:")
    print(f"  - Training period: {training_period_days} days")
    print(f"  - Symbol: {symbol}")
    print(f"  - Walk-forward splits: {training_config.n_splits}")
    print(f"  - LightGBM n_estimators: {lightgbm_config.n_estimators}")
    print(f"  - Device: {lightgbm_config.device}")
    print()

    # -------------------------------------------------------------------------
    # Step 2: Load Features from QuestDB
    # -------------------------------------------------------------------------

    logger.info("Loading training data from QuestDB...")

    loader = QuestDBLoader(questdb_connection)

    # Get available date range
    min_date, max_date = loader.get_available_date_range()
    logger.info(f"Available data: {min_date} to {max_date}")

    # Use last N days
    end_date = max_date
    start_date = end_date - timedelta(days=training_period_days)

    logger.info(f"Training period: {start_date} to {end_date}")

    # Load features (33 features + timestamp + close_price)
    lightgbm_data = loader.load_lightgbm_features(
        start_date=start_date,
        end_date=end_date,
        symbol=symbol,
    )

    loader.close()

    logger.info(
        f"Loaded {len(lightgbm_data)} rows, {len(lightgbm_data.columns)} columns"
    )
    print()

    # -------------------------------------------------------------------------
    # Step 3: Extract Features and Prices
    # -------------------------------------------------------------------------

    features = lightgbm_data.drop(columns=["timestamp", "close_price"])
    prices = lightgbm_data["close_price"]

    logger.info(f"Feature matrix shape: {features.shape}")
    logger.info(f"Features: {list(features.columns)}")
    print()

    # -------------------------------------------------------------------------
    # Step 4: Create Volatility-Adjusted Labels
    # -------------------------------------------------------------------------

    trainer = LightGBMTrainer(
        training_config=training_config,
        lightgbm_config=lightgbm_config,
        labeling_config=labeling_config,
    )

    logger.info("Creating volatility-adjusted labels...")
    labels = trainer.create_volatility_adjusted_labels(features, prices)
    logger.info(f"Labels shape: {labels.shape}")
    print()

    # Align features with labels (remove last N rows that have no labels)
    features = features.iloc[: len(labels)]
    logger.info(f"Aligned features shape: {features.shape}")
    print()

    # -------------------------------------------------------------------------
    # Step 6: Train LightGBM Model
    # -------------------------------------------------------------------------

    logger.info("Starting LightGBM training with walk-forward validation...")
    print()

    result = trainer.train(
        features=features,
        labels=labels,
        mlflow_run_name="lightgbm_training",
    )

    # -------------------------------------------------------------------------
    # Step 7: Save Model and OOF Predictions
    # -------------------------------------------------------------------------

    logger.info("Saving model and predictions...")

    # Create output directory
    output_dir = Path("data/06_models")
    output_dir.mkdir(parents=True, exist_ok=True)

    # Save LightGBM model (native format)
    model_path = output_dir / "lightgbm_latest.txt"
    trainer.save_model(model_path)
    logger.info(f"Model saved to: {model_path.absolute()}")

    # Save out-of-fold predictions (for meta-learner training)
    oof_path = output_dir / "oof_lightgbm_latest.parquet"
    trainer.save_oof_predictions(oof_path)
    logger.info(f"OOF predictions saved to: {oof_path.absolute()}")

    # Save feature importance to CSV
    import pandas as pd

    importance_path = output_dir / "feature_importance_latest.csv"
    feature_importance_list = result.feature_importance

    importance_df = pd.DataFrame(
        feature_importance_list, columns=["feature", "importance"]
    )
    importance_df = importance_df.sort_values("importance", ascending=False)
    importance_df.to_csv(importance_path, index=False)
    logger.info(f"Feature importance saved to: {importance_path.absolute()}")

    print()

    # -------------------------------------------------------------------------
    # Step 8: Display Results
    # -------------------------------------------------------------------------

    print()
    print("=" * 80)
    print("Training Complete!")
    print("=" * 80)
    print()

    # Aggregate metrics across folds
    val_metrics = result.validation_metrics

    print(f"Validation Metrics (Cross-Validation Averages):")
    print(
        f"  - Accuracy:   {val_metrics.accuracy_mean:.4f} ± {val_metrics.accuracy_std:.4f}"
    )
    print(f"  - AUC:        {val_metrics.auc_mean:.4f} ± {val_metrics.auc_std:.4f}")
    print(
        f"  - Precision (UP):   {val_metrics.precision_up_mean:.4f} ± {val_metrics.precision_up_std:.4f}"
    )
    print(
        f"  - Precision (DOWN): {val_metrics.precision_down_mean:.4f} ± {val_metrics.precision_down_std:.4f}"
    )
    print(f"  - F1 (UP):    {val_metrics.f1_up_mean:.4f} ± {val_metrics.f1_up_std:.4f}")
    print(
        f"  - F1 (DOWN):  {val_metrics.f1_down_mean:.4f} ± {val_metrics.f1_down_std:.4f}"
    )
    print()

    print(f"OOF Predictions shape: {result.oof_predictions_shape}")
    print(f"Model type: {result.model_type}")
    print()

    # Feature importance
    print("Top 10 Most Important Features:")
    for i, row in enumerate(importance_df.head(10).itertuples(), 1):
        print(f"  {i:2d}. {row.feature:30s} - {row.importance:.2f}")

    print()
    print("=" * 80)
    print("Saved Outputs:")
    print("=" * 80)
    print(f"  📁 Model (LightGBM):          {model_path.absolute()}")
    print(f"  📁 OOF Predictions (Parquet): {oof_path.absolute()}")
    print(f"  📁 Feature Importance (CSV):  {importance_path.absolute()}")
    print()
    print("=" * 80)
    print("Next Steps:")
    print("  1. Review metrics and feature importance above")
    print(
        "  2. Tune hyperparameters if needed (edit script or conf/base/parameters.yml)"
    )
    print("  3. Export to ONNX: python scripts/export_onnx.py")
    print(f"  4. Current model ready at: {model_path.absolute()}")
    print("  5. For deployment: Convert to ONNX and copy to apps/algo-worker/models/")
    print("=" * 80)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Training interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        sys.exit(1)
