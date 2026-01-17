# Batch Training - Quick Start

## Problem Fixed

**Error:** `undefined bind variable: 1` when loading data from QuestDB

**Root Cause:** SQL queries used PostgreSQL positional parameters (`$1`, `$2`) but Kedro's `SQLQueryDataset` with SQLAlchemy requires named parameters (`:param_name`).

## Solution Applied

1. ✅ Fixed SQL queries to use named parameters (`:training_start`, `:training_end`)
2. ✅ Created batch data loader to reduce RAM usage
3. ✅ Added batch training pipeline
4. ✅ Configured parameters for batch-by-batch training

## Verify Fix

```bash
cd services/training-pipeline
python verify_batch_setup.py
```

Expected output:

```
✅ SQL parameter syntax correct
✅ Date ranges working
✅ Catalog configured
✅ Parameters configured
🎉 All checks passed!
```

## Run Batch Training

```bash
# Use default settings (30-day batches)
kedro run --pipeline batch_training

# Use custom batch size
kedro run --pipeline batch_training --params training.batch_days=60

# Dry run (see what would execute)
kedro run --pipeline batch_training --dry-run
```

## Configuration

Edit `conf/base/parameters.yml`:

```yaml
training:
  training_start: "2023-01-01"
  training_end: "2025-12-31"
  batch_days: 30 # RAM usage: smaller = less RAM
```

**RAM Estimates:**

- 7 days ≈ 500 MB
- 30 days ≈ 2 GB
- 90 days ≈ 6 GB

## How It Works

1. **Data Loading:** Queries QuestDB in time-based chunks
2. **Training:** LightGBM trains incrementally using `init_model`
3. **Memory:** Each batch is garbage collected after processing

## Files Changed

| File                                                            | Change                    |
| --------------------------------------------------------------- | ------------------------- |
| `packages/schema/sql/market-state/get-by-time-range.sql`        | `$1` → `:training_start`  |
| `packages/schema/sql/training-labels/get-all-horizons.sql`      | `$1` → `:training_start`  |
| `conf/base/catalog.yml`                                         | Added `*_batch` datasets  |
| `src/training_pipeline/utils/batch_loader.py`                   | New batch loader          |
| `src/training_pipeline/pipelines/train_ensemble/nodes_batch.py` | New batch training nodes  |
| `src/training_pipeline/pipeline_registry.py`                    | Registered batch pipeline |

## Documentation

- Full guide: `docs/BATCH_TRAINING.md`
- Tests: `tests/test_batch_loader.py`

## Next Steps

1. Run verification: `python verify_batch_setup.py`
2. Test with small date range first
3. Monitor RAM usage: `watch -n 1 free -h`
4. Adjust `batch_days` based on available RAM
5. Implement walk-forward validation using batches

## Troubleshooting

**Still getting "undefined bind variable"?**

- Check SQL files manually: should have `:training_start`, NOT `$1`
- Verify catalog uses correct SQL file paths

**Out of memory?**

- Reduce `training.batch_days` in parameters.yml
- Close other applications

**No data loaded?**

- Check QuestDB has data for date range
- Run: `SELECT COUNT(*) FROM market_state_1m WHERE timestamp >= '2023-01-01'`
