# QuestDB Schema Update Summary

## Changes Made

Updated the training pipeline to use the **correct QuestDB table schema** from `packages/schema/sql/schema/`:

### 1. Table Name Change

- ❌ **Old**: `lightgbm_features` (didn't exist in schema)
- ✅ **New**: `market_state_1m` (actual table with 33 features)

### 2. Feature Schema Update (33 features)

**Old schema** (placeholder):

- Index Breadth (6): `pct_stocks_above_vwap`, `pct_stocks_above_ema20`, etc.
- NIFTY FUTURE (9): `fut_price_vs_vwap`, `fut_return_1m`, etc.
- Options (11): `atm_iv`, `iv_skew`, `charm_atm`, `vanna_atm`, etc.

**New schema** (actual from `create_market_state_1m.sql`):

- Market Structure (8): `price_vs_vwap`, `price_vs_day_high`, `range_position`, etc.
- Momentum & Trend (8): `rsi_5`, `rsi_14`, `macd_hist`, `ema_9_slope`, etc.
- Volatility (5): `atr_percent`, `realized_vol_5m`, `india_vix`, etc.
- Options (9): `atm_iv`, `delta_atm`, `gamma_atm`, `pcr_oi`, etc.
- Time Context (3): `minutes_from_open`, `minutes_to_close`, `day_of_week`

### 3. Price Data JOIN

The `market_state_1m` table doesn't include `close_price`. We now **JOIN with `market_candles`**:

```sql
SELECT
    ms.timestamp,
    ms.price_vs_vwap,
    ms.rsi_14,
    -- ... all 33 features ...
    mc.close as close_price  -- JOINed from candles
FROM market_state_1m ms
LEFT JOIN market_candles mc
    ON ms.timestamp = mc.timestamp
    AND mc.instrument_key = 'NSE_INDEX|Nifty 50'
    AND mc.interval_value = 1
    AND mc.interval_unit = 'minute'
```

### 4. Files Updated

1. **`scripts/check_features.py`**
   - Changed table from `lightgbm_features` → `market_state_1m`
   - Updated 33 feature names to match schema
   - Removed `close_price` check (it comes from JOIN)

2. **`src/training_pipeline/utils/sql_loader.py`**
   - Updated `load_lightgbm_features()` to use `market_state_1m`
   - Added JOIN with `market_candles` to get `close_price`
   - Added instrument_key mapping (NIFTY → NSE_INDEX|Nifty 50)
   - Updated `get_available_date_range()` default table

3. **`scripts/train_lightgbm.py`**
   - Updated `atr_column` from `fut_atr_percent` → `atr_percent`

## Testing

Run the verification script:

```powershell
cd services/training-pipeline
poetry shell
python scripts/check_features.py
```

**Expected output:**

```
✅ Connected to QuestDB
✅ Table exists with rows
✅ All 33 features present
✅ Ready to train!
```

## Next Steps

1. **Populate `market_state_1m` table** using compute-engine
2. **Populate `market_candles` table** with 1-minute NIFTY candles
3. Run training: `python scripts/train_lightgbm.py`

## Schema Reference

See SQL schema files:

- `packages/schema/sql/schema/create_market_state_1m.sql` - 33 features
- `packages/schema/sql/schema/create_market_candles.sql` - OHLCV data
- `packages/schema/sql/schema/create_instrument_features_1m.sql` - Per-instrument features (not used directly)

## Architecture

```
compute-engine (Rust)
    ↓
market_state_1m (33 features) + market_candles (prices)
    ↓
training-pipeline (Python)
    ↓
LightGBM model
```

Zero train-serve skew: Same features used in training and production!
