"""
Kedro pipeline for 'train_tier3'

Tier 3: Microstructure Scalper (Linear Transformer / LiT)
"""

from kedro.pipeline import Pipeline, node
from .nodes_lit import train_lit_model

def create_pipeline(**kwargs) -> Pipeline:
    return Pipeline(
        [
            node(
                func=train_lit_model,
                inputs={"train_data": "tier3_tick_features", "parameters": "params:tier3"},
                outputs="tier3_lit_model",
                name="train_tier3_lit",
            ),
        ],
        namespace="train_tier3",
        inputs={"tier3_tick_features"},
        outputs={"tier3_lit_model"},
    )
