"""
Model export utilities for ONNX conversion
"""

import json
import onnx
import onnxruntime as ort
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional
import xgboost as xgb


def export_xgboost_to_onnx(
    model: xgb.Booster,
    output_path: str,
    initial_types: Optional[list] = None,
    n_features: Optional[int] = None,
) -> bool:
    """
    Export XGBoost model to ONNX format

    Args:
        model: Trained XGBoost Booster
        output_path: Path to save ONNX model
        initial_types: Initial types for ONNX conversion
        n_features: Number of input features

    Returns:
        True if successful, False otherwise
    """
    try:
        from onnxmltools.convert import convert_xgboost
        from onnxmltools.convert.common.data_types import FloatTensorType

        # Define initial types if not provided
        if initial_types is None:
            if n_features is None:
                raise ValueError("Either initial_types or n_features must be provided")
            initial_types = [("input", FloatTensorType([None, n_features]))]

        # Convert to ONNX
        onnx_model = convert_xgboost(model, initial_types=initial_types)

        # Save ONNX model
        onnx.save_model(onnx_model, output_path)

        # Validate the model
        validate_onnx_model(output_path)

        print(f"XGBoost model exported to ONNX: {output_path}")
        return True

    except Exception as e:
        print(f"Error exporting XGBoost to ONNX: {e}")
        return False


def export_keras_to_onnx(model, output_path: str, input_shape: tuple) -> bool:
    """
    Export Keras/TensorFlow model to ONNX format

    Args:
        model: Trained Keras model
        output_path: Path to save ONNX model
        input_shape: Shape of input tensor (batch_size, ...)

    Returns:
        True if successful, False otherwise
    """
    try:
        import tf2onnx

        # Convert to ONNX
        model_proto, _ = tf2onnx.convert.from_keras(
            model,
            input_signature=[
                tf2onnx.tf.TensorSpec(input_shape, tf2onnx.tf.float32, name="input")
            ],
            opset=13,
        )

        # Save ONNX model
        onnx.save_model(model_proto, output_path)

        # Validate the model
        validate_onnx_model(output_path)

        print(f"Keras model exported to ONNX: {output_path}")
        return True

    except Exception as e:
        print(f"Error exporting Keras to ONNX: {e}")
        return False


def export_sklearn_to_onnx(
    model,
    output_path: str,
    initial_types: Optional[list] = None,
    n_features: Optional[int] = None,
) -> bool:
    """
    Export scikit-learn model to ONNX format

    Args:
        model: Trained scikit-learn model
        output_path: Path to save ONNX model
        initial_types: Initial types for ONNX conversion
        n_features: Number of input features

    Returns:
        True if successful, False otherwise
    """
    try:
        from skl2onnx import convert_sklearn
        from skl2onnx.common.data_types import FloatTensorType

        # Define initial types if not provided
        if initial_types is None:
            if n_features is None:
                raise ValueError("Either initial_types or n_features must be provided")
            initial_types = [("input", FloatTensorType([None, n_features]))]

        # Convert to ONNX
        onnx_model = convert_sklearn(model, initial_types=initial_types)

        # Save ONNX model
        onnx.save_model(onnx_model, output_path)

        # Validate the model
        validate_onnx_model(output_path)

        print(f"Scikit-learn model exported to ONNX: {output_path}")
        return True

    except Exception as e:
        print(f"Error exporting scikit-learn to ONNX: {e}")
        return False


def validate_onnx_model(model_path: str) -> bool:
    """
    Validate ONNX model

    Args:
        model_path: Path to ONNX model

    Returns:
        True if valid, False otherwise
    """
    try:
        # Load and check the model
        onnx_model = onnx.load(model_path)
        onnx.checker.check_model(onnx_model)
        print(f"ONNX model validated successfully: {model_path}")
        return True

    except Exception as e:
        print(f"ONNX model validation failed: {e}")
        return False


def test_onnx_inference(
    model_path: str,
    test_input: np.ndarray,
    expected_output: Optional[np.ndarray] = None,
    tolerance: float = 1e-5,
) -> bool:
    """
    Test ONNX model inference

    Args:
        model_path: Path to ONNX model
        test_input: Test input array
        expected_output: Expected output (for comparison)
        tolerance: Tolerance for output comparison

    Returns:
        True if inference successful, False otherwise
    """
    try:
        # Create ONNX Runtime session
        session = ort.InferenceSession(model_path)

        # Get input name
        input_name = session.get_inputs()[0].name

        # Run inference
        onnx_output = session.run(None, {input_name: test_input.astype(np.float32)})

        print(f"ONNX inference successful. Output shape: {onnx_output[0].shape}")

        # Compare with expected output if provided
        if expected_output is not None:
            diff = np.abs(onnx_output[0] - expected_output).max()
            if diff > tolerance:
                print(
                    f"Warning: Output difference exceeds tolerance: {diff} > {tolerance}"
                )
                return False
            else:
                print(f"Output matches expected (max diff: {diff:.2e})")

        return True

    except Exception as e:
        print(f"ONNX inference test failed: {e}")
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

        print(f"Model metadata saved to {output_path}")

    except Exception as e:
        print(f"Error saving model metadata: {e}")


def load_model_metadata(metadata_path: str) -> Dict[str, Any]:
    """
    Load model metadata from JSON

    Args:
        metadata_path: Path to metadata file

    Returns:
        Dictionary of metadata
    """
    try:
        with open(metadata_path, "r") as f:
            metadata = json.load(f)

        print(f"Model metadata loaded from {metadata_path}")
        return metadata

    except Exception as e:
        print(f"Error loading model metadata: {e}")
        return {}


def create_model_package(
    model_dir: str,
    model_files: Dict[str, str],
    metadata: Dict[str, Any],
    package_name: str,
):
    """
    Create a model package with all necessary files

    Args:
        model_dir: Directory containing model files
        model_files: Dictionary mapping file types to file paths
        metadata: Model metadata
        package_name: Name of the package
    """
    package_dir = Path(model_dir) / package_name
    package_dir.mkdir(exist_ok=True)

    # Copy model files
    for file_type, file_path in model_files.items():
        src = Path(file_path)
        dst = package_dir / src.name
        dst.write_bytes(src.read_bytes())
        print(f"Copied {file_type} to package: {dst}")

    # Save metadata
    metadata_path = package_dir / "metadata.json"
    save_model_metadata(str(metadata_path), metadata)

    print(f"Model package created: {package_dir}")
