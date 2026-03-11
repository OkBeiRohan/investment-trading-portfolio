"""
Kedro pipeline for 'train_tier2'

Tier 2: Intraday Navigator (LightGBM, TFT, Mamba)
"""

from kedro.pipeline import Pipeline, node
from .nodes_cpcv import train_lightgbm_cpcv

def create_pipeline(**kwargs) -> Pipeline:
    return Pipeline(
        [
            node(
                func=train_lightgbm_cpcv,
                inputs={"catalog": "catalog", "parameters": "params:tier2"},
                outputs="tier2_lightgbm_ensemble",
                name="train_tier2_lightgbm_cpcv",
            ),
        ],
        namespace="train_tier2",
        tags=["tier2", "intraday", "lightgbm"],
    )
