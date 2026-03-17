# SQL Queries for QuestDB

This directory contains parameterized SQL queries for accessing QuestDB time-series data.

## Purpose

These SQL files are **shared across TypeScript and Python services** to ensure:

- ✅ **Single source of truth** for database queries
- ✅ **Polyglot access** (TypeScript repositories + Python training pipeline)
- ✅ **Version control** for SQL logic
- ✅ **Easy testing** and maintenance

## Directory Structure

```
sql/
├── candles/
│   ├── select-by-time-range.sql     # Query candles for time range
│   ├── select-latest.sql            # Get latest candle
│   └── check-data-exists.sql        # Check if data exists
├── quotes/
│   ├── select-by-time-range.sql     # Query quotes for time range
│   ├── select-latest.sql            # Get latest quote
│   └── check-data-exists.sql        # Check if data exists
├── greeks/
│   ├── select-by-time-range.sql     # Query option greeks for time range
│   ├── select-latest.sql            # Get latest greeks
│   └── check-data-exists.sql        # Check if data exists
└── depth/
    ├── select-by-time-range.sql     # Query market depth for time range
    ├── select-latest-snapshot.sql   # Get latest depth snapshot
    └── check-data-exists.sql        # Check if data exists
```

## Usage in TypeScript

```typescript
import { readFileSync } from "fs";
import { join } from "path";

// Load SQL from @repo/schema
const sqlPath =
  require.resolve("@repo/schema/sql/candles/select-by-time-range");
const sql = readFileSync(sqlPath, "utf-8");

// Execute with parameters
const result = await questdb.query(sql, [
  "NSE_INDEX|Nifty 50", // $1: instrument_key
  "1m", // $2: interval
  "2024-01-01T00:00:00Z", // $3: start_time
  "2024-01-31T23:59:59Z", // $4: end_time
]);
```

## Usage in Python

```python
from pathlib import Path
import psycopg2

# Load SQL from @repo/schema (monorepo package)
schema_path = Path(__file__).parent.parent / 'packages' / 'schema'
sql_path = schema_path / 'sql' / 'candles' / 'select-by-time-range.sql'

with open(sql_path, 'r') as f:
    sql = f.read()

# Execute with parameters (QuestDB PostgreSQL wire protocol)
conn = psycopg2.connect(
    host='localhost',
    port=8812,
    user='admin',
    database='qdb'
)

with conn.cursor() as cur:
    cur.execute(sql, [
        'NSE_INDEX|Nifty 50',    # $1: instrument_key
        '1m',                     # $2: interval
        '2024-01-01T00:00:00Z',   # $3: start_time
        '2024-01-31T23:59:59Z',   # $4: end_time
    ])
    rows = cur.fetchall()
```

## Parameter Conventions

All SQL queries use **positional parameters** (`$1`, `$2`, etc.) compatible with:

- PostgreSQL wire protocol (QuestDB, psycopg2)
- node-postgres (`pg` npm package)

### Common Parameters

| Parameter        | Type        | Description                    | Example                        |
| ---------------- | ----------- | ------------------------------ | ------------------------------ |
| `instrument_key` | `string`    | Instrument identifier          | `'NSE_INDEX\|Nifty 50'`        |
| `interval`       | `string`    | Candle interval                | `'1m'`, `'5m'`, `'1h'`, `'1D'` |
| `start_time`     | `timestamp` | Start of time range (ISO 8601) | `'2024-01-01T00:00:00Z'`       |
| `end_time`       | `timestamp` | End of time range (ISO 8601)   | `'2024-01-31T23:59:59Z'`       |
| `side`           | `string`    | Order book side (optional)     | `'BUY'`, `'SELL'`              |
| `limit`          | `integer`   | Max rows to return (optional)  | `1000`                         |

## Table Schemas

### market_candles

```sql
CREATE TABLE market_candles (
  timestamp TIMESTAMP,
  instrument_key SYMBOL,
  interval SYMBOL,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume LONG,
  open_interest LONG
) TIMESTAMP(timestamp) PARTITION BY DAY;
```

### market_quotes

```sql
CREATE TABLE market_quotes (
  timestamp TIMESTAMP,
  instrument_key SYMBOL,
  ltp DOUBLE,
  bid DOUBLE,
  ask DOUBLE,
  bid_qty LONG,
  ask_qty LONG,
  volume LONG,
  open_interest LONG,
  upper_circuit DOUBLE,
  lower_circuit DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY;
```

### option_greeks

```sql
CREATE TABLE option_greeks (
  timestamp TIMESTAMP,
  instrument_key SYMBOL,
  delta DOUBLE,
  gamma DOUBLE,
  theta DOUBLE,
  vega DOUBLE,
  iv DOUBLE,
  underlying_price DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY;
```

### market_depth

```sql
CREATE TABLE market_depth (
  timestamp TIMESTAMP,
  instrument_key SYMBOL,
  side SYMBOL,  -- 'BUY' or 'SELL'
  level INT,     -- 0-4 for 5 levels
  price DOUBLE,
  quantity LONG,
  orders INT
) TIMESTAMP(timestamp) PARTITION BY DAY;
```

## Query Patterns

### Time-Range Queries

All time-range queries follow this pattern:

```sql
WHERE instrument_key = $1
  AND timestamp >= $2
  AND timestamp <= $3
ORDER BY timestamp ASC
```

### Latest Data Queries

Latest data queries use `ORDER BY timestamp DESC LIMIT 1`:

```sql
WHERE instrument_key = $1
ORDER BY timestamp DESC
LIMIT 1
```

### Existence Checks

Data existence checks use `COUNT(*)`:

```sql
SELECT COUNT(*) as count
FROM {table}
WHERE instrument_key = $1
  AND timestamp >= $2
  AND timestamp <= $3
```

## Adding New Queries

When adding new SQL queries:

1. **Create `.sql` file** in appropriate subdirectory
2. **Add parameter comments** at the top (see existing files)
3. **Use positional parameters** (`$1`, `$2`, etc.)
4. **Test with both TypeScript and Python**
5. **Update this README** with usage examples

## Testing

### TypeScript Test

```typescript
import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";

describe("SQL Queries", () => {
  it("should load candles query", () => {
    const sqlPath =
      require.resolve("@repo/schema/sql/candles/select-by-time-range");
    const sql = readFileSync(sqlPath, "utf-8");

    expect(sql).toContain("SELECT");
    expect(sql).toContain("FROM market_candles");
    expect(sql).toContain("$1"); // instrument_key parameter
  });
});
```

### Python Test

```python
import pytest
from pathlib import Path

def test_load_candles_query():
    schema_path = Path(__file__).parent.parent / 'packages' / 'schema'
    sql_path = schema_path / 'sql' / 'candles' / 'select-by-time-range.sql'

    with open(sql_path, 'r') as f:
        sql = f.read()

    assert 'SELECT' in sql
    assert 'FROM market_candles' in sql
    assert '$1' in sql  # instrument_key parameter
```

## Notes

- **Timestamps**: Always use ISO 8601 format (`YYYY-MM-DDTHH:MM:SSZ`)
- **Timezones**: QuestDB stores timestamps in UTC
- **Performance**: Add `LIMIT` clause for large result sets
- **Indexing**: QuestDB auto-indexes `timestamp` and `SYMBOL` columns

---

**Last Updated**: March 17, 2026  
**Maintained by**: Platform Team
