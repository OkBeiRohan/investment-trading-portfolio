# Train Ensemble Pipeline

Train Level-0 base models using walk-forward validation.

---

## Purpose

Train 5 base models (XGBoost, CNN-LSTM, GINN, SVM, Transformer) independently using walk-forward validation to prevent lookahead bias.

---

## Walk-Forward Validation

**Strategy**: Expanding window with rolling test set

```
Train: [----6 months----] | Test: [-1 month-]
       [------7 months-------] | Test: [-1 month-]
       [--------8 months---------] | Test: [-1 month-]
                   ... (12 folds for 2-year dataset)
```

**Implementation**:

```python
from sklearn.model_selection import TimeSeriesSplit

tscv = TimeSeriesSplit(n_splits=12, test_size=30*375)  # 30 days * 375 ticks/day

for train_idx, test_idx in tscv.split(features):
    X_train, X_test = features.iloc[train_idx], features.iloc[test_idx]
    y_train, y_test = labels.iloc[train_idx], labels.iloc[test_idx]

    model.fit(X_train, y_train)
    predictions = model.predict(X_test)
    oof_predictions[test_idx] = predictions  # Save for meta-learner
```

---

## Models

### **1. XGBoost Classifier**

**File**: `src/training_pipeline/pipelines/train_ensemble/models/xgboost_trainer.py`

**Hyperparameters**:

```python
{
    'max_depth': 6,
    'learning_rate': 0.01,
    'n_estimators': 1000,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'gamma': 0.1,
    'early_stopping_rounds': 50,
    'eval_metric': 'auc',
}
```

**Target AUC**: >0.70 (test set)

---

### **2. CNN-LSTM Hybrid**

**File**: `src/training_pipeline/pipelines/train_ensemble/models/cnn_lstm_trainer.py`

**Architecture**:

```python
model = Sequential([
    Conv1D(64, kernel_size=3, activation='relu', input_shape=(60, 50)),
    MaxPooling1D(pool_size=2),
    LSTM(128, return_sequences=False),
    Dropout(0.3),
    Dense(64, activation='relu'),
    Dense(1, activation='sigmoid'),
])
```

**Training**:

```python
model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['AUC'])
model.fit(X_train, y_train, epochs=50, batch_size=32, validation_split=0.2)
```

**Target AUC**: >0.68 (test set)

---

### **3. GINN (GARCH-Informed Neural Network)**

**File**: `src/training_pipeline/pipelines/train_ensemble/models/ginn_trainer.py`

**Two-Stage Training**:

**Stage 1: GARCH(1,1)**

```python
from arch import arch_model

model = arch_model(returns, vol='Garch', p=1, q=1)
garch_fit = model.fit()
volatility = garch_fit.conditional_volatility
residuals = returns / volatility
```

**Stage 2: LSTM on Residuals**

```python
lstm = Sequential([
    LSTM(64, input_shape=(60, 50)),
    Dense(32, activation='relu'),
    Dense(1, activation='sigmoid'),
])
lstm.fit(residuals, labels)
```

**Target AUC**: >0.69 (test set)

---

### **4. SVM (Support Vector Machine)**

**File**: `src/training_pipeline/pipelines/train_ensemble/models/svm_trainer.py`

**Hyperparameters**:

```python
from sklearn.svm import SVC
from sklearn.model_selection import GridSearchCV

param_grid = {
    'C': [0.1, 1, 10],
    'gamma': ['scale', 'auto', 0.01, 0.1],
    'kernel': ['rbf'],
}

svm = SVC(probability=True, class_weight='balanced')
grid = GridSearchCV(svm, param_grid, cv=5, scoring='roc_auc')
grid.fit(X_train, y_train)
```

**Target AUC**: >0.67 (test set)

---

### **5. Transformer Encoder**

**File**: `src/training_pipeline/pipelines/train_ensemble/models/transformer_trainer.py`

**Architecture**:

```python
from tensorflow.keras.layers import MultiHeadAttention, LayerNormalization

def transformer_block(inputs, embed_dim, num_heads, ff_dim):
    attn_output = MultiHeadAttention(num_heads=num_heads, key_dim=embed_dim)(inputs, inputs)
    attn_output = LayerNormalization(epsilon=1e-6)(inputs + attn_output)
    ff_output = Dense(ff_dim, activation='relu')(attn_output)
    ff_output = Dense(embed_dim)(ff_output)
    return LayerNormalization(epsilon=1e-6)(attn_output + ff_output)

inputs = Input(shape=(60, 50))
x = transformer_block(inputs, embed_dim=256, num_heads=8, ff_dim=512)
x = GlobalAveragePooling1D()(x)
outputs = Dense(1, activation='sigmoid')(x)

model = Model(inputs=inputs, outputs=outputs)
```

**Target AUC**: >0.70 (test set)

---

## MLflow Tracking

**Log Parameters, Metrics, Models**:

```python
import mlflow

with mlflow.start_run(run_name='xgboost_fold_1'):
    mlflow.log_params(hyperparameters)
    mlflow.log_metric('train_auc', train_auc)
    mlflow.log_metric('test_auc', test_auc)
    mlflow.sklearn.log_model(model, 'xgboost')
```

**View Results**:

```bash
mlflow ui
# Opens at http://localhost:5000
```

---

## Out-of-Fold Predictions

**Save for Meta-Learner**:

```python
# Save predictions on test set from each fold
oof_predictions = np.zeros(len(features))

for fold, (train_idx, test_idx) in enumerate(tscv.split(features)):
    model.fit(X_train, y_train)
    oof_predictions[test_idx] = model.predict_proba(X_test)[:, 1]

# Save to data/07_model_output/oof_xgboost.parquet
pd.DataFrame({'oof_xgboost': oof_predictions}).to_parquet('data/07_model_output/oof_xgboost.parquet')
```

---

## Parameters

**File**: `conf/base/parameters/ensemble.yml`

```yaml
ensemble:
  walk_forward:
    n_splits: 12
    test_size_days: 30
  xgboost:
    max_depth: 6
    learning_rate: 0.01
    n_estimators: 1000
  cnn_lstm:
    conv_filters: 64
    lstm_units: 128
    epochs: 50
  ginn:
    garch_p: 1
    garch_q: 1
    lstm_units: 64
  svm:
    C: [0.1, 1, 10]
    gamma: ["scale", "auto"]
  transformer:
    num_heads: 8
    embed_dim: 256
    ff_dim: 512
```

---

## Run

```bash
kedro run --pipeline train_ensemble
```

---

## Output

**Trained Models**: `data/06_models/*.pkl`
**OOF Predictions**: `data/07_model_output/oof_*.parquet`

---

## Testing

**Unit Tests**:

```python
def test_xgboost_training():
    model = train_xgboost(X_train, y_train, hyperparams)
    preds = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, preds)
    assert auc > 0.65
```
