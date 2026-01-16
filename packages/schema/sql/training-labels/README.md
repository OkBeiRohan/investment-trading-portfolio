# Training Labels - Multi-Horizon Support

## Overview

The `training_labels_1m` table supports **multiple prediction horizons** for the same timestamp, enabling:

- ✅ **Multi-task learning** - Train models to predict 1m, 5m, 15m, 30m simultaneously
- ✅ **Horizon-specific strategies** - Different models for different timeframes
- ✅ **Better generalization** - Shared features across horizons prevent overfitting

## Schema

```sql
CREATE TABLE training_labels_1m (
  timestamp TIMESTAMP,
  horizon_minutes INT,          -- 1, 5, 15, 30
  label BYTE,                   -- -1 (DOWN), 0 (NEUTRAL), 1 (UP)
  future_return DOUBLE,         -- Actual return at horizon
  atr_threshold DOUBLE          -- Volatility-adjusted threshold used
) TIMESTAMP(timestamp) PARTITION BY DAY WAL
DEDUP UPSERT KEYS(timestamp, horizon_minutes);
```

## Supported Horizons

| Horizon | Use Case                      | ATR Scaling       |
| ------- | ----------------------------- | ----------------- |
| **1m**  | Ultra-short term scalping     | `√(1/5) ≈ 0.45x`  |
| **5m**  | Baseline prediction (default) | `1.0x` (baseline) |
| **15m** | Swing trades, medium-term     | `√(15/5) ≈ 1.73x` |
| **30m** | Position trades, longer-term  | `√(30/5) ≈ 2.45x` |

**ATR Scaling Logic**: Thresholds scale by `√(horizon/5)` to account for volatility increasing with time.

## Label Calculation

```python
# For each horizon (1m, 5m, 15m, 30m):
future_return = (future_price - current_price) / current_price

# Scale threshold by horizon
k = 1.0
horizon_scaling = sqrt(horizon_minutes / 5)
atr_threshold = k * atr_percent * horizon_scaling

# Assign label
if future_return > atr_threshold:
    label = 1  # UP
elif future_return < -atr_threshold:
    label = -1  # DOWN
else:
    label = 0  # NEUTRAL
```

## Example Queries

### Get All Horizons for Time Range

```sql
SELECT * FROM training_labels_1m
WHERE timestamp >= '2026-01-15T09:15:00.000Z'
AND timestamp < '2026-01-15T15:30:00.000Z'
ORDER BY timestamp ASC, horizon_minutes ASC;
```

### Get Specific Horizon

```sql
SELECT * FROM training_labels_1m
WHERE timestamp >= '2026-01-15T09:15:00.000Z'
AND timestamp < '2026-01-15T15:30:00.000Z'
AND horizon_minutes = 5
ORDER BY timestamp ASC;
```

### Check Label Distribution

```sql
SELECT
  horizon_minutes,
  COUNT(*) as total,
  SUM(CASE WHEN label = 1 THEN 1 ELSE 0 END) as up,
  SUM(CASE WHEN label = 0 THEN 1 ELSE 0 END) as neutral,
  SUM(CASE WHEN label = -1 THEN 1 ELSE 0 END) as down
FROM training_labels_1m
WHERE timestamp >= '2026-01-15T09:15:00.000Z'
AND timestamp < '2026-01-15T15:30:00.000Z'
GROUP BY horizon_minutes
ORDER BY horizon_minutes;
```

## TypeScript Usage

```typescript
// Get single horizon
const labels5m = await trainingLabelsRepo.getByTimeRange(
  startTime,
  endTime,
  5 // 5-minute horizon
);

// Get all horizons
const allLabels = await trainingLabelsRepo.getAllHorizonsByTimeRange(
  startTime,
  endTime
);

// Get grouped by timestamp (for multi-task training)
const grouped = await trainingLabelsRepo.getGroupedByTimestamp(
  startTime,
  endTime
);
// grouped.get(timestamp) → [label_1m, label_5m, label_15m, label_30m]

// Check class distribution
const distribution = await trainingLabelsRepo.getDistributionByHorizon(
  startTime,
  endTime
);
console.log(distribution);
// [
//   { horizonMinutes: 1, totalLabels: 1000, upLabels: 300, neutralLabels: 400, downLabels: 300, ... },
//   { horizonMinutes: 5, totalLabels: 1000, upLabels: 320, neutralLabels: 360, downLabels: 320, ... },
//   ...
// ]
```

## Python Usage (Training Pipeline)

```python
import pandas as pd
from pathlib import Path

# Load SQL
sql_path = Path(__file__).parent / "packages/schema/sql/training-labels/get-all-horizons.sql"
query = sql_path.read_text()

# Execute
df = pd.read_sql(query, con=engine, params=[start_time, end_time])

# Pivot for multi-task learning
pivot = df.pivot(
    index='timestamp',
    columns='horizon_minutes',
    values=['label', 'future_return']
)
# Result: timestamp | label_1m | label_5m | label_15m | label_30m | return_1m | ...
```

## Multi-Task Learning Benefits

1. **Shared Feature Representations** - Same features predict all horizons
2. **Regularization** - Learning multiple tasks prevents overfitting to single horizon
3. **Robustness** - Model learns generalizable patterns, not horizon-specific noise
4. **Flexibility** - Single model can generate predictions for any horizon

## Data Volume Impact

With 4 horizons per timestamp:

- **Single horizon**: ~20,000 labels/day (375 minutes × 1 minute candles)
- **Multi-horizon**: ~80,000 labels/day (20,000 × 4 horizons)
- **Annual storage**: ~29M labels (80K × 365 days) ≈ 500MB uncompressed

QuestDB columnar compression reduces this by ~70%, so actual storage ≈ 150MB/year.

## Migration from Single Horizon

If you have existing labels with `horizon_minutes = 5` only:

```sql
-- No migration needed!
-- The DEDUP UPSERT KEYS(timestamp, horizon_minutes) allows coexistence
-- Old: (timestamp, 5, ...)
-- New: (timestamp, 1, ...), (timestamp, 5, ...), (timestamp, 15, ...), (timestamp, 30, ...)
```

Just start inserting additional horizons and both will coexist.
