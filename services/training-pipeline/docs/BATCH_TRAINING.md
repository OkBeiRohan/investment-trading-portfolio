# Batch Training Guide

## Problem Solved

The standard Kedro approach loads the entire dataset into memory, which can cause RAM overflow for large time-series datasets (3+ years of 1-minute data).

## Solution

**Batch loading** - Load data in time-based chunks (e.g., 30 days at a time), train incrementally, and release memory between batches.

## What Changed

### 1. SQL Parameter Fix

**Before (BROKEN):**

```sql
SELECT * FROM market_state_1m
WHERE timestamp >= $1 AND timestamp < $2  -- PostgreSQL positional params
```

**After (FIXED):**

```sql
SELECT * FROM market_state_1m
WHERE timestamp >= :training_start AND timestamp < :training_end  -- Named params
```

**Why:** Kedro's `SQLQueryDataset` uses SQLAlchemy, which expects named parameters (`:param_name`) not positional parameters (`$1`, `$2`).

### 2. Catalog Configuration

Added batch-specific datasets with dynamic parameters:

```yaml
# catalog.yml
features_batch:
  type: pandas.SQLQueryDataset
  filepath: .../get-by-time-range.sql
  credentials: questdb_credentials
  load_args:
    params:
      training_start: "${batch_start}" # Overridden at runtime
      training_end: "${batch_end}"
```

### 3. Batch Data Loader

Created `utils/batch_loader.py`:

- `BatchDataLoader` - Iterator that yields data batches
- `get_date_ranges()` - Helper to calculate date ranges

### 4. Batch Training Nodes

Created `pipelines/train_ensemble/nodes_batch.py`:

- `train_lightgbm_batch()` - Train LightGBM incrementally on batches
- `validate_model_batch()` - Validate model using batches

## How to Use

### Option 1: Run Batch Training Pipeline

```bash
cd services/training-pipeline

# Run batch training (30-day batches by default)
kedro run --pipeline batch_training

# Override batch size
kedro run --pipeline batch_training --params training.batch_days=60
```

### Option 2: Use BatchDataLoader in Custom Nodes

```python
from training_pipeline.utils import BatchDataLoader

def custom_training_node(catalog, parameters):
    loader = BatchDataLoader(
        catalog=catalog,
        start_date="2023-01-01",
        end_date="2025-12-31",
        batch_days=30,  # Load 30 days at a time
    )

    model = None

    for batch_num, (features, labels) in enumerate(loader):
        # Align features and labels
        merged = features.merge(labels, on='timestamp', how='inner')

        X = merged[feature_columns]
        y = merged['target_direction']

        # Train/continue training
        if model is None:
            model = lgb.train(params, lgb.Dataset(X, y))
        else:
            model = lgb.train(params, lgb.Dataset(X, y), init_model=model)

        # Memory is automatically freed when batch goes out of scope

    return model
```

### Option 3: Manual Batch Loading

```python
from training_pipeline.utils import get_date_ranges

# Get date ranges for walk-forward validation
ranges = get_date_ranges("2023-01-01", "2025-12-31", batch_days=30)

for batch_start, batch_end in ranges:
    # Load data for this batch
    features = catalog.load(
        "features_batch",
        params={"training_start": batch_start, "training_end": batch_end}
    )

    # Train on this batch
    # ...
```

## Configuration

Edit `conf/base/parameters.yml`:

```yaml
training:
  training_start: "2023-01-01"
  training_end: "2025-12-31"
  batch_days: 30 # Adjust based on RAM: smaller = less RAM, slower training

validation:
  validation_start: "2025-01-01"
  validation_end: "2025-12-31"
  batch_days: 30

features:
  feature_columns:
    - pct_stocks_above_vwap
    - fut_return_1m
    - atm_iv
    # ... 33 features total
  target_column: "target_direction"
```

## RAM Usage Estimation

| Batch Size | Approx RAM Usage (1-min data) |
| ---------- | ----------------------------- |
| 7 days     | ~500 MB                       |
| 30 days    | ~2 GB                         |
| 90 days    | ~6 GB                         |
| 180 days   | ~12 GB                        |

**Rule of thumb:** Use batch_days that keeps RAM usage <50% of available RAM.

## LightGBM Incremental Training

LightGBM supports incremental learning via `init_model`:

```python
# First batch: train initial model
model = lgb.train(params, train_data)

# Subsequent batches: continue training
model = lgb.train(
    params,
    new_train_data,
    init_model=model,  # Continue from previous model
)
```

**Note:** This is NOT the same as online learning. The model continues training, so:

- ✅ Accumulates knowledge from all batches
- ✅ Reduces RAM usage
- ❌ May forget early patterns (mitigate with learning rate decay)

## Walk-Forward Validation with Batches

For proper time-series validation:

```python
train_ranges = get_date_ranges("2023-01-01", "2024-12-31", 30)
val_ranges = get_date_ranges("2025-01-01", "2025-12-31", 30)

# Train on 2023-2024 in batches
model = train_in_batches(train_ranges)

# Validate on 2025 in batches (avoid loading all val data)
metrics = validate_in_batches(model, val_ranges)
```

## Debugging

### Check if data is loading:

```python
# Test batch loader
loader = BatchDataLoader(catalog, "2023-01-01", "2023-02-01", batch_days=7)
for features, labels in loader:
    print(f"Features: {features.shape}, Labels: {labels.shape}")
    break  # Just test first batch
```

### Verify SQL parameters:

```python
# Check catalog entry
catalog._datasets['features_batch']._describe()

# Should show:
# {
#   'filepath': '.../get-by-time-range.sql',
#   'load_args': {'params': {'training_start': ..., 'training_end': ...}}
# }
```

### Test SQL directly:

```python
from kedro_datasets.pandas import SQLQueryDataset

dataset = SQLQueryDataset(
    filepath='packages/schema/sql/market-state/get-by-time-range.sql',
    credentials={'con': 'postgresql://...'},
    load_args={
        'params': {
            'training_start': '2023-01-01 00:00:00',
            'training_end': '2023-01-31 23:59:59',
        }
    }
)

df = dataset.load()
print(df.shape)
```

## Troubleshooting

### "undefined bind variable" error

**Cause:** SQL uses `$1` instead of `:training_start`

**Fix:** Already fixed in this update. SQL now uses named parameters.

### "Out of memory" error

**Cause:** Batch size too large

**Fix:** Reduce `batch_days` in parameters.yml

### Empty batches

**Cause:** No data for that time period

**Fix:** Check QuestDB data availability:

```sql
SELECT DATE(timestamp), COUNT(*)
FROM market_state_1m
GROUP BY DATE(timestamp)
ORDER BY DATE(timestamp);
```

### Model not learning across batches

**Cause:** Not passing `init_model` to subsequent batches

**Fix:** See `nodes_batch.py` example - always use `init_model=model` after first batch.

## Next Steps

1. **Test the fix:**

   ```bash
   kedro run --pipeline batch_training
   ```

2. **Monitor RAM usage:**

   ```bash
   # In another terminal
   watch -n 1 free -h
   ```

3. **Adjust batch size** based on available RAM

4. **Implement walk-forward validation** using `get_date_ranges()`

5. **Export to ONNX** after training completes
