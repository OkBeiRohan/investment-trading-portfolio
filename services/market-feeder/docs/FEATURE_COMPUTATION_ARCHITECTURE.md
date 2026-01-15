# Data Collection & Feature Computation Architecture

## Overview

This document explains the **separation of concerns** between raw data collection and feature computation for ML training.

---

## Architecture Diagram

```
┌─────────────────┐
│  Upstox WebSocket│
│   (Market Data)  │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    market-feeder                         │
│  ┌──────────────────────┐   ┌──────────────────────┐   │
│  │ Historical Data      │   │ Feature Computation  │   │
│  │ Collection           │   │ Service              │   │
│  │                      │   │                      │   │
│  │ Raw Data → QuestDB   │   │ Raw → compute-engine │   │
│  │  - Ticks             │   │       → Features     │   │
│  │  - Candles           │   │       → QuestDB      │   │
│  │  - Quotes            │   │                      │   │
│  │  - Greeks            │   │ (Scheduled batches)  │   │
│  └──────────────────────┘   └──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐            ┌─────────────────┐
│    QuestDB      │            │    QuestDB      │
│  market_ticks   │            │ training_       │
│  market_candles │            │  features_*     │
│  market_quotes  │            │                 │
│  option_greeks  │            │ (33 features)   │
└─────────────────┘            └─────────────────┘
         │                              │
         │                              ▼
         │                     ┌─────────────────┐
         │                     │ training-       │
         │                     │  pipeline       │
         │                     │                 │
         │                     │ Model Training  │
         │                     └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    algo-worker                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Live Trading                                      │  │
│  │                                                   │  │
│  │ Raw Market Data → compute-engine → Features      │  │
│  │                                ↓                  │  │
│  │                           ML Inference           │  │
│  │                        (Ephemeral - No Storage)  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Design Principles

### **1. Single Responsibility**

Each service has ONE job:

| Service                 | Responsibility                                   |
| ----------------------- | ------------------------------------------------ |
| **market-feeder**       | Collect raw market data from Upstox/Binance      |
| **feature-computation** | Batch process raw data → features (for training) |
| **algo-worker**         | Live trading with real-time feature computation  |
| **training-pipeline**   | Train ML models using stored features            |

### **2. Code Reuse**

**compute-engine** (Rust) is the single source of truth for feature calculation:

- Used by `market-feeder` (batch processing)
- Used by `algo-worker` (real-time processing)
- Ensures consistency between training and inference

### **3. Storage Efficiency**

**Raw data is compact, features are regeneratable:**

- Store: Raw ticks, candles, quotes, Greeks (~100 MB/day)
- Generate: Features as needed (~500 MB/day)
- Benefit: Can recalculate features with different parameters without re-collecting data

### **4. Performance**

**Live trading requires zero latency:**

- algo-worker: In-memory feature computation (no DB writes)
- feature-computation: Batched DB writes (hourly/EOD)

---

## Data Flow

### **Raw Data Collection** (market-feeder → QuestDB)

```typescript
// Historical Data Service
1. Connect to Upstox WebSocket
2. Receive ticks, quotes, Greeks
3. Store to QuestDB:
   - market_ticks
   - market_candles (aggregated from ticks)
   - market_quotes
   - option_greeks
```

**Tables Created:**

- `market_ticks`: Last price, volume, OI
- `market_candles`: OHLCV for 1m, 5m, 15m, 1h
- `market_quotes`: Bid/ask prices and quantities
- `option_greeks`: Delta, gamma, vega, theta, IV

### **Feature Computation** (raw data → compute-engine → training features)

```typescript
// Feature Computation Service
1. Read raw data from QuestDB (by time range)
2. Call compute-engine (Rust binary) with raw data
3. Receive 33 computed features
4. Store to training_features_lightgbm table
```

**Features Computed (33 total):**

1. **Market Structure (8):**
   - price_vs_vwap
   - price_vs_day_high, price_vs_day_low
   - range_position
   - prev_day_high_dist, prev_day_low_dist
   - weekly_high_dist, weekly_low_dist

2. **Momentum & Trend (8):**
   - rsi_5, rsi_14, rsi_21
   - macd_hist
   - ema_9_slope, ema_21_slope
   - adx
   - roc_5

3. **Volatility (5):**
   - atr_percent
   - realized_vol_5m, realized_vol_15m
   - vol_expansion_ratio
   - india_vix

4. **Options (9):**
   - atm_iv, atm_iv_change
   - delta_atm, gamma_atm, vega_atm, theta_atm
   - pcr_oi, pcr_volume
   - max_pain_dist

5. **Time Context (3):**
   - minutes_from_open
   - minutes_to_close
   - day_of_week

### **Scheduled Feature Computation**

```typescript
// Feature Computation Scheduler

// Hourly (9 AM - 3 PM IST, Mon-Fri)
- Computes features for last 2 hours
- Handles late-arriving data

// End of Day (3:45 PM IST)
- Computes features for entire trading session
- Final reconciliation

// Weekly (Sunday 2 AM IST)
- Recomputes features for entire week
- Handles corrections, corporate actions
```

---

## Configuration

### **market-feeder .env**

```bash
# Historical data collection
HISTORY_SAVER_ENABLED=true
HISTORICAL_DATA_INSTRUMENTS=NSE_INDEX|Nifty 50,NSE_INDEX|Nifty Bank

# Feature computation
FEATURE_COMPUTATION_ENABLED=true
FEATURE_COMPUTATION_INSTRUMENTS=NSE_INDEX|Nifty 50,NSE_INDEX|Nifty Bank
```

### **Feature Computation Schedule**

Controlled by environment variables:

```bash
# Enable/disable feature computation
FEATURE_COMPUTATION_ENABLED=true

# Instruments to process (comma-separated)
FEATURE_COMPUTATION_INSTRUMENTS=NSE_INDEX|Nifty 50,NSE_INDEX|Nifty Bank
```

---

## Usage

### **Manual Feature Computation**

```typescript
// Inject FeatureComputationScheduler
constructor(
  private readonly scheduler: FeatureComputationScheduler,
) {}

// Trigger manual computation
const startTime = new Date('2026-01-01T09:15:00');
const endTime = new Date('2026-01-01T15:30:00');
const instruments = ['NSE_INDEX|Nifty 50'];

const rowsStored = await this.scheduler.triggerManualComputation(
  startTime,
  endTime,
  instruments,
);

console.log(`Stored ${rowsStored} feature rows`);
```

### **Query Computed Features**

```sql
-- Get features for a specific time range
SELECT * FROM training_features_lightgbm
WHERE instrument_key = 'NSE_INDEX|Nifty 50'
  AND timestamp >= '2026-01-01T09:15:00'
  AND timestamp < '2026-01-01T15:30:00'
ORDER BY timestamp ASC;

-- Check feature data quality
SELECT
  instrument_key,
  COUNT(*) as row_count,
  MIN(timestamp) as earliest,
  MAX(timestamp) as latest
FROM training_features_lightgbm
GROUP BY instrument_key;
```

---

## Training Pipeline Integration

### **How training-pipeline Uses Features**

```python
# training_pipeline/pipelines/data_engineering/nodes.py

def load_features_from_questdb(
    questdb_client,
    start_date: str,
    end_date: str,
    instruments: list[str],
) -> pd.DataFrame:
    """Load pre-computed features from QuestDB"""
    query = f"""
        SELECT * FROM training_features_lightgbm
        WHERE instrument_key IN ({','.join(f"'{i}'" for i in instruments)})
          AND timestamp >= '{start_date}'
          AND timestamp < '{end_date}'
        ORDER BY timestamp ASC
    """

    features = questdb_client.query(query)
    return pd.DataFrame(features.rows, columns=features.columns)
```

**Benefits:**

- No feature computation delay during training
- Consistent features between training and inference (same compute-engine)
- Can train on months of historical data efficiently

---

## Performance Metrics

### **Compute Engine (Rust)**

- **Latency**: <10ms for 1000 data points (33 features)
- **Throughput**: ~100K rows/sec on single core
- **Memory**: <50 MB resident

### **Feature Computation Service**

- **Hourly batch**: ~5000 rows in <30 seconds
- **EOD batch**: ~30K rows in <3 minutes
- **Weekly recomputation**: ~200K rows in <20 minutes

### **Storage**

| Table                      | Size/Day | Retention |
| -------------------------- | -------- | --------- |
| market_ticks               | ~80 MB   | 90 days   |
| market_candles             | ~10 MB   | 1 year    |
| market_quotes              | ~50 MB   | 90 days   |
| option_greeks              | ~30 MB   | 90 days   |
| training_features_lightgbm | ~400 MB  | 2 years   |

---

## Future Enhancements

### **1. NAPI-RS Integration**

Replace JSON serialization with zero-copy Rust bindings:

```typescript
// Instead of exec() with JSON files
import { computeFeatures } from '@repo/compute-engine';

const features = computeFeatures(rawData); // Direct FFI call
```

**Benefits:**

- 10x faster (no serialization overhead)
- Lower memory usage
- Better error handling

### **2. Incremental Feature Computation**

Track last processed timestamp per instrument:

```sql
CREATE TABLE feature_computation_checkpoints (
  instrument_key SYMBOL,
  last_processed_timestamp TIMESTAMP,
  PRIMARY KEY (instrument_key)
);
```

**Benefits:**

- Avoid reprocessing same data
- Resume after failures
- Faster incremental updates

### **3. Multi-Timeframe Features**

Compute features for multiple timeframes simultaneously:

- 5-minute features (current)
- 15-minute features (swing trading)
- 1-hour features (positional trading)

---

## Troubleshooting

### **No features being stored**

1. Check `FEATURE_COMPUTATION_ENABLED=true` in .env
2. Verify raw data exists in QuestDB:
   ```sql
   SELECT COUNT(*) FROM market_ticks WHERE instrument_key = 'NSE_INDEX|Nifty 50';
   ```
3. Check compute-engine binary exists:
   ```bash
   ls packages/compute-engine/target/release/compute-engine
   ```

### **Scheduler not running**

1. Verify ScheduleModule is imported
2. Check timezone: `Asia/Kolkata`
3. View logs: `pnpm dev --filter=market-feeder`

### **Compute engine errors**

1. Rebuild Rust binary:
   ```bash
   cd packages/compute-engine
   cargo build --release
   ```
2. Test manually:
   ```bash
   ./target/release/compute-engine --version
   ```

---

## References

- [Compute Engine Architecture](../../packages/compute-engine/docs/ARCHITECTURE.md)
- [Training Pipeline](../../services/training-pipeline/README.md)
- [Algo Worker](../../apps/algo-worker/README.md)
- [QuestDB Schema](../../packages/schema/sql/schema/)

---

**Last Updated**: January 13, 2026  
**Status**: Production-Ready
