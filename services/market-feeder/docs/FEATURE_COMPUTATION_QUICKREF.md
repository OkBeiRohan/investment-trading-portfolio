# Quick Reference: Data Collection & Feature Computation

## TL;DR

**market-feeder** = Raw data → QuestDB + Batch feature computation → training_features tables  
**algo-worker** = Live trading → compute-engine → ephemeral features (no storage)  
**training-pipeline** = Reads training_features → trains models

---

## Enable Feature Computation

```bash
# .env
FEATURE_COMPUTATION_ENABLED=true
FEATURE_COMPUTATION_INSTRUMENTS=NSE_INDEX|Nifty 50,NSE_INDEX|Nifty Bank
```

---

## Manual Trigger

```typescript
import { FeatureComputationScheduler } from './feature-computation';

// Inject scheduler
const rowsStored = await scheduler.triggerManualComputation(
  new Date('2026-01-01T09:15:00'),
  new Date('2026-01-01T15:30:00'),
  ['NSE_INDEX|Nifty 50'],
);
```

---

## Query Features

```sql
-- Check stored features
SELECT * FROM training_features_lightgbm
WHERE instrument_key = 'NSE_INDEX|Nifty 50'
  AND timestamp >= '2026-01-13T09:15:00'
ORDER BY timestamp ASC
LIMIT 10;

-- Feature count by instrument
SELECT instrument_key, COUNT(*) as feature_count
FROM training_features_lightgbm
GROUP BY instrument_key;
```

---

## 33 Features Computed

| Category         | Features                                              | Count |
| ---------------- | ----------------------------------------------------- | ----- |
| Market Structure | price_vs_vwap, range_position, high/low distances     | 8     |
| Momentum & Trend | RSI (5/14/21), MACD, EMA slopes, ADX, ROC             | 8     |
| Volatility       | ATR%, realized vol (5m/15m), vol expansion, India VIX | 5     |
| Options          | ATM IV, Greeks (δγνθ), PCR (OI/vol), max pain         | 9     |
| Time Context     | mins from open/to close, day of week                  | 3     |

---

## Scheduler

| Trigger | Schedule        | Purpose                    |
| ------- | --------------- | -------------------------- |
| Hourly  | 9-15:00 Mon-Fri | Incremental (last 2 hours) |
| EOD     | 15:45 Mon-Fri   | Full day reconciliation    |
| Weekly  | Sun 2:00 AM     | Full week recomputation    |

---

## File Structure

```
services/market-feeder/src/
├── feature-computation/
│   ├── feature-computation.module.ts      # NestJS module
│   ├── feature-computation.service.ts     # Orchestration logic
│   ├── feature-computation.scheduler.ts   # Cron jobs
│   ├── compute-engine.service.ts          # Rust wrapper
│   └── index.ts                           # Exports
└── app.module.ts                          # Import here
```

---

## Troubleshooting

**No features stored?**

1. Check `FEATURE_COMPUTATION_ENABLED=true`
2. Verify raw data exists: `SELECT COUNT(*) FROM market_ticks;`
3. Check compute-engine binary: `ls packages/compute-engine/target/release/`

**Scheduler not running?**

1. Check timezone: `Asia/Kolkata`
2. View logs: `pnpm dev --filter=market-feeder`

**Compute engine errors?**

```bash
cd packages/compute-engine
cargo build --release
./target/release/compute-engine --version
```

---

## Full Documentation

See [FEATURE_COMPUTATION_ARCHITECTURE.md](./FEATURE_COMPUTATION_ARCHITECTURE.md)
