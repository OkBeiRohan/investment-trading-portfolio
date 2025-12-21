# SQL Query Centralization Documentation

## Overview

All QuestDB SQL queries have been centralized in `packages/schema/sql/` to ensure **TypeScript services and Python training pipeline use identical queries**.

## Architecture

```
@repo/schema/
├── sql/
│   ├── candles/
│   │   ├── select-by-time-range.sql
│   │   ├── select-latest.sql
│   │   └── check-data-exists.sql
│   ├── quotes/
│   ├── greeks/
│   └── depth/
└── package.json  # Exports: "./sql/*": "./sql/**/*.sql"

TypeScript Services → @repo/database → loadSqlQuery() → @repo/schema/sql/
Python Pipeline    → sql_loader.py   → load_sql()     → @repo/schema/sql/
                                                           ↑
                                                   Single Source of Truth
```

## Benefits

### 1. **Query Consistency**

- TypeScript repositories and Python training nodes use **identical SQL**
- No risk of query drift between services
- Easier to maintain and update queries

### 2. **Version Control**

- SQL logic tracked in Git
- Changes visible in PR diffs
- Easy to review and revert

### 3. **Polyglot Support**

- TypeScript: `require.resolve('@repo/schema/sql/...')`
- Python: `load_sql('candles/select-by-time-range')`

### 4. **Testing**

- Can test SQL queries independently
- Validate parameter substitution
- Ensure QuestDB compatibility

## Usage

### TypeScript (NestJS Services)

```typescript
// packages/database/src/questdb/repositories/candles.repository.ts

import { loadSqlQueryCached } from "../utils/sql-loader";

@Injectable()
export class CandlesRepository {
  async findByTimeRange(query: ICandleQuery): Promise<IMarketCandle[]> {
    // Load SQL from @repo/schema (cached for performance)
    const sql = loadSqlQueryCached("candles/select-by-time-range");

    const result = await this.questdb.query(sql, [
      query.instrument_key,
      query.interval,
      query.start_time.toISOString(),
      query.end_time.toISOString(),
    ]);

    return result.rows.map((row) => ({
      ...row,
      timestamp: new Date(row.timestamp),
    }));
  }
}
```

### Python (Training Pipeline)

```python
# services/training-pipeline/src/training_pipeline/pipelines/data_ingestion/nodes.py

from training_pipeline.utils.sql_loader import load_sql
import psycopg2
import pandas as pd

def fetch_candles(instrument_key: str, interval: str, start_time: datetime, end_time: datetime):
    # Load SQL from @repo/schema (same query as TypeScript!)
    sql = load_sql('candles/select-by-time-range')

    conn = psycopg2.connect(host='localhost', port=8812, user='admin', database='qdb')

    df = pd.read_sql_query(sql, conn, params=[
        instrument_key,
        interval,
        start_time.isoformat(),
        end_time.isoformat(),
    ])

    return df
```

## SQL Utilities

### TypeScript: `sql-loader.ts`

```typescript
// packages/database/src/questdb/utils/sql-loader.ts

export function loadSqlQuery(queryPath: string): string;
export function loadSqlQueryCached(queryPath: string): string;
export function clearSqlCache(): void;
```

**Features**:

- ✅ Resolves SQL files via `require.resolve()`
- ✅ Caching for performance
- ✅ Cache clearing for hot-reload

### Python: `sql_loader.py`

```python
# services/training-pipeline/src/training_pipeline/utils/sql_loader.py

from training_pipeline.utils.sql_loader import load_sql, SQLQueryLoader

# Convenience function
sql = load_sql('candles/select-by-time-range')

# Or use class for more control
loader = SQLQueryLoader()
sql = loader.load('candles/select-by-time-range')
queries = loader.list_queries()
```

**Features**:

- ✅ Auto-detects monorepo structure
- ✅ Caching for performance
- ✅ Lists all available queries

## Available Queries

### Candles (`candles/`)

| Query                      | Parameters                                                         | Description                  |
| -------------------------- | ------------------------------------------------------------------ | ---------------------------- |
| `select-by-time-range.sql` | `$1` instrument_key, `$2` interval, `$3` start_time, `$4` end_time | Query candles for time range |
| `select-latest.sql`        | `$1` instrument_key, `$2` interval                                 | Get latest candle            |
| `check-data-exists.sql`    | `$1` instrument_key, `$2` interval, `$3` start_time, `$4` end_time | Check if data exists         |

### Quotes (`quotes/`)

| Query                      | Parameters                                          | Description                 |
| -------------------------- | --------------------------------------------------- | --------------------------- |
| `select-by-time-range.sql` | `$1` instrument_key, `$2` start_time, `$3` end_time | Query quotes for time range |
| `select-latest.sql`        | `$1` instrument_key                                 | Get latest quote            |
| `check-data-exists.sql`    | `$1` instrument_key, `$2` start_time, `$3` end_time | Check if data exists        |

### Greeks (`greeks/`)

| Query                      | Parameters                                          | Description                 |
| -------------------------- | --------------------------------------------------- | --------------------------- |
| `select-by-time-range.sql` | `$1` instrument_key, `$2` start_time, `$3` end_time | Query greeks for time range |
| `select-latest.sql`        | `$1` instrument_key                                 | Get latest greeks           |
| `check-data-exists.sql`    | `$1` instrument_key, `$2` start_time, `$3` end_time | Check if data exists        |

### Depth (`depth/`)

| Query                        | Parameters                                          | Description                            |
| ---------------------------- | --------------------------------------------------- | -------------------------------------- |
| `select-by-time-range.sql`   | `$1` instrument_key, `$2` start_time, `$3` end_time | Query depth for time range             |
| `select-latest-snapshot.sql` | `$1` instrument_key                                 | Get latest depth snapshot (all levels) |
| `check-data-exists.sql`      | `$1` instrument_key, `$2` start_time, `$3` end_time | Check if data exists                   |

## Adding New Queries

1. **Create `.sql` file** in `packages/schema/sql/{category}/`
2. **Add parameter comments** at the top
3. **Use positional parameters** (`$1`, `$2`, etc.)
4. **Test with both TypeScript and Python**
5. **Update this documentation**

Example:

```sql
-- Get OHLC summary for instrument
-- Parameters: $1 = instrument_key, $2 = start_time, $3 = end_time
SELECT
  MIN(low) as period_low,
  MAX(high) as period_high,
  first(open) as period_open,
  last(close) as period_close
FROM market_candles
WHERE instrument_key = $1
  AND timestamp >= $2
  AND timestamp <= $3;
```

## Testing

### TypeScript Test

```typescript
import { loadSqlQuery } from "../utils/sql-loader";

describe("SQL Queries", () => {
  it("should load candles query", () => {
    const sql = loadSqlQuery("candles/select-by-time-range");
    expect(sql).toContain("FROM market_candles");
    expect(sql).toContain("$1"); // instrument_key parameter
  });
});
```

### Python Test

```python
from training_pipeline.utils.sql_loader import load_sql

def test_load_candles_query():
    sql = load_sql('candles/select-by-time-range')
    assert 'FROM market_candles' in sql
    assert '$1' in sql  # instrument_key parameter
```

## Migration Guide

### Migrating Existing Repositories

**Before** (embedded SQL):

```typescript
async findLatest(instrumentKey: string) {
  const sql = `
    SELECT timestamp, ltp, bid, ask
    FROM market_quotes
    WHERE instrument_key = $1
    ORDER BY timestamp DESC
    LIMIT 1
  `;
  return this.questdb.query(sql, [instrumentKey]);
}
```

**After** (shared SQL):

```typescript
import { loadSqlQueryCached } from '../utils/sql-loader';

async findLatest(instrumentKey: string) {
  const sql = loadSqlQueryCached('quotes/select-latest');
  return this.questdb.query(sql, [instrumentKey]);
}
```

## Performance

### Caching

- **TypeScript**: `loadSqlQueryCached()` caches queries in memory
- **Python**: `SQLQueryLoader` uses internal `_cache` dict
- **Cache invalidation**: Only needed during development (hot-reload)

### Benchmarks

- **Without cache**: ~1-2ms to read `.sql` file from disk
- **With cache**: ~0.001ms (in-memory lookup)
- **Negligible overhead** compared to network I/O for database queries

## Security

### SQL Injection Prevention

- ✅ **Always use parameterized queries** (`$1`, `$2`, etc.)
- ✅ **Never concatenate user input** into SQL strings
- ✅ **PostgreSQL wire protocol** handles parameter escaping

### Access Control

- SQL files are **read-only** at runtime
- Only `@repo/database` and `training_pipeline` can execute queries
- QuestDB connection credentials in environment variables

## Troubleshooting

### "SQL query not found" Error

**TypeScript**:

```typescript
Error: Cannot find module '@repo/schema/sql/candles/select-latest.sql'
```

**Solution**: Ensure `@repo/schema` is built and `sql/` directory exists.

**Python**:

```python
FileNotFoundError: SQL query not found: /path/to/schema/sql/candles/select-latest.sql
```

**Solution**: Check monorepo structure. Ensure `packages/schema/sql/` exists.

### Query Parameter Mismatch

**Error**: `bind message supplies 3 parameters, but prepared statement requires 4`

**Solution**: Check SQL file parameter count matches function call:

```python
# SQL has 4 parameters ($1, $2, $3, $4)
cursor.execute(sql, [param1, param2, param3, param4])
```

## References

- **QuestDB PostgreSQL Wire Protocol**: https://questdb.io/docs/reference/api/postgres/
- **psycopg2 Parameterized Queries**: https://www.psycopg.org/docs/usage.html#query-parameters
- **node-postgres Parameters**: https://node-postgres.com/features/queries#parameterized-query

---

**Last Updated**: December 2024  
**Maintained by**: Platform Team
