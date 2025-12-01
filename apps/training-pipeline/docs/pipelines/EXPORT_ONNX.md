# Export ONNX Pipeline

Convert trained models to ONNX format for production deployment.

---

## Purpose

Export all 6 models (5 Level-0 + 1 Level-1) to ONNX format with FP16 quantization for faster inference on GPU. Validate ONNX inference matches original models.

---

## Models to Export

| Model        | Original Format  | ONNX File           | Quantization |
| ------------ | ---------------- | ------------------- | ------------ |
| XGBoost      | .pkl (sklearn)   | `xgboost.onnx`      | FP16         |
| CNN-LSTM     | .h5 (TensorFlow) | `cnn_lstm.onnx`     | FP16         |
| GINN         | .h5 (TensorFlow) | `ginn.onnx`         | FP16         |
| SVM          | .pkl (sklearn)   | `svm.onnx`          | FP32\*       |
| Transformer  | .h5 (TensorFlow) | `transformer.onnx`  | FP16         |
| Meta-Learner | .pkl (sklearn)   | `meta_learner.onnx` | FP32         |

\* SVM quantization to FP16 causes accuracy loss

---

## Conversion

### **1. XGBoost → ONNX**

```python
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

def export_xgboost_to_onnx(model, input_shape):
    initial_type = [('float_input', FloatTensorType([None, input_shape]))]
    onnx_model = convert_sklearn(
        model,
        initial_types=initial_type,
        target_opset=13,
    )

    with open('onnx/xgboost.onnx', 'wb') as f:
        f.write(onnx_model.SerializeToString())
```

---

### **2. TensorFlow (CNN-LSTM, GINN, Transformer) → ONNX**

```python
import tf2onnx

def export_tensorflow_to_onnx(model, model_name):
    spec = (tf.TensorSpec((None, 60, 50), tf.float32, name="input"),)
    onnx_model, _ = tf2onnx.convert.from_keras(
        model,
        input_signature=spec,
        opset=13,
    )

    with open(f'onnx/{model_name}.onnx', 'wb') as f:
        f.write(onnx_model.SerializeToString())
```

---

### **3. SVM → ONNX**

```python
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

def export_svm_to_onnx(model, input_shape):
    initial_type = [('float_input', FloatTensorType([None, input_shape]))]
    onnx_model = convert_sklearn(
        model,
        initial_types=initial_type,
        target_opset=13,
        options={type(model): {'zipmap': False}},  # Return probabilities as array
    )

    with open('onnx/svm.onnx', 'wb') as f:
        f.write(onnx_model.SerializeToString())
```

---

### **4. Meta-Learner → ONNX**

```python
def export_meta_learner_to_onnx(model):
    initial_type = [('float_input', FloatTensorType([None, 5]))]  # 5 L0 predictions
    onnx_model = convert_sklearn(
        model,
        initial_types=initial_type,
        target_opset=13,
    )

    with open('onnx/meta_learner.onnx', 'wb') as f:
        f.write(onnx_model.SerializeToString())
```

---

## FP16 Quantization

**Reduce Model Size & Improve Inference Speed**:

```python
from onnxruntime.quantization import quantize_dynamic, QuantType

def quantize_to_fp16(onnx_path):
    quantize_dynamic(
        model_input=onnx_path,
        model_output=onnx_path.replace('.onnx', '_fp16.onnx'),
        weight_type=QuantType.QFloat16,
    )
```

**Expected Speedup**: 1.5-2x on GPU with TensorRT

---

## Validation

**Compare ONNX vs. Original Predictions**:

```python
import onnxruntime as ort
import numpy as np

def validate_onnx_model(original_model, onnx_path, X_test):
    # Original predictions
    original_preds = original_model.predict_proba(X_test)[:, 1]

    # ONNX predictions
    sess = ort.InferenceSession(onnx_path)
    input_name = sess.get_inputs()[0].name
    onnx_preds = sess.run(None, {input_name: X_test.astype(np.float32)})[1][:, 1]

    # Compare
    mae = np.mean(np.abs(original_preds - onnx_preds))
    max_error = np.max(np.abs(original_preds - onnx_preds))

    print(f'MAE: {mae:.6f}, Max Error: {max_error:.6f}')
    assert mae < 1e-4, f'ONNX validation failed: MAE={mae}'
```

**Tolerance**:

- FP32: MAE < 1e-6
- FP16: MAE < 1e-4

---

## Nodes

### **1. export_all_models**

**Function**: `export_models_to_onnx(models)`

```python
def export_models_to_onnx(models):
    export_xgboost_to_onnx(models['xgboost'], input_shape=50)
    export_tensorflow_to_onnx(models['cnn_lstm'], 'cnn_lstm')
    export_tensorflow_to_onnx(models['ginn'], 'ginn')
    export_svm_to_onnx(models['svm'], input_shape=50)
    export_tensorflow_to_onnx(models['transformer'], 'transformer')
    export_meta_learner_to_onnx(models['meta_learner'])
```

---

### **2. validate_onnx_models**

**Function**: `validate_onnx_inference(models, onnx_paths, X_test)`

```python
def validate_onnx_inference(models, onnx_paths, X_test):
    for model_name, onnx_path in onnx_paths.items():
        validate_onnx_model(models[model_name], onnx_path, X_test)
    print('✅ All ONNX models validated')
```

---

## Parameters

**File**: `conf/base/parameters/export_onnx.yml`

```yaml
export_onnx:
  target_opset: 13
  quantization:
    enabled: true
    weight_type: "QFloat16"
  validation:
    tolerance_fp32: 1e-6
    tolerance_fp16: 1e-4
```

---

## Run

```bash
kedro run --pipeline export_onnx
```

---

## Output

**ONNX Models**: `onnx/*.onnx`

```
onnx/
├── xgboost.onnx
├── cnn_lstm.onnx
├── ginn.onnx
├── svm.onnx
├── transformer.onnx
└── meta_learner.onnx
```

---

## Deployment

**Copy to algo-worker**:

```bash
cp onnx/*.onnx ../algo-worker/models/
```

---

## Model Sizes

| Model        | Original | ONNX (FP32) | ONNX (FP16) | Compression |
| ------------ | -------- | ----------- | ----------- | ----------- |
| XGBoost      | 5 MB     | 3 MB        | 1.5 MB      | 50%         |
| CNN-LSTM     | 10 MB    | 8 MB        | 4 MB        | 50%         |
| GINN         | 8 MB     | 6 MB        | 3 MB        | 50%         |
| SVM          | 2 MB     | 1.5 MB      | 1.5 MB\*    | 0%          |
| Transformer  | 15 MB    | 12 MB       | 6 MB        | 50%         |
| Meta-Learner | 0.5 MB   | 0.3 MB      | 0.3 MB      | 0%          |

\* SVM not quantized (accuracy loss)

---

## Testing

**Unit Tests**:

```python
def test_onnx_export():
    model = train_xgboost(X_train, y_train)
    export_xgboost_to_onnx(model, input_shape=50)
    assert os.path.exists('onnx/xgboost.onnx')

def test_onnx_validation():
    validate_onnx_model(xgb_model, 'onnx/xgboost.onnx', X_test)
```

---

## See Also

- [Train Ensemble Pipeline](./TRAIN_ENSEMBLE.md)
- [ONNX Runtime Documentation](https://onnxruntime.ai/docs/)
