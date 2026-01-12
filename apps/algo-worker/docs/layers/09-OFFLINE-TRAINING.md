# Layer 9: Offline Training & Deployment

**Purpose**: ML model training, backtesting, and versioned model deployment

---

## Overview

The Offline Training layer is implemented in the `training-pipeline` service (separate from live algo-worker). Handles data preparation, model training, walk-forward validation, and ONNX export for production deployment.

---

## Components

### Training Pipeline (Kedro)

- Data ingestion from QuestDB/MongoDB
- Feature engineering
- Model training (ensemble)
- Walk-forward validation
- ONNX export

### Backtesting Engine

- Historical simulation
- Transaction cost modeling
- Performance metrics (Sharpe, Sortino, MDD)

### Model Registry (MLflow)

- Experiment tracking
- Model versioning
- Artifact storage
- A/B test management

---

## Training Workflow

```
┌─────────────────────────────────────────────┐
│ 1. Data Ingestion                           │
│    - Fetch ticks from QuestDB               │
│    - Fetch signals from MongoDB             │
│    - Join features with labels              │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 2. Feature Engineering                      │
│    - Technical indicators                   │
│    - Microstructure features                │
│    - Option Greeks                          │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 3. Walk-Forward Validation                  │
│    - Combinatorial Purged CV (CPCV)         │
│    - Purging + Embargoing                   │
│    - Out-of-fold predictions                │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 4. Model Training (Ensemble)                │
│    - XGBoost, LightGBM                      │
│    - CNN-LSTM, Transformer                  │
│    - GINN, SVM                              │
│    - Optional: TimesNet, WFTNet, KAN        │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 5. Meta-Learner Training                    │
│    - Stack Level-0 OOF predictions          │
│    - Train Level-1 XGBoost                  │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 6. Backtesting                              │
│    - Simulate trades on test set            │
│    - Model transaction costs                │
│    - Compute Sharpe, Sortino, MDD           │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 7. ONNX Export                              │
│    - Convert to ONNX format                 │
│    - FP16 quantization                      │
│    - Validation (ONNX vs original)          │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 8. Model Registry (MLflow)                  │
│    - Log metrics (AUC, Sharpe)              │
│    - Register model artifact                │
│    - Tag version (production/staging)       │
└─────────────────────────────────────────────┘
```

---

## Combinatorial Purged Cross-Validation

```python
from sklearn.model_selection import TimeSeriesSplit

def cpcv_split(
    features: pd.DataFrame,
    labels: pd.Series,
    n_splits: int = 12,
    purge_window: int = 375,  # 1 day @ 1s candles
    embargo_window: int = 375,
):
    """
    Combinatorial Purged Cross-Validation

    Prevents temporal leakage by:
    1. Expanding training window (not shuffled)
    2. Purging data between train/test
    3. Embargoing data after test
    """
    tscv = TimeSeriesSplit(n_splits=n_splits)

    for train_idx, test_idx in tscv.split(features):
        # Purge: Remove data immediately before test set
        purged_train_idx = train_idx[train_idx < test_idx[0] - purge_window]

        # Embargo: Remove data immediately after test set
        embargoed_test_idx = test_idx[test_idx < len(features) - embargo_window]

        X_train = features.iloc[purged_train_idx]
        y_train = labels.iloc[purged_train_idx]
        X_test = features.iloc[embargoed_test_idx]
        y_test = labels.iloc[embargoed_test_idx]

        yield X_train, X_test, y_train, y_test
```

---

## Model Training (XGBoost Example)

```python
import xgboost as xgb
from sklearn.metrics import roc_auc_score
import mlflow

def train_xgboost(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    parameters: dict,
) -> xgb.XGBClassifier:
    """Train XGBoost with CPCV"""

    with mlflow.start_run(run_name='xgboost_fold'):
        # Log hyperparameters
        mlflow.log_params(parameters)

        # Train model
        model = xgb.XGBClassifier(
            max_depth=parameters['max_depth'],
            learning_rate=parameters['learning_rate'],
            n_estimators=parameters['n_estimators'],
            objective='binary:logistic',
            eval_metric='auc',
            tree_method='gpu_hist',  # GPU training
            gpu_id=0,
        )

        model.fit(
            X_train,
            y_train,
            eval_set=[(X_test, y_test)],
            early_stopping_rounds=50,
            verbose=False,
        )

        # Evaluate
        y_pred_proba = model.predict_proba(X_test)[:, 1]
        auc = roc_auc_score(y_test, y_pred_proba)

        # Log metrics
        mlflow.log_metric('test_auc', auc)
        mlflow.log_metric('best_iteration', model.best_iteration)

        # Save model
        mlflow.sklearn.log_model(model, 'xgboost')

        return model
```

---

## Backtesting with Transaction Costs

```python
def backtest_strategy(
    predictions: np.ndarray,
    actual: np.ndarray,
    prices: pd.Series,
    threshold: float = 0.6,
    transaction_cost: float = 0.002,  # 0.2%
    slippage: float = 0.0005,         # 0.05%
) -> dict:
    """Backtest with realistic costs"""

    equity = [100000]  # Start with ₹100k
    positions = []

    for i in range(len(predictions)):
        # Generate signal
        signal = 1 if predictions[i] > threshold else 0

        if signal == 1:
            # Enter position
            if actual[i] == 1:
                # Correct prediction
                return_pct = 0.05 - transaction_cost - slippage
            else:
                # Wrong prediction
                return_pct = -0.05 - transaction_cost - slippage

            equity.append(equity[-1] * (1 + return_pct))
            positions.append(1)
        else:
            # Stay flat
            equity.append(equity[-1])
            positions.append(0)

    # Compute metrics
    returns = np.diff(equity) / equity[:-1]

    metrics = {
        'total_return': (equity[-1] - equity[0]) / equity[0],
        'sharpe_ratio': np.mean(returns) / np.std(returns) * np.sqrt(252),
        'sortino_ratio': np.mean(returns) / np.std(returns[returns < 0]) * np.sqrt(252),
        'max_drawdown': calculate_max_drawdown(equity),
        'win_rate': np.sum((np.array(positions) == 1) & (actual == 1)) / np.sum(positions),
        'total_trades': np.sum(positions),
        'final_equity': equity[-1],
    }

    return metrics

def calculate_max_drawdown(equity: list) -> float:
    """Maximum drawdown from peak"""
    peak = equity[0]
    max_dd = 0

    for value in equity:
        if value > peak:
            peak = value
        dd = (peak - value) / peak
        if dd > max_dd:
            max_dd = dd

    return max_dd
```

---

## ONNX Export

```python
import onnx
import onnxmltools
from onnxconverter_common import FloatTensorType

def export_to_onnx(
    model,
    feature_names: list,
    output_path: str,
) -> None:
    """Export trained model to ONNX"""

    # Define input type
    initial_type = [
        ('float_input', FloatTensorType([None, len(feature_names)]))
    ]

    # Convert to ONNX
    if isinstance(model, xgb.XGBClassifier):
        onnx_model = onnxmltools.convert_xgboost(
            model,
            initial_types=initial_type,
            target_opset=13,
        )
    else:
        onnx_model = onnxmltools.convert_sklearn(
            model,
            initial_types=initial_type,
            target_opset=13,
        )

    # FP16 quantization for 2x speedup
    from onnxruntime.quantization import quantize_dynamic, QuantType

    quantize_dynamic(
        output_path,
        output_path.replace('.onnx', '_fp16.onnx'),
        weight_type=QuantType.QFloat16,
    )

    # Validate
    onnx.checker.check_model(onnx_model)

    # Compare predictions
    validate_onnx_conversion(model, onnx_model, X_test)

    print(f'✅ ONNX model saved: {output_path}')
```

---

## Model Deployment

```bash
# 1. Train models (weekly)
cd services/training-pipeline
kedro run

# 2. Export to ONNX
kedro run --pipeline export_onnx

# 3. Copy to algo-worker
cp data/06_models/*.onnx ../../apps/algo-worker/models/

# 4. Restart algo-worker to load new models
pm2 restart algo-worker
```

---

## Model Registry (MLflow)

```python
import mlflow

# Start MLflow server
# mlflow ui --port 5000

# Register model
with mlflow.start_run() as run:
    mlflow.sklearn.log_model(model, 'xgboost')
    mlflow.log_metrics({
        'test_auc': 0.72,
        'sharpe_ratio': 1.8,
        'max_drawdown': 0.12,
    })

    # Register in model registry
    model_uri = f'runs:/{run.info.run_id}/xgboost'
    mlflow.register_model(model_uri, 'XGBoostClassifier')

# Promote to production
client = mlflow.tracking.MlflowClient()
client.transition_model_version_stage(
    name='XGBoostClassifier',
    version=3,
    stage='Production',
)
```

---

## A/B Testing

```python
class ModelABTest:
    """
    Split live traffic between model versions
    """
    def __init__(self, model_a: str, model_b: str, split_ratio: float = 0.5):
        self.model_a = self.load_model(model_a)
        self.model_b = self.load_model(model_b)
        self.split_ratio = split_ratio

    async def predict(self, features: np.ndarray, user_id: str) -> Prediction:
        # Hash user_id to deterministic split
        if hash(user_id) % 100 < self.split_ratio * 100:
            model = self.model_a
            version = 'A'
        else:
            model = self.model_b
            version = 'B'

        prediction = await model.predict(features)

        # Log for analysis
        self.log_prediction(user_id, version, prediction)

        return prediction
```

---

## Configuration

```yaml
# conf/base/parameters.yml
xgboost:
  max_depth: 6
  learning_rate: 0.01
  n_estimators: 500
  subsample: 0.8
  colsample_bytree: 0.8

training:
  train_test_split: 0.8
  cv_splits: 12
  purge_window: 375 # 1 day
  embargo_window: 375

backtesting:
  transaction_cost: 0.002
  slippage: 0.0005
  initial_capital: 100000

export:
  output_dir: 'data/06_models'
  quantize_fp16: true
```

---

## Monitoring Metrics

- `training.model_train_duration_seconds`
- `training.backtest_sharpe_ratio`
- `training.backtest_max_drawdown`
- `training.model_export_success_total`
- `training.ab_test_predictions_total` (by version)

---

## Testing

```python
def test_cpcv_no_leakage():
    """Ensure CPCV prevents temporal leakage"""
    features, labels = load_data()

    for X_train, X_test, _, _ in cpcv_split(features, labels):
        # Test set must come after train set
        assert X_train.index[-1] < X_test.index[0]

        # Gap between train and test (purge)
        gap = X_test.index[0] - X_train.index[-1]
        assert gap >= 375  # At least 1 day

def test_backtest_with_costs():
    """Backtest includes transaction costs"""
    metrics = backtest_strategy(
        predictions=np.ones(100),  # All bullish
        actual=np.ones(100),       # All correct
        prices=pd.Series(range(100)),
        transaction_cost=0.002,
        slippage=0.0005,
    )

    # With costs, return < 5% per trade
    assert metrics['total_return'] < 0.05 * 100
```

---

## Production Deployment Checklist

- [ ] Train on 12+ months of data
- [ ] Backtest Sharpe Ratio >1.2
- [ ] Max Drawdown <20%
- [ ] Out-of-sample validation AUC >0.65
- [ ] ONNX validation: predictions match original
- [ ] FP16 quantization tested
- [ ] Model size <100MB
- [ ] Inference latency <50ms (GPU)
- [ ] Model registered in MLflow
- [ ] A/B test plan documented

---

**See Also**:

- [training-pipeline/README.md](../../../../../services/training-pipeline/README.md) - Full training guide
- [ADVANCED_VALIDATION.md](../../../../../services/training-pipeline/docs/ADVANCED_VALIDATION.md) - CPCV, OFI, RL patterns
- [08-LOGGING-MONITORING.md](./08-LOGGING-MONITORING.md) - Previous layer
