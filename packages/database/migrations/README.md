# QuestDB Database Migrations

This directory contains SQL migration scripts for QuestDB schema management.

## ⚠️ IMPORTANT: Migrations are OPTIONAL

**The `questdb.service.ts` automatically creates all tables when you first run any service** (e.g., `market-feeder`, `algo-worker`).

**You only need to run these migrations if you want to:**

- Manually set up the schema before starting services
- Reset/recreate the database schema
- Verify the exact schema being used

**For normal development:** Just start your services and the tables will be created automatically! ✅

## Available Migrations

| Migration                | Description            | Tables Created     |
| ------------------------ | ---------------------- | ------------------ |
| `001_initial_schema.sql` | Initial schema setup   | 9 tables + 2 views |
| `001_rollback.sql`       | Rollback migration 001 | Drops all tables   |

## How to Run

### Option 1: QuestDB Web Console (Recommended)

1. Open QuestDB console: http://localhost:9000
2. Copy the entire contents of `001_initial_schema.sql`
3. Paste into the query editor
4. Click **Run** (or press Ctrl+Enter)
5. Wait ~5 seconds for completion

### Option 2: QuestDB CLI (psql)

```bash
# Connect to QuestDB
psql -h localhost -p 8812 -U admin -d qdb

# Run migration
\i packages/database/migrations/001_initial_schema.sql
```

### Option 3: Node.js Script

```bash
# From project root
cd packages/database
node -e "
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 8812,
  user: 'admin',
  database: 'qdb',
});

const sql = fs.readFileSync('migrations/001_initial_schema.sql', 'utf8');

pool.query(sql)
  .then(() => console.log('Migration complete'))
  .catch(err => console.error('Migration failed:', err))
  .finally(() => pool.end());
"
```

## Verification

After running the migration, verify the schema:

```sql
-- List all tables
SELECT table_name FROM tables();

-- Expected output:
-- market_candles
-- market_quotes
-- option_greeks
-- market_depth
-- system_audit
-- market_ticks
-- training_features_lightgbm
-- training_features_tft
-- training_labels
-- market_candles_1m (view)
-- market_candles_30m (view)

-- Check table row counts
SELECT
  table_name,
  (SELECT count(*) FROM table_name) as row_count
FROM tables()
WHERE table_name LIKE 'market_%' OR table_name LIKE 'training_%';

-- Check storage size
SELECT
  table_name,
  sum(diskSize) / 1024 / 1024 as size_mb
FROM table_partitions()
GROUP BY table_name
ORDER BY size_mb DESC;
```

## Rollback

To completely reset the database:

```sql
-- Run rollback script
-- WARNING: This deletes ALL data!
-- Copy contents of 001_rollback.sql and run in console
```

## Schema Overview

### Core Market Data Tables

| Table            | Purpose                           | Expected Volume |
| ---------------- | --------------------------------- | --------------- |
| `market_candles` | OHLCV historical data             | 200K/day        |
| `market_quotes`  | Bid/ask tick data                 | 1M/day          |
| `option_greeks`  | Greeks snapshots                  | 50K/day         |
| `market_depth`   | Order book (1-20 levels flexible) | 500K-2M/day     |
| `system_audit`   | Distributed tracing               | 100K/day        |

### Training Data Tables

| Table                        | Purpose                     | Expected Volume |
| ---------------------------- | --------------------------- | --------------- |
| `market_ticks`               | Unified tick data           | 10M/day         |
| `training_features_lightgbm` | LightGBM features (43 cols) | 375/day         |
| `training_features_tft`      | TFT features                | 75/day          |
| `training_labels`            | Supervised labels           | 375/day         |

### Materialized Views (Auto-Created)

| View                 | Purpose                     | Source           |
| -------------------- | --------------------------- | ---------------- |
| `market_candles_1m`  | Auto-aggregated 1m candles  | `market_quotes`  |
| `market_candles_30m` | Auto-aggregated 30m candles | `market_candles` |

**Note**: Materialized views are automatically created by `questdb.service.ts` and included in the migration.

## Storage Estimates

### Initial Setup

- Empty database: <100 MB
- With indexes: ~200 MB

### After 1 Month (50 instruments)

- market_candles: ~500 MB
- market_quotes: ~2 GB
- market_ticks: ~3 GB
- Total: ~6 GB

### After 1 Year (50 instruments)

- Total: ~70 GB

### With Full History (2000-2026, 500 instruments)

- Total: ~5 TB (compressed)

## Maintenance

### Partition Management

```sql
-- List partitions
SELECT * FROM table_partitions() WHERE table_name = 'market_candles';

-- Drop old partitions (older than 2 years)
ALTER TABLE market_candles DROP PARTITION LIST '2022-01-01', '2022-01-02';

-- Detach partition (move to archive)
ALTER TABLE market_candles DETACH PARTITION LIST '2022-01-01';
```

### Vacuum (Reclaim Space)

```sql
-- QuestDB automatically vacuums, but you can force it
VACUUM TABLE market_candles;
```

### Reindex

```sql
-- Rebuild indexes for better performance
REINDEX TABLE market_candles;
```

## Troubleshooting

### Migration Failed: "Table already exists"

The migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to re-run. If you want to start fresh:

```bash
# Option 1: Drop tables manually
psql -h localhost -p 8812 -U admin -d qdb -f migrations/001_rollback.sql

# Option 2: Use QuestDB console to drop tables
```

### Migration Timeout

If the migration times out (unlikely for empty tables):

1. Run tables in batches
2. Increase QuestDB memory: `QDB_CAIRO_MAX_MEMORY=8G`
3. Check QuestDB logs: `questdb/log/`

### Disk Space Issues

```bash
# Check QuestDB data directory size
du -sh questdb/db/

# Free up space by dropping old partitions
```

## Next Steps

After running the migration:

1. ✅ **Verify schema**: Run verification queries above
2. ✅ **Start services**:
   - `pnpm --filter market-feeder dev` (historical data fetching)
   - `pnpm --filter algo-worker dev` (feature computation)
3. ✅ **Backfill data**: See `services/market-feeder/docs/MULTI_TIMEFRAME_STRATEGY.md`
4. ✅ **Enable views**: Uncomment materialized views in migration after data ingestion

---

**Last Updated**: January 13, 2026  
**Version**: 1.0.0
