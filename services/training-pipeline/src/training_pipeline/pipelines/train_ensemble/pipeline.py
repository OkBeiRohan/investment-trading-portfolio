"""
This is a boilerplate pipeline 'train_ensemble'
generated using Kedro 1.1.1
"""

from kedro.pipeline import Pipeline  # noqa
from .nodes import create_lightgbm_training_node


def create_pipeline(**kwargs) -> Pipeline:
    return Pipeline([create_lightgbm_training_node()])