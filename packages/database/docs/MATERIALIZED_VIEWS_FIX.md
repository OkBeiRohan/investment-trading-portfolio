# QuestDB Materialized Views Fix

**Date**: January 13, 2026  
**Issue**: Training tables and materialized views failed to create during service startup

## Root Cause

**QuestDB doesn't support traditional materialized views** like PostgreSQL does. The migration and SQL files used `CREATE MATERIALIZED VIEW` syntax which is not supported in QuestDB.

## Errors Observed

```json
{"level":"error","context":"QuestDBService","msg":"Failed to create table: training_features_lightgbm"}
{"level":"error","context":"QuestDBService","msg":"Failed to create table: training_features_tft"}
{"level":"error","context":"QuestDBService","msg":"Failed to create table: training_labels"}
{"level":"warn","context":"QuestDBService","msg":"Failed to create materialized view: market_candles_1m"}
{"level":"warn","context":"QuestDBService","msg":"Failed to create materialized view: market_candles_30m"}
```

## Changes Made

### 1. Fixed Error Logging

**File**: `packages/database/src/questdb/questdb.service.ts`

- Improved error logging to show actual error messages and stack traces
- Changed from passing entire error object to extracting `message` and `stack`

### 2. Converted Materialized Views to Regular Tables

**Files**:

- `packages/schema/sql/schema/create_market_candles_1m_view.sql`
- `packages/schema/sql/schema/create_market_candles_30m_view.sql`

**Before** (❌ Not supported in QuestDB):

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS market_candles_1m AS
SELECT ...
FROM market_quotes
SAMPLE BY 1m;
```

**After** (✅ Standard table):

```sql
CREATE TABLE IF NOT EXISTS market_candles_1m (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 1000,
  interval SYMBOL CAPACITY 10,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume LONG,
  open_interest LONG
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key);
```

### 3. Created Aggregation Query Files

**New Files**:

- `packages/schema/sql/utils/populate-market-candles-1m.sql`
- `packages/schema/sql/utils/populate-market-candles-30m.sql`

These files contain `INSERT INTO ... SELECT` queries that the application should run periodically to populate the aggregated candle tables.

**Example** (`populate-market-candles-1m.sql`):

```sql
INSERT INTO market_candles_1m
SELECT
  timestamp,
  instrument_key,
  '1m' as interval,
  first(ltp) as open,
  max(ltp) as high,
  min(ltp) as low,
  last(ltp) as close,
  sum(volume) as volume,
  last(open_interest) as open_interest
FROM market_quotes
WHERE timestamp >= dateadd('h', -2, now())
SAMPLE BY 1m
ALIGN TO CALENDAR;
```

### 4. Updated Service Logic

**File**: `packages/database/src/questdb/questdb.service.ts`

- Combined table creation into single loop (11 tables total)
- Removed separate "materialized views" section
- Added logic to handle `_view` suffix in SQL file names

### 5. Updated Migration Scripts

**File**: `packages/database/migrations/001_initial_schema.sql`

- Changed header: "9 tables + 2 views" → "11 tables"
- Replaced materialized view SQL with regular table definitions
- Added notes about application-managed aggregation
- Updated footer with next steps for periodic jobs

**File**: `packages/database/migrations/001_rollback.sql`

- Changed `DROP VIEW` to `DROP TABLE` for candle tables

**File**: `packages/database/migrations/README.md`

- Updated table counts (11 instead of "9 + 2 views")
- Changed descriptions from "auto-aggregated" to "app-managed"
- Added notes about periodic job setup

## How to Populate Aggregated Candles

### Option 1: Manual Execution (Testing)

```bash
# In QuestDB console (http://localhost:9000)
# Run packages/schema/sql/utils/populate-market-candles-1m.sql
# Run packages/schema/sql/utils/populate-market-candles-30m.sql
```

### Option 2: Scheduled Jobs (Production)

**Recommended**: Create a cron job or NestJS scheduler:

```typescript
// In market-feeder service
@Cron('*/5 * * * *') // Every 5 minutes
async refreshOneMinuteCandles() {
  const sql = loadSqlQueryCached('utils/populate-market-candles-1m');
  await this.questdb.query(sql);
}

@Cron('*/30 * * * *') // Every 30 minutes
async refreshThirtyMinuteCandles() {
  const sql = loadSqlQueryCached('utils/populate-market-candles-30m');
  await this.questdb.query(sql);
}
```

## Verification

After restarting the service, all tables should create successfully:

```
[QuestDBService] Table created/verified: market_candles
[QuestDBService] Table created/verified: market_quotes
[QuestDBService] Table created/verified: option_greeks
[QuestDBService] Table created/verified: market_depth
[QuestDBService] Table created/verified: system_audit
[QuestDBService] Table created/verified: market_ticks
[QuestDBService] Table created/verified: training_features_lightgbm ✅
[QuestDBService] Table created/verified: training_features_tft ✅
[QuestDBService] Table created/verified: training_labels ✅
[QuestDBService] Table created/verified: market_candles_1m ✅
[QuestDBService] Table created/verified: market_candles_30m ✅
```

## Next Steps

1. **Restart market-feeder service** to verify all tables create successfully
2. **Implement periodic jobs** to populate aggregated candle tables
3. **Consider**: Use QuestDB's built-in scheduled SQL jobs (Enterprise feature) or implement in application layer

## References

- [QuestDB Documentation: SAMPLE BY](https://questdb.io/docs/reference/sql/sample-by/)
- [QuestDB Documentation: INSERT FROM SELECT](https://questdb.io/docs/reference/sql/insert/)
- QuestDB does NOT support `CREATE MATERIALIZED VIEW` - use regular tables instead
