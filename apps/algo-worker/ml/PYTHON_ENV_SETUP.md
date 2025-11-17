# Python ML Environment - Setup Complete ✅

## Environment Details

- **Location**: `apps/algo-worker/ml/venv/`
- **Python Version**: 3.13.5
- **Purpose**: Pure compute worker for model training (NO database/API access)
- **Architecture**: NestJS orchestrator → CSV export → Python training → ONNX models → NestJS inference

---

## Installed Packages

### Core Scientific Computing

- ✅ **numpy** 2.3.5
- ✅ **pandas** 2.3.3
- ✅ **scipy** 1.16.3

### Machine Learning Libraries

- ✅ **scikit-learn** 1.7.2
- ✅ **xgboost** 3.1.1

### Deep Learning

- ✅ **tensorflow** 2.20.0 (Python 3.13 compatible)
- ✅ **keras** 3.12.0

### Statistical Models

- ✅ **arch** 8.0.0 (GARCH models)
- ✅ **statsmodels** 0.14.5

### Technical Indicators

- ✅ **ta** 0.11.0 (pure computation, no data fetching)

### Model Persistence

- ✅ **joblib** 1.5.2
- ✅ **h5py** 3.15.1

### ONNX Export (Critical for TypeScript Integration)

- ✅ **onnx** 1.19.1
- ✅ **onnxruntime** 1.23.2
- ✅ **onnxmltools** 1.14.0
- ✅ **skl2onnx** 1.19.1

### Visualization

- ✅ **matplotlib** 3.10.7
- ✅ **seaborn** 0.13.2

---

## What's NOT Installed (By Design)

Per the unified architecture, these dependencies are **intentionally excluded**:

- ❌ **yfinance** - Use `@repo/market-sdk` in NestJS instead
- ❌ **pymongo** - Use `@repo/database` in NestJS instead
- ❌ **jupyter** - Can add if needed for experiments
- ❌ **python-dotenv** - NestJS handles all configuration
- ❌ **tf2onnx** - Has protobuf conflicts with TensorFlow 2.20

---

## Usage Pattern

### ✅ Correct Workflow

```typescript
// NestJS: Collect data via @repo/market-sdk
const marketData = await this.upstoxClient.getHistoricalData();

// NestJS: Engineer features (TypeScript)
const features = this.featureEngineer.compute(marketData);

// NestJS: Export to CSV for Python
await this.exportToCSV(features, '/tmp/training_data.csv');

// NestJS: Spawn Python training process
const result = await this.trainModel('xgboost', '/tmp/training_data.csv');

// Python: Train model and export ONNX
// - Read CSV
// - Train XGBoost
// - Export to ONNX
// - Exit

// NestJS: Load ONNX model for inference
const model = await this.modelLoader.load('/models/xgboost.onnx');
```

### ❌ Wrong Workflow (Don't Do This)

```python
# ❌ Python script directly accessing MongoDB
import pymongo
db = pymongo.MongoClient(...)  # WRONG! Use NestJS + @repo/database

# ❌ Python script directly fetching market data
import yfinance
data = yfinance.download(...)  # WRONG! Use NestJS + @repo/market-sdk

# ❌ Python script with environment variables
from dotenv import load_dotenv
load_dotenv()  # WRONG! NestJS handles config
```

---

## Activation

```bash
cd /home/anandhu/Code/investment-trading-portfolio/apps/algo-worker/ml
source venv/bin/activate
```

---

## Verification

All packages verified working:

```
✅ TensorFlow: 2.20.0
✅ Keras: 3.12.0
✅ XGBoost: 3.1.1
✅ scikit-learn: 1.7.2
✅ ONNX: 1.19.1
✅ ONNX Runtime: 1.23.2
```

---

## Next Steps

1. **Create Python Training Scripts**:
   - `ml/train_xgboost.py` - XGBoost classifier training
   - `ml/train_cnn_lstm.py` - CNN-LSTM hybrid training
   - `ml/train_ginn.py` - GARCH-Informed Neural Network
   - `ml/train_svm.py` - SVM classifier training
   - `ml/utils/onnx_export.py` - ONNX export utilities

2. **Create NestJS Data Infrastructure**:
   - `DataCollectionService` - Uses `@repo/market-sdk`
   - `FeatureEngineeringService` - TypeScript feature calculations
   - `TrainingDataService` - CSV export for Python
   - `ModelTrainingService` - Python process orchestration
   - `ModelLoaderService` - ONNX inference in TypeScript

3. **Implement TypeScript Inference Layer**:
   - `onnxruntime-node` integration
   - `SignalEngineService` - Pure TypeScript inference
   - Integration with `@repo/database` for persistence

---

## Notes

- **GPU Support**: CUDA drivers not found, using CPU-only (fine for training)
- **Protobuf Conflict**: tf2onnx not installed due to conflict with TensorFlow 2.20
  - Workaround: Use `keras.saving.save_model(format='onnx')` for Keras models
  - XGBoost/scikit-learn: Use `skl2onnx` and `onnxmltools` (working fine)
- **Python Version**: 3.13.5 is latest, all packages compatible

---

## File Structure

```
apps/algo-worker/ml/
├── venv/                      # Python virtual environment ✅
├── requirements.txt           # Full dependency list
├── requirements-base.txt      # Base ML packages
├── requirements-onnx.txt      # ONNX export packages
└── (training scripts TBD)
```
