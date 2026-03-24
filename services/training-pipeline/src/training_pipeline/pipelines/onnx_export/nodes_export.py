"""
ONNX export for all tier models.

Exports all CPCV folds (Tier 2), HMM via pickle (skl2onnx if available),
scalers alongside their models, and computes SHA-256 checksums for every
artifact.  Called by the runner after quality gate passes.
"""

import hashlib
import logging
import os
import pickle
from typing import Any

import time

import mlflow
import mlflow.onnx
import torch

from ...utils.mlflow_tracking import register_and_promote
from ...utils.observability import ONNX_EXPORT_DURATION, ONNX_MODEL_SIZE

logger = logging.getLogger(__name__)


def _sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def export_all_models(
    artifact_paths: dict[str, str],
    config: dict[str, Any],
) -> dict[str, str]:
    """
    Convert/copy all trained models to ONNX (where possible) and return
    an updated ``artifact_paths`` dict with ``.onnx`` paths and checksums.

    Models that are already saved as native format (XGBoost JSON, LightGBM txt,
    PyTorch .pt) are also exported to ONNX where the tooling supports it.
    """
    output_dir = config.get("output_dir", config.get("export", {}).get("output_dir", "data/06_models"))
    opset = config.get("onnx_opset", config.get("export", {}).get("onnx_opset", 13))
    os.makedirs(output_dir, exist_ok=True)

    exported: dict[str, str] = {}

    start = time.monotonic()
    _export_tier0_xgboost(artifact_paths, output_dir, opset, exported)
    ONNX_EXPORT_DURATION.labels(tier="0").observe(time.monotonic() - start)

    start = time.monotonic()
    _export_tier1_patchtst(artifact_paths, output_dir, opset, exported)
    ONNX_EXPORT_DURATION.labels(tier="1").observe(time.monotonic() - start)

    start = time.monotonic()
    _export_tier1_hmm(artifact_paths, output_dir, exported)
    ONNX_EXPORT_DURATION.labels(tier="1_hmm").observe(time.monotonic() - start)

    start = time.monotonic()
    _export_tier2_lightgbm(artifact_paths, output_dir, opset, exported)
    ONNX_EXPORT_DURATION.labels(tier="2").observe(time.monotonic() - start)

    start = time.monotonic()
    _export_tier3_lit(artifact_paths, output_dir, opset, exported)
    ONNX_EXPORT_DURATION.labels(tier="3").observe(time.monotonic() - start)

    start = time.monotonic()
    _export_meta_learner(artifact_paths, output_dir, opset, exported)
    ONNX_EXPORT_DURATION.labels(tier="meta").observe(time.monotonic() - start)

    for name, path in list(exported.items()):
        if os.path.exists(path) and path.endswith(".onnx"):
            size = os.path.getsize(path)
            tier_label = name.split("_")[0] if "_" in name else "unknown"
            ONNX_MODEL_SIZE.labels(tier=tier_label, model_name=name).set(size)
            mlflow.log_metric(f"{name}_size_bytes", size)
            try:
                mlflow.log_artifact(path, "onnx_models")
            except Exception as e:
                logger.warning("Could not log ONNX artifact %s to MLflow: %s", name, e)

    for name, path in list(exported.items()):
        if os.path.exists(path):
            exported[f"{name}_sha256"] = _sha256(path)

    logger.info("ONNX export complete — %d artifacts", len([v for v in exported.values() if not v.startswith("sha")]))
    _register_models(exported)
    return exported


def _register_models(exported: dict[str, str]) -> None:
    """Register exported ONNX models in MLflow Model Registry."""
    registry_map = {
        "tier0_gap_predictor_onnx": "tier0_gap_predictor",
        "tier1_patchtst_onnx": "tier1_patchtst",
        "tier3_lit_onnx": "tier3_lit",
        "meta_learner_onnx": "meta_learner",
    }
    for artifact_key, model_name in registry_map.items():
        path = exported.get(artifact_key)
        if not path or not os.path.exists(path):
            continue
        try:
            run = mlflow.active_run()
            if run:
                register_and_promote(
                    model_name=model_name,
                    run_id=run.info.run_id,
                    artifact_path="onnx_models",
                    stage="Staging",
                )
        except Exception as e:
            logger.warning("Could not register model %s: %s", model_name, e)

    for artifact_key in exported:
        if artifact_key.startswith("tier2_") and artifact_key.endswith("_onnx"):
            path = exported.get(artifact_key)
            if not path or not os.path.exists(path):
                continue
            model_name = artifact_key.replace("_onnx", "")
            try:
                run = mlflow.active_run()
                if run:
                    register_and_promote(
                        model_name=model_name,
                        run_id=run.info.run_id,
                        artifact_path="onnx_models",
                        stage="Staging",
                    )
            except Exception as e:
                logger.warning("Could not register model %s: %s", model_name, e)


def _export_tier0_xgboost(paths, out_dir, opset, exported):
    src = paths.get("tier0_xgboost")
    if not src or not os.path.exists(src):
        return
    try:
        import xgboost as xgb
        import onnxmltools
        from onnxmltools.convert.common.data_types import FloatTensorType

        model = xgb.Booster()
        model.load_model(src)
        n_feats = len(model.feature_names) if model.feature_names else 10
        initial_types = [("input", FloatTensorType([None, n_feats]))]
        onnx_model = onnxmltools.convert_xgboost(model, initial_types=initial_types, target_opset=opset)
        dest = os.path.join(out_dir, "tier0_gap_predictor.onnx")
        import onnx
        onnx.save_model(onnx_model, dest)
        exported["tier0_gap_predictor_onnx"] = dest
        logger.info("Exported Tier 0 XGBoost → %s", dest)
    except Exception as e:
        logger.error("Tier 0 ONNX export failed: %s", e)


def _export_tier1_patchtst(paths, out_dir, opset, exported):
    src = paths.get("tier1_patchtst")
    if not src or not os.path.exists(src):
        return
    try:
        from ..train_tier1.nodes_patchtst import SimplePatchTST
        state = torch.load(src, map_location="cpu", weights_only=True)
        n_feats = 8
        seq_len = 60
        patch_len = 5
        model = SimplePatchTST(seq_len, patch_len, n_feats, forecast_horizon=5)
        model.load_state_dict(state)
        model.eval()
        dummy = torch.randn(1, seq_len, n_feats)
        dest = os.path.join(out_dir, "tier1_patchtst.onnx")
        torch.onnx.export(
            model, dummy, dest, opset_version=opset,
            input_names=["input"], output_names=["output"],
            dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
        )
        exported["tier1_patchtst_onnx"] = dest
        logger.info("Exported Tier 1 PatchTST → %s", dest)
    except Exception as e:
        logger.error("Tier 1 PatchTST ONNX export failed: %s", e)


def _export_tier1_hmm(paths, out_dir, exported):
    """HMM is not natively ONNX-exportable — keep as pickle with checksum."""
    src = paths.get("tier1_hmm")
    if not src or not os.path.exists(src):
        return
    exported["tier1_hmm_pkl"] = src
    scaler_src = paths.get("tier1_hmm_scaler")
    if scaler_src and os.path.exists(scaler_src):
        exported["tier1_hmm_scaler_pkl"] = scaler_src
    logger.info("Tier 1 HMM registered as pickle (no ONNX conversion for HMM)")


def _export_tier2_lightgbm(paths, out_dir, opset, exported):
    """Export ALL CPCV folds (not just fold_1)."""
    lgb_keys = [k for k in paths if k.startswith("tier2_")]
    if not lgb_keys:
        return
    try:
        import lightgbm as lgb
        import onnxmltools
        from onnxmltools.convert.common.data_types import FloatTensorType

        for key in lgb_keys:
            src = paths[key]
            if not os.path.exists(src):
                continue
            model = lgb.Booster(model_file=src)
            n_feats = model.num_feature()
            initial_types = [("input", FloatTensorType([None, n_feats]))]
            onnx_model = onnxmltools.convert_lightgbm(model, initial_types=initial_types, target_opset=opset)
            dest = os.path.join(out_dir, f"{key}.onnx")
            import onnx
            onnx.save_model(onnx_model, dest)
            exported[f"{key}_onnx"] = dest
            logger.info("Exported Tier 2 %s → %s", key, dest)
    except Exception as e:
        logger.error("Tier 2 LightGBM ONNX export failed: %s", e)


def _export_tier3_lit(paths, out_dir, opset, exported):
    src = paths.get("tier3_lit")
    if not src or not os.path.exists(src):
        return
    try:
        from ..train_tier3.nodes_lit import SimpleLinearTransformer
        state = torch.load(src, map_location="cpu", weights_only=True)
        n_feats = 5
        seq_len = 20
        model = SimpleLinearTransformer(n_feats, forecast_horizon=1)
        model.load_state_dict(state)
        model.eval()
        dummy = torch.randn(1, seq_len, n_feats)
        dest = os.path.join(out_dir, "tier3_lit.onnx")
        torch.onnx.export(
            model, dummy, dest, opset_version=opset,
            input_names=["input"], output_names=["output"],
            dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
        )
        exported["tier3_lit_onnx"] = dest
        logger.info("Exported Tier 3 LiT → %s", dest)
    except Exception as e:
        logger.error("Tier 3 LiT ONNX export failed: %s", e)


def _export_meta_learner(paths, out_dir, opset, exported):
    src = paths.get("meta_learner")
    if not src or not os.path.exists(src):
        return
    try:
        from ..train_meta.nodes_metalearner import RegimeConditionedGatingNetwork
        state = torch.load(src, map_location="cpu", weights_only=True)
        model = RegimeConditionedGatingNetwork(num_models=4, num_regimes=4)
        model.load_state_dict(state)
        model.eval()
        dummy_preds = torch.randn(1, 4)
        dummy_regime = torch.randn(1, 4)
        dest = os.path.join(out_dir, "meta_learner.onnx")
        torch.onnx.export(
            model, (dummy_preds, dummy_regime), dest, opset_version=opset,
            input_names=["model_preds", "regime_one_hot"],
            output_names=["final_pred", "weights"],
            dynamic_axes={
                "model_preds": {0: "batch"}, "regime_one_hot": {0: "batch"},
                "final_pred": {0: "batch"}, "weights": {0: "batch"},
            },
        )
        exported["meta_learner_onnx"] = dest
        logger.info("Exported Meta-learner → %s", dest)
    except Exception as e:
        logger.error("Meta-learner ONNX export failed: %s", e)
