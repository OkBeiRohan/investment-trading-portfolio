# Train Meta-Learner Pipeline

Train Level-1 stacking model (Logistic Regression) on Level-0 out-of-fold predictions.

---

## Purpose

Blend predictions from 5 base models using a Logistic Regression meta-learner trained on out-of-fold predictions to prevent data leakage.

---

## Stacking Strategy

**Level-0 Models** → **Out-of-Fold Predictions** → **Level-1 Meta-Learner**

```
XGBoost     → OOF Predictions (col 1)
CNN-LSTM    → OOF Predictions (col 2)
GINN        → OOF Predictions (col 3)
SVM         → OOF Predictions (col 4)
Transformer → OOF Predictions (col 5)
                    ↓
        Logistic Regression Meta-Learner
                    ↓
            Final Prediction
```

---

## Why Out-of-Fold?

**Problem**: If we use training set predictions, meta-learner overfits to Level-0 predictions

**Solution**: Use predictions on test sets from walk-forward validation (OOF)

**Example**:

```python
# WRONG: Meta-learner sees training predictions (overfits)
meta_input = np.column_stack([
    xgb.predict_proba(X_train)[:, 1],
    cnn.predict(X_train),
    ...
])

# CORRECT: Meta-learner sees OOF predictions (generalizes)
meta_input = np.column_stack([
    oof_xgboost,  # Predictions on test folds only
    oof_cnn_lstm,
    oof_ginn,
    oof_svm,
    oof_transformer,
])
```

---

## Implementation

### **1. Load OOF Predictions**

**Node**: `load_oof_predictions()`

```python
def load_oof_predictions():
    oof_xgboost = pd.read_parquet('data/07_model_output/oof_xgboost.parquet')
    oof_cnn_lstm = pd.read_parquet('data/07_model_output/oof_cnn_lstm.parquet')
    oof_ginn = pd.read_parquet('data/07_model_output/oof_ginn.parquet')
    oof_svm = pd.read_parquet('data/07_model_output/oof_svm.parquet')
    oof_transformer = pd.read_parquet('data/07_model_output/oof_transformer.parquet')

    meta_features = pd.concat([
        oof_xgboost, oof_cnn_lstm, oof_ginn, oof_svm, oof_transformer
    ], axis=1)

    return meta_features
```

---

### **2. Train Meta-Learner**

**Node**: `train_meta_learner(meta_features, labels)`

```python
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import TimeSeriesSplit

def train_meta_learner(meta_features, labels):
    # Use time-series cross-validation
    tscv = TimeSeriesSplit(n_splits=5)

    meta_model = LogisticRegression(
        C=1.0,
        penalty='l2',
        solver='lbfgs',
        max_iter=1000,
    )

    # Cross-validation
    cv_scores = []
    for train_idx, test_idx in tscv.split(meta_features):
        X_train, X_test = meta_features.iloc[train_idx], meta_features.iloc[test_idx]
        y_train, y_test = labels.iloc[train_idx], labels.iloc[test_idx]

        meta_model.fit(X_train, y_train)
        score = roc_auc_score(y_test, meta_model.predict_proba(X_test)[:, 1])
        cv_scores.append(score)

    # Train on full dataset
    meta_model.fit(meta_features, labels)

    return meta_model, np.mean(cv_scores)
```

---

## Model Weights

**Learned Coefficients**:

```python
meta_model.coef_
# Example: [0.25, 0.15, 0.20, 0.10, 0.30]
# XGBoost: 0.25, CNN-LSTM: 0.15, GINN: 0.20, SVM: 0.10, Transformer: 0.30
```

**Interpretation**: Transformer has highest weight (0.30), SVM lowest (0.10)

---

## MLflow Tracking

```python
with mlflow.start_run(run_name='meta_learner'):
    mlflow.log_param('C', 1.0)
    mlflow.log_param('penalty', 'l2')
    mlflow.log_metric('cv_auc_mean', np.mean(cv_scores))
    mlflow.log_metric('cv_auc_std', np.std(cv_scores))
    mlflow.sklearn.log_model(meta_model, 'meta_learner')
```

---

## Performance Targets

| Metric               | Target                      |
| -------------------- | --------------------------- |
| CV AUC (mean)        | >0.73                       |
| CV AUC (std)         | <0.05                       |
| Ensemble improvement | >3% over best Level-0 model |

---

## Parameters

**File**: `conf/base/parameters/meta_learner.yml`

```yaml
meta_learner:
  logistic_regression:
    C: 1.0
    penalty: "l2"
    solver: "lbfgs"
    max_iter: 1000
  cross_validation:
    n_splits: 5
```

---

## Run

```bash
kedro run --pipeline train_meta_learner
```

---

## Output

**Trained Model**: `data/06_models/meta_learner.pkl`

---

## Testing

**Unit Tests**:

```python
def test_meta_learner_training():
    meta_features = pd.DataFrame({
        'xgb': np.random.rand(1000),
        'cnn': np.random.rand(1000),
        'ginn': np.random.rand(1000),
        'svm': np.random.rand(1000),
        'transformer': np.random.rand(1000),
    })
    labels = np.random.randint(0, 2, 1000)

    meta_model, cv_auc = train_meta_learner(meta_features, labels)
    assert cv_auc > 0.5  # Better than random
```

---

## See Also

- [Train Ensemble Pipeline](./TRAIN_ENSEMBLE.md) - Level-0 model training
- [Export ONNX Pipeline](./EXPORT_ONNX.md) - Convert to ONNX format
