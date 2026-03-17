---
applyTo: "services/training-pipeline/**"
---

# GitHub Copilot Instructions - Training Pipeline

## Role & Context

You are working on the **Training Pipeline** - a Kedro-based Python project for training and evaluating ML models for volatility prediction in options trading.

**Important**: Models must be trained to support **user-configurable trading**. Users can enable/disable specific instruments, strategies, and model preferences. Train models to handle diverse scenarios.

## Project Overview

**Purpose**: ML model training (ONLY), backtesting, and model artifact generation
**Stack**: Python 3.11+, Kedro, LightGBM, XGBoost, TensorFlow, scikit-learn, ONNX

**Key Responsibilities**:

- Load pre-computed features from QuestDB (computed by compute-engine)
- Train ensemble ML models (LightGBM, XGBoost, CNN-LSTM, GINN, SVM, Transformer, TFT, LiT)
- Perform walk-forward validation (Combinatorial Purged Cross-Validation)
- Export models to ONNX format for algo-worker
- Generate training metrics and performance reports

**CRITICAL**: Training-pipeline does NOT compute features. It ONLY loads pre-computed features from QuestDB.

## Configuration-Aware Training

### **Why Configuration Matters for ML Training**

In production, algo-worker only analyzes instruments enabled by active users:

- If no user enables FINNIFTY, model won't predict FINNIFTY
- If no user allows naked call writing, no SELL_CALL signals generated
- If user disabled XGBoost, only other models used

**Training Implication**: Models must generalize across instruments/strategies, not overfit to specific combinations.

### **Training Best Practices**

```python
# ✅ GOOD: Train on diverse instrument/strategy combinations
for symbol in ['NIFTY', 'BANKNIFTY', 'FINNIFTY']:
    for strategy in ['LONG_STRADDLE', 'IRON_CONDOR', 'BULL_PUT', 'BEAR_CALL']:
        features = engineer_features(symbol, strategy)
        labels = get_labels(symbol, strategy)
        model.partial_fit(features, labels)

# ❌ BAD: Train only on NIFTY LONG_STRADDLE
features = engineer_features('NIFTY', 'LONG_STRADDLE')
model.fit(features, labels)
```

### **Model Robustness Requirements**

1. **Instrument Agnostic**: Model should work on NIFTY, BANKNIFTY, FINNIFTY without retraining
2. **Strategy Agnostic**: Same features applicable to all option strategies
3. **Confidence Calibration**: Confidence scores must be comparable across instruments
4. **Missing Data Handling**: If user disables some models, remaining models compensate

### **Feature Engineering (Handled by compute-engine)**

**CRITICAL**: Training-pipeline does NOT engineer features. Features are computed by compute-engine (Rust/NAPI).

```python
# ❌ BAD: Computing features in training-pipeline
features = []
for stock in nifty50_constituents:
    features.append(compute_rsi(stock.prices))  # DON'T DO THIS!

# ✅ GOOD: Loading pre-computed features from QuestDB
features = loader.load_lightgbm_features(
    start_date='2023-01-01',
    end_date='2025-12-31',
    symbol='NIFTY'
)
# Features already computed by compute-engine and stored in QuestDB
```

**Why This Matters**:

1. **Zero Train-Serve Skew**: Training uses EXACT same features as production
2. **Single Source of Truth**: Feature logic defined once in compute-engine
3. **Type Safety**: Rust types guarantee correct feature schema
4. **Performance**: Rust computes features <1ms vs Python 10-50ms

**Feature Schema (33 features for LightGBM)**:

- **Index Breadth (6)**: Aggregated from 50 NIFTY constituents
- **NIFTY FUTURE (9)**: Primary price discovery instrument
- **Options (11)**: Greeks + IV + PCR from option chain
- **Volatility (4)**: Historical + implied volatility metrics
- **Time (3)**: Market timing context

See [docs/ml/TIER1_MODELS.md](../../../docs/ml/TIER1_MODELS.md) for full feature and model documentation.

### **Validation Against User Configs**

After training, validate model performance under realistic config scenarios:

```python
# Simulate user configurations
user_configs = [
    {'instruments': ['NIFTY'], 'strategies': ['LONG_STRADDLE']},
    {'instruments': ['BANKNIFTY'], 'strategies': ['IRON_CONDOR']},
    {'instruments': ['NIFTY', 'FINNIFTY'], 'strategies': ['BULL_PUT', 'BEAR_CALL']},
]

for config in user_configs:
    test_data = filter_by_config(X_test, config)
    predictions = model.predict(test_data)
    auc = roc_auc_score(y_test_filtered, predictions)
    assert auc > 0.70, f"Model fails for config {config}"
```

---

## Architecture Principles

### 1. Kedro Project Structure (Updated - No Feature Engineering)

```
training-pipeline/
├── conf/
│   ├── base/
│   │   ├── catalog.yml          # QuestDB data sources (pre-computed features)
│   │   ├── parameters.yml       # Model hyperparameters + training config
│   │   └── logging.yml          # Logging configuration
│   └── local/
│       └── credentials.yml      # QuestDB/MongoDB credentials (gitignored)
├── src/
│   └── training_pipeline/
│       ├── pipelines/
│       │   ├── train_ensemble/  # Level-0 models (LightGBM, XGBoost, etc.)
│       │   ├── train_meta_learner/  # Level-1 stacking
│       │   ├── export_onnx/     # ONNX conversion
│       │   └── backtesting/     # Walk-forward backtest
│       ├── utils/
│       │   ├── sql_loader.py    # QuestDB data loader (NOT feature computation)
│       │   ├── metrics.py       # Evaluation metrics
│       │   ├── validation.py    # Walk-forward validation
│       │   └── backtesting.py   # Backtest utilities
│       └── types/
│           └── model_types.py   # Shared type definitions
├── data/
│   ├── 06_models/               # Trained models (.pkl, .txt)
│   ├── 07_model_output/         # OOF predictions (.parquet)
│   └── 08_reporting/            # Metrics & reports
└── notebooks/                   # Exploratory analysis
```

**Note**: No `01_raw/`, `02_intermediate/`, `03_primary/`, `04_feature/`, or `05_model_input/` folders.
Why? **Features are pre-computed by compute-engine and loaded directly from QuestDB.**

### 2. Data Sources (Kedro Catalog) - Pre-Computed Features ONLY

**NEVER hardcode database connections. Use Kedro catalog:**

```yaml
# conf/base/catalog.yml

# QuestDB - Pre-computed LightGBM features (33 features)
lightgbm_features:
  type: pandas.SQLQueryDataSet
  credentials: questdb
  sql: >
    SELECT 
      timestamp,
      -- Index Breadth (6)
      pct_stocks_above_vwap, pct_stocks_above_ema20, weighted_return_top10,
      advance_decline_ratio, breadth_momentum_5m, breadth_volatility,
      -- NIFTY FUTURE (9)
      fut_price_vs_vwap, fut_range_position, fut_return_1m, fut_return_5m,
      fut_atr_percent, fut_volume_zscore, fut_oi_change, fut_rsi_14, fut_macd,
      -- Options (11)
      atm_iv, atm_iv_change, iv_skew, gamma_atm, vega_atm, theta_atm,
      pcr_oi, pcr_volume, max_pain_distance, charm_atm, vanna_atm,
      -- Volatility (4)
      india_vix, realized_vol_5m, realized_vol_15m, vol_expansion_ratio,
      -- Time (3)
      minutes_from_open, minutes_to_close, day_of_week,
      -- Target
      close_price
    FROM market_state_encoder_output
    WHERE timestamp >= '2023-01-01'
    ORDER BY timestamp ASC

# QuestDB - TFT sequence data (for TFT model) - PLACEHOLDER
tft_sequence_data:
  type: pandas.SQLQueryDataSet
  credentials: questdb
  sql: >
    SELECT timestamp, index_return, index_realized_vol, breadth_score,
           fut_return, fut_volume, atm_iv, iv_change
    FROM tft_sequence_data
    WHERE timestamp >= '2023-01-01'
    ORDER BY timestamp ASC

# QuestDB - LOB tensors (for LiT model) - PLACEHOLDER
lob_tensors:
  type: pandas.SQLQueryDataSet
  credentials: questdb
  sql: >
    SELECT timestamp, bid_prices, bid_volumes, ask_prices, ask_volumes
    FROM lob_snapshots
    WHERE timestamp >= '2023-01-01'
    ORDER BY timestamp ASC

# Output - Trained models
lightgbm_model:
  type: pickle.PickleDataSet
  filepath: data/06_models/lightgbm.txt

# Output - OOF predictions (for meta-learner)
oof_lightgbm:
  type: pandas.ParquetDataSet
  filepath: data/07_model_output/oof_lightgbm.parquet

# Output - ONNX models (for algo-worker)
lightgbm_onnx:
  type: onnx.ONNXDataSet
  filepath: data/06_models/lightgbm.onnx
```

**Key Insight**: All feature columns come from `market_state_encoder_output` table in QuestDB.
No feature computation in Python. Training-pipeline is a **pure model training** system.

### 3. Model Training Nodes

**Each model has a dedicated training node:**

```python
# src/training_pipeline/nodes/xgboost_training.py
import xgboost as xgb
from sklearn.model_selection import TimeSeriesSplit
import logging

logger = logging.getLogger(__name__)

def train_xgboost_classifier(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    parameters: dict,
) -> xgb.XGBClassifier:
    """
    Train XGBoost classifier with time-series cross-validation

    Args:
        X_train: Training features
        y_train: Training labels (1=VOL_UP, 0=VOL_DOWN)
        parameters: Hyperparameters from parameters.yml

    Returns:
        Trained XGBoost model
    """
    logger.info("Training XGBoost classifier")

    model = xgb.XGBClassifier(
        max_depth=parameters['max_depth'],
        learning_rate=parameters['learning_rate'],
        n_estimators=parameters['n_estimators'],
        objective='binary:logistic',
        eval_metric='auc',
        use_label_encoder=False,
        random_state=42,
    )

    # Time-series cross-validation
    tscv = TimeSeriesSplit(n_splits=5)

    for fold, (train_idx, val_idx) in enumerate(tscv.split(X_train)):
        X_fold_train = X_train.iloc[train_idx]
        y_fold_train = y_train.iloc[train_idx]
        X_fold_val = X_train.iloc[val_idx]
        y_fold_val = y_train.iloc[val_idx]

        model.fit(
            X_fold_train,
            y_fold_train,
            eval_set=[(X_fold_val, y_fold_val)],
            early_stopping_rounds=50,
            verbose=False,
        )

        logger.info(f"Fold {fold + 1}: Val AUC = {model.best_score:.4f}")

    # Final training on all data
    model.fit(X_train, y_train)

    logger.info(f"Training complete. Best score: {model.best_score:.4f}")

    return model
```

### 4. Walk-Forward Validation

```python
def walk_forward_validation(
    features: pd.DataFrame,
    labels: pd.Series,
    model_fn: callable,
    train_window: int = 180,  # days
    test_window: int = 30,    # days
) -> dict:
    """
    Perform walk-forward validation

    Returns dict with:
        - predictions: All out-of-sample predictions
        - metrics: Performance metrics per fold
        - models: Trained models per fold
    """
    results = {
        'predictions': [],
        'metrics': [],
        'models': [],
    }

    # Sort by time
    data = features.join(labels).sort_index()

    # Calculate number of folds
    total_days = (data.index[-1] - data.index[0]).days
    n_folds = (total_days - train_window) // test_window

    for fold in range(n_folds):
        train_start = data.index[0] + pd.Timedelta(days=fold * test_window)
        train_end = train_start + pd.Timedelta(days=train_window)
        test_end = train_end + pd.Timedelta(days=test_window)

        # Split data
        train_data = data.loc[train_start:train_end]
        test_data = data.loc[train_end:test_end]

        if len(test_data) == 0:
            break

        # Train model
        X_train = train_data[features.columns]
        y_train = train_data[labels.name]
        X_test = test_data[features.columns]
        y_test = test_data[labels.name]

        model = model_fn(X_train, y_train)

        # Predict
        predictions = model.predict_proba(X_test)[:, 1]

        # Evaluate
        metrics = evaluate_predictions(y_test, predictions)

        results['predictions'].extend(predictions)
        results['metrics'].append(metrics)
        results['models'].append(model)

        logger.info(f"Fold {fold + 1}: Sharpe = {metrics['sharpe']:.3f}")

    return results
```

### 5. Model Export to ONNX

```python
import onnx
import onnxmltools
from onnxmltools.convert.xgboost.operator_converters.XGBoost import convert_xgboost
from onnxconverter_common import FloatTensorType

def export_to_onnx(
    model,
    feature_names: list,
    output_path: str,
) -> None:
    """
    Export trained model to ONNX format

    Args:
        model: Trained scikit-learn or XGBoost model
        feature_names: List of feature names
        output_path: Path to save ONNX file
    """
    logger.info(f"Exporting model to ONNX: {output_path}")

    # Define input type
    initial_type = [
        ('float_input', FloatTensorType([None, len(feature_names)]))
    ]

    # Convert to ONNX
    if isinstance(model, xgb.XGBClassifier):
        onnx_model = onnxmltools.convert_xgboost(
            model,
            initial_types=initial_type,
            target_opset=12,
        )
    else:
        onnx_model = onnxmltools.convert_sklearn(
            model,
            initial_types=initial_type,
            target_opset=12,
        )

    # Save
    onnx.save_model(onnx_model, output_path)

    # Verify
    onnx.checker.check_model(onnx_model)

    logger.info(f"ONNX model saved and verified: {output_path}")
```

### 6. Backtesting with Transaction Costs

```python
def backtest_strategy(
    predictions: np.ndarray,
    actual: np.ndarray,
    prices: pd.Series,
    threshold: float = 0.6,
    transaction_cost: float = 0.002,  # 0.2%
    slippage: float = 0.0005,         # 0.05%
) -> dict:
    """
    Backtest trading strategy with realistic costs

    Returns performance metrics including Sharpe, Sortino, MDD
    """
    positions = []
    equity = [100000]  # Start with 100k

    for i in range(len(predictions)):
        signal = 1 if predictions[i] > threshold else 0

        if signal == 1 and actual[i] == 1:
            # Correct prediction - profit
            return_pct = 0.05 - transaction_cost - slippage
        elif signal == 1 and actual[i] == 0:
            # Wrong prediction - loss
            return_pct = -0.05 - transaction_cost - slippage
        else:
            return_pct = 0

        equity.append(equity[-1] * (1 + return_pct))
        positions.append(signal)

    # Calculate metrics
    returns = np.diff(equity) / equity[:-1]

    metrics = {
        'total_return': (equity[-1] - equity[0]) / equity[0],
        'sharpe_ratio': np.mean(returns) / np.std(returns) * np.sqrt(252),
        'sortino_ratio': np.mean(returns) / np.std(returns[returns < 0]) * np.sqrt(252),
        'max_drawdown': calculate_max_drawdown(equity),
        'win_rate': np.sum((np.array(positions) == 1) & (actual == 1)) / np.sum(positions),
        'total_trades': np.sum(positions),
    }

    return metrics

def calculate_max_drawdown(equity: list) -> float:
    """Calculate maximum drawdown"""
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

## Kedro Pipeline Definition

```python
# src/training_pipeline/pipelines/model_training/pipeline.py
from kedro.pipeline import Pipeline, node
from .nodes import (
    train_xgboost_classifier,
    train_cnn_lstm,
    train_ginn,
    train_svm,
    export_to_onnx,
    evaluate_model,
)

def create_pipeline(**kwargs) -> Pipeline:
    return Pipeline([
        # XGBoost
        node(
            func=train_xgboost_classifier,
            inputs=["X_train", "y_train", "params:xgboost"],
            outputs="xgboost_model",
            name="train_xgboost",
        ),
        node(
            func=export_to_onnx,
            inputs=["xgboost_model", "params:feature_names"],
            outputs="xgboost_onnx",
            name="export_xgboost_onnx",
        ),

        # CNN-LSTM
        node(
            func=train_cnn_lstm,
            inputs=["X_train_seq", "y_train", "params:cnn_lstm"],
            outputs="cnn_lstm_model",
            name="train_cnn_lstm",
        ),

        # Evaluation
        node(
            func=evaluate_model,
            inputs=["xgboost_model", "X_test", "y_test"],
            outputs="xgboost_metrics",
            name="evaluate_xgboost",
        ),
    ])
```

## Configuration Files

```yaml
# conf/base/parameters.yml
xgboost:
  max_depth: 6
  learning_rate: 0.01
  n_estimators: 500
  subsample: 0.8
  colsample_bytree: 0.8

cnn_lstm:
  cnn_filters: 64
  cnn_kernel_size: 3
  lstm_units: 50
  dropout: 0.3
  epochs: 100
  batch_size: 32

svm:
  kernel: "rbf"
  C: 10
  gamma: "scale"

training:
  train_test_split: 0.8
  target_variable: "vol_up"
  feature_columns:
    - realizedVol5d
    - realizedVol10d
    - realizedVol20d
    - rsi14
    - macd
    - indiaVix
    - pcrVolume
    - atmIV
    - volSkew
```

## Running the Pipeline

```bash
# Run full pipeline
kedro run

# Run specific pipeline
kedro run --pipeline model_training

# Run specific node
kedro run --node train_xgboost

# With parameters override
kedro run --params xgboost.max_depth=8
```

## Testing

```python
# tests/pipelines/test_xgboost.py
import pytest
from training_pipeline.nodes.xgboost_training import train_xgboost_classifier

def test_xgboost_training():
    X_train = pd.DataFrame({
        'feature1': np.random.randn(1000),
        'feature2': np.random.randn(1000),
    })
    y_train = pd.Series(np.random.randint(0, 2, 1000))

    parameters = {
        'max_depth': 3,
        'learning_rate': 0.1,
        'n_estimators': 10,
    }

    model = train_xgboost_classifier(X_train, y_train, parameters)

    assert model is not None
    assert hasattr(model, 'predict')
    assert hasattr(model, 'predict_proba')
```

## Code Quality Standards

- **Reproducibility**: Set random seeds, version data
- **Modularity**: Each model in separate node
- **Testing**: Unit test all training functions
- **Documentation**: Document hyperparameters and metrics
- **Version Control**: Track model versions with MLflow

## When Making Changes

1. ✅ Use Kedro catalog for all data sources
2. ✅ Implement walk-forward validation
3. ✅ Model transaction costs and slippage
4. ✅ Export to ONNX for production use
5. ✅ Track experiments with MLflow
6. ✅ Test on GPU (ArchLinux environment)
7. ✅ Document hyperparameter choices

## Anti-Patterns to Avoid

❌ Hardcoded database connections  
❌ Simple train/test split (use walk-forward)  
❌ Ignoring transaction costs in backtest  
❌ Not exporting to ONNX  
❌ Missing random seeds  
❌ Training on leaky features

## Documentation

- [Training Pipeline README](./README.md) - Service overview
- [ML Architecture](../../../docs/ml/README.md) - AI/ML documentation index
- [TRAINING_PIPELINE.md](../../../docs/ml/TRAINING_PIPELINE.md) - Detailed training docs
- [INFERENCE_PIPELINE.md](../../../docs/ml/INFERENCE_PIPELINE.md) - ONNX Runtime in NestJS
- [compute-engine README](../../../packages/compute-engine/README.md) - Feature computation

