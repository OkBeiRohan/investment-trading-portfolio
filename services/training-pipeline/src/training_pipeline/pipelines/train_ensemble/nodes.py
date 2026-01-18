"""
This is a boilerplate pipeline 'train_ensemble'
generated using Kedro 1.1.1
"""

from .models.lightgbm_trainer import LightGBMTrainer
from kedro.io import DataCatalog
import logging
from training_pipeline.utils.batch_loader import BatchDataLoader

logger = logging.getLogger(__name__)


# def train_lightgbm_model(X, y, model_dir, horizon_minutes):
#     """Train LightGBM model with walk-forward validation"""
#     trainer = LightGBMTrainer()

#     logger.info("Training with walk-forward validation...")
#     trainer.train(X, y)

#     # 6. Save
#     model_path = model_dir / f"lightgbm_{horizon_minutes}min.txt"
#     oof_path = model_dir / f"oof_lightgbm_{horizon_minutes}min.parquet"

#     trainer.save_model(model_path)
#     trainer.save_oof_predictions(oof_path)

#     logger.info(f"✅ Model: {model_path}")
#     logger.info(f"✅ OOF: {oof_path}")

#     return {
#         "horizon": f"{horizon_minutes}min",
#         "model_path": str(model_path),
#         "oof_path": str(oof_path),
#     }


def train_lightgbm_model(
    catalog: DataCatalog,
    parameters: dict[str, dict[str, str]],
) -> dict[str, str]:
    """Create a Kedro Node for LightGBM training"""

    # Extract parameters
    train_params = parameters["training"]
    lgb_params = parameters["lightgbm"]

    start_date = train_params["training_start"]
    end_date = train_params["training_end"]
    batch_days = int(train_params.get("batch_days", 30))

    logger.info(
        f"Starting batch training: {start_date} to {end_date}, "
        f"{batch_days} days per batch"
        f"lightgbm_params: {lgb_params}"
        f"catalog: {catalog}"
    )

    loader = BatchDataLoader(
        catalog=catalog,
        start_date=start_date,
        end_date=end_date,
        batch_days=batch_days,
    )
    logger.info(f"Initialized BatchDataLoader: {loader}")

    logger.info("Initializing LightGBM Trainer...")

    trainer = LightGBMTrainer()

    return trainer.train(features="features", labels="labels")
