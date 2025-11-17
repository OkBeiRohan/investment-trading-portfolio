"""
Simplified model export without ONNX (compatibility workaround)
"""

import json
import joblib
from pathlib import Path
from typing import Dict, Any


def export_to_onnx(model, output_path: str, feature_names: list = None) -> bool:
    """
    Simplified export - saves as joblib instead of ONNX
    This is a compatibility workaround for Python 3.13 + ONNX issues

    Args:
        model: Trained model
        output_path: Path to save model
        feature_names: List of feature names

    Returns:
        True if successful
    """
    try:
        # Change .onnx extension to .pkl
        if output_path.endswith(".onnx"):
            output_path = output_path.replace(".onnx", ".pkl")

        # Save with joblib
        joblib.dump(model, output_path)
        print(f"✓ Model saved to {output_path} (joblib format)")

        # Save feature names if provided
        if feature_names:
            meta_path = output_path.replace(".pkl", "_features.json")
            with open(meta_path, "w") as f:
                json.dump({"features": feature_names}, f, indent=2)
            print(f"✓ Feature names saved to {meta_path}")

        return True

    except Exception as e:
        print(f"✗ Error saving model: {e}")
        return False


def save_model_metadata(output_path: str, metadata: Dict[str, Any]):
    """
    Save model metadata to JSON

    Args:
        output_path: Path to save metadata
        metadata: Dictionary of metadata
    """
    try:
        with open(output_path, "w") as f:
            json.dump(metadata, f, indent=2, default=str)
        print(f"✓ Metadata saved to {output_path}")
    except Exception as e:
        print(f"✗ Error saving metadata: {e}")
