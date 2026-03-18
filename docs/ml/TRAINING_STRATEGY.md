# Training Strategy: In-Depth Validation & Deployment Guide

**Last Updated**: March 11, 2026
**Architecture Version**: 2026 5-Tier Data-Bound Hierarchical
**Status**: Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Data Split Strategy](#data-split-strategy)
3. [CPCV Deep Dive](#cpcv-deep-dive)
4. [Walk-Forward Validation](#walk-forward-validation)
5. [Label Generation](#label-generation)
6. [Model Training Configuration](#model-training-configuration)
7. [Training Pipeline](#training-pipeline)
8. [ONNX Export](#onnx-export)
9. [Backtesting Framework](#backtesting-framework)
10. [Model Update Strategy](#model-update-strategy)
11. [Monitoring &amp; Drift Detection](#monitoring--drift-detection)
12. [Transaction Cost Model (NIFTY Options)](#transaction-cost-model-nifty-options)
13. [Production Drift Detection & Failover](#production-drift-detection--failover)

---

## Overview

The training strategy is designed for **financial time-series** with specific challenges:

| Challenge           | Solution                                 |
| ------------------- | ---------------------------------------- |
| Temporal dependency | No random shuffling, time-ordered splits |
| Label leakage       | Purge + embargo gaps                     |
| Regime changes      | Walk-forward with expanding window       |
| Distribution shift  | Weekly retraining + drift detection      |
| Overfitting         | CPCV with multiple test periods          |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VALIDATION FRAMEWORK ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  RAW DATA (4 years: 2022-2026)                                              │
│  ├── ~1,000,000 1-minute candles                                            │
│  ├── 100+ computed features                                                 │
│  └── Multi-horizon labels (5m, 15m, 30m)                                    │
│                                                                             │
│  SPLIT STRATEGY                                                             │
│  ├── Training:   2022-01 to 2025-06 (3.5 years, expanding)                  │
│  ├── Validation: 2025-07 to 2025-09 (3 months, sliding)                     │
│  └── Test:       2025-10 to 2026-01 (3 months, held-out)                    │
│                                                                             │
│  VALIDATION METHODS                                                         │
│  ├── CPCV:          Combinatorial splits for Tier 2 models                  │
│  ├── Walk-Forward:  Expanding window for Tier 1 regime models               │
│  └── Rolling:       Online updates for Tier 3 microstructure                │
│                                                                             │
│  DEPLOYMENT                                                                 │
│  ├── Weekly retrain → ONNX export → A/B test → Production                   │
│  └── Drift detection → Alert → Emergency retrain                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Split Strategy

### Time-Based Split (Golden Rule: Future Never Leaks to Past)

```
Timeline: 2022 ════════════════════════════════════════════════> 2026

Data:     │←─────────────── TRAINING ──────────────→│←─VAL─→│←─TEST─→│
          2022-01                               2025-06  2025-09  2026-01

Split:    │════════ 3.5 years ════════════════════│ 3 mo │  3 mo  │
          │         ~850K samples                 │ 75K  │  75K   │
```

### Split Implementation

```python
def create_time_splits(
    df: pd.DataFrame,
    train_end: str = '2025-06-30',
    val_end: str = '2025-09-30'
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Create train/validation/test splits based on time.

    CRITICAL: Test set must NEVER be seen during training or validation.
    """
    df = df.sort_values('timestamp')

    train_mask = df['timestamp'] < train_end
    val_mask = (df['timestamp'] >= train_end) & (df['timestamp'] < val_end)
    test_mask = df['timestamp'] >= val_end

    return df[train_mask], df[val_mask], df[test_mask]
```

### Why This Split?

| Split          | Size | Purpose          | Usage                                   |
| -------------- | ---- | ---------------- | --------------------------------------- |
| **Training**   | 85%  | Model fitting    | CPCV folds, parameter tuning            |
| **Validation** | 7.5% | Model selection  | Hyperparameter search, ensemble weights |
| **Test**       | 7.5% | Final evaluation | One-time evaluation, go/no-go decision  |

---

## CPCV Deep Dive

### What is CPCV?

**Combinatorial Purged Cross-Validation** (CPCV) solves two critical problems:

1. **Standard CV leaks future information**: K-Fold randomly assigns samples, so training may contain data from "after" validation
2. **TimeSeriesSplit only tests recent data**: May miss how model performs in different regimes

CPCV tests **all time periods** while respecting temporal order.

### The Three Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CPCV COMPONENTS                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. COMBINATORIAL SPLITS                                                    │
│     ├── Divide data into K time-ordered groups                              │
│     ├── Test on M groups at a time (M < K)                                  │
│     └── C(K, M) = K! / (M!(K-M)!) possible combinations                     │
│                                                                             │
│  2. PURGE GAP                                                               │
│     ├── Remove data AROUND test boundaries                                  │
│     ├── Prevents label leakage from overlapping windows                     │
│     └── Typically 1-5% of test window size                                  │
│                                                                             │
│  3. EMBARGO PERIOD                                                          │
│     ├── Remove data AFTER test set                                          │
│     ├── Ensures no future information in training                           │
│     └── Typically 60-120 bars (1-2 hours for 1-min data)                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Visual Explanation

```
Data Timeline: ═════════════════════════════════════════════════════════════

Standard K-Fold (WRONG for time-series):
  Fold 1: [Train][Test][Train][Test][Train]  ← Future leaks to past!
  Fold 2: [Test][Train][Test][Train][Test]

TimeSeriesSplit (Suboptimal):
  Fold 1: [═ Train ═][Test]
  Fold 2: [══ Train ══][Test]
  Fold 3: [═══ Train ═══][Test]
          ↑ Only tests recent data

CPCV (Correct):
  K=5, M=2 → 10 combinations, all periods tested

  Fold 1:  [═ TRAIN ═][P][═ TEST ═][E][═ TRAIN ═][P][═ TEST ═][E][═ TRAIN ═]
  Fold 2:  [═ TRAIN ═][P][═ TEST ═][E][═ TRAIN ═][═ TRAIN ═][P][═ TEST ═]
  ...
  Fold 10: [═ TEST ═][E][═ TRAIN ═][═ TRAIN ═][═ TRAIN ═][P][═ TEST ═]

  [P] = Purge (removed)   [E] = Embargo (removed)
```

### Implementation

```python
import numpy as np
import pandas as pd
from itertools import combinations

class CPCVSplitter:
    """
    Combinatorial Purged Cross-Validation for financial time-series.

    Parameters:
    -----------
    n_splits : int
        Number of groups to split data into (K)
    n_test_splits : int
        Number of groups to use as test set (M)
    purge_pct : float
        Percentage of test size to purge around boundaries
    embargo_bars : int
        Number of bars to remove after each test group
    """

    def __init__(
        self,
        n_splits: int = 5,
        n_test_splits: int = 2,
        purge_pct: float = 0.01,
        embargo_bars: int = 60
    ):
        self.n_splits = n_splits
        self.n_test_splits = n_test_splits
        self.purge_pct = purge_pct
        self.embargo_bars = embargo_bars

    def get_n_splits(self) -> int:
        """Number of CV iterations."""
        from math import comb
        return comb(self.n_splits, self.n_test_splits)

    def split(self, X, y=None, timestamps=None):
        """
        Generate train/test indices for each fold.

        Yields:
        -------
        train_idx, test_idx : arrays of indices
        """
        n_samples = len(X)
        group_size = n_samples // self.n_splits
        purge_size = int(group_size * self.purge_pct)

        # Create group boundaries
        group_boundaries = []
        for i in range(self.n_splits):
            start = i * group_size
            end = start + group_size if i < self.n_splits - 1 else n_samples
            group_boundaries.append((start, end))

        # Generate all combinations of test groups
        test_combinations = list(combinations(range(self.n_splits), self.n_test_splits))

        for test_groups in test_combinations:
            test_indices = []
            purge_embargo_indices = set()

            # Build test set and identify purge/embargo zones
            for group_id in test_groups:
                start, end = group_boundaries[group_id]
                test_indices.extend(range(start, end))

                # Purge zone: around test boundaries
                purge_start = max(0, start - purge_size)
                purge_end = min(n_samples, end + purge_size)
                purge_embargo_indices.update(range(purge_start, start))
                purge_embargo_indices.update(range(end, purge_end))

                # Embargo zone: after test set
                embargo_end = min(n_samples, end + self.embargo_bars)
                purge_embargo_indices.update(range(end, embargo_end))

            test_set = set(test_indices)

            # Build train set (exclude test + purge + embargo)
            train_indices = [
                i for i in range(n_samples)
                if i not in test_set and i not in purge_embargo_indices
            ]

            yield np.array(train_indices), np.array(test_indices)

    def get_fold_info(self) -> str:
        """Return human-readable fold information."""
        n_folds = self.get_n_splits()
        return f"CPCV with K={self.n_splits}, M={self.n_test_splits} → {n_folds} folds"
```

### CPCV Parameters for Our Data

```python
# For 4 years of 1-minute data (~1M samples)
cpcv_config = {
    'n_splits': 5,           # 5 time groups
    'n_test_splits': 2,      # Test 2 at a time
    'purge_pct': 0.01,       # 1% purge (covers 15-min label horizon)
    'embargo_bars': 60,      # 60 bars = 1 hour (conservative)
}

# This creates C(5,2) = 10 CV folds
# Each fold: ~800K train, ~200K test (after purge/embargo)
```

### Why These Parameters?

| Parameter         | Value    | Reasoning                                      |
| ----------------- | -------- | ---------------------------------------------- |
| `n_splits=5`      | 5 groups | ~8 months per group, captures regime variation |
| `n_test_splits=2` | 2 groups | 40% test ratio per fold                        |
| `purge_pct=0.01`  | ~2K bars | Covers 15-min label lookahead + margin         |
| `embargo_bars=60` | 1 hour   | Conservative buffer for any delayed effects    |

---

## Walk-Forward Validation

### For Regime Models (Tier 1)

Regime models need **more training data** to detect rare events. Use walk-forward with expanding window:

```python
class WalkForwardValidator:
    """
    Expanding window walk-forward validation.

    Used for Tier 1 regime models trained on 26 years of daily data.
    """

    def __init__(
        self,
        min_train_years: int = 5,
        test_months: int = 6,
        step_months: int = 6
    ):
        self.min_train_years = min_train_years
        self.test_months = test_months
        self.step_months = step_months

    def split(self, df: pd.DataFrame, date_col: str = 'timestamp'):
        """
        Generate expanding train/test windows.

        For 26 years of data (2000-2026):
        - Initial train: 2000-2004 (5 years)
        - First test: 2005-H1 (6 months)
        - Then expand train, slide test forward
        """
        dates = pd.to_datetime(df[date_col])
        min_date = dates.min()
        max_date = dates.max()

        train_end = min_date + pd.DateOffset(years=self.min_train_years)

        fold = 0
        while train_end + pd.DateOffset(months=self.test_months) <= max_date:
            test_end = train_end + pd.DateOffset(months=self.test_months)

            train_mask = dates < train_end
            test_mask = (dates >= train_end) & (dates < test_end)

            train_idx = df[train_mask].index.values
            test_idx = df[test_mask].index.values

            yield train_idx, test_idx, {
                'fold': fold,
                'train_period': f'{min_date.date()} to {train_end.date()}',
                'test_period': f'{train_end.date()} to {test_end.date()}',
                'train_samples': len(train_idx),
                'test_samples': len(test_idx),
            }

            train_end += pd.DateOffset(months=self.step_months)
            fold += 1
```

### Walk-Forward Visualization

```
26 Years: 2000 ═══════════════════════════════════════════════════════> 2026

Fold 1:   [═══ 5yr Train ═══][6mo Test]
Fold 2:   [═════ 5.5yr Train ═════][6mo Test]
Fold 3:   [═══════ 6yr Train ═══════][6mo Test]
...
Fold 40:  [════════════════════ 24yr Train ════════════════════][6mo Test]

Key insight: Each test period is evaluated with ALL prior history.
```

---

## Label Generation

### Directional Labels (3-Class)

```python
def generate_directional_labels(
    df: pd.DataFrame,
    price_col: str = 'close',
    horizons: list[int] = [5, 15, 30],
    threshold_pct: float = 0.002
) -> pd.DataFrame:
    """
    Generate multi-horizon directional labels.

    For each horizon, create:
    - target_return_{horizon}m: Continuous return
    - target_direction_{horizon}m: Categorical (DOWN=-1, NEUTRAL=0, UP=1)

    Parameters:
    -----------
    horizons : list[int]
        Forecast horizons in minutes (e.g., [5, 15, 30])
    threshold_pct : float
        Threshold for UP/DOWN classification (default: 0.2%)
    """
    labels = pd.DataFrame(index=df.index)

    for horizon in horizons:
        # Future return
        future_price = df[price_col].shift(-horizon)
        returns = (future_price - df[price_col]) / df[price_col]

        labels[f'target_return_{horizon}m'] = returns

        # Direction classification
        direction = pd.Series(0, index=df.index)  # NEUTRAL
        direction[returns > threshold_pct] = 1     # UP
        direction[returns < -threshold_pct] = -1   # DOWN

        labels[f'target_direction_{horizon}m'] = direction

        # Class distribution check
        dist = direction.value_counts(normalize=True)
        print(f"Horizon {horizon}m: DOWN={dist.get(-1, 0):.1%}, "
              f"NEUTRAL={dist.get(0, 0):.1%}, UP={dist.get(1, 0):.1%}")

    # Mark invalid labels (end of dataset)
    max_horizon = max(horizons)
    labels['is_valid'] = True
    labels.iloc[-max_horizon:, labels.columns.get_loc('is_valid')] = False

    return labels
```

### Label Quality Flags

```python
def add_label_quality_flags(
    df: pd.DataFrame,
    labels: pd.DataFrame
) -> pd.DataFrame:
    """
    Add quality flags to identify noisy labels.
    """
    labels = labels.copy()

    # CLEAN: Normal trading conditions
    labels['label_quality'] = 'CLEAN'

    # NOISY: High volatility periods
    if 'realized_vol_5m' in df.columns:
        vol_threshold = df['realized_vol_5m'].quantile(0.95)
        noisy_mask = df['realized_vol_5m'] > vol_threshold
        labels.loc[noisy_mask, 'label_quality'] = 'NOISY'

    # OUTLIER: Extreme returns
    for col in labels.columns:
        if 'return' in col:
            outlier_mask = labels[col].abs() > 0.05  # >5% return
            labels.loc[outlier_mask, 'label_quality'] = 'OUTLIER'

    # INVALID: Market closed, pre-open, etc.
    if 'minutes_from_open' in df.columns:
        invalid_mask = df['minutes_from_open'] <= 0
        labels.loc[invalid_mask, 'is_valid'] = False
        labels.loc[invalid_mask, 'label_quality'] = 'INVALID'

    return labels
```

---

## Model Training Configuration

### LightGBM (Tier 2 Primary)

```yaml
# conf/base/parameters/lightgbm.yml

lightgbm:
  model_params:
    objective: multiclass
    num_class: 3
    n_estimators: 1000
    max_depth: 8
    num_leaves: 64
    learning_rate: 0.01

    # Regularization
    feature_fraction: 0.8
    bagging_fraction: 0.8
    bagging_freq: 5
    min_child_samples: 20

    # Class imbalance
    class_weight: balanced

    # Performance
    n_jobs: -1
    device: cpu # LightGBM CPU is faster than GPU for tabular

  training:
    early_stopping_rounds: 50
    eval_metric: multi_logloss
    verbose: 100

  features:
    count: 46 # Excludes Order Flow (8 features)
    categories:
      - index_breadth: 8
      - nifty_future: 12
      - options: 14
      - volatility: 6
      - time_context: 6
```

### TFT (Tier 2 Multi-Horizon)

```yaml
# conf/base/parameters/tft.yml

tft:
  model_params:
    hidden_size: 64
    attention_head_size: 4
    dropout: 0.1
    hidden_continuous_size: 32
    learning_rate: 0.001

  data:
    sequence_length: 120 # 2 hours of 1-min data
    prediction_horizons: [5, 15, 30] # minutes

  training:
    max_epochs: 100
    batch_size: 256
    gradient_clip_val: 0.1
    reduce_on_plateau_patience: 4
    early_stopping_patience: 10

  output:
    type: quantile_regression
    quantiles: [0.1, 0.5, 0.9]
```

### Regime HMM (Tier 1)

```yaml
# conf/base/parameters/regime_hmm.yml

regime_hmm:
  model_params:
    n_components: 4 # 4 market regimes
    covariance_type: full
    n_iter: 100
    random_state: 42

  features:
    - return_1d
    - return_5d
    - return_20d
    - realized_vol_20d
    - india_vix
    - vix_percentile_1yr

  training:
    min_train_years: 5
    walk_forward_step: 6 # months
```

---

## Training Pipeline

### Pipeline Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TRAINING PIPELINE DAG                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────┐                                                          │
│  │ data_ingestion│ → Load from QuestDB                                      │
│  └───────┬───────┘                                                          │
│          ↓                                                                  │
│  ┌───────────────┐                                                          │
│  │ feature_prep  │ → Filter valid, normalize, split                         │
│  └───────┬───────┘                                                          │
│          ↓                                                                  │
│  ┌───────────────┐                                                          │
│  │ label_gen     │ → Multi-horizon labels with quality flags                │
│  └───────┬───────┘                                                          │
│          ├──────────────────┬──────────────────┐                            │
│          ↓                  ↓                  ↓                            │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                    │
│  │ train_regime  │  │ train_lgbm    │  │ train_tft     │                    │
│  │ (Tier 1)      │  │ (Tier 2)      │  │ (Tier 2)      │                    │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘                    │
│          │                  │                  │                            │
│          └──────────────────┼──────────────────┘                            │
│                             ↓                                               │
│                     ┌───────────────┐                                       │
│                     │ train_meta    │ → Meta-learner on OOF predictions     │
│                     └───────┬───────┘                                       │
│                             ↓                                               │
│                     ┌───────────────┐                                       │
│                     │ export_onnx   │ → Convert all models to ONNX          │
│                     └───────┬───────┘                                       │
│                             ↓                                               │
│                     ┌───────────────┐                                       │
│                     │ backtest      │ → Simulate trading with costs         │
│                     └───────────────┘                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pipeline Definition

```python
# src/training_pipeline/pipelines/training/pipeline.py

from kedro.pipeline import Pipeline, node, pipeline

def create_pipeline(**kwargs) -> Pipeline:
    return pipeline([
        # Data Ingestion
        node(
            func=load_training_data,
            inputs=["params:data.start_date", "params:data.end_date"],
            outputs="raw_features",
            name="load_training_data",
        ),

        # Feature Preparation
        node(
            func=prepare_features,
            inputs=["raw_features", "params:features"],
            outputs="prepared_features",
            name="prepare_features",
        ),

        # Label Generation
        node(
            func=generate_labels,
            inputs=["prepared_features", "params:labels"],
            outputs="training_labels",
            name="generate_labels",
        ),

        # LightGBM Training
        node(
            func=train_lightgbm_cpcv,
            inputs=["prepared_features", "training_labels", "params:lightgbm"],
            outputs=["lgbm_model", "lgbm_oof_preds", "lgbm_metrics"],
            name="train_lightgbm",
        ),

        # TFT Training
        node(
            func=train_tft,
            inputs=["prepared_features", "training_labels", "params:tft"],
            outputs=["tft_model", "tft_oof_preds", "tft_metrics"],
            name="train_tft",
        ),

        # Meta-Learner Training
        node(
            func=train_meta_learner,
            inputs=["lgbm_oof_preds", "tft_oof_preds", "training_labels"],
            outputs=["meta_model", "meta_metrics"],
            name="train_meta_learner",
        ),

        # ONNX Export
        node(
            func=export_all_onnx,
            inputs=["lgbm_model", "tft_model", "meta_model", "params:export"],
            outputs="onnx_models",
            name="export_onnx",
        ),
    ])
```

---

## ONNX Export

### Export Functions

```python
# src/training_pipeline/pipelines/export/nodes.py

import onnx
import torch
from onnxmltools import convert_lightgbm
from onnxruntime.quantization import quantize_dynamic, QuantType

def export_lightgbm_onnx(
    model,
    output_path: str,
    n_features: int = 46
) -> str:
    """Export LightGBM to ONNX."""
    from onnxmltools.convert.common.data_types import FloatTensorType

    initial_types = [('input', FloatTensorType([None, n_features]))]
    onnx_model = convert_lightgbm(model, initial_types=initial_types)

    onnx.save_model(onnx_model, output_path)

    # Validate
    onnx.checker.check_model(output_path)

    return output_path


def export_pytorch_onnx(
    model: torch.nn.Module,
    output_path: str,
    input_shape: tuple,
    quantize: bool = True
) -> str:
    """Export PyTorch model to ONNX with optional quantization."""
    model.eval()
    dummy_input = torch.randn(*input_shape)

    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={
            'input': {0: 'batch'},
            'output': {0: 'batch'}
        },
        opset_version=17,
        do_constant_folding=True,
    )

    # Optimize
    from onnxruntime.transformers import optimizer
    optimized = optimizer.optimize_model(output_path)
    optimized.save_model_to_file(output_path)

    # Quantize
    if quantize:
        quantized_path = output_path.replace('.onnx', '_quantized.onnx')
        quantize_dynamic(
            output_path,
            quantized_path,
            weight_type=QuantType.QUInt8
        )
        return quantized_path

    return output_path
```

---

## Backtesting Framework

### Realistic Transaction Costs (NSE F&O)

```python
@dataclass
class TransactionCosts:
    """NSE F&O transaction costs (2026 rates)."""

    # Brokerage
    brokerage_per_order: float = 20.0  # ₹20 flat

    # Regulatory
    stt_sell_pct: float = 0.000625     # 0.0625% on sell (options)
    stamp_duty_pct: float = 0.00003    # 0.003%
    exchange_txn_pct: float = 0.0000345  # 0.00345%
    sebi_charges_pct: float = 0.000001   # 0.0001%

    # GST
    gst_rate: float = 0.18             # 18% on brokerage + txn

    # Slippage model
    slippage_pct: float = 0.0005       # 0.05% (1 tick for options)

    def calculate_total_cost(self, trade_value: float, side: str) -> float:
        """Calculate total transaction cost for a trade."""
        costs = self.brokerage_per_order

        if side == 'SELL':
            costs += trade_value * self.stt_sell_pct

        costs += trade_value * (
            self.stamp_duty_pct +
            self.exchange_txn_pct +
            self.sebi_charges_pct
        )

        # GST on brokerage and txn charges
        costs += costs * self.gst_rate

        # Slippage
        costs += trade_value * self.slippage_pct

        return costs
```

### Backtest Engine

```python
def run_backtest(
    signals: pd.DataFrame,
    prices: pd.DataFrame,
    costs: TransactionCosts = TransactionCosts(),
    initial_capital: float = 1_000_000,
    max_position_pct: float = 0.10,
    max_positions: int = 5
) -> dict:
    """
    Run backtest with realistic costs.

    Returns:
    --------
    metrics : dict
        Sharpe, Sortino, max_drawdown, win_rate, etc.
    """
    capital = initial_capital
    positions = []
    trades = []
    equity_curve = [capital]

    for timestamp, row in signals.iterrows():
        price = prices.loc[timestamp, 'close']

        # Update existing positions
        for pos in positions[:]:
            pos.update_pnl(price)

            # Check exit conditions
            if should_exit(pos, row):
                exit_price = price * (1 - costs.slippage_pct)
                pnl = pos.close(exit_price)

                # Deduct transaction costs
                exit_cost = costs.calculate_total_cost(pos.value, 'SELL')
                net_pnl = pnl - exit_cost

                capital += net_pnl
                trades.append(Trade(pos, net_pnl, timestamp))
                positions.remove(pos)

        # Check entry conditions
        if row['signal'] != 0 and len(positions) < max_positions:
            position_size = min(
                capital * max_position_pct,
                (capital - sum(p.value for p in positions)) / (max_positions - len(positions))
            )

            if position_size > 10000:  # Min position size
                entry_price = price * (1 + costs.slippage_pct)
                entry_cost = costs.calculate_total_cost(position_size, 'BUY')

                pos = Position(
                    entry_time=timestamp,
                    entry_price=entry_price,
                    size=position_size - entry_cost,
                    direction='LONG' if row['signal'] > 0 else 'SHORT'
                )
                positions.append(pos)

        equity_curve.append(capital + sum(p.unrealized_pnl for p in positions))

    return calculate_metrics(trades, equity_curve, initial_capital)
```

### Metrics Calculation

```python
def calculate_metrics(
    trades: list,
    equity_curve: list,
    initial_capital: float
) -> dict:
    """Calculate comprehensive backtest metrics."""

    returns = pd.Series(equity_curve).pct_change().dropna()
    trade_returns = [t.pnl / t.position_size for t in trades]

    return {
        # Returns
        'total_return': (equity_curve[-1] - initial_capital) / initial_capital,
        'annualized_return': returns.mean() * 252 * 375,  # 375 trading mins/day

        # Risk-adjusted
        'sharpe_ratio': returns.mean() / returns.std() * np.sqrt(252 * 375),
        'sortino_ratio': (
            returns.mean() / returns[returns < 0].std() * np.sqrt(252 * 375)
            if len(returns[returns < 0]) > 0 else np.inf
        ),
        'calmar_ratio': (
            returns.mean() * 252 * 375 / calculate_max_drawdown(equity_curve)
            if calculate_max_drawdown(equity_curve) > 0 else np.inf
        ),

        # Drawdown
        'max_drawdown': calculate_max_drawdown(equity_curve),
        'avg_drawdown': calculate_avg_drawdown(equity_curve),

        # Trade statistics
        'total_trades': len(trades),
        'win_rate': len([t for t in trades if t.pnl > 0]) / len(trades),
        'avg_win': np.mean([t.pnl for t in trades if t.pnl > 0]),
        'avg_loss': np.mean([t.pnl for t in trades if t.pnl < 0]),
        'profit_factor': (
            sum(t.pnl for t in trades if t.pnl > 0) /
            abs(sum(t.pnl for t in trades if t.pnl < 0))
            if sum(t.pnl for t in trades if t.pnl < 0) != 0 else np.inf
        ),
    }
```

---

## Model Update Strategy

### Weekly Retrain Schedule

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WEEKLY MODEL UPDATE SCHEDULE                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SUNDAY 23:00 IST                                                           │
│  ├── 1. Data refresh: Append last week's data                               │
│  ├── 2. Drift detection: Check feature/prediction distributions             │
│  └── 3. Trigger retrain if drift detected                                   │
│                                                                             │
│  MONDAY 00:00 IST                                                           │
│  ├── 4. Retrain models (if needed):                                         │
│  │   ├── Tier 1: Monthly only (stable)                                      │
│  │   ├── Tier 2: Weekly (LightGBM, TFT)                                     │
│  │   └── Tier 3: Daily (online learning for LiT)                            │
│  ├── 5. Export to ONNX                                                      │
│  └── 6. Run validation backtest                                             │
│                                                                             │
│  MONDAY 08:00 IST (1hr before market)                                       │
│  ├── 7. Compare new vs production model                                     │
│  ├── 8. Deploy if new model better by >0.5% Sharpe                          │
│  └── 9. A/B test (optional): Run both, compare                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Monitoring & Drift Detection

```python
from scipy.stats import ks_2samp

def detect_feature_drift(
    training_features: pd.DataFrame,
    live_features: pd.DataFrame,
    threshold_pvalue: float = 0.05
) -> dict:
    """
    Detect distribution drift using Kolmogorov-Smirnov test.
    """
    drift_results = {}

    for col in training_features.columns:
        if col in live_features.columns:
            stat, pvalue = ks_2samp(
                training_features[col].dropna(),
                live_features[col].dropna()
            )

            drift_results[col] = {
                'ks_statistic': stat,
                'p_value': pvalue,
                'drift_detected': pvalue < threshold_pvalue
            }

    n_drifted = sum(1 for r in drift_results.values() if r['drift_detected'])

    return {
        'feature_results': drift_results,
        'n_features_drifted': n_drifted,
        'drift_ratio': n_drifted / len(drift_results),
        'should_retrain': n_drifted / len(drift_results) > 0.2  # >20% features drifted
    }
```

---

## Transaction Cost Model (NIFTY Options)

All backtesting and Sharpe ratio calculations MUST include realistic transaction costs. A strategy with gross Sharpe 2.0 can become net-negative after costs. Without this model, performance targets are meaningless.

### Cost Components (per leg, per lot of 25 units)

| Component | Rate | Example (premium Rs 150) | Notes |
|-----------|------|--------------------------|-------|
| **Brokerage** | Rs 20/order (flat) | Rs 20 | Zerodha/Upstox discount broker model |
| **STT** | 0.0625% on sell side | Rs 2.34 (on sell) | Securities Transaction Tax; buy-side exempt for options |
| **Exchange txn charges** | 0.0495% (NSE FO) | Rs 1.86 | NSE charges on turnover |
| **GST** | 18% on (brokerage + exchange charges) | Rs 3.93 | On brokerage + exchange charges |
| **SEBI turnover fees** | 0.0001% | Rs 0.04 | Negligible but included |
| **Stamp duty** | 0.003% on buy side | Rs 0.11 | State-level, varies slightly |
| **Slippage** | 1-5 bps typical | Rs 3.75 (at 1 bps) | Biggest variable cost; depends on liquidity |

### Total Cost Estimate

```python
def estimate_round_trip_cost(
    premium: float,
    lot_size: int = 25,
    slippage_bps: float = 2.0,
    brokerage_per_order: float = 20.0,
) -> dict:
    """
    Estimate total round-trip cost for a NIFTY option trade.
    Returns cost breakdown and cost as % of premium.
    """
    turnover_per_leg = premium * lot_size
    turnover_round_trip = turnover_per_leg * 2

    brokerage = brokerage_per_order * 2  # buy + sell
    stt = turnover_per_leg * 0.000625  # sell side only
    exchange_charges = turnover_round_trip * 0.000495
    gst = (brokerage + exchange_charges) * 0.18
    sebi_fees = turnover_round_trip * 0.000001
    stamp_duty = turnover_per_leg * 0.00003  # buy side only
    slippage = turnover_round_trip * (slippage_bps / 10000)

    total = brokerage + stt + exchange_charges + gst + sebi_fees + stamp_duty + slippage
    cost_pct = (total / turnover_per_leg) * 100

    return {
        'total_cost': round(total, 2),
        'cost_as_pct_of_premium': round(cost_pct, 3),
        'breakdown': {
            'brokerage': brokerage,
            'stt': round(stt, 2),
            'exchange_charges': round(exchange_charges, 2),
            'gst': round(gst, 2),
            'sebi_fees': round(sebi_fees, 2),
            'stamp_duty': round(stamp_duty, 2),
            'slippage': round(slippage, 2),
        }
    }

# Example: Rs 150 premium, 25 lot size, 2 bps slippage
# Total ~Rs 55-65 round trip, or ~1.5% of premium per trade
```

### Impact on Strategy Metrics

| Metric | Without Costs | With Costs (2 bps slippage) | With Costs (5 bps) |
|--------|--------------|----------------------------|---------------------|
| Sharpe Ratio target | >1.5 | >1.2 | >0.9 |
| Win rate breakeven | 50% | ~52% | ~54% |
| Trades/day breakeven | - | Max ~15-20 | Max ~8-10 |

**Rule**: All backtesting in TRAINING_PIPELINE.md MUST apply `estimate_round_trip_cost()` to every simulated trade. Raw (gross) metrics should be reported alongside net metrics, never alone.

---

## Production Drift Detection & Failover

### Monitored Metrics

| Metric | Threshold | Check Frequency | Action |
|--------|-----------|-----------------|--------|
| Tier 2 rolling AUC (20-day) | <0.58 | Daily EOD | Trigger retraining |
| Feature distribution shift (KS test) | p < 0.01 for >3 features | Daily EOD | Alert + investigate |
| Tier 4 hit rate (10-day rolling) | <45% | Daily EOD | Reduce position to 50% |
| Tier 4 hit rate (20-day rolling) | <40% | Daily EOD | **Stop trading, manual review** |
| Prediction calibration (ECE) | >0.15 | Weekly | Re-calibrate temperature |
| India VIX regime change | VIX crosses 25 (up) or 15 (down) | Real-time | Adjust regime weights |

### Failover Strategy

```
IF rolling_20d_hit_rate < 40%:
    → STOP all new trades
    → Close existing positions at market
    → Alert admin via notification-service
    → Trigger emergency retraining
    → Require manual approval to resume

ELIF rolling_10d_hit_rate < 45%:
    → Reduce max position to 50% of normal
    → Switch to default regime weights (no learned weights)
    → Schedule accelerated retraining

ELIF rolling_20d_auc < 0.58:
    → Schedule standard retraining for next weekend
    → Continue trading with current models
    → Log degradation in experiment tracker
```

### Feature Drift Detection

```python
from scipy.stats import ks_2samp

def detect_feature_drift(
    reference_features: pd.DataFrame,  # Last 60 days of training data
    live_features: pd.DataFrame,       # Last 5 days of live data
    p_threshold: float = 0.01
) -> list[str]:
    """Return list of features with significant distribution shift."""
    drifted = []
    for col in reference_features.columns:
        stat, p_value = ks_2samp(reference_features[col], live_features[col])
        if p_value < p_threshold:
            drifted.append(col)
    return drifted
```

---

## Related Documentation

- [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) - Data sources and schemas
- [MODEL_ARCHITECTURE.md](./MODEL_ARCHITECTURE.md) - 5-tier data-bound hierarchy
- [UPSTOX_DATA_INGESTION.md](./UPSTOX_DATA_INGESTION.md) - Data collection
- [training-pipeline README](../../services/training-pipeline/README.md) - Kedro setup
- [TRAINING_DATA_GUIDE.md](../../services/training-pipeline/docs/TRAINING_DATA_GUIDE.md) - Data queries
