# Training Pipeline Data Guide

> **How to access 26 years of historical data and 117 features for ML training.**

**Last Updated**: January 18, 2026

---

## Overview

The training-pipeline uses pre-computed features from QuestDB for model training. This eliminates the need to recalculate features during training, ensuring:

1. **Training-Serving Consistency**: Same features as live inference
2. **Fast Training**: No feature computation overhead
3. **Data Quality**: Validity flags filter bad data automatically

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TRAINING DATA FLOW                                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                           QUESTDB                                        │ │
│  │                                                                          │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │ │
│  │  │ historical_ohlcv│  │ training_       │  │ training_       │          │ │
│  │  │ (2000-2026)     │  │ features_54     │  │ labels          │          │ │
│  │  │ 26 years        │  │ (2020-2026)     │  │ (2020-2026)     │          │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │ │
│  │                                │                   │                     │ │
│  │                                └─────────┬─────────┘                     │ │
│  └──────────────────────────────────────────│──────────────────────────────┘ │
│                                              │                                │
│                                              ▼                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      KEDRO TRAINING PIPELINE                             │ │
│  │                                                                          │ │
│  │   Data Node ──→ Split ──→ CPCV ──→ Training ──→ ONNX Export             │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Available Data

### Historical Coverage

| Dataset | Start Date | End Date | Frequency | Size |
|---------|------------|----------|-----------|------|
| NIFTY 50 Index OHLCV | 2000-01-01 | Present | Daily | ~7,000 rows |
| NIFTY 50 Index OHLCV | 2015-01-01 | Present | 1-minute | ~2.5M rows |
| NIFTY Futures OHLCV | 2010-01-01 | Present | 1-minute | ~3M rows |
| NIFTY 50 Constituents | 2005-01-01 | Present | Daily | ~2.5M rows |
| NIFTY Options | 2015-01-01 | Present | 1-minute | ~100M rows |
| 54 Computed Features | 2020-01-01 | Present | 1-minute | ~1.5M rows |
| Multi-horizon Labels | 2020-01-01 | Present | 1-minute | ~1.5M rows |
| Tick-by-Tick Data | 2024-01-01 | Present | Tick | ~25B rows |
| Market Depth 20 | 2024-01-01 | Present | Snapshot | ~50B rows |

---

## Querying Training Data

### Python Connection

```python
import psycopg2
import pandas as pd

def get_questdb_connection():
    """Connect to QuestDB using PostgreSQL wire protocol."""
    return psycopg2.connect(
        host='localhost',
        port=8812,
        user='admin',
        password='quest',
        dbname='qdb'
    )

def query_to_df(query: str) -> pd.DataFrame:
    """Execute query and return DataFrame."""
    conn = get_questdb_connection()
    df = pd.read_sql(query, conn)
    conn.close()
    return df
```

### Basic Training Data Query

```python
def get_training_data(
    start_date: str = '2020-01-01',
    end_date: str = '2025-12-31',
    target_horizon: str = '5m'
) -> pd.DataFrame:
    """
    Get features + labels for training.
    """
    query = f"""
    SELECT 
        f.timestamp,
        
        -- Index Breadth (8)
        f.pct_stocks_above_vwap,
        f.pct_stocks_above_ema20,
        f.weighted_return_top10,
        f.advance_decline_ratio,
        f.breadth_momentum_5m,
        f.breadth_volatility,
        f.breadth_thrust,
        f.new_highs_lows_ratio,
        
        -- NIFTY Future (12)
        f.fut_price_vs_vwap,
        f.fut_range_position,
        f.fut_return_1m,
        f.fut_return_5m,
        f.fut_return_15m,
        f.fut_atr_percent,
        f.fut_volume_zscore,
        f.fut_oi_change,
        f.fut_oi_change_pct,
        f.fut_rsi_14,
        f.fut_macd,
        f.fut_macd_signal,
        
        -- Options (14)
        f.atm_iv,
        f.atm_iv_change,
        f.iv_skew,
        f.iv_term_structure,
        f.gamma_atm,
        f.vega_atm,
        f.theta_atm,
        f.pcr_oi,
        f.pcr_volume,
        f.max_pain_distance,
        f.total_gamma_exposure,
        f.charm_atm,
        f.vanna_atm,
        f.iv_percentile_30d,
        
        -- Volatility (6)
        f.india_vix,
        f.realized_vol_5m,
        f.realized_vol_15m,
        f.vol_expansion_ratio,
        f.iv_rv_ratio,
        f.vix_percentile_30d,
        
        -- Order Flow (8) - for LiT model
        f.bid_ask_spread_bps,
        f.depth_imbalance_5,
        f.ofi_1s,
        f.ofi_5s,
        f.ofi_30s,
        f.trade_imbalance,
        f.bid_slope,
        f.ask_slope,
        
        -- Time Context (6)
        f.minutes_from_open,
        f.minutes_to_close,
        f.day_of_week,
        f.is_expiry_day,
        f.days_to_expiry,
        f.session_phase,
        
        -- Labels
        l.target_return_{target_horizon} AS target_return,
        l.target_direction_{target_horizon} AS target_direction,
        l.regime_label
        
    FROM training_features_54 f
    INNER JOIN training_labels l 
        ON f.timestamp = l.timestamp 
        AND f.reference_instrument = l.reference_instrument
    WHERE f.is_valid = TRUE
      AND l.is_valid = TRUE
      AND l.label_quality = 'CLEAN'
      AND f.timestamp BETWEEN '{start_date}' AND '{end_date}'
    ORDER BY f.timestamp
    """
    
    return query_to_df(query)
```

---

## Feature Groups for Different Models

### LightGBM (46 features)

All features except Order Flow (use when LOB data not available):

```python
LIGHTGBM_FEATURES = [
    # Index Breadth (8)
    'pct_stocks_above_vwap', 'pct_stocks_above_ema20', 'weighted_return_top10',
    'advance_decline_ratio', 'breadth_momentum_5m', 'breadth_volatility',
    'breadth_thrust', 'new_highs_lows_ratio',
    
    # NIFTY Future (12)
    'fut_price_vs_vwap', 'fut_range_position', 'fut_return_1m', 'fut_return_5m',
    'fut_return_15m', 'fut_atr_percent', 'fut_volume_zscore', 'fut_oi_change',
    'fut_oi_change_pct', 'fut_rsi_14', 'fut_macd', 'fut_macd_signal',
    
    # Options (14)
    'atm_iv', 'atm_iv_change', 'iv_skew', 'iv_term_structure', 'gamma_atm',
    'vega_atm', 'theta_atm', 'pcr_oi', 'pcr_volume', 'max_pain_distance',
    'total_gamma_exposure', 'charm_atm', 'vanna_atm', 'iv_percentile_30d',
    
    # Volatility (6)
    'india_vix', 'realized_vol_5m', 'realized_vol_15m', 'vol_expansion_ratio',
    'iv_rv_ratio', 'vix_percentile_30d',
    
    # Time Context (6)
    'minutes_from_open', 'minutes_to_close', 'day_of_week', 'is_expiry_day',
    'days_to_expiry', 'session_phase',
]
```

### LiT Microstructure (14 features)

```python
LIT_FEATURES = [
    # Order Flow (8)
    'bid_ask_spread_bps', 'depth_imbalance_5', 'ofi_1s', 'ofi_5s', 'ofi_30s',
    'trade_imbalance', 'bid_slope', 'ask_slope',
    
    # Returns (6)
    'fut_return_1m', 'fut_return_5m', 'fut_price_vs_vwap', 'fut_range_position',
    'fut_volume_zscore', 'fut_atr_percent',
]
```

### TFT Sequence (54 × 120 timesteps)

```python
def get_tft_sequences(
    start_date: str,
    end_date: str,
    lookback: int = 120,  # 2 hours of 1-min data
) -> pd.DataFrame:
    """
    Get sequences for TFT training.
    """
    query = f"""
    SELECT *
    FROM training_features_54
    WHERE is_valid = TRUE
      AND timestamp BETWEEN '{start_date}' AND '{end_date}'
    ORDER BY timestamp
    """
    
    df = query_to_df(query)
    
    # Create sequences
    sequences = []
    for i in range(lookback, len(df)):
        seq = df.iloc[i-lookback:i].values
        sequences.append(seq)
    
    return np.array(sequences)
```

---

## Data Quality Filtering

### Validity Flags

Each row in `training_features_54` and `training_labels` has:

| Column | Type | Values |
|--------|------|--------|
| `is_valid` | BOOLEAN | TRUE = usable, FALSE = skip |
| `invalid_reason` | STRING | Why invalid (NULL if valid) |
| `label_quality` | STRING | 'CLEAN', 'NOISY', 'OUTLIER' |

### Common Invalid Reasons

| Reason | Meaning | Action |
|--------|---------|--------|
| `MARKET_CLOSED` | Holiday/weekend | Always exclude |
| `PRE_OPEN` | 9:00-9:15 session | Exclude from most models |
| `STALE_DATA` | Gap >60s | Review or exclude |
| `OUTLIER` | >5σ from mean | Mark for review |
| `INCOMPLETE_BREADTH` | <40 stocks | Use cautiously |
| `INCOMPLETE_OPTIONS` | <10 strikes | Exclude options features |
| `CIRCUIT_LIMIT` | Circuit hit | Special handling |
| `LOW_LIQUIDITY` | Spread >50bps | Mark for review |

### Example Filter Query

```python
def get_clean_training_data(start_date: str, end_date: str) -> pd.DataFrame:
    """
    Get only high-quality training data.
    """
    query = f"""
    SELECT f.*, l.target_return_5m, l.target_direction_5m
    FROM training_features_54 f
    INNER JOIN training_labels l 
        ON f.timestamp = l.timestamp 
        AND f.reference_instrument = l.reference_instrument
    WHERE 
        -- Both must be valid
        f.is_valid = TRUE 
        AND l.is_valid = TRUE
        
        -- Only clean labels
        AND l.label_quality = 'CLEAN'
        
        -- Exclude known problematic periods
        AND l.invalid_reason IS NULL
        
        -- Date range
        AND f.timestamp BETWEEN '{start_date}' AND '{end_date}'
        
        -- Market hours only (9:15 to 15:30 IST)
        AND f.minutes_from_open > 0
        AND f.minutes_to_close > 0
        
        -- Reasonable feature ranges
        AND f.atm_iv > 0.05
        AND f.atm_iv < 1.0
        AND f.pct_stocks_above_vwap >= 0
        AND f.pct_stocks_above_vwap <= 1
        
    ORDER BY f.timestamp
    """
    
    return query_to_df(query)
```

---

## CPCV Split Strategy

Combinatorial Purged Cross-Validation for time-series:

```python
from cpcv import CombinatorialPurgedKFold

def get_cpcv_splits(
    df: pd.DataFrame,
    n_splits: int = 5,
    n_test_splits: int = 2,
    embargo_minutes: int = 15,
):
    """
    Generate CPCV train/test splits with embargo gap.
    """
    cv = CombinatorialPurgedKFold(
        n_splits=n_splits,
        n_test_splits=n_test_splits,
        embargo_td=pd.Timedelta(minutes=embargo_minutes)
    )
    
    timestamps = pd.to_datetime(df['timestamp'])
    
    for train_idx, test_idx in cv.split(df, timestamps=timestamps):
        yield train_idx, test_idx
```

---

## Sample Kedro Node

```python
# nodes/data_loading.py
from kedro.pipeline import node

def load_training_features(
    start_date: str,
    end_date: str,
    target_horizon: str,
) -> pd.DataFrame:
    """
    Kedro node to load training data from QuestDB.
    """
    query = f"""
    SELECT 
        f.*,
        l.target_return_{target_horizon} AS target,
        l.target_direction_{target_horizon} AS target_class
    FROM training_features_54 f
    JOIN training_labels l USING (timestamp, reference_instrument)
    WHERE f.is_valid AND l.is_valid AND l.label_quality = 'CLEAN'
      AND f.timestamp BETWEEN '{start_date}' AND '{end_date}'
    """
    
    return query_to_df(query)

# Register in pipeline
data_node = node(
    func=load_training_features,
    inputs=["params:start_date", "params:end_date", "params:target_horizon"],
    outputs="training_data",
    name="load_training_features",
)
```

---

## Related Documentation

- [QUESTDB_TRAINING_DATA.md](../../docs/ml/QUESTDB_TRAINING_DATA.md) - Full schema
- [FEATURE_SPECIFICATION.md](../../docs/ml/FEATURE_SPECIFICATION.md) - Feature definitions
- [TRAINING_PIPELINE.md](../../docs/ml/TRAINING_PIPELINE.md) - Kedro pipeline
- [compute-engine README](../../packages/compute-engine/README.md) - Feature computation
