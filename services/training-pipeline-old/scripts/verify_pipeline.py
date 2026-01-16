"""
Verify training pipeline compilation and imports

This script validates that all training pipeline files:
1. Compile without syntax errors
2. Import successfully
3. Have proper structure
"""

import sys
from pathlib import Path

# Add src to path
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

print("=" * 80)
print("Training Pipeline Verification")
print("=" * 80)
print()

# Test 1: Compile all Python files
print("✓ Test 1: Syntax validation")
print("-" * 40)

import py_compile

test_files = [
    "training_pipeline/pipelines/train_ensemble/nodes.py",
    "training_pipeline/pipelines/train_ensemble/pipeline.py",
    "training_pipeline/pipelines/pipeline.py",
    "training_pipeline/utils/sql_loader.py",
    "training_pipeline/pipelines/train_ensemble/models/lightgbm_trainer.py",
    "training_pipeline/pipelines/train_ensemble/models/xgboost_trainer.py",
    "training_pipeline/pipelines/train_ensemble/models/cnn_lstm_trainer.py",
    "training_pipeline/pipelines/train_ensemble/models/ginn_trainer.py",
    "training_pipeline/pipelines/train_ensemble/models/svm_trainer.py",
    "training_pipeline/pipelines/train_ensemble/models/transformer_trainer.py",
    "training_pipeline/pipelines/train_ensemble/models/tft_trainer.py",
    "training_pipeline/pipelines/train_ensemble/models/lit_trainer.py",
]

for test_file in test_files:
    file_path = src_path / test_file
    try:
        py_compile.compile(str(file_path), doraise=True)
        print(f"  ✅ {test_file}")
    except py_compile.PyCompileError as e:
        print(f"  ❌ {test_file}: {e}")
        sys.exit(1)

print()

# Test 2: Import key modules
print("✓ Test 2: Import validation")
print("-" * 40)

try:
    from src.training_pipeline.utils.sql_loader import QuestDBLoader

    print("  ✅ QuestDBLoader")
    _ = QuestDBLoader  # Mark as used
except ImportError as e:
    print(f"  ❌ QuestDBLoader: {e}")
    sys.exit(1)

try:
    from src.training_pipeline.pipelines.train_ensemble.models.lightgbm_trainer import (
        LightGBMTrainer,
    )

    print("  ✅ LightGBMTrainer")
    _l = LightGBMTrainer  # Mark as used
except ImportError as e:
    print(f"  ❌ LightGBMTrainer: {e}")
    sys.exit(1)

# Test placeholder trainers
placeholder_trainers = [
    ("XGBoost", "xgboost_trainer", "XGBoostTrainer"),
    ("CNN-LSTM", "cnn_lstm_trainer", "CNNLSTMTrainer"),
    ("GINN", "ginn_trainer", "GINNTrainer"),
    ("SVM", "svm_trainer", "SVMTrainer"),
    ("Transformer", "transformer_trainer", "TransformerTrainer"),
    ("TFT", "tft_trainer", "TFTTrainer"),
    ("LiT", "lit_trainer", "LiTTrainer"),
]

for name, module_name, class_name in placeholder_trainers:
    try:
        module = __import__(
            f"training_pipeline.pipelines.train_ensemble.models.{module_name}",
            fromlist=[class_name],
        )
        trainer_class = getattr(module, class_name)
        print(f"  ✅ {name}Trainer")
    except (ImportError, AttributeError) as e:
        print(f"  ❌ {name}Trainer: {e}")
        sys.exit(1)

print()

# Test 3: Validate function signatures
print("✓ Test 3: Function signature validation")
print("-" * 40)

try:
    from src.training_pipeline.pipelines.train_ensemble import nodes

    # Check that key functions exist
    assert hasattr(nodes, "load_training_data"), "Missing load_training_data()"
    assert hasattr(nodes, "train_lightgbm"), "Missing train_lightgbm()"
    assert hasattr(nodes, "train_xgboost"), "Missing train_xgboost()"
    assert hasattr(nodes, "train_cnn_lstm"), "Missing train_cnn_lstm()"
    assert hasattr(nodes, "train_ginn"), "Missing train_ginn()"
    assert hasattr(nodes, "train_svm"), "Missing train_svm()"
    assert hasattr(nodes, "train_transformer"), "Missing train_transformer()"
    assert hasattr(nodes, "train_tft"), "Missing train_tft()"
    assert hasattr(nodes, "train_lit"), "Missing train_lit()"

    print("  ✅ load_training_data()")
    print("  ✅ train_lightgbm()")
    print("  ✅ train_xgboost()")
    print("  ✅ train_cnn_lstm()")
    print("  ✅ train_ginn()")
    print("  ✅ train_svm()")
    print("  ✅ train_transformer()")
    print("  ✅ train_tft()")
    print("  ✅ train_lit()")

except (ImportError, AssertionError) as e:
    print(f"  ❌ Function validation failed: {e}")
    sys.exit(1)

print()

# Test 4: Validate placeholder behavior
print("✓ Test 4: Placeholder behavior validation")
print("-" * 40)

# Test that placeholder trainers raise NotImplementedError
import pandas as pd

for name, module_name, class_name in placeholder_trainers:
    try:
        module = __import__(
            f"training_pipeline.pipelines.train_ensemble.models.{module_name}",
            fromlist=[class_name],
        )
        trainer_class = getattr(module, class_name)
        trainer = trainer_class()

        # Try to train (should raise NotImplementedError)
        dummy_data = pd.DataFrame({"col1": [1, 2, 3]})
        dummy_labels = pd.Series([0, 1, 0])

        try:
            trainer.train(dummy_data, dummy_labels)
            print(f"  ❌ {name}Trainer should raise NotImplementedError")
            sys.exit(1)
        except NotImplementedError:
            print(f"  ✅ {name}Trainer correctly raises NotImplementedError")

    except Exception as e:
        print(f"  ❌ {name}Trainer test failed: {e}")
        sys.exit(1)

print()

# Summary
print("=" * 80)
print("✅ ALL TESTS PASSED")
print("=" * 80)
print()
print("Training pipeline is ready for:")
print("  • Compute-engine MSE implementation (33 features)")
print("  • QuestDB population with historical data")
print("  • End-to-end LightGBM training")
print("  • Placeholder trainer implementation")
print()
