# Multi-Timeframe Historical Data Strategy

## Overview

The market-feeder service implements an intelligent multi-timeframe data fetching strategy that maximizes data granularity while respecting Upstox API limitations.

## Upstox API Limits

| Unit        | Interval Options                    | Historical Availability | Max Retrieval Limit                                               |
| ----------- | ----------------------------------- | ----------------------- | ----------------------------------------------------------------- |
| **minutes** | 1, 2, 3, 5, 10, 15, 30, 60, ... 300 | January 2022            | • 1 month (1-15 min intervals)<br>• 1 quarter (>15 min intervals) |
| **hours**   | 1, 2, 3, 4, 5                       | January 2022            | 1 quarter                                                         |
| **days**    | 1                                   | January 2000            | 1 decade                                                          |
| **weeks**   | 1                                   | January 2000            | Unlimited                                                         |
| **months**  | 1                                   | January 2000            | Unlimited                                                         |

## Fetching Strategy

The service automatically generates an optimal fetch plan that:

1. **Maximizes data granularity** - Uses smallest possible intervals
2. **Respects API limits** - Stays within retrieval windows
3. **Minimizes storage waste** - Avoids redundant data
4. **Optimizes for training** - Prioritizes intervals useful for ML

### Phase-Based Approach

```
Phase 1: Recent Data (1 month back)
├─ Interval: 1 minute
├─ Use Case: Real-time strategy validation
└─ Storage: ~11,700 candles/instrument

Phase 2: Mid-Term Data (1-3 months)
├─ Interval: 5 minutes
├─ Use Case: Intraday pattern analysis
└─ Storage: ~4,680 candles/instrument

Phase 3: Quarter Data (3 months - 1 quarter)
├─ Interval: 30 minutes
├─ Use Case: Swing trading signals
└─ Storage: ~2,535 candles/instrument

Phase 4: 2022-2024 Data (1 quarter - 3 years)
├─ Interval: 1 hour
├─ Use Case: Daily volatility patterns
└─ Storage: ~390 candles/month

Phase 5: Historical Data (2000-2022)
├─ Interval: Daily
├─ Use Case: Long-term backtesting
└─ Storage: ~250 candles/year

Phase 6: Very Old Data (pre-10 years)
├─ Interval: Weekly
├─ Use Case: Regime detection
└─ Storage: ~52 candles/year
```

## Storage Estimates

### Single Instrument (Full History)

```
Phase 1 (1m × 1 month):      11,700 candles ×  80 bytes = 0.9 MB
Phase 2 (5m × 2 months):      4,680 candles ×  80 bytes = 0.4 MB
Phase 3 (30m × 2 months):     2,535 candles ×  80 bytes = 0.2 MB
Phase 4 (1h × 3 years):      13,650 candles ×  80 bytes = 1.1 MB
Phase 5 (1d × 22 years):      5,500 candles ×  80 bytes = 0.4 MB
Phase 6 (1w × 2 years):         104 candles ×  80 bytes = 0.01 MB
────────────────────────────────────────────────────────────────
Total per instrument:        38,169 candles           ≈ 3.0 MB
```

### Fleet-Wide Estimates

| Instruments           | Total Candles | Storage (Uncompressed) | Storage (QuestDB Compressed) |
| --------------------- | ------------- | ---------------------- | ---------------------------- |
| 50 (Nifty 50)         | 1,908,450     | 150 MB                 | **~45 MB** (3x compression)  |
| 500 (Index + Options) | 19,084,500    | 1.5 GB                 | **~500 MB**                  |
| 5,000 (All NSE)       | 190,845,000   | 15 GB                  | **~5 GB**                    |

## Usage

### Automatic Multi-Timeframe (Recommended)

```typescript
// Fetch all data from 2000 to today
await historicalDataService.backfillHistoricalData({
  instrumentKeys: ['NSE_INDEX|Nifty 50', 'NSE_INDEX|Nifty Bank'],
  useMultiTimeframe: true, // Default
});
```

### Manual Intervals (Legacy)

```typescript
// Specify exact intervals
await historicalDataService.backfillHistoricalData({
  instrumentKeys: ['NSE_INDEX|Nifty 50'],
  intervals: ['1m', '5m', '1h', '1d'],
  useMultiTimeframe: false,
});
```

### Custom Date Range

```typescript
// Fetch specific range with automatic timeframe selection
await historicalDataService.backfillHistoricalData({
  instrumentKeys: ['NSE_INDEX|Nifty 50'],
  fromDate: '2020-01-01',
  toDate: '2024-12-31',
  useMultiTimeframe: true,
});
```

## QuestDB Schema

All timeframes are stored in the same `market_candles` table:

```sql
CREATE TABLE market_candles (
  timestamp TIMESTAMP,
  instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
  interval SYMBOL CAPACITY 20,  -- '1m', '5m', '30m', '1h', '1d', '1w', '1M'
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume LONG,
  open_interest LONG
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, instrument_key, interval);
```

### Query Examples

```sql
-- Get 1-minute data for recent analysis
SELECT * FROM market_candles
WHERE instrument_key = 'NSE_INDEX|Nifty 50'
  AND interval = '1m'
  AND timestamp >= dateadd('d', -7, now());

-- Get daily data for backtesting
SELECT * FROM market_candles
WHERE instrument_key = 'NSE_INDEX|Nifty 50'
  AND interval = '1d'
  AND timestamp BETWEEN '2020-01-01' AND '2024-12-31';

-- Resample 1m to 15m (on-the-fly aggregation)
SELECT
  timestamp,
  first(open) as open,
  max(high) as high,
  min(low) as low,
  last(close) as close,
  sum(volume) as volume
FROM market_candles
WHERE instrument_key = 'NSE_INDEX|Nifty 50'
  AND interval = '1m'
SAMPLE BY 15m ALIGN TO CALENDAR;
```

## Training Pipeline Integration

The training-pipeline consumes data based on model requirements:

| Model           | Preferred Interval | Lookback Window | Use Case                       |
| --------------- | ------------------ | --------------- | ------------------------------ |
| **LightGBM**    | 1m, 5m             | 60 candles      | Intraday volatility prediction |
| **Transformer** | 1m                 | 120 candles     | Pattern recognition            |
| **TFT**         | 5m, 30m            | 24 hours        | Multi-horizon forecasting      |
| **LSTM**        | 1h, 1d             | 30 days         | Trend detection                |

### Example: Fetch Data for LightGBM Training

```python
# In training-pipeline Kedro pipeline
from compute_engine import fetch_training_data

# Automatically selects 1m data for recent, 5m for older
features = fetch_training_data(
    instrument_key="NSE_INDEX|Nifty 50",
    preferred_interval="1m",
    fallback_intervals=["5m", "15m"],  # Use if 1m unavailable
    start_date="2024-01-01",
    end_date="2024-12-31",
)
```

## Performance Optimization

### Batching Strategy

```typescript
// Process instruments in parallel (max 5 concurrent)
const batches = chunk(instrumentKeys, 5);

for (const batch of batches) {
  await Promise.all(
    batch.map((key) =>
      historicalDataService.backfillHistoricalData({
        instrumentKeys: [key],
        useMultiTimeframe: true,
      }),
    ),
  );
}
```

### Gap Detection

```typescript
// Only fetch missing data
const gaps = await questdbService.findMissingRanges(
  'market_candles',
  'NSE_INDEX|Nifty 50',
  '1m',
  new Date('2024-01-01'),
  new Date(),
);

// Fetch only gaps
for (const [start, end] of gaps) {
  await fetchHistoricalCandles({ from_date: start, to_date: end });
}
```

## Monitoring

### Progress Events

```typescript
// Listen to backfill progress
eventEmitter.on('backfill.progress', (progress) => {
  console.log(
    `Progress: ${progress.completedInstruments}/${progress.totalInstruments}`,
  );
  console.log(`Total candles: ${progress.totalCandles}`);
});

// Listen to completion
eventEmitter.on('backfill.completed', (result) => {
  console.log(`Completed in ${result.durationMs}ms`);
  console.log(`Total candles: ${result.totalCandles}`);
});
```

### Health Checks

```typescript
// Verify data quality
const quality = await questdbService.checkDataQuality(
  'market_candles',
  'NSE_INDEX|Nifty 50',
  '1m',
);

console.log(`Completeness: ${quality.completeness}%`);
console.log(`Missing candles: ${quality.missingCount}`);
```

## Best Practices

### 1. Initial Backfill (First Time)

```bash
# Fetch all Nifty 50 constituents
curl -X POST http://localhost:3002/historical-data/backfill \
  -H "Content-Type: application/json" \
  -d '{
    "instrumentKeys": ["NSE_INDEX|Nifty 50", "NSE_INDEX|Nifty Bank"],
    "useMultiTimeframe": true
  }'
```

### 2. Daily Updates (Scheduled)

```typescript
// In historical-data.scheduler.ts
@Cron('0 18 * * 1-5') // Every weekday at 6 PM IST
async dailyUpdate() {
  await this.historicalDataService.backfillHistoricalData({
    instrumentKeys: this.getActiveInstruments(),
    fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    useMultiTimeframe: true,
  });
}
```

### 3. On-Demand Fills

```typescript
// Fill gaps detected during training
const missingRanges = await findMissingRanges(...);

for (const range of missingRanges) {
  await historicalDataService.backfillHistoricalData({
    instrumentKeys: [range.instrumentKey],
    fromDate: range.start,
    toDate: range.end,
  });
}
```

## Troubleshooting

### Rate Limiting

```typescript
// Add delay between API calls
await sleep(100); // 100ms delay = max 10 req/sec
```

### Memory Issues

```typescript
// Process in smaller batches
const BATCH_SIZE = 10;
for (let i = 0; i < instrumentKeys.length; i += BATCH_SIZE) {
  const batch = instrumentKeys.slice(i, i + BATCH_SIZE);
  await backfillHistoricalData({ instrumentKeys: batch });

  // Allow GC to run
  await sleep(1000);
}
```

### Data Quality Issues

```sql
-- Find instruments with gaps
SELECT
  instrument_key,
  interval,
  COUNT(*) as candle_count,
  MIN(timestamp) as first_candle,
  MAX(timestamp) as last_candle
FROM market_candles
GROUP BY instrument_key, interval
HAVING candle_count < expected_count;
```

---

**Last Updated**: January 13, 2026  
**Status**: ✅ Production-Ready
