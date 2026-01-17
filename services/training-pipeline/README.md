# Training Pipeline

> **Kedro-based ML training pipeline with CPCV validation and ONNX export for production inference.**

[![Powered by Kedro](https://img.shields.io/badge/powered_by-kedro-ffc900?logo=kedro)](https://kedro.org)

**Last Updated**: January 18, 2026

---

## Purpose

The training pipeline is responsible for:

1. **Feature Engineering**: Process historical data from QuestDB
2. **Label Generation**: Multi-horizon labels (10s → EOD)
3. **Model Training**: With CPCV (Combinatorial Purged Cross-Validation)
4. **ONNX Export**: Convert PyTorch/LightGBM models for NestJS inference
5. **Model Registry**: Track experiments with MLflow

### What This Service Does

- ✅ Train ML models using historical features from QuestDB
- ✅ Validate models using walk-forward CPCV
- ✅ Export models to ONNX format for algo-worker
- ✅ Track experiments and metrics with MLflow
- ✅ Generate performance reports

### What This Service Should NOT Do

- ❌ Real-time inference (use algo-worker with ONNX Runtime)
- ❌ Feature computation (use compute-engine in Rust)
- ❌ Live trading decisions

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TRAINING PIPELINE (Python/Kedro)                     │
│                                                                              │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│   │ Data Ingestion  │ →  │ Feature Eng.    │ →  │ Label Gen.      │         │
│   │ (QuestDB)       │    │ (compute-engine)│    │ (Multi-horizon) │         │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                                    ↓                                         │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│   │ CPCV Validation │ ←  │ Model Training  │ →  │ ONNX Export     │         │
│   │                 │    │ (PyTorch/LGB)   │    │ (Quantized)     │         │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                                                          ↓                   │
│                                                  ┌─────────────────┐         │
│                                                  │ Model Registry  │         │
│                                                  │ (MLflow/MinIO)  │         │
│                                                  └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
                                                          ↓
                                                  algo-worker (NestJS)
                                                  loads ONNX models
```

---

## Dependencies

### Internal

| Package | Purpose |
|---------|---------|
| `compute-engine` | Used for historical feature computation |
| `@repo/database` | QuestDB connection for training data |

### External

| Library | Purpose |
|---------|---------|
| Kedro | Pipeline orchestration |
| PyTorch | Neural network training |
| LightGBM | Gradient boosting |
| ONNX | Model export format |
| onnxruntime | ONNX export and validation |
| MLflow | Experiment tracking |

---

## Quick Start

```bash
# 1. Navigate to training pipeline
cd services/training-pipeline

# 2. Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run training pipeline
kedro run

# 5. Run specific pipeline
kedro run --pipeline=training
kedro run --pipeline=export
```

---

## Pipelines

### 1. Data Pipeline

```bash
kedro run --pipeline=data
```

- Loads historical OHLCV data from QuestDB
- Computes features using compute-engine (via Python bindings or direct query)
- Generates multi-horizon labels

### 2. Training Pipeline

```bash
kedro run --pipeline=training
```

- Trains LightGBM, TFT, Mamba, Meta-learner models
- Uses CPCV for robust validation
- Logs metrics to MLflow

### 3. Export Pipeline

```bash
kedro run --pipeline=export
```

- Exports trained models to ONNX format
- Applies dynamic quantization for faster inference
- Validates ONNX models
- Uploads to model registry

---

## ONNX Export

### Supported Models

| Model | Framework | Export Method |
|-------|-----------|---------------|
| LightGBM | LightGBM | sklearn-onnx |
| TFT | PyTorch | torch.onnx.export |
| Mamba | PyTorch | torch.onnx.export |
| PatchTST | PyTorch | torch.onnx.export |
| Meta-Learner | PyTorch | torch.onnx.export |

### Export Code Example

```python
import torch
import onnx
from onnxruntime.quantization import quantize_dynamic

def export_to_onnx(model, path, input_shape):
    model.eval()
    dummy_input = torch.randn(*input_shape)
    
    torch.onnx.export(
        model,
        dummy_input,
        path,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch'}, 'output': {0: 'batch'}},
        opset_version=17,
    )
    
    # Quantize for faster inference
    quantize_dynamic(path, path.replace('.onnx', '_quantized.onnx'))
```

---

## Configuration

### Parameters (`conf/base/parameters.yml`)

```yaml
training:
  epochs: 100
  batch_size: 256
  learning_rate: 0.001
  early_stopping_patience: 10

cpcv:
  n_splits: 5
  n_test_splits: 2
  embargo_gap: 5  # minutes

export:
  output_path: "models/"
  quantize: true
  opset_version: 17

features:
  num_features: 33
  sequence_length: 100  # for TFT/Mamba
```

### Catalog (`conf/base/catalog.yml`)

```yaml
historical_features:
  type: pandas.ParquetDataset
  filepath: data/01_raw/features.parquet

trained_lightgbm:
  type: pickle.PickleDataset
  filepath: data/06_models/lightgbm.pkl

onnx_models:
  type: kedro_mlflow.io.artifacts.MlflowArtifactDataSet
  data_set:
    type: PartitionedDataset
    path: data/07_onnx/
    dataset: pickle.PickleDataset
```

---

## CPCV (Combinatorial Purged Cross-Validation)

CPCV prevents information leakage in time-series data:

```python
from cpcv import CombinatorialPurgedKFold

cv = CombinatorialPurgedKFold(
    n_splits=5,
    n_test_splits=2,
    embargo_td=pd.Timedelta(minutes=5)
)

for train_idx, test_idx in cv.split(X, y, timestamps):
    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]
    
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)
    # Evaluate...
```

---

## Outputs

| Output | Location | Consumer |
|--------|----------|----------|
| ONNX Models | `models/*.onnx` | algo-worker |
| Metrics | MLflow | Dashboard |
| Feature Importance | `reports/shap/` | Compliance |

---

## Documentation

- [ML Architecture](../../docs/ml/README.md) - AI/ML overview
- [TRAINING_PIPELINE.md](../../docs/ml/TRAINING_PIPELINE.md) - Detailed training docs
- [INFERENCE_PIPELINE.md](../../docs/ml/INFERENCE_PIPELINE.md) - ONNX inference in NestJS
- [Kedro Documentation](https://docs.kedro.org)

---

## Related Services

| Service | Relationship |
|---------|--------------|
| `compute-engine` | Provides features (historical and live) |
| `algo-worker` | Consumes ONNX models for live inference |
| `market-feeder` | Stores raw market data to QuestDB |

---

**Status**: Active Development  
**Technology**: Python 3.11+, Kedro, PyTorch, LightGBM, ONNX
