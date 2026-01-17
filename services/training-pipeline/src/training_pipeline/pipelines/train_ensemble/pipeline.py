"""
This is a boilerplate pipeline 'train_ensemble'
generated using Kedro 1.1.1
"""

from kedro.pipeline import Pipeline, Node  # noqa
from .nodes import train_lightgbm_model


def create_pipeline(**kwargs) -> Pipeline:
    return Pipeline(
        [
            Node(
                func=train_lightgbm_model,
                inputs={
                    "catalog": "catalog",  # Special Kedro input
                    "parameters": "params:all",
                },
                outputs="lightgbm_model_batch",
                name="train_lightgbm_batch",
            )
        ],
        namespace="training_ensemble",
        tags=["train_ensemble"],
    )
