"""
Kedro pipeline for 'onnx_export'

ONNX Model Export and Registry
"""

from kedro.pipeline import Pipeline, node
from .nodes_export import export_all_models

def create_pipeline(**kwargs) -> Pipeline:
    return Pipeline(
        [
            node(
                func=export_all_models,
                inputs={
                    "tier0_model": "tier0_xgboost_model",
                    "tier1_hmm": "tier1_regime_hmm_model",
                    "tier1_patchtst": "tier1_patchtst_model",
                    "tier2_ensemble": "tier2_lightgbm_ensemble",
                    "tier3_lit": "tier3_lit_model",
                    "meta_learner": "final_meta_learner_model",
                    "parameters": "params:export"
                },
                outputs="onnx_export_status",
                name="export_onnx_models_node",
            ),
        ],
        namespace="onnx_export",
        tags=["export", "onnx"],
    )
