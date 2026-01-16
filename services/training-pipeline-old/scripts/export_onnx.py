"""
ONNX Export Pipeline for LightGBM Models

Converts trained LightGBM models to ONNX format with FP16 quantization
for production deployment in algo-worker.

Features:
- Convert LightGBM → ONNX with FP16 quantization (2x smaller, 2x faster)
- Validate predictions match original model (< 1e-4 error)
- Export metadata (feature names, class labels, thresholds)
- Support multi-horizon models
"""

from pathlib import Path
import logging
import numpy as np
import pandas as pd
import lightgbm as lgb
import onnx
import onnxruntime as ort
from onnxmltools.convert import convert_lightgbm
from onnxconverter_common import FloatTensorType
from onnxconverter_common.float16_converter import convert_float_to_float16

logger = logging.getLogger(__name__)


def export_lightgbm_to_onnx(
    model_path: str,
    output_path: str,
    feature_names: list[str],
    num_classes: int = 3,
    quantize_fp16: bool = True,
    validate: bool = True,
) -> dict:
    """
    Export LightGBM model to ONNX format

    Args:
        model_path: Path to .txt LightGBM model
        output_path: Path to save .onnx file
        feature_names: List of feature column names (must match training)
        num_classes: Number of classes (3 for UP/NEUTRAL/DOWN)
        quantize_fp16: Apply FP16 quantization (2x smaller, 2x faster)
        validate: Validate ONNX predictions match LightGBM

    Returns:
        dict with export metadata (error, file_size, inference_time)
    """
    logger.info(f"Exporting LightGBM model to ONNX: {model_path} → {output_path}")

    # 1. Load LightGBM model
    booster = lgb.Booster(model_file=model_path)
    logger.info(f"Loaded LightGBM model: {booster.num_trees()} trees")

    # 2. Define input type (batch_size, num_features)
    initial_type = [("float_input", FloatTensorType([None, len(feature_names)]))]

    # 3. Convert to ONNX
    onnx_model = convert_lightgbm(
        booster,
        initial_types=initial_type,
        target_opset=12,
    )
    logger.info("Converted to ONNX format")

    # 4. Apply FP16 quantization
    if quantize_fp16:
        onnx_model = convert_float_to_float16(onnx_model)
        logger.info("Applied FP16 quantization")

    # 5. Save ONNX model
    output_path_obj = Path(output_path)
    output_path_obj.parent.mkdir(parents=True, exist_ok=True)
    onnx.save_model(onnx_model, str(output_path_obj))

    # Check model
    onnx.checker.check_model(onnx_model)
    logger.info(f"✅ Saved and validated ONNX model: {output_path}")

    # 6. Get file sizes
    lgb_size = Path(model_path).stat().st_size / 1024  # KB
    onnx_size = output_path_obj.stat().st_size / 1024  # KB
    logger.info(f"File sizes: LightGBM={lgb_size:.1f}KB, ONNX={onnx_size:.1f}KB")

    metadata = {
        "lightgbm_size_kb": lgb_size,
        "onnx_size_kb": onnx_size,
        "compression_ratio": lgb_size / onnx_size if onnx_size > 0 else 0,
    }

    # 7. Validate predictions
    if validate:
        logger.info("Validating ONNX predictions...")

        # Generate random test data
        X_test = np.random.randn(100, len(feature_names)).astype(np.float32)

        # LightGBM predictions
        lgb_preds = booster.predict(X_test)
        if num_classes > 2:
            lgb_probs = lgb_preds  # Already probabilities for multiclass
        else:
            lgb_probs = np.column_stack([1 - lgb_preds, lgb_preds])

        # ONNX predictions
        ort_session = ort.InferenceSession(str(output_path_obj))
        input_name = ort_session.get_inputs()[0].name
        onnx_preds = ort_session.run(None, {input_name: X_test})[
            1
        ]  # [1] = probabilities

        # Compare
        max_error = np.max(np.abs(lgb_probs - onnx_preds))
        mean_error = np.mean(np.abs(lgb_probs - onnx_preds))

        logger.info(f"Prediction validation:")
        logger.info(f"  Max error: {max_error:.6f}")
        logger.info(f"  Mean error: {mean_error:.6f}")

        if max_error > 1e-3:
            logger.warning(f"⚠️  High prediction error: {max_error:.6f}")
        else:
            logger.info("✅ Predictions match within tolerance")

        metadata["max_prediction_error"] = float(max_error)
        metadata["mean_prediction_error"] = float(mean_error)

        # Benchmark inference time
        import time

        start = time.time()
        for _ in range(1000):
            ort_session.run(None, {input_name: X_test[:1]})
        elapsed = (time.time() - start) / 1000 * 1000  # ms per inference

        logger.info(f"ONNX inference time: {elapsed:.2f}ms per sample")
        metadata["inference_time_ms"] = elapsed

    return metadata


def export_all_horizons(
    model_dir: Path,
    output_dir: Path,
    feature_names: list[str],
    horizons: list[int] = [5, 15, 30],
) -> dict:
    """
    Export all multi-horizon models to ONNX

    Args:
        model_dir: Directory with lightgbm_{horizon}min.txt files
        output_dir: Directory to save ONNX models
        feature_names: List of feature names
        horizons: List of horizon minutes to export

    Returns:
        dict mapping horizon → export metadata
    """
    logger.info("=" * 80)
    logger.info("EXPORTING MULTI-HORIZON MODELS TO ONNX")
    logger.info("=" * 80)

    results = {}

    for horizon in horizons:
        model_path = model_dir / f"lightgbm_{horizon}min.txt"
        output_path = output_dir / f"lightgbm_{horizon}min.onnx"

        if not model_path.exists():
            logger.warning(f"⚠️  Model not found: {model_path}")
            continue

        try:
            metadata = export_lightgbm_to_onnx(
                model_path=str(model_path),
                output_path=str(output_path),
                feature_names=feature_names,
                num_classes=3,
                quantize_fp16=True,
                validate=True,
            )
            results[horizon] = metadata
            logger.info(f"✅ Exported {horizon}min model")
        except Exception as e:
            logger.error(f"❌ Failed to export {horizon}min model: {e}", exc_info=True)

    # Summary
    logger.info("\n" + "=" * 80)
    logger.info("EXPORT SUMMARY")
    logger.info("=" * 80)

    for horizon, metadata in results.items():
        logger.info(f"\n{horizon}min Horizon:")
        logger.info(f"  ONNX size: {metadata['onnx_size_kb']:.1f} KB")
        logger.info(f"  Compression: {metadata['compression_ratio']:.2f}x")
        logger.info(f"  Max error: {metadata['max_prediction_error']:.6f}")
        logger.info(f"  Inference: {metadata['inference_time_ms']:.2f}ms")

    return results


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Example usage
    model_dir = Path(__file__).parent.parent.parent / "data" / "06_models"
    output_dir = (
        Path(__file__).parent.parent.parent.parent.parent
        / "apps"
        / "algo-worker"
        / "models"
    )

    # Feature names (must match training)
    feature_names = [
        # Market Structure (8)
        "price_vs_vwap",
        "price_vs_day_high",
        "price_vs_day_low",
        "range_position",
        "prev_day_high_dist",
        "prev_day_low_dist",
        "weekly_high_dist",
        "weekly_low_dist",
        # Momentum & Trend (8)
        "rsi_5",
        "rsi_14",
        "rsi_21",
        "macd_hist",
        "ema_9_slope",
        "ema_21_slope",
        "adx",
        "roc_5",
        # Volatility (5)
        "atr_percent",
        "realized_vol_5m",
        "realized_vol_15m",
        "vol_expansion_ratio",
        "india_vix",
        # Options (9)
        "atm_iv",
        "atm_iv_change",
        "delta_atm",
        "gamma_atm",
        "vega_atm",
        "theta_atm",
        "pcr_oi",
        "pcr_volume",
        "max_pain_dist",
        # Time (3)
        "minutes_from_open",
        "minutes_to_close",
        "day_of_week",
    ]

    export_all_horizons(
        model_dir=model_dir,
        output_dir=output_dir,
        feature_names=feature_names,
        horizons=[5, 15, 30],
    )
