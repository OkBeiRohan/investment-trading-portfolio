"""
Nodes for ONNX Model Export
"""

import logging
import torch
import lightgbm as lgb
import xgboost as xgb
import onnx
import onnxmltools
from onnxmltools.convert.common.data_types import FloatTensorType
from typing import Dict, Any

logger = logging.getLogger(__name__)

def export_all_models(
    tier0_model: xgb.Booster,
    tier1_hmm: Any,
    tier1_patchtst: torch.nn.Module,
    tier2_ensemble: Dict[str, lgb.Booster],
    tier3_lit: torch.nn.Module,
    meta_learner: torch.nn.Module,
    parameters: Dict[str, Any]
) -> str:
    """
    Exports all trained models in the pipeline to ONNX format.
    These optimized artifacts will be picked up by the Rust Algo-Worker for ultra-low latency execution.
    """
    logger.info("Starting ONNX Model Exports...")
    
    output_dir = parameters.get("output_dir", "data/06_models")
    opset = parameters.get("onnx_opset", 13)
    
    import os
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Export Tier 0 XGBoost
    try:
        tier0_path = os.path.join(output_dir, "tier0_gap_predictor.onnx")
        # dummy input for shaping
        xgboost_initial_types = [('input', FloatTensorType([None, 10]))]
        onnx_model_xgb = onnxmltools.convert_xgboost(tier0_model, initial_types=xgboost_initial_types)
        onnx.save_model(onnx_model_xgb, tier0_path)
        logger.info(f"Exported Tier 0 XGBoost -> {tier0_path}")
    except Exception as e:
        logger.error(f"Failed to export Tier 0 XGBoost: {e}")

    # 2. Export Tier 1 PatchTST (PyTorch)
    try:
        tier1_path = os.path.join(output_dir, "tier1_patchtst.onnx")
        dummy_input = torch.randn(1, 60, 8) # batch, seq_len, features
        torch.onnx.export(
            tier1_patchtst, 
            dummy_input, 
            tier1_path, 
            opset_version=opset,
            input_names=['input'], 
            output_names=['output'],
            dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
        )
        logger.info(f"Exported Tier 1 PatchTST -> {tier1_path}")
    except Exception as e:
        logger.error(f"Failed to export Tier 1 PatchTST: {e}")

    # 3. Export Tier 2 LightGBM
    try:
        # Assuming we just export fold_1 for simplicity, or we can export all folds 
        if tier2_ensemble and "fold_1" in tier2_ensemble:
            tier2_path = os.path.join(output_dir, "tier2_lightgbm_fold_1.onnx")
            lgb_model = tier2_ensemble["fold_1"]
            lgb_initial_types = [('input', FloatTensorType([None, 10]))] # Approximate feature len
            onnx_model_lgb = onnxmltools.convert_lightgbm(lgb_model, initial_types=lgb_initial_types)
            onnx.save_model(onnx_model_lgb, tier2_path)
            logger.info(f"Exported Tier 2 LightGBM (Fold 1) -> {tier2_path}")
    except Exception as e:
        logger.error(f"Failed to export Tier 2 LightGBM: {e}")

    # 4. Export Tier 3 LiT (PyTorch)
    try:
        tier3_path = os.path.join(output_dir, "tier3_lit.onnx")
        dummy_input = torch.randn(1, 20, 5) # batch, seq_len, features
        torch.onnx.export(
            tier3_lit, 
            dummy_input, 
            tier3_path, 
            opset_version=opset,
            input_names=['input'], 
            output_names=['output'],
            dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
        )
        logger.info(f"Exported Tier 3 LiT -> {tier3_path}")
    except Exception as e:
        logger.error(f"Failed to export Tier 3 LiT: {e}")

    # 5. Export Meta-Learner (PyTorch)
    try:
        meta_path = os.path.join(output_dir, "meta_learner.onnx")
        dummy_preds = torch.randn(1, 4)
        dummy_regimes = torch.randn(1, 4)
        torch.onnx.export(
            meta_learner, 
            (dummy_preds, dummy_regimes), 
            meta_path, 
            opset_version=opset,
            input_names=['model_preds', 'regime_one_hot'], 
            output_names=['final_pred', 'weights'],
            dynamic_axes={
                'model_preds': {0: 'batch_size'}, 'regime_one_hot': {0: 'batch_size'}, 
                'final_pred': {0: 'batch_size'}, 'weights': {0: 'batch_size'}
            }
        )
        logger.info(f"Exported Meta-Learner -> {meta_path}")
    except Exception as e:
        logger.error(f"Failed to export Meta-Learner: {e}")

    return "EXPORT_COMPLETE"
