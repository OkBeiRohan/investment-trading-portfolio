# Train Ensemble Pipeline

Train Level-0 base models using walk-forward validation.

---

## Purpose

Train 6-8 base models (core: XGBoost, LightGBM, CNN-LSTM, GINN, SVM, Transformer; optional: TimesNet-MLP, WFTNet-MLP) independently using walk-forward validation to prevent lookahead bias.

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

### **2. LightGBM Classifier**

**File**: `src/training_pipeline/pipelines/train_ensemble/models/lightgbm_trainer.py`

**Hyperparameters**:

```python
{
    'boosting_type': 'gbdt',
    'num_leaves': 31,
    'max_depth': -1,
    'learning_rate': 0.01,
    'n_estimators': 1000,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'reg_alpha': 0.1,
    'reg_lambda': 0.1,
    'early_stopping_rounds': 50,
    'metric': 'auc',
}
```

**Training**:

```python
import lightgbm as lgb

lgb_train = lgb.Dataset(X_train, y_train)
lgb_val = lgb.Dataset(X_val, y_val, reference=lgb_train)

model = lgb.train(
    params,
    lgb_train,
    valid_sets=[lgb_train, lgb_val],
    callbacks=[lgb.early_stopping(50), lgb.log_evaluation(100)]
)
```

**Target AUC**: >0.74 (test set)

**Benefits over XGBoost**:

- Faster training (3-5x)
- Lower memory usage
- Better with categorical features
- Histogram-based tree construction

---

### **3. CNN-LSTM Hybrid**

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

### **4. GINN (GARCH-Informed Neural Network)**

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

### **5. SVM (Support Vector Machine)**

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

### **6. Transformer Encoder**

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

### **7. TimesNet-Enhanced MLP** (Optional)

**File**: `src/training_pipeline/pipelines/train_ensemble/models/timesnet_mlp_trainer.py`

**Prerequisites**: Pre-trained TimesNet feature extractor (see TRAIN_FEATURE_EXTRACTOR.md)

**Architecture**:

```python
class TimesNetMLP:
    def __init__(self, timesnet_path='models/timesnet.pkl'):
        # Load frozen TimesNet
        self.timesnet = torch.load(timesnet_path)
        self.timesnet.eval()

        # MLP classifier
        self.mlp = nn.Sequential(
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        with torch.no_grad():
            features = self.timesnet(x)  # Extract features (freeze)
        return self.mlp(features)
```

**Training**:

```python
# Extract features once
with torch.no_grad():
    X_train_features = timesnet_mlp.timesnet(X_train)
    X_test_features = timesnet_mlp.timesnet(X_test)

# Train only MLP
optimizer = torch.optim.Adam(timesnet_mlp.mlp.parameters(), lr=1e-3)
for epoch in range(50):
    optimizer.zero_grad()
    outputs = timesnet_mlp.mlp(X_train_features)
    loss = F.binary_cross_entropy(outputs, y_train)
    loss.backward()
    optimizer.step()
```

**Target AUC**: >0.73 (test set)

**When to Use**:

- You have pre-trained TimesNet from feature extraction pipeline
- 2+ years of historical data
- Target >2% AUC improvement over base models

---

### **8. WFTNet-Enhanced MLP** (Optional)

**File**: `src/training_pipeline/pipelines/train_ensemble/models/wftnet_mlp_trainer.py`

**Prerequisites**: Pre-trained WFTNet feature extractor

Similar architecture to TimesNet-MLP but uses WFTNet wavelet-based features.

**Target AUC**: >0.72 (test set)

**When to Use**:

- High-frequency data with strong frequency patterns
- Pre-trained WFTNet available
- Computational resources for wavelet transforms

---

## Model Performance Targets

| Model        | Train AUC | Test AUC | Inference Time |
| ------------ | --------- | -------- | -------------- |
| XGBoost      | >0.75     | >0.70    | <10ms          |
| LightGBM     | >0.74     | >0.69    | <8ms           |
| CNN-LSTM     | >0.72     | >0.68    | <30ms          |
| GINN         | >0.73     | >0.69    | <25ms          |
| SVM          | >0.71     | >0.67    | <15ms          |
| Transformer  | >0.74     | >0.70    | <40ms          |
| TimesNet-MLP | >0.73     | >0.69    | <20ms          |
| WFTNet-MLP   | >0.72     | >0.68    | <18ms          |

**Core Ensemble Target** (6 models): Test AUC >0.75, Sharpe Ratio >1.5
**Extended Ensemble Target** (8 models): Test AUC >0.77, Sharpe Ratio >1.6

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
# Train core ensemble (6 models: XGBoost, LightGBM, CNN-LSTM, GINN, SVM, Transformer)
kedro run --pipeline train_ensemble

# Train extended ensemble (8 models: includes TimesNet-MLP, WFTNet-MLP)
kedro run --pipeline train_ensemble --params use_feature_extractors:true
```

---

## Output

**Trained Models**:

- `data/06_models/xgboost.pkl`
- `data/06_models/lightgbm.pkl`
- `data/06_models/cnn_lstm.pkl`
- `data/06_models/ginn.pkl`
- `data/06_models/svm.pkl`
- `data/06_models/transformer.pkl`
- `data/06_models/timesnet_mlp.pkl` (optional)
- `data/06_models/wftnet_mlp.pkl` (optional)

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
