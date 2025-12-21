# SQL Query Reference - Quick Guide

## 📁 Available Queries

### Candles

| Query                          | Parameters                                                         | Usage                            |
| ------------------------------ | ------------------------------------------------------------------ | -------------------------------- |
| `candles/select-by-time-range` | `$1` instrument_key, `$2` interval, `$3` start_time, `$4` end_time | Get OHLCV candles for time range |
| `candles/select-latest`        | `$1` instrument_key, `$2` interval                                 | Get most recent candle           |
| `candles/check-data-exists`    | `$1` instrument_key, `$2` interval, `$3` start_time, `$4` end_time | Check if data available          |

### Quotes

| Query                         | Parameters                                          | Usage                          |
| ----------------------------- | --------------------------------------------------- | ------------------------------ |
| `quotes/select-by-time-range` | `$1` instrument_key, `$2` start_time, `$3` end_time | Get tick quotes for time range |
| `quotes/select-latest`        | `$1` instrument_key                                 | Get most recent quote          |
| `quotes/check-data-exists`    | `$1` instrument_key, `$2` start_time, `$3` end_time | Check if data available        |

### Greeks

| Query                         | Parameters                                          | Usage                            |
| ----------------------------- | --------------------------------------------------- | -------------------------------- |
| `greeks/select-by-time-range` | `$1` instrument_key, `$2` start_time, `$3` end_time | Get option greeks for time range |
| `greeks/select-latest`        | `$1` instrument_key                                 | Get most recent greeks           |
| `greeks/check-data-exists`    | `$1` instrument_key, `$2` start_time, `$3` end_time | Check if data available          |

### Depth

| Query                          | Parameters                                          | Usage                                               |
| ------------------------------ | --------------------------------------------------- | --------------------------------------------------- |
| `depth/select-by-time-range`   | `$1` instrument_key, `$2` start_time, `$3` end_time | Get order book depth for time range                 |
| `depth/select-latest-snapshot` | `$1` instrument_key                                 | Get full order book snapshot (5 levels, both sides) |
| `depth/check-data-exists`      | `$1` instrument_key, `$2` start_time, `$3` end_time | Check if data available                             |

---

## 🔧 TypeScript Usage

```typescript
import { loadSqlQueryCached } from "../utils/sql-loader";

// Load query (cached)
const sql = loadSqlQueryCached("candles/select-by-time-range");

// Execute with QuestDB
const result = await questdb.query(sql, [
  "NSE_INDEX|Nifty 50", // $1: instrument_key
  "1m", // $2: interval
  "2024-01-01T00:00:00Z", // $3: start_time
  "2024-01-31T23:59:59Z", // $4: end_time
]);
```

**Functions**:

- `loadSqlQuery(queryPath: string)` - Load SQL (no cache)
- `loadSqlQueryCached(queryPath: string)` - Load SQL (with cache)
- `clearSqlCache()` - Clear cache (hot-reload)

---

## 🐍 Python Usage

```python
from training_pipeline.utils.sql_loader import load_sql
import psycopg2

# Load query (cached)
sql = load_sql('candles/select-by-time-range')

# Execute with QuestDB
conn = psycopg2.connect(host='localhost', port=8812, user='admin', database='qdb')
cursor = conn.cursor()

cursor.execute(sql, [
    'NSE_INDEX|Nifty 50',    # $1: instrument_key
    '1m',                     # $2: interval
    '2024-01-01T00:00:00Z',   # $3: start_time
    '2024-01-31T23:59:59Z',   # $4: end_time
])

rows = cursor.fetchall()
```

**Functions**:

- `load_sql(query_path: str)` - Load SQL (convenience function)
- `SQLQueryLoader()` - Loader class with caching
- `list_queries()` - List all available queries

---

## 📊 Common Patterns

### Time Range (Last 30 Days)

```typescript
const endTime = new Date();
const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);

const sql = loadSqlQueryCached("candles/select-by-time-range");
const result = await questdb.query(sql, [
  instrumentKey,
  interval,
  startTime.toISOString(),
  endTime.toISOString(),
]);
```

### Latest Data

```typescript
const sql = loadSqlQueryCached("quotes/select-latest");
const result = await questdb.query(sql, [instrumentKey]);
const latestQuote = result.rows[0];
```

### Data Availability Check

```typescript
const sql = loadSqlQueryCached("candles/check-data-exists");
const result = await questdb.query(sql, [
  instrumentKey,
  interval,
  startTime.toISOString(),
  endTime.toISOString(),
]);
const dataExists = result.rows[0].count > 0;
```

---

## 🎯 Parameter Types

| Parameter        | Type       | Format                      | Example                |
| ---------------- | ---------- | --------------------------- | ---------------------- |
| `instrument_key` | `string`   | `{EXCHANGE}_{TYPE}\|{NAME}` | `NSE_INDEX\|Nifty 50`  |
| `interval`       | `string`   | `{number}{unit}`            | `1m`, `5m`, `1h`, `1D` |
| `timestamp`      | `ISO 8601` | `YYYY-MM-DDTHH:MM:SSZ`      | `2024-01-15T09:30:00Z` |
| `side`           | `string`   | `BUY` or `SELL`             | `BUY`                  |

---

## 🚀 Quick Start

### 1. TypeScript Repository

```typescript
// Import loader
import { loadSqlQueryCached } from "../utils/sql-loader";

// Replace embedded SQL
const sql = loadSqlQueryCached("candles/select-by-time-range");

// Execute query
const result = await this.questdb.query(sql, [param1, param2, param3, param4]);
```

### 2. Python Node

```python
# Import loader
from training_pipeline.utils.sql_loader import load_sql

# Load SQL
sql = load_sql('candles/select-by-time-range')

# Execute query
df = pd.read_sql_query(sql, conn, params=[param1, param2, param3, param4])
```

---

## 📚 Documentation

- **Comprehensive Guide**: [docs/SQL_QUERY_CENTRALIZATION.md](../../docs/SQL_QUERY_CENTRALIZATION.md)
- **SQL Details**: [packages/schema/sql/README.md](./README.md)
- **Migration Summary**: [packages/schema/sql/MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)

---

**Quick Tips**:

- ✅ Always use parameterized queries (`$1`, `$2`, etc.)
- ✅ Use caching functions (`loadSqlQueryCached`, `load_sql`)
- ✅ ISO 8601 timestamps in UTC
- ✅ Check data exists before querying large ranges
- ❌ Never concatenate user input into SQL
