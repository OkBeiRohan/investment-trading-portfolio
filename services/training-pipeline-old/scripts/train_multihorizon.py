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

from src.training_pipeline.utils.sql_loader import QuestDBLoader
from src.training_pipeline.pipelines.train_ensemble.models.lightgbm_trainer import (
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
) -> dict[str, object]:
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
        return {"horizon": horizon_minutes, "error": "No data after merge"}

    # 4. Prepare X, y
    feature_cols = [col for col in features.columns if col != "timestamp"]
    X = data[feature_cols]
    y = data["label"]  # 0=DOWN, 1=NEUTRAL, 2=UP

    logger.info(f"Features: {X.shape}, Labels: {y.shape}")
    logger.info(f"Label distribution:\n{y.value_counts().sort_index()}")

    # 5. Train model
    from training_pipeline.pipelines.train_ensemble.models.lightgbm_trainer import (
        LightGBMConfig,
        LabelingConfig,
    )
    from training_pipeline.types import TrainingConfig

    trainer = LightGBMTrainer(
        training_config=TrainingConfig(
            n_splits=12, purge_window=375, embargo_window=375
        ),
        lightgbm_config=LightGBMConfig(
            objective="multiclass",
            num_class=3,
            metric="multi_logloss",
            boosting_type="gbdt",
            learning_rate=0.01,
            num_leaves=31,
            n_estimators=400,
            feature_fraction=0.8,
            bagging_fraction=0.8,
            bagging_freq=5,
            device="gpu",
            gpu_platform_id=0,
            gpu_device_id=0,
        ),
        labeling_config=LabelingConfig(horizon=horizon_minutes),
    )

    logger.info("Training model with walk-forward validation...")
    result = trainer.train(X, y, mlflow_run_name=f"lightgbm_{horizon_minutes}min")

    # 6. Save model with horizon suffix
    model_dir = Path(__file__).parent.parent / "data" / "06_models"
    model_dir.mkdir(parents=True, exist_ok=True)

    model_path = model_dir / f"lightgbm_{horizon_minutes}min.txt"
    trainer.save_model(model_path)
    logger.info(f"✅ Saved model: {model_path}")

    # 7. Save OOF predictions
    oof_path = model_dir / f"oof_lightgbm_{horizon_minutes}min.parquet"
    trainer.save_oof_predictions(oof_path)
    logger.info(f"✅ Saved OOF predictions: {oof_path}")

    # 8. Save feature importance
    import pandas as pd

    importance_path = model_dir / f"feature_importance_{horizon_minutes}min.csv"
    importance_df = pd.DataFrame(
        result.feature_importance, columns=["feature", "importance"]
    )
    importance_df.to_csv(importance_path, index=False)
    logger.info(f"✅ Saved feature importance: {importance_path}")

    # 9. Get metrics
    val_metrics = result.validation_metrics
    logger.info(f"\n📊 {horizon_minutes}min Horizon Metrics:")
    logger.info(
        f"  Accuracy: {val_metrics.accuracy_mean:.4f} ± {val_metrics.accuracy_std:.4f}"
    )
    logger.info(f"  AUC: {val_metrics.auc_mean:.4f} ± {val_metrics.auc_std:.4f}")
    logger.info(f"  Precision (UP): {val_metrics.precision_up_mean:.4f}")
    logger.info(f"  Precision (DOWN): {val_metrics.precision_down_mean:.4f}")

    return {
        "horizon": horizon_minutes,
        "model_path": str(model_path),
        "oof_path": str(oof_path),
        "importance_path": str(importance_path),
        "accuracy": val_metrics.accuracy_mean,
        "auc": val_metrics.auc_mean,
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
    loader = QuestDBLoader("postgresql://admin:quest@localhost:8812/qdb")

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
            results.append(result)
        except Exception as e:
            logger.error(f"❌ Failed to train {horizon}min model: {e}", exc_info=True)
            results.append({"horizon": horizon, "error": str(e)})

    # Summary
    logger.info("\n" + "=" * 80)
    logger.info("TRAINING SUMMARY")
    logger.info("=" * 80)

    for result in results:
        if "error" in result:
            logger.info(f"\n{result['horizon']}min Horizon: ❌ {result['error']}")
            continue
        logger.info(f"\n{result['horizon']}min Horizon:")
        logger.info(f"  Model: {result['model_path']}")
        logger.info(f"  OOF: {result['oof_path']}")
        logger.info(f"  Importance: {result['importance_path']}")
        logger.info(f"  Accuracy: {result.get('accuracy', 0):.4f}")
        logger.info(f"  AUC: {result.get('auc', 0):.4f}")

    logger.info("\n✅ Multi-horizon training complete!")


if __name__ == "__main__":
    main()
