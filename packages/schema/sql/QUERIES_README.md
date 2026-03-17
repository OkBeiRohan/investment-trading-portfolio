# QuestDB SQL Queries v2.0

This directory contains SQL queries used by `@repo/database` repositories.

## Directory Structure

```
sql/
├── schema/              # CREATE TABLE statements (loaded by QuestDBService)
├── candles/             # Market candles queries
├── instrument-master/   # Instrument registry queries
├── instrument-features/ # Per-instrument features queries
├── market-state/        # Market state (LightGBM input) queries
├── option-chain/        # Option chain snapshots queries
├── training-labels/     # Training labels queries
└── utils/               # Utility queries (gap detection, auditing)
```

## Usage Pattern

### In Repositories

```typescript
import { loadSqlQueryCached } from '../utils/sql-loader';

@Injectable()
export class CandlesRepository {
  async findByTimeRange(...): Promise<MarketCandle[]> {
    // Load SQL from packages/schema/sql/candles/get-by-time-range.sql
    const sql = loadSqlQueryCached('candles/get-by-time-range');
    const result = await this.pool.query(sql, [instrumentKey, ...params]);
    return result.rows.map(row => this.mapRow(row));
  }
}
```

### Caching

All SQL queries are cached in memory after first load for performance.

### File Naming Convention

- **Queries**: `<action>-<entity>-<modifier>.sql`
  - Examples: `get-by-time-range.sql`, `get-latest.sql`, `check-exists.sql`
- **Schema**: `create_<table_name>.sql`
  - Examples: `create_market_candles.sql`, `create_instrument_master.sql`

## Query Inventory

### candles/

- `get-by-time-range.sql` - Fetch candles for time window (with limit)
- `get-latest.sql` - Get latest candle for instrument + interval
- `check-exists.sql` - Check if data exists in range

### instrument-master/

- `get-by-key.sql` - Get instrument by key
- `get-active.sql` - Get all active instruments
- `get-options.sql` - Get options for underlying
- `get-options-by-expiry.sql` - Get options for underlying + expiry

### instrument-features/

- `get-latest.sql` - Get latest 31-column features for instrument
- `get-by-time-range.sql` - Get features for time range

### market-state/

- `get-latest.sql` - Get latest 33-feature market state
- `get-by-time-range.sql` - Get states for time range (training)
- `get-last-n.sql` - Get last N states

### option-chain/

- `get-latest-chain.sql` - Get latest option chain for underlying
- `get-latest-chain-by-expiry.sql` - Get chain for specific expiry
- `get-atm-options.sql` - Get ATM options (closest to spot)

### training-labels/

- `get-by-time-range.sql` - Get labels for time range + horizon

## Parameter Conventions

All queries use PostgreSQL positional parameters (`$1`, `$2`, etc.):

- **$1**: Usually `instrument_key` or primary filter
- **$2+**: Additional filters (timestamps, intervals, etc.)
- **Last param**: Often `LIMIT` for pagination

## Performance Tips

1. **Use parameterized queries** - Prevents SQL injection + enables query plan caching
2. **Add LIMIT clauses** - Avoid unbounded result sets
3. **Index-aware filtering** - Filter on indexed columns first
4. **Minimize SELECT \*** - Specify columns when possible (future optimization)

## Adding New Queries

1. Create SQL file in appropriate directory
2. Use parameterized queries ($1, $2, etc.)
3. Add JSDoc comment in repository method explaining parameters
4. Test with sample data before committing

---

**Last Updated**: March 17, 2026  
**Version**: 2.0 (Production Schema)
