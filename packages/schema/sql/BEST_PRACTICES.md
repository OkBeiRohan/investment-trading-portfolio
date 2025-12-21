# SQL Query Best Practices

## ✅ DO: Use Parameterized Queries

### For Optional Filters (e.g., side filter)

```typescript
// ✅ GOOD: Use parameter with NULL check in SQL
const sql = loadSqlQueryCached("depth/select-by-time-range-filtered");
const result = await questdb.query(sql, [
  instrumentKey,
  startTime.toISOString(),
  endTime.toISOString(),
  query.side || null, // NULL = no filter
  query.limit || 999999999,
]);
```

**SQL**:

```sql
WHERE instrument_key = $1
  AND timestamp >= $2
  AND timestamp <= $3
  AND ($4::text IS NULL OR side = $4)  -- ✅ NULL-safe filter
LIMIT $5;
```

### For LIMIT Clause

```typescript
// ✅ GOOD: Use parameter with high default
const sql = loadSqlQueryCached("candles/select-by-time-range-with-limit");
const result = await questdb.query(sql, [
  instrumentKey,
  interval,
  startTime.toISOString(),
  endTime.toISOString(),
  query.limit || 999999999, // High number = effectively no limit
]);
```

**SQL**:

```sql
ORDER BY timestamp ASC
LIMIT $5;  -- ✅ Always use parameter
```

---

## ❌ DON'T: String Manipulation

### Avoid String Replacement for Filters

```typescript
// ❌ BAD: String manipulation (SQL injection risk, harder to test)
let sql = loadSqlQueryCached("depth/select-by-time-range");
if (query.side) {
  sql = sql.replace(
    "WHERE instrument_key = $1",
    `WHERE instrument_key = $1\n  AND side = '${query.side}'` // ❌ Injection risk!
  );
}
```

### Avoid String Concatenation for LIMIT

```typescript
// ❌ BAD: String concatenation
let sql = loadSqlQueryCached("candles/select-by-time-range");
if (query.limit) {
  sql = sql.trim().replace(/;$/, "") + ` LIMIT ${query.limit};`; // ❌ Error-prone
}
```

---

## Why Parameterized Queries?

### 1. **Security**

- ✅ Prevents SQL injection
- ✅ Proper escaping handled by driver
- ❌ String concatenation can introduce vulnerabilities

### 2. **Performance**

- ✅ Query plan caching (database can reuse execution plan)
- ✅ No string manipulation overhead
- ❌ String replacement creates unique queries each time

### 3. **Testability**

- ✅ SQL files can be tested independently
- ✅ No need to mock TypeScript string manipulation
- ✅ Python can use identical SQL with same parameters

### 4. **Maintainability**

- ✅ Single source of truth (SQL file)
- ✅ Clear parameter contracts
- ✅ Easier to review and modify

---

## NULL-Safe Optional Filters

QuestDB (PostgreSQL) supports NULL-safe conditional filters:

```sql
-- Filter only when parameter is provided
AND ($4::text IS NULL OR side = $4)

-- Equivalent to TypeScript:
if (side !== null) {
  WHERE side = $4
}
```

**Pattern**:

- Pass `null` when filter not needed
- Pass actual value when filter needed
- SQL handles both cases

**Example**:

```typescript
// No side filter - gets all sides
query(sql, [instrumentKey, startTime, endTime, null, 1000]);

// Filter for BUY side only
query(sql, [instrumentKey, startTime, endTime, "BUY", 1000]);
```

---

## High Number Pattern for Optional LIMIT

Use a very high number to effectively disable LIMIT:

```typescript
query.limit || 999999999; // 999M rows = effectively unlimited
```

**Why not `Number.MAX_SAFE_INTEGER`?**

- QuestDB uses 32-bit INT for LIMIT
- 999,999,999 is safe and clear
- Python equivalent: `limit or 999_999_999`

---

## Table Name Substitution (Exception)

**Only for trusted table names from enums**:

```typescript
// ✅ SAFE: Table name from enum (not user input)
let sql = loadSqlQueryCached("utils/check-data-exists");
sql = sql.replace("{TABLE_NAME}", table);  // table is from enum

// SQL template
SELECT COUNT(*) FROM {TABLE_NAME}  -- Placeholder
WHERE instrument_key = $1
```

**Why this is safe**:

- Table name from TypeScript enum
- Never from user input
- Python equivalent uses same enum

**Alternatives considered**:

- ❌ Dynamic table name parameter (not supported by PostgreSQL)
- ❌ Separate SQL file per table (too much duplication)
- ✅ Template substitution with enum (safe + DRY)

---

## Summary

| Pattern                   | Security  | Performance | Maintainability |
| ------------------------- | --------- | ----------- | --------------- |
| **Parameterized queries** | ✅ Safe   | ✅ Fast     | ✅ Easy         |
| String replacement        | ❌ Risk   | ❌ Slow     | ❌ Hard         |
| Enum substitution         | ✅ Safe\* | ✅ Fast     | ✅ Easy         |

\*Safe only when value comes from trusted enum, not user input.

---

**Last Updated**: December 2024  
**See Also**: [SQL_QUERY_CENTRALIZATION.md](../../docs/SQL_QUERY_CENTRALIZATION.md)
