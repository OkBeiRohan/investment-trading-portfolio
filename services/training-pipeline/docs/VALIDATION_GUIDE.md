# Validation Guide: CPCV & Walk-Forward

**Last Updated**: March 17, 2026

---

## Overview

This guide explains the validation strategies used in the training pipeline:

| Strategy | Used For | Data |
|----------|----------|------|
| **CPCV** | Tier 2 models (LightGBM, TFT) | 4 years 1-min |
| **Walk-Forward** | Tier 1 regime models | 26 years daily |
| **Rolling** | Tier 3 microstructure (LiT) | Live tick |

---

## CPCV: Combinatorial Purged Cross-Validation

### Why Not Standard K-Fold?

Standard K-Fold **randomly shuffles** data, which causes:
- Future information to leak into training
- Overly optimistic performance estimates
- Models that fail catastrophically in production

### CPCV Solves This

```
Timeline: ═════════════════════════════════════════════════════════════════

Standard K-Fold (WRONG):
  [Train] [Test] [Train] [Test] [Train]  ← Future leaks!

TimeSeriesSplit (Better but limited):
  [═══ Train ═══][Test]
  [════ Train ════][Test]
  [═════ Train ═════][Test]
  ↑ Only tests recent periods

CPCV (Best):
  All periods tested with purge + embargo
```

### Configuration

```python
# conf/base/parameters.yml
cpcv:
  n_splits: 5        # K = 5 groups
  n_test_splits: 2   # M = 2 groups per test
  purge_pct: 0.01    # 1% purge around boundaries
  embargo_bars: 60   # 60 bars (1 hour) after test
```

This creates **C(5,2) = 10 folds**.

### Usage

```python
from training_pipeline.utils.cpcv import CPCVSplitter

splitter = CPCVSplitter(
    n_splits=5,
    n_test_splits=2,
    purge_pct=0.01,
    embargo_bars=60
)

for fold, (train_idx, test_idx) in enumerate(splitter.split(X)):
    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]
    
    model.fit(X_train, y_train)
    oof_preds[test_idx] = model.predict_proba(X_test)
```

---

## Walk-Forward Validation

### For Regime Models

Regime models need **maximum historical context** to detect rare events (crashes, bubbles). Use expanding window:

```python
from training_pipeline.utils.walk_forward import WalkForwardValidator

validator = WalkForwardValidator(
    min_train_years=5,
    test_months=6,
    step_months=6
)

for train_idx, test_idx, info in validator.split(df):
    print(f"Fold {info['fold']}: {info['train_period']} → {info['test_period']}")
    # Train regime model...
```

### Timeline

```
26 Years: 2000 ═══════════════════════════════════════════════════════> 2026

Fold 1:   [═══ 5yr Train ═══][6mo Test]
Fold 2:   [═════ 5.5yr Train ═════][6mo Test]
...
Fold 40:  [═════════════ 24yr Train ═════════════][6mo Test]
```

---

## Label Generation

### Directional Labels

```python
from training_pipeline.utils.labels import generate_directional_labels

labels = generate_directional_labels(
    df,
    horizons=[5, 15, 30],    # minutes ahead
    threshold_pct=0.002      # 0.2% threshold
)

# Output columns:
# - target_return_5m, target_return_15m, target_return_30m
# - target_direction_5m (-1/0/1), target_direction_15m, target_direction_30m
```

### Class Distribution

Expect roughly balanced classes:
- DOWN: ~30%
- NEUTRAL: ~40%
- UP: ~30%

---

## Metrics

### Model Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| AUC-ROC | >0.68 | Discrimination ability |
| Log Loss | <0.9 | Probability calibration |
| Brier Score | <0.2 | Calibration error |

### Backtest Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| Sharpe Ratio | >1.5 | Risk-adjusted return |
| Sortino Ratio | >2.0 | Downside risk-adjusted |
| Max Drawdown | <15% | Capital preservation |
| Win Rate | >55% | Trade success rate |

---

## Related Documentation

- [TRAINING_STRATEGY.md](../../docs/ml/TRAINING_STRATEGY.md) - Full validation guide
- [TRAINING_DATA_GUIDE.md](./TRAINING_DATA_GUIDE.md) - Data queries
