"""
Kedro pipeline for 'iv_surface'
"""

from kedro.pipeline import Pipeline, node
from .nodes_iv import predict_iv_surface

def create_pipeline(**kwargs) -> Pipeline:
    return Pipeline(
        [
            node(
                func=predict_iv_surface,
                inputs={"option_chain": "raw_option_chain", "parameters": "params:iv_surface"},
                outputs="smoothed_iv_surface",
                name="predict_iv_surface_node",
            ),
        ],
        namespace="iv_surface",
        tags=["iv", "volatility", "pricing"],
    )
