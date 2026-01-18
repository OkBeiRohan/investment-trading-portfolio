# Training Strategy: Validation & Deployment

**Last Updated**: January 18, 2026  
**Architecture Version**: 2026 Institutional-Grade

---

## Validation Framework Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TRAINING & VALIDATION FRAMEWORK                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DATA SPLIT STRATEGY                                                        │
│  ├── Training: 2022-01 to 2025-06 (3.5 years)                               │
│  ├── Validation: 2025-07 to 2025-09 (3 months)                              │
│  └── Test: 2025-10 to 2026-01 (3 months, held-out)                          │
│                                                                              │
│  VALIDATION METHODS                                                          │
│  ├── CPCV (Combinatorial Purged Cross-Validation)                           │
│  ├── Walk-Forward Validation                                                │
│  └── Time-Series Split with Embargo                                         │
│                                                                              │
│  DEPLOYMENT PIPELINE                                                         │
│  ├── Train → Validate → Export ONNX → A/B Test → Production                │
│  └── Weekly retrain on new data                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## CPCV: Combinatorial Purged Cross-Validation

### Why CPCV?

Financial time series have **temporal structure** and potential **label leakage**:
- Standard k-fold: Training data from "future" leaks into validation
- TimeSeriesSplit: Only tests recent data, may miss regime changes
- CPCV: Tests all periods while preventing lookahead bias

### Implementation

```python
import numpy as np
from itertools import combinations

class PurgedKFold:
    """
    Combinatorial Purged K-Fold Cross-Validation
    
    - Purge: Remove data around test boundaries to prevent leakage
    - Embargo: Additional gap after test set
    """
    
    def __init__(self, n_splits=5, purge_pct=0.05, embargo_bars=60):
        self.n_splits = n_splits
        self.purge_pct = purge_pct
        self.embargo_bars = embargo_bars
    
    def split(self, X, y=None, groups=None):
        n_samples = len(X)
        fold_size = n_samples // self.n_splits
        purge_size = int(fold_size * self.purge_pct)
        
        indices = np.arange(n_samples)
        fold_starts = [i * fold_size for i in range(self.n_splits)]
        
        for test_fold in range(self.n_splits):
            test_start = fold_starts[test_fold]
            test_end = test_start + fold_size
            
            # Purge around test boundaries
            purge_start = max(0, test_start - purge_size)
            purge_end = min(n_samples, test_end + purge_size)
            
            # Build train indices (exclude test + purge + embargo)
            train_mask = np.ones(n_samples, dtype=bool)
            train_mask[purge_start:purge_end + self.embargo_bars] = False
            
            train_idx = indices[train_mask]
            test_idx = indices[test_start:test_end]
            
            yield train_idx, test_idx
```

### Visualization

```
Timeline: ═════════════════════════════════════════════════════════════════

Fold 1:   [═════ TRAIN ═════][P][═ TEST ═][E][═════════ TRAIN ═════════]
Fold 2:   [═══ TRAIN ═══][P][═ TEST ═][E][═════════════ TRAIN ═════════]
Fold 3:   [═══════ TRAIN ═══════][P][═ TEST ═][E][═════════ TRAIN ═════]
Fold 4:   [═════════════ TRAIN ═════════════][P][═ TEST ═][E][══ TRAIN ═]
Fold 5:   [═════════════════════ TRAIN ═════════════════════][P][═ TEST ═]

Legend:   [P] = Purge gap (removed)   [E] = Embargo (removed)
```

---

## Walk-Forward Validation

### For Regime Models (Daily Data)

```python
class WalkForwardValidator:
    """
    Expanding window walk-forward validation for regime models
    """
    
    def __init__(self, 
                 train_years=5, 
                 test_months=6,
                 step_months=6):
        self.train_years = train_years
        self.test_months = test_months
        self.step_months = step_months
    
    def split(self, dates):
        """
        Example with 26 years (2000-2026):
        
        Fold 1:  Train [2000-2004]  Test [2005-H1]
        Fold 2:  Train [2000-2005]  Test [2005-H2]
        Fold 3:  Train [2000-2006]  Test [2006-H1]
        ...
        Fold 40: Train [2000-2024]  Test [2025-H2]
        """
        min_date = dates.min()
        max_date = dates.max()
        
        train_end = min_date + pd.DateOffset(years=self.train_years)
        
        while train_end + pd.DateOffset(months=self.test_months) <= max_date:
            test_end = train_end + pd.DateOffset(months=self.test_months)
            
            train_mask = dates < train_end
            test_mask = (dates >= train_end) & (dates < test_end)
            
            yield train_mask, test_mask
            
            train_end += pd.DateOffset(months=self.step_months)
```

### Visualization

```
26 Years: 2000 ════════════════════════════════════════════════════> 2026

Fold 1:   [════ 5yr Train ════][Test]
Fold 2:   [═════ 5.5yr Train ═════][Test]
Fold 3:   [══════ 6yr Train ══════][Test]
          ...
Fold 40:  [════════════════════ 24yr Train ════════════════════][Test]
```

---

## Label Generation

### Directional Labels (Tier 2 Models)

```python
def generate_directional_labels(df, horizon_bars=15, threshold_pct=0.002):
    """
    Generate 3-class labels based on future returns
    
    Parameters:
    - horizon_bars: Forecast horizon (15 = 15 minutes for 1-min data)
    - threshold_pct: Movement threshold (0.2%)
    
    Returns:
    - 0: VOL_DOWN (< -0.2%)
    - 1: NEUTRAL (-0.2% to +0.2%)
    - 2: VOL_UP (> +0.2%)
    """
    future_price = df['close'].shift(-horizon_bars)
    returns = (future_price - df['close']) / df['close']
    
    labels = pd.Series(1, index=df.index)  # Default NEUTRAL
    labels[returns > threshold_pct] = 2     # VOL_UP
    labels[returns < -threshold_pct] = 0    # VOL_DOWN
    
    return labels


def generate_regime_labels(df, window_days=20):
    """
    Generate regime labels based on market characteristics
    
    Returns:
    - 0: BULL_TRENDING (VIX low, positive trend)
    - 1: BEAR_TRENDING (VIX moderate, negative trend)
    - 2: VOLATILE (VIX high, high ATR)
    - 3: RANGING (VIX normal, low ATR)
    """
    vix = df['india_vix']
    trend = (df['close'] > df['sma_50']).astype(int)
    volatility = df['atr_14'] / df['close']
    
    regimes = pd.Series(3, index=df.index)  # Default RANGING
    
    # BULL_TRENDING
    regimes[(vix < 18) & (trend == 1) & (volatility < 0.015)] = 0
    
    # BEAR_TRENDING
    regimes[(vix >= 18) & (vix < 25) & (trend == 0)] = 1
    
    # VOLATILE
    regimes[(vix >= 25) | (volatility >= 0.025)] = 2
    
    return regimes
```

---

## Training Pipeline (Kedro)

### Pipeline DAG

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ KEDRO TRAINING PIPELINE                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [raw_daily]──┐                                                             │
│               │                                                              │
│  [raw_minute]─┼──→ [feature_engineering] ──→ [training_features]            │
│               │            │                        │                        │
│  [raw_vix]────┘            │                        │                        │
│                            ▼                        ▼                        │
│                    [label_generation] ──→ [training_labels]                 │
│                                                     │                        │
│                                                     ▼                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ PARALLEL MODEL TRAINING                                              │   │
│  │                                                                       │   │
│  │  [train_regime_hmm] ─────────────────────────────┐                   │   │
│  │  [train_lightgbm] ───────────────────────────────┼──→ [models/]      │   │
│  │  [train_xgboost] ────────────────────────────────┤                   │   │
│  │  [train_tft] ────────────────────────────────────┤                   │   │
│  │  [train_meta_learner] ──(uses L0 OOF preds)──────┘                   │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                     │                        │
│                                                     ▼                        │
│                                          [export_onnx] ──→ [onnx/]          │
│                                                     │                        │
│                                                     ▼                        │
│                                          [backtest] ──→ [metrics/]          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Kedro Node Example

```python
# src/training_pipeline/pipelines/train/nodes.py

def train_lightgbm(
    features: pd.DataFrame,
    labels: pd.Series,
    params: dict
) -> tuple[lgb.LGBMClassifier, dict]:
    """
    Train LightGBM with CPCV validation
    """
    cpcv = PurgedKFold(n_splits=5, embargo_bars=60)
    
    oof_preds = np.zeros((len(features), 3))
    models = []
    scores = []
    
    for fold, (train_idx, val_idx) in enumerate(cpcv.split(features)):
        X_train, X_val = features.iloc[train_idx], features.iloc[val_idx]
        y_train, y_val = labels.iloc[train_idx], labels.iloc[val_idx]
        
        model = lgb.LGBMClassifier(**params)
        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            callbacks=[lgb.early_stopping(50)]
        )
        
        oof_preds[val_idx] = model.predict_proba(X_val)
        scores.append(roc_auc_score(y_val, oof_preds[val_idx], multi_class='ovr'))
        models.append(model)
    
    # Retrain on full data
    final_model = lgb.LGBMClassifier(**params)
    final_model.fit(features, labels)
    
    metrics = {
        'cv_auc_mean': np.mean(scores),
        'cv_auc_std': np.std(scores),
        'oof_preds': oof_preds
    }
    
    return final_model, metrics
```

---

## ONNX Export Strategy

### Export Configuration

```python
def export_to_onnx(model, model_name: str, input_shape: tuple):
    """
    Export model to ONNX with optimization
    """
    if model_name in ['lightgbm', 'xgboost']:
        # Tree models via onnxmltools
        from onnxmltools import convert_lightgbm, convert_xgboost
        from onnxconverter_common import FloatTensorType
        
        initial_type = [('input', FloatTensorType([None, input_shape[0]]))]
        
        if model_name == 'lightgbm':
            onnx_model = convert_lightgbm(model, initial_types=initial_type)
        else:
            onnx_model = convert_xgboost(model, initial_types=initial_type)
    
    elif model_name in ['tft', 'lit']:
        # PyTorch models via torch.onnx
        dummy_input = torch.randn(1, *input_shape)
        torch.onnx.export(
            model,
            dummy_input,
            f'{model_name}.onnx',
            input_names=['input'],
            output_names=['output'],
            dynamic_axes={'input': {0: 'batch'}, 'output': {0: 'batch'}},
            opset_version=14
        )
    
    # Optimize ONNX model
    from onnxruntime.transformers import optimizer
    optimized = optimizer.optimize_model(f'{model_name}.onnx')
    optimized.save_model_to_file(f'{model_name}_optimized.onnx')
```

---

## Backtesting Framework

### Configuration

```python
class BacktestConfig:
    # Transaction costs (NSE F&O)
    BROKERAGE_PER_ORDER = 20  # ₹20 flat
    STT_SELL = 0.000625       # 0.0625% on sell
    STAMP_DUTY = 0.00003      # 0.003%
    EXCHANGE_TXN = 0.0000345  # 0.00345%
    SEBI_CHARGES = 0.000001   # 0.0001%
    GST_RATE = 0.18           # 18% on brokerage + txn charges
    
    # Slippage model
    SLIPPAGE_PCT = 0.0005     # 0.05%
    
    # Position sizing
    MAX_POSITION_SIZE = 0.1   # 10% of capital per trade
    MAX_POSITIONS = 5
```

### Backtest Loop

```python
def run_backtest(signals, prices, config=BacktestConfig()):
    """
    Run backtest with realistic costs
    """
    capital = 1_000_000  # ₹10L starting capital
    positions = []
    trades = []
    
    for i, row in signals.iterrows():
        # Generate entry signal
        if row['signal'] != 'NEUTRAL' and len(positions) < config.MAX_POSITIONS:
            entry_price = prices.loc[i, 'close'] * (1 + config.SLIPPAGE_PCT)
            position = Position(
                entry_time=i,
                entry_price=entry_price,
                size=capital * config.MAX_POSITION_SIZE,
                direction=row['signal']
            )
            positions.append(position)
        
        # Check exits
        for pos in positions[:]:
            current_price = prices.loc[i, 'close']
            exit_signal = check_exit_conditions(pos, current_price, row)
            
            if exit_signal:
                exit_price = current_price * (1 - config.SLIPPAGE_PCT)
                pnl = calculate_pnl(pos, exit_price, config)
                trades.append(Trade(pos, exit_price, pnl))
                positions.remove(pos)
    
    return calculate_metrics(trades)
```

### Metrics

```python
def calculate_metrics(trades):
    returns = [t.pnl_pct for t in trades]
    
    return {
        'total_trades': len(trades),
        'win_rate': len([r for r in returns if r > 0]) / len(trades),
        'avg_return': np.mean(returns),
        'sharpe_ratio': np.mean(returns) / np.std(returns) * np.sqrt(252),
        'sortino_ratio': np.mean(returns) / np.std([r for r in returns if r < 0]) * np.sqrt(252),
        'max_drawdown': calculate_max_drawdown(returns),
        'profit_factor': sum([r for r in returns if r > 0]) / abs(sum([r for r in returns if r < 0])),
        'calmar_ratio': np.mean(returns) * 252 / calculate_max_drawdown(returns)
    }
```

---

## Model Update Strategy

### Weekly Retrain Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WEEKLY MODEL UPDATE (Sunday Night)                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. DATA REFRESH                                                            │
│     └── Append last week's data to training set                             │
│                                                                              │
│  2. DRIFT DETECTION                                                         │
│     ├── Compare feature distributions (KS test)                             │
│     ├── Check prediction calibration                                        │
│     └── If drift detected → full retrain, else → incremental                │
│                                                                              │
│  3. MODEL RETRAIN                                                           │
│     ├── Tier 1: Monthly retrain (regime models stable)                      │
│     ├── Tier 2: Weekly retrain (LightGBM, XGBoost)                          │
│     └── Tier 3: Daily fine-tune (online learning)                           │
│                                                                              │
│  4. VALIDATION                                                               │
│     ├── Compare new model vs production on last 2 weeks                     │
│     └── Deploy only if new model performs better                            │
│                                                                              │
│  5. ONNX EXPORT                                                             │
│     └── Export validated model to algo-worker/models/                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) - Data sources
- [MODEL_ARCHITECTURE.md](./MODEL_ARCHITECTURE.md) - Model design
- [training-pipeline README](../../services/training-pipeline/README.md) - Kedro setup
