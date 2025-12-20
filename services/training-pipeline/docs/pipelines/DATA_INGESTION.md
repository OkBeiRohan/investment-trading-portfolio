# Data Ingestion Pipeline

Fetch historical market data from QuestDB for model training.

---

## Purpose

Query 2+ years of historical tick data from QuestDB, aggregate into OHLCV candles at multiple timeframes (1m, 5m, 15m, 1h), and prepare for feature engineering.

---

## Nodes

### **1. fetch_tick_data**

**Function**: `fetch_ticks_from_questdb()`

**Query**:

```sql
SELECT timestamp, symbol, ltp, volume, oi, bid, ask
FROM ticks
WHERE symbol IN ('NIFTY', 'BANKNIFTY')
  AND timestamp >= '2022-01-01'
ORDER BY timestamp ASC
```

**Output**: `data/01_raw/tick_data.parquet`

---

### **2. aggregate_candles**

**Function**: `aggregate_to_ohlcv(tick_data, timeframes)`

**Timeframes**: `['1T', '5T', '15T', '1H']` (1 minute, 5 minute, 15 minute, 1 hour)

**Aggregation**:

```python
ohlcv = tick_data.groupby(['symbol', pd.Grouper(key='timestamp', freq=freq)]).agg({
    'ltp': ['first', 'max', 'min', 'last'],  # Open, High, Low, Close
    'volume': 'sum',
    'oi': 'last',
})
```

**Output**: `data/02_intermediate/candles_{timeframe}.parquet`

---

## Parameters

**File**: `conf/base/parameters/data_ingestion.yml`

```yaml
data_ingestion:
  symbols:
    - NIFTY
    - BANKNIFTY
  start_date: "2022-01-01"
  end_date: "2024-12-31"
  timeframes:
    - 1T
    - 5T
    - 15T
    - 1H
  questdb:
    host: localhost
    port: 8812
```

---

## Run

```bash
kedro run --pipeline data_ingestion
```

---

## Output Schema

**Candle Data**:

```python
{
    'timestamp': datetime64[ns],
    'symbol': str,
    'open': float64,
    'high': float64,
    'low': float64,
    'close': float64,
    'volume': int64,
    'oi': int64,
}
```
