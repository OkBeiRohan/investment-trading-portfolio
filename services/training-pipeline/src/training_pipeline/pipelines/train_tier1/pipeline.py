"""
Kedro pipeline for 'train_tier1'

Tier 1: Macro Director (Regime HMM + PatchTST)
"""

from kedro.pipeline import Pipeline, node
from .nodes_hmm import train_regime_hmm_model
from .nodes_patchtst import train_patchtst_model

def create_pipeline(**kwargs) -> Pipeline:
    return Pipeline(
        [
            node(
                func=train_regime_hmm_model,
                inputs={"train_data": "tier1_daily_features", "parameters": "params:tier1"},
                outputs="tier1_regime_hmm_model",
                name="train_tier1_regime_hmm",
            ),
            node(
                func=train_patchtst_model,
                inputs={"train_data": "tier1_daily_features", "parameters": "params:tier1"},
                outputs="tier1_patchtst_model",
                name="train_tier1_patchtst",
            ),
        ],
        namespace="train_tier1",
        inputs={"tier1_daily_features"},
        outputs={"tier1_regime_hmm_model", "tier1_patchtst_model"},
    )
