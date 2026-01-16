#!/usr/bin/env python3
"""
Train LightGBM models for multiple prediction horizons (5min, 15min, 30min)

STRATEGY: Separate models per horizon (RECOMMENDED)
- lightgbm_5min.txt: Predicts 5-minute volatility moves
- lightgbm_15min.txt: Predicts 15-minute volatility moves
- lightgbm_30min.txt: Predicts 30-minute volatility moves

WHY SEPARATE MODELS:
1. Different feature importance per horizon (5min: OFI, 30min: Macro)
2. Different optimal hyperparameters (shorter horizon = less regularization)
3. Different class distributions (longer horizon = more NEUTRAL)
4. Easier to deploy (algo-worker can load only needed horizons)
5. Clearer performance evaluation

ALTERNATIVE (NOT RECOMMENDED): Single multi-output model
- Would need custom LightGBM objective function
- Feature importance less interpretable
- One bad horizon degrades all predictions
"""

import sys
import warnings
from pathlib import Path
from datetime import datetime, timedelta
import logging

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from training_pipeline.utils.sql_loader import QuestDBLoader
from training_pipeline.pipelines.train_ensemble.models.lightgbm_trainer import (
    LightGBMTrainer,
)

warnings.filterwarnings("ignore")
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def train_horizon(
    horizon_minutes: int,
    loader: QuestDBLoader,
    start_date: datetime,
    end_date: datetime,
) -> dict:
    """Train model for specific horizon"""
    logger.info(f"=" * 80)
    logger.info(f"Training LightGBM for {horizon_minutes}-minute horizon")
    logger.info(f"=" * 80)

    # 1. Load features (same for all horizons)
    features = loader.load_lightgbm_features(
        start_date=start_date,
        end_date=end_date,
    )
    logger.info(f"Loaded {len(features)} feature rows")

    # 2. Load labels for this horizon
    labels = loader.load_training_labels(
        start_date=start_date,
        end_date=end_date,
        horizon_minutes=horizon_minutes,
    )
    logger.info(f"Loaded {len(labels)} labels for {horizon_minutes}min horizon")

    # 3. Merge features and labels on timestamp
    data = features.merge(labels, on="timestamp", how="inner")
    logger.info(f"Merged dataset: {len(data)} rows")

    if len(data) == 0:
        logger.error(f"No data after merge for {horizon_minutes}min horizon!")
        return None

    # 4. Prepare X, y
    feature_cols = [col for col in features.columns if col != "timestamp"]
    X = data[feature_cols]
    y = data["label"]  # 0=DOWN, 1=NEUTRAL, 2=UP

    logger.info(f"Features: {X.shape}, Labels: {y.shape}")
    logger.info(f"Label distribution:\n{y.value_counts().sort_index()}")

    # 5. Train model
    trainer = LightGBMTrainer(
        num_classes=3,
        params={
            "objective": "multiclass",
            "num_class": 3,
            "metric": "multi_logloss",
            "boosting_type": "gbdt",
            "learning_rate": 0.01,
            "max_depth": 6,
            "num_leaves": 31,
            "feature_fraction": 0.8,
            "bagging_fraction": 0.8,
            "bagging_freq": 5,
            "verbose": -1,
            "device": "gpu",  # Use GPU if available
            "gpu_platform_id": 0,
            "gpu_device_id": 0,
        },
    )

    logger.info("Training model with walk-forward validation...")
    trainer.train(X, y)

    # 6. Save model with horizon suffix
    model_dir = Path(__file__).parent.parent / "data" / "06_models"
    model_dir.mkdir(parents=True, exist_ok=True)

    model_path = model_dir / f"lightgbm_{horizon_minutes}min.txt"
    trainer.save_model(str(model_path))
    logger.info(f"✅ Saved model: {model_path}")

    # 7. Save OOF predictions
    oof_path = model_dir / f"oof_lightgbm_{horizon_minutes}min.parquet"
    trainer.save_oof_predictions(str(oof_path))
    logger.info(f"✅ Saved OOF predictions: {oof_path}")

    # 8. Save feature importance
    importance_path = model_dir / f"feature_importance_{horizon_minutes}min.csv"
    trainer.save_feature_importance(str(importance_path))
    logger.info(f"✅ Saved feature importance: {importance_path}")

    # 9. Get metrics
    metrics = trainer.get_metrics()
    logger.info(f"\n📊 {horizon_minutes}min Horizon Metrics:")
    logger.info(f"  Train Log Loss: {metrics.get('train_logloss', 'N/A'):.4f}")
    logger.info(f"  Val Log Loss: {metrics.get('val_logloss', 'N/A'):.4f}")
    logger.info(f"  Val Accuracy: {metrics.get('val_accuracy', 'N/A'):.4f}")

    return {
        "horizon": horizon_minutes,
        "model_path": str(model_path),
        "oof_path": str(oof_path),
        "importance_path": str(importance_path),
        "metrics": metrics,
    }


def main():
    """Train models for all horizons"""
    logger.info("=" * 80)
    logger.info("MULTI-HORIZON LIGHTGBM TRAINING")
    logger.info("=" * 80)

    # Configuration
    HORIZONS = [5, 15, 30]  # minutes
    START_DATE = datetime(2023, 1, 1)
    END_DATE = datetime.now()

    logger.info(f"Horizons: {HORIZONS}")
    logger.info(f"Training period: {START_DATE} to {END_DATE}")

    # Initialize loader
    loader = QuestDBLoader(
        host="localhost",
        port=8812,
        user="admin",
        password="quest",
        database="qdb",
    )

    # Train each horizon
    results = []
    for horizon in HORIZONS:
        try:
            result = train_horizon(
                horizon_minutes=horizon,
                loader=loader,
                start_date=START_DATE,
                end_date=END_DATE,
            )
            if result:
                results.append(result)
        except Exception as e:
            logger.error(f"❌ Failed to train {horizon}min model: {e}", exc_info=True)

    # Summary
    logger.info("\n" + "=" * 80)
    logger.info("TRAINING SUMMARY")
    logger.info("=" * 80)

    for result in results:
        logger.info(f"\n{result['horizon']}min Horizon:")
        logger.info(f"  Model: {result['model_path']}")
        logger.info(f"  OOF: {result['oof_path']}")
        logger.info(f"  Importance: {result['importance_path']}")
        logger.info(
            f"  Val Accuracy: {result['metrics'].get('val_accuracy', 'N/A'):.4f}"
        )

    logger.info("\n✅ Multi-horizon training complete!")


if __name__ == "__main__":
    main()
