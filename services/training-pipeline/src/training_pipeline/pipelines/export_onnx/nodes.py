# src/training_pipeline/pipelines/export_onnx/nodes.py
import torch
import onnx
import onnxruntime as ort
from pathlib import Path
from typing import Any


def export_pytorch_to_onnx(
    model: torch.nn.Module,
    model_name: str,
    input_shape: tuple,
    output_path: Path,
    opset_version: int = 17,
    optimize: bool = True,
) -> str:
    """
    Export PyTorch model to ONNX format
    """
    # Set model to eval mode
    model.eval()

    # Create dummy input
    dummy_input = torch.randn(1, *input_shape)

    # Export to ONNX
    onnx_path = output_path / f"{model_name}.onnx"

    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_path),
        dynamo=True,  # Use torch.export (PyTorch 2.5+)
        opset_version=opset_version,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
        optimize=optimize,
        verify=True,
    )

    # Verify with ONNX Runtime
    ort_sess = ort.InferenceSession(str(onnx_path))
    ort_inputs = {"input": dummy_input.cpu().numpy()}
    ort_outputs = ort_sess.run(None, ort_inputs)

    # Check GPU support
    providers = ort.get_available_providers()
    gpu_available = "CUDAExecutionProvider" in providers

    print(f"✅ Exported {model_name} to {onnx_path}")
    print(f"📊 Providers: {providers}")
    print(f"🚀 GPU Available: {gpu_available}")

    return str(onnx_path)


def export_sklearn_to_onnx(
    model: Any, model_name: str, initial_types: list, output_path: Path
) -> str:
    """
    Export sklearn model (XGBoost, SVM, etc.) to ONNX
    """
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType

    onnx_path = output_path / f"{model_name}.onnx"

    # Convert to ONNX
    onnx_model = convert_sklearn(model, initial_types=initial_types, target_opset=17)

    # Save
    with open(onnx_path, "wb") as f:
        f.write(onnx_model.SerializeToString())

    # Verify
    onnx.checker.check_model(str(onnx_path))

    print(f"✅ Exported {model_name} to {onnx_path}")

    return str(onnx_path)
