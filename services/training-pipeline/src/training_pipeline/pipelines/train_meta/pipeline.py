"""
Kedro pipeline for 'train_meta'

Meta-Learner: Regime-Conditioned Temporal Loss Gating Network
"""

from kedro.pipeline import Pipeline, node
from .nodes_metalearner import train_meta_learner

def create_pipeline(**kwargs) -> Pipeline:
    return Pipeline(
        [
            node(
                func=train_meta_learner,
                inputs={
                    "oof_tier0": "tier0_oof_predictions",
                    "oof_tier1": "tier1_oof_predictions", 
                    "oof_tier2": "tier2_oof_predictions",
                    "oof_tier3": "tier3_oof_predictions",
                    "parameters": "params:meta",
                },
                outputs="final_meta_learner_model",
                name="train_meta_learner_gating_network",
            ),
        ],
        namespace="train_meta",
        tags=["meta", "ensemble"],
    )
