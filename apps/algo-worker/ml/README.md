# ML Training Infrastructure

This directory contains the complete machine learning training infrastructure for the algo-worker algorithmic trading system.

## 📁 Directory Structure

```
ml/
├── config/                    # Model configuration files (YAML)
│   ├── xgboost_config.yaml
│   ├── cnn_lstm_config.yaml
│   ├── ginn_config.yaml
│   ├── svm_config.yaml
│   └── stacking_config.yaml
├── training/                  # Training scripts
│   ├── train_xgboost.py
│   ├── train_cnn_lstm.py
│   ├── train_ginn.py
│   ├── train_svm.py
│   └── train_stacking.py
├── utils/                     # Utilities
│   ├── data_loader.py         # Data loading and preprocessing
│   ├── model_export.py        # ONNX export utilities
│   └── evaluation.py          # Metrics and visualization
└── requirements-base.txt      # Python dependencies
```

## 🎯 Training Pipeline Overview

### 1. **Data Preparation**

Training data should be exported from the NestJS `TrainingDataService` as:

```
data/exports/features_labeled.csv
```

The CSV must contain:

- `timestamp`: Timestamp of observation
- `target`: Binary label (1 = VOL_UP, 0 = VOL_DOWN)
- Feature columns: All engineered features from DataEngine

### 2. **Model Training Order**

Train models in this order:

#### **Level-0 Base Models** (train these first):

1. **XGBoost** - Baseline gradient boosting model

   ```bash
   python ml/training/train_xgboost.py
   ```

   - Output: `models/xgboost/xgboost_model.onnx`
   - Config: `ml/config/xgboost_config.yaml`

2. **CNN-LSTM** - Hybrid deep learning model

   ```bash
   python ml/training/train_cnn_lstm.py
   ```

   - Output: `models/cnn_lstm/cnn_lstm_model.onnx`
   - Config: `ml/config/cnn_lstm_config.yaml`

3. **GINN** - GARCH-Informed Neural Network

   ```bash
   python ml/training/train_ginn.py
   ```

   - Output: `models/ginn/lstm_model.onnx`
   - Config: `ml/config/ginn_config.yaml`

4. **SVM** - Support Vector Machine with RBF kernel
   ```bash
   python ml/training/train_svm.py
   ```

   - Output: `models/svm/svm_model.onnx`
   - Config: `ml/config/svm_config.yaml`

#### **Level-1 Meta-Model** (train this last):

5. **Stacking Ensemble** - Logistic regression meta-learner
   ```bash
   python ml/training/train_stacking.py
   ```

   - Output: `models/stacking/meta_model.onnx`
   - Config: `ml/config/stacking_config.yaml`
   - Requires: All Level-0 models must be trained first

## 🚀 Quick Start

### 1. Setup Python Environment

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r ml/requirements-base.txt
```

### 2. Export Training Data

From NestJS app:

```typescript
// Call TrainingDataService to export features
await trainingDataService.exportLabeledData(
  'data/exports/features_labeled.csv',
);
```

### 3. Train Models

```bash
# Train all Level-0 models
python ml/training/train_xgboost.py
python ml/training/train_cnn_lstm.py
python ml/training/train_ginn.py
python ml/training/train_svm.py

# Train Level-1 meta-model
python ml/training/train_stacking.py
```

### 4. Load Models in NestJS

Models are automatically loaded by `ModelLoaderService`:

```typescript
// app.module.ts already configured to load models on startup
// Models loaded from models/ directory
```

## ⚙️ Configuration

All hyperparameters are configured via YAML files in `ml/config/`.

### XGBoost Config Example

```yaml
# ml/config/xgboost_config.yaml
max_depth: 6
learning_rate: 0.03
n_estimators: 500
subsample: 0.8
threshold: 0.55
```

### CNN-LSTM Config Example

```yaml
# ml/config/cnn_lstm_config.yaml
model:
  sequence_length: 60
  cnn:
    filters: 64
    kernel_size: 3
  lstm:
    units: 50
    dropout: 0.2
```

## 📊 Model Architecture Details

### 1. XGBoost Classifier

- **Purpose**: High-performance baseline for heterogeneous features
- **Features**: All 25+ features from DataEngine
- **Cross-Validation**: 5-fold TimeSeriesSplit
- **Output**: Binary classification probabilities
- **Exports**: JSON, ONNX, feature importance plots

### 2. CNN-LSTM Hybrid

- **Architecture**:
  ```
  Input (60 timesteps × 25 features)
  → Conv1D (64 filters, kernel=3)
  → MaxPooling1D
  → LSTM (50 units)
  → Dense (32 → 16)
  → Output (sigmoid)
  ```
- **Purpose**: Extract local patterns + temporal dependencies
- **Training**: Early stopping, learning rate scheduling

### 3. GARCH-Informed Neural Network (GINN)

- **Two-Stage Hybrid**:
  1. **Stage 1**: GARCH(1,1) fitted to volatility series
  2. **Stage 2**: LSTM learns residual patterns
- **Output**: GARCH predictions + LSTM corrections
- **Purpose**: Capture both linear (GARCH) and non-linear (LSTM) volatility dynamics

### 4. Support Vector Machine (SVM)

- **Kernel**: RBF (Radial Basis Function)
- **Grid Search**: C=[0.1, 1, 10, 100], gamma=['scale', 'auto']
- **Feature Selection**: RFE to select top 15 features
- **Note**: Research shows SVMs produce **higher economic gains (Sharpe ratio)** despite lower accuracy

### 5. Stacking Ensemble (Meta-Learner)

- **Level-0 Models**: XGBoost, CNN-LSTM, GINN, SVM
- **Level-1 Model**: Logistic Regression
- **Training**: Out-of-fold predictions to avoid data leakage
- **Output**: Blended probability combining all base models

## 🔬 Data Utilities

### `data_loader.py`

```python
# Load and validate data
data = load_training_data('data/exports/features_labeled.csv')

# Time-series split (no shuffle!)
X_train, X_val, X_test, y_train, y_val, y_test = split_time_series(features, labels)

# Create sequences for LSTM (60 timesteps)
X_seq, y_seq = create_sequences(data, labels, sequence_length=60)

# Normalize features
X_norm, scaler = normalize_features(X, method='standard')

# Balance classes (handle imbalance)
X_balanced, y_balanced = balance_classes(X, y, method='oversample')
```

### `model_export.py`

```python
# Export XGBoost to ONNX
export_xgboost_to_onnx(model, 'models/xgboost/model.onnx', n_features=25)

# Export Keras to ONNX
export_keras_to_onnx(model, 'models/cnn_lstm/model.onnx', input_shape=(None, 60, 25))

# Export scikit-learn to ONNX
export_sklearn_to_onnx(model, 'models/svm/model.onnx', n_features=15)

# Test ONNX inference
test_onnx_inference('models/xgboost/model.onnx', X_sample)
```

### `evaluation.py`

```python
# Calculate metrics
metrics = calculate_metrics(y_true, y_pred_proba, threshold=0.55)
# Returns: accuracy, precision, recall, f1, auc

# Plot confusion matrix
plot_confusion_matrix(y_true, y_pred_proba, 'confusion_matrix.png')

# Plot ROC curve
plot_roc_curve(y_true, y_pred_proba, 'roc_curve.png')

# Plot feature importance
plot_feature_importance(model, feature_names, 'importance.png')

# Calculate trading metrics
sharpe = calculate_sharpe_ratio(returns)
sortino = calculate_sortino_ratio(returns)
max_dd = calculate_max_drawdown(equity_curve)
```

## 📈 Performance Metrics

### Classification Metrics

- **Accuracy**: Overall correctness
- **Precision**: Correct positive predictions / All positive predictions
- **Recall**: Correct positive predictions / All actual positives
- **F1 Score**: Harmonic mean of precision and recall
- **AUC-ROC**: Area under ROC curve

### Trading Metrics (Primary Targets)

- ✅ **Sharpe Ratio**: > 1.5 (Excellent: > 2.0)
- ✅ **Sortino Ratio**: > 2.0
- ✅ **Max Drawdown**: < 20% (Unacceptable: > 30%)
- ✅ **Calmar Ratio**: Return / Max Drawdown

> **⚠️ Important**: DO NOT optimize for classification accuracy alone!
> Focus on **risk-adjusted returns** (Sharpe/Sortino ratios).

## 🔄 Training Best Practices

### 1. Avoid Data Leakage

- ✅ Use `TimeSeriesSplit` (not K-Fold)
- ✅ Never shuffle time-series data
- ✅ Use out-of-fold predictions for stacking
- ✅ Features must be "as-of" timestamp (no look-ahead)

### 2. Model All Costs

```python
# Transaction costs (apply to EVERY trade)
brokerage = 20  # INR or 0.05% (whichever lower)
stt = 0.0625%   # Sell-side premium
exchange_fees = 0.053%
gst = 0.18%     # On (brokerage + fees)
```

### 3. Pessimistic Backtesting

```python
# Slippage for market orders
slippage_buy = price * (1 + 0.0005)   # Pay 0.05% above mid
slippage_sell = price * (1 - 0.0005)  # Receive 0.05% below mid

# Always model bid-ask spread
fill_buy = askPrice   # Pay the ask
fill_sell = bidPrice  # Receive the bid
```

### 4. Cross-Validation

```python
# Use walk-forward validation
from sklearn.model_selection import TimeSeriesSplit

tscv = TimeSeriesSplit(n_splits=5)
for train_idx, val_idx in tscv.split(X):
    # Train on [0:train_idx], validate on [train_idx:val_idx]
    pass
```

## 🐛 Troubleshooting

### Issue: Import Errors

```bash
# Solution: Install all dependencies
pip install -r ml/requirements-base.txt
```

### Issue: CUDA Out of Memory

```python
# Solution: Enable memory growth
gpus = tf.config.list_physical_devices('GPU')
for gpu in gpus:
    tf.config.experimental.set_memory_growth(gpu, True)

# Or reduce batch size in config
training:
  batch_size: 16  # Reduce from 32
```

### Issue: Stacking Fails - Base Models Not Found

```bash
# Solution: Train all Level-0 models first
python ml/training/train_xgboost.py
python ml/training/train_cnn_lstm.py
python ml/training/train_ginn.py
python ml/training/train_svm.py

# Then train stacking
python ml/training/train_stacking.py
```

### Issue: Data Not Found

```typescript
// Solution: Export data from NestJS first
await trainingDataService.exportLabeledData(
  'data/exports/features_labeled.csv',
);
```

## 📚 Research References

- **XGBoost**: Chen & Guestrin (2016) - "XGBoost: A Scalable Tree Boosting System"
- **CNN-LSTM**: Livieris et al. (2020) - "CNN-LSTM model for gold price forecasting"
- **GINN**: Hansen et al. (2021) - "GARCH-Informed Neural Networks"
- **SVM**: Tharwat (2020) - "SVM for financial prediction"
- **Stacking**: Wolpert (1992) - "Stacked Generalization"

## 🔗 Integration with NestJS

### Model Loading (Automatic)

```typescript
// app.module.ts
@Module({
  imports: [
    SignalEngineModule,  // Loads models on startup
  ]
})

// signal-engine/model-loader.service.ts
async loadModels() {
  this.xgboostSession = await ort.InferenceSession.create('models/xgboost/model.onnx');
  this.cnnLstmSession = await ort.InferenceSession.create('models/cnn_lstm/model.onnx');
  // ... load all models
}
```

### Running Inference

```typescript
// signal-engine/ensemble-inference.service.ts
async generateSignal(features: FeatureVector): Promise<TradingSignal> {
  // Load ONNX models and run inference
  const predictions = await this.runInference(features);

  return {
    prediction: predictions.class,
    confidence: predictions.probability,
    modelContributions: predictions.contributions
  };
}
```

## 📝 Next Steps

1. ✅ Train all 4 Level-0 models
2. ✅ Train Level-1 stacking meta-model
3. ⏳ Backtest strategies using trained models
4. ⏳ Deploy to production
5. ⏳ Monitor performance and retrain periodically

## 🤝 Contributing

When adding new models:

1. Create training script in `ml/training/`
2. Add config file in `ml/config/`
3. Update this README
4. Export to ONNX format
5. Add loader in NestJS `ModelLoaderService`

---

**Last Updated**: 2025-01-30
**Python Version**: 3.10+
**TensorFlow Version**: 2.20.0 (GPU-enabled)
