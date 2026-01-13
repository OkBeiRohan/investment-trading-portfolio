# QuestDB Schema v2.0 - Quick Reference

**Last Updated**: January 13, 2026  
**Status**: Production-Ready

---

## 📊 Table Summary

| #   | Table Name               | Rows/Day       | Purpose                         | Source                                      |
| --- | ------------------------ | -------------- | ------------------------------- | ------------------------------------------- |
| 1   | `instrument_master`      | ~10K (static)  | Instrument registry             | Upstox `/v3/instrument/expired-instruments` |
| 2   | `market_candles`         | ~500K          | Unified OHLCV data              | Upstox Historical Candle V3                 |
| 3   | `orderbook_l2_snapshots` | ~5M (optional) | Level 2 order book              | Upstox Market Feed V3 (depth 30)            |
| 4   | `instrument_features_1m` | ~200K          | Derived features per instrument | Calculated from `market_candles`            |
| 5   | `option_chain_snapshot`  | ~100K          | Option chain + Greeks           | Upstox option feed + Greeks                 |
| 6   | `market_state_1m`        | ~390           | Market State Encoder output     | Aggregated from all sources                 |
| 7   | `training_labels_1m`     | ~390           | Supervised learning labels      | Label generation job                        |
| 8   | `system_audit`           | ~100K          | Audit logs                      | All services                                |

**Total Daily Volume**: ~6.3M rows/day (~1.2M excluding optional orderbook)

---

## 🔑 Primary Keys & Indexes

| Table                    | Primary Key                                                  | Indexed Columns                    |
| ------------------------ | ------------------------------------------------------------ | ---------------------------------- |
| `instrument_master`      | N/A                                                          | `instrument_key`                   |
| `market_candles`         | `(timestamp, instrument_key, interval_value, interval_unit)` | `instrument_key`                   |
| `orderbook_l2_snapshots` | `(timestamp, instrument_key, side, level)`                   | `instrument_key`                   |
| `instrument_features_1m` | `(timestamp, instrument_key)`                                | `instrument_key`                   |
| `option_chain_snapshot`  | `(timestamp, underlying_key, instrument_key)`                | `underlying_key`, `instrument_key` |
| `market_state_1m`        | `timestamp`                                                  | None                               |
| `training_labels_1m`     | `(timestamp, horizon_minutes)`                               | None                               |
| `system_audit`           | N/A                                                          | `trace_id`                         |

---

## 📈 Common Queries

### Get Latest Instrument Price

```sql
-- Single instrument
SELECT timestamp, close
FROM market_candles
WHERE instrument_key = 'NSE_INDEX|Nifty 50'
  AND interval_value = 1
  AND interval_unit = 'minute'
ORDER BY timestamp DESC
LIMIT 1;
```

### Get OHLCV for Time Range

```sql
-- 5-minute candles for last hour
SELECT *
FROM market_candles
WHERE instrument_key = 'NSE_INDEX|Nifty 50'
  AND interval_value = 5
  AND interval_unit = 'minute'
  AND timestamp >= dateadd('h', -1, now())
ORDER BY timestamp DESC;
```

### Get Instrument Details

```sql
-- Lookup instrument metadata
SELECT *
FROM instrument_master
WHERE instrument_key = 'NSE_FO|NIFTY24JANFUT';

-- Find all options for underlying
SELECT *
FROM instrument_master
WHERE underlying_key = 'NSE_INDEX|Nifty 50'
  AND instrument_type = 'OPTION'
  AND is_expired = false
ORDER BY strike, option_type;
```

### Get Option Chain Snapshot

```sql
-- Latest option chain for NIFTY
SELECT *
FROM option_chain_snapshot
WHERE underlying_key = 'NSE_INDEX|Nifty 50'
  AND timestamp >= dateadd('m', -5, now())
ORDER BY strike, option_type;
```

### Get Market State for ML

```sql
-- Latest market state (feeds LightGBM)
SELECT *
FROM market_state_1m
WHERE timestamp >= dateadd('h', -1, now())
ORDER BY timestamp DESC;
```

### Get Training Labels

```sql
-- Get labels for 5-minute horizon
SELECT *
FROM training_labels_1m
WHERE horizon_minutes = 5
  AND timestamp >= '2026-01-01'
ORDER BY timestamp DESC;
```

### Get Order Book Depth

```sql
-- Latest bid/ask levels (top 10)
SELECT side, level, price, quantity
FROM orderbook_l2_snapshots
WHERE instrument_key = 'NSE_INDEX|Nifty 50'
  AND timestamp >= dateadd('m', -1, now())
  AND level <= 10
ORDER BY timestamp DESC, side, level
LIMIT 20;
```

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     UPSTOX V3 APIS                              │
│  - Historical Candle V3                                         │
│  - Expired Instruments                                          │
│  - Market Feed V3 (depth 30)                                    │
│  - Option Greeks                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    MARKET-FEEDER SERVICE                        │
│  - Ingests live market data                                     │
│  - Normalizes to Upstox format                                  │
│  - Writes to QuestDB                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 RAW TABLES (append-only)                        │
│  ✅ instrument_master                                           │
│  ✅ market_candles                                              │
│  ✅ orderbook_l2_snapshots (optional)                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  COMPUTE-ENGINE SERVICE                         │
│  - Calculates instrument_features_1m (VWAP, ATR, RSI, etc.)    │
│  - Aggregates into market_state_1m (Market State Encoder)      │
│  - Generates training_labels_1m (label generation job)         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 DERIVED TABLES (computed)                       │
│  ✅ instrument_features_1m                                      │
│  ✅ option_chain_snapshot                                       │
│  ✅ market_state_1m                                             │
│  ✅ training_labels_1m                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  DOWNSTREAM CONSUMERS                           │
│  - training-pipeline: Trains LightGBM models                    │
│  - algo-worker: Real-time inference (reads market_state_1m)     │
│  - backtester: Historical simulations                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 TypeScript Types

```typescript
import {
  InstrumentMasterSchema,
  MarketCandleSchema,
  OrderbookL2SnapshotSchema,
  InstrumentFeatures1mSchema,
  OptionChainSnapshotSchema,
  MarketState1mSchema,
  TrainingLabels1mSchema,
  SystemAuditSchema,
  type InstrumentMaster,
  type MarketCandle,
  type OrderbookL2Snapshot,
  type InstrumentFeatures1m,
  type OptionChainSnapshot,
  type MarketState1m,
  type TrainingLabels1m,
  type SystemAudit,
  QuestDBTables,
} from "@repo/schema";

// Example: Validate market candle
const candle = MarketCandleSchema.parse({
  timestamp: new Date(),
  instrumentKey: "NSE_INDEX|Nifty 50",
  intervalValue: 5,
  intervalUnit: "minute",
  open: 22100.5,
  high: 22110.0,
  low: 22095.0,
  close: 22105.0,
  volume: 1000000,
  openInterest: null,
});

// Example: Table name constants
const tableName = QuestDBTables.MARKET_CANDLES; // "market_candles"
```

---

## 🚀 Performance Tips

1. **Use batch inserts** (10K rows at a time):

   ```typescript
   const values = candles
     .map(
       (c) =>
         `('${c.timestamp}', '${c.instrumentKey}', ${c.intervalValue}, '${c.intervalUnit}', ${c.open}, ${c.high}, ${c.low}, ${c.close}, ${c.volume}, ${c.openInterest ?? "NULL"})`
     )
     .join(",");

   await pool.query(`INSERT INTO market_candles VALUES ${values}`);
   ```

2. **Use SAMPLE BY for downsampling**:

   ```sql
   SELECT
     timestamp,
     first(open) as open,
     max(high) as high,
     min(low) as low,
     last(close) as close,
     sum(volume) as volume
   FROM market_candles
   WHERE instrument_key = 'NSE_INDEX|Nifty 50'
     AND interval_value = 1
     AND interval_unit = 'minute'
   SAMPLE BY 5m ALIGN TO CALENDAR;
   ```

3. **Index on frequently filtered columns**:
   - Already indexed: `instrument_key`, `underlying_key`, `trace_id`
   - Use in WHERE clauses for fast lookups

4. **Partition by DAY**:
   - All tables are partitioned by day
   - Queries on recent data are fast
   - Old partitions can be dropped for retention

5. **Use DEDUP UPSERT**:
   - Prevents duplicate inserts
   - Idempotent writes (safe to retry)

---

## 🛠️ Maintenance

### Drop Old Partitions (7-day retention example)

```sql
-- List partitions older than 7 days
SELECT * FROM table_partitions('market_candles')
WHERE timestamp < dateadd('d', -7, now());

-- Drop old partitions
ALTER TABLE market_candles DROP PARTITION '2026-01-01';
```

### Vacuum (reclaim space)

```sql
-- QuestDB automatically vacuums, but you can force it:
VACUUM TABLE market_candles;
```

### Check Table Sizes

```sql
SELECT
  table_name,
  count(*) as rows,
  round(sum(diskSize) / 1024 / 1024, 2) as size_mb
FROM table_partitions()
GROUP BY table_name
ORDER BY size_mb DESC;
```

---

## 🔗 Related Documentation

- [Migration Guide](./MIGRATION_v2.md) - How to upgrade from v1.0
- [Training Data Schema](../docs/TRAINING_DATA_SCHEMA.md) - Legacy schema reference
- [SQL Centralization](../docs/SQL_QUERY_CENTRALIZATION.md) - SQL best practices
- [@repo/schema README](../../schema/README.md) - TypeScript types

---

**Last Updated**: January 13, 2026  
**Version**: 2.0.0  
**Status**: ✅ Production-Ready
