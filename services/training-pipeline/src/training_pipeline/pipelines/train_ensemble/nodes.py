"""
This is a boilerplate pipeline 'train_ensemble'
generated using Kedro 1.1.1
"""

from kedro.pipeline import Node
from .models.lightgbm_trainer import LightGBMTrainer

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


def create_lightgbm_training_node() -> Node:
    """Create a Kedro Node for LightGBM training"""

    trainer = LightGBMTrainer()

    return Node(
        func=trainer.train,
        inputs=["features", "labels"],
        outputs="lightgbm_training_result",
        name="lightgbm_training_node",
    )
