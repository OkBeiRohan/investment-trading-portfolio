"""
This is a Kedro pipeline 'train_tier0' for XGBoost Pre-Market Gap Predictor
"""

from kedro.pipeline import Pipeline, node
from .nodes import train_xgboost_gap_model, evaluate_tier0_model

def create_pipeline(**kwargs) -> Pipeline:
    return Pipeline(
        [
            node(
                func=train_xgboost_gap_model,
                inputs=["tier0_training_data", "params:tier0"],
                outputs="tier0_xgboost_model",
                name="train_tier0_xgboost_node",
            ),
            node(
                func=evaluate_tier0_model,
                inputs=["tier0_xgboost_model", "tier0_test_data", "params:tier0"],
                outputs="tier0_metrics",
                name="evaluate_tier0_node",
            )
        ],
        namespace="train_tier0",
        inputs={"tier0_training_data", "tier0_test_data"},
        outputs={"tier0_xgboost_model", "tier0_metrics"},
    )
