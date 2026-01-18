# Data Architecture: Multi-Source Training Pipeline

**Last Updated**: January 18, 2026  
**Architecture Version**: 2026 Institutional-Grade

---

## Data Sources Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AVAILABLE DATA SOURCES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ HISTORICAL DATA (Upstox API)                                        │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                      │    │
│  │  Daily OHLCV (26 Years: 2000-2026)                                  │    │
│  │  ├── NIFTY 50 Spot Index                                            │    │
│  │  ├── NIFTY Futures (from launch)                                    │    │
│  │  ├── NIFTY Options (from launch)                                    │    │
│  │  └── 50 Constituent Stocks                                          │    │
│  │                                                                      │    │
│  │  1-Min OHLCV (4 Years: 2022-2026)                                   │    │
│  │  ├── Same instruments as above                                      │    │
│  │  └── ~1,000,000 candles per instrument                              │    │
│  │                                                                      │    │
│  │  India VIX (12 Years: Feb 2014-2026)                                │    │
│  │  └── Daily and intraday available                                   │    │
│  │                                                                      │    │
│  │  Expired F&O Contracts (Full Chain)                                 │    │
│  │  ├── OHLCV + Open Interest                                          │    │
│  │  ├── Strike prices (all strikes)                                    │    │
│  │  ├── Weekly + Monthly expiries                                      │    │
│  │  └── Metadata (lot size, tick size, freeze qty)                     │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ LIVE DATA (Upstox Plus WebSocket)                                   │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                      │    │
│  │  Tick-by-Tick (From Today Onwards)                                  │    │
│  │  ├── Full Market Depth (30 levels bid/ask)                          │    │
│  │  ├── Option Greeks (delta, theta, gamma, vega, rho)                 │    │
│  │  ├── Implied Volatility (real-time)                                 │    │
│  │  ├── Open Interest (real-time)                                      │    │
│  │  └── Total Bid/Ask Quantities                                       │    │
│  │                                                                      │    │
│  │  Option Chain (Live)                                                │    │
│  │  ├── All strikes for current + next expiry                          │    │
│  │  └── Put-Call chain with Greeks                                     │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Coverage Matrix

| Data Type | Start Date | End Date | Granularity | Instruments |
|-----------|------------|----------|-------------|-------------|
| **NIFTY 50 Spot** | Jan 2000 | Today | Daily, 1-min | Index |
| **NIFTY Futures** | Jun 2000 | Today | Daily, 1-min | Near/Next/Far |
| **NIFTY Options** | Jun 2001 | Today | Daily, 1-min | Full chain |
| **India VIX** | Feb 2014 | Today | Daily, 1-min | Index |
| **Constituents** | Jan 2000 | Today | Daily, 1-min | 50 stocks |
| **Live Tick** | Today | Ongoing | Sub-second | All subscribed |

---

## Upstox API Endpoints

### Historical Data

| Endpoint | Purpose | Data |
|----------|---------|------|
| `/v2/historical-candle/{key}/{interval}/{to_date}/{from_date}` | Active instruments | OHLCV |
| `/v3/historical-candle/{key}/{interval}/{to_date}/{from_date}` | V3 with pagination | OHLCV |
| `/v2/expired-instruments/historical-candle/{key}/{interval}/{to}/{from}` | Expired F&O | OHLCV + OI |
| `/v2/option/chain` | Current option chain | Greeks, IV |
| `/v2/option/contract` | Option contracts | All strikes |

### Expired Instruments Discovery

| Endpoint | Purpose |
|----------|---------|
| `/v2/expired-instruments/expiries/{underlying_key}` | Get all expiry dates |
| `/v2/expired-instruments/option-contracts/{underlying_key}/{expiry_date}` | Option contracts for expiry |
| `/v2/expired-instruments/future-contracts/{underlying_key}/{expiry_date}` | Future contracts for expiry |

### Live Data (WebSocket)

| Feed Type | Fields | Use Case |
|-----------|--------|----------|
| `LTPC` | LTP, LTT, LTQ, CP | Basic price |
| `Option Greeks` | Delta, Theta, Gamma, Vega, Rho, IV, OI | Options analysis |
| `Full` | OHLC, depth-5, Greeks | Standard feed |
| `Full D30` (Plus) | OHLC, depth-30, Greeks, TBQ/TSQ | Full microstructure |

---

## Data Schema: Upstox Fields

### Expired Option Contract Metadata

```json
{
  "name": "NIFTY",
  "segment": "NSE_FO",
  "exchange": "NSE",
  "expiry": "2025-04-17",
  "instrument_key": "NSE_FO|47983|17-04-2025",
  "exchange_token": "47983",
  "trading_symbol": "NIFTY 20400 PE 17 APR 25",
  "tick_size": 5,
  "lot_size": 75,
  "instrument_type": "PE",
  "freeze_quantity": 1800,
  "underlying_key": "NSE_INDEX|Nifty 50",
  "underlying_type": "INDEX",
  "underlying_symbol": "NIFTY",
  "strike_price": 20400,
  "minimum_lot": 75,
  "weekly": true
}
```

### Live Tick Data (Depth-30)

```json
{
  "type": "live_feed",
  "feeds": {
    "NSE_FO|45450": {
      "fullFeed": {
        "marketFF": {
          "ltpc": { "ltp": 213.75, "ltt": "1740727891235", "ltq": "150", "cp": 494.05 },
          "marketLevel": {
            "bidAskQuote": [
              { "bidQ": "75", "bidP": 213.45, "askQ": "525", "askP": 213.9 },
              // ... 30 levels
            ]
          },
          "optionGreeks": {
            "delta": 0.4952, "theta": -8.4067, "gamma": 0.0007,
            "vega": 16.769, "rho": 3.8673
          },
          "marketOHLC": { "ohlc": [{ "interval": "1d", ... }, { "interval": "I1", ... }] },
          "atp": 272.9,
          "vtt": "779625",
          "oi": 210000,
          "iv": 0.131378,
          "tbq": 46050,
          "tsq": 41850
        }
      }
    }
  }
}
```

---

## QuestDB Storage Schema

### Raw Data Tables

```sql
-- Daily candles (26 years, partitioned by year)
CREATE TABLE raw_daily_candles (
  timestamp TIMESTAMP,
  instrument_key SYMBOL,
  instrument_type SYMBOL,     -- 'INDEX' | 'FUTURE' | 'OPTION_CE' | 'OPTION_PE' | 'STOCK'
  underlying SYMBOL,          -- 'NIFTY' | 'BANKNIFTY' | stock symbol
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume LONG,
  oi LONG,                    -- NULL for spot
  strike DOUBLE,              -- NULL for non-options
  expiry DATE,                -- NULL for spot/stocks
  weekly BOOLEAN              -- TRUE for weekly expiry
) TIMESTAMP(timestamp) PARTITION BY YEAR;

-- Minute candles (4 years, partitioned by month)
CREATE TABLE raw_minute_candles (
  timestamp TIMESTAMP,
  instrument_key SYMBOL,
  instrument_type SYMBOL,
  underlying SYMBOL,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume LONG,
  oi LONG
) TIMESTAMP(timestamp) PARTITION BY MONTH;

-- India VIX (12 years)
CREATE TABLE india_vix (
  timestamp TIMESTAMP,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  granularity SYMBOL          -- 'daily' | 'minute'
) TIMESTAMP(timestamp) PARTITION BY YEAR;

-- Live tick data (from today, partitioned by day)
CREATE TABLE tick_data (
  timestamp TIMESTAMP,
  instrument_key SYMBOL,
  instrument_type SYMBOL,
  ltp DOUBLE,
  ltq LONG,
  cp DOUBLE,                  -- close price (previous)
  -- Depth 30 (arrays)
  bid_prices DOUBLE[],
  bid_quantities LONG[],
  ask_prices DOUBLE[],
  ask_quantities LONG[],
  -- Greeks (options only)
  delta DOUBLE,
  theta DOUBLE,
  gamma DOUBLE,
  vega DOUBLE,
  rho DOUBLE,
  iv DOUBLE,
  -- Aggregates
  oi LONG,
  vtt LONG,                   -- Volume traded today
  atp DOUBLE,                 -- Average traded price
  tbq LONG,                   -- Total bid quantity
  tsq LONG                    -- Total ask quantity
) TIMESTAMP(timestamp) PARTITION BY DAY;
```

### Computed Features Tables

```sql
-- Training features (computed from raw data)
CREATE TABLE training_features_54 (
  timestamp TIMESTAMP,
  underlying SYMBOL,
  -- Index Breadth (8)
  pct_stocks_above_vwap DOUBLE,
  pct_stocks_above_ema20 DOUBLE,
  breadth_thrust DOUBLE,
  advance_decline_ratio DOUBLE,
  breadth_momentum_5m DOUBLE,
  new_highs_lows_ratio DOUBLE,
  sector_rotation_score DOUBLE,
  breadth_volatility DOUBLE,
  -- NIFTY Future (12)
  fut_price_vs_vwap DOUBLE,
  fut_range_position DOUBLE,
  fut_rsi_14 DOUBLE,
  fut_macd_signal DOUBLE,
  fut_bollinger_pct DOUBLE,
  fut_atr_pct DOUBLE,
  fut_momentum_1m DOUBLE,
  fut_momentum_5m DOUBLE,
  fut_ema_crossover DOUBLE,
  fut_volume_ratio DOUBLE,
  fut_oi_change_pct DOUBLE,
  fut_basis_pct DOUBLE,
  -- Options (14)
  atm_iv DOUBLE,
  iv_skew_25d DOUBLE,
  iv_term_structure DOUBLE,
  pcr_volume DOUBLE,
  pcr_oi DOUBLE,
  max_pain_distance DOUBLE,
  total_gamma_exposure DOUBLE,
  atm_iv_change DOUBLE,
  call_iv_avg DOUBLE,
  put_iv_avg DOUBLE,
  net_oi_change DOUBLE,
  weighted_delta DOUBLE,
  weighted_gamma DOUBLE,
  weighted_vega DOUBLE,
  -- Volatility (6)
  india_vix DOUBLE,
  realized_vol_5m DOUBLE,
  realized_vol_15m DOUBLE,
  iv_rv_ratio DOUBLE,
  vol_regime DOUBLE,
  vol_expansion_ratio DOUBLE,
  -- Order Flow (8) - computed from tick data
  ofi_1s DOUBLE,
  ofi_5s DOUBLE,
  ofi_30s DOUBLE,
  trade_imbalance DOUBLE,
  depth_imbalance_5 DOUBLE,
  depth_imbalance_10 DOUBLE,
  volume_at_bid_pct DOUBLE,
  large_trade_indicator DOUBLE,
  -- Time Context (6)
  minutes_from_open DOUBLE,
  minutes_to_close DOUBLE,
  day_of_week DOUBLE,
  is_expiry_day DOUBLE,
  is_expiry_week DOUBLE,
  session_type DOUBLE,
  -- Validity flags
  is_valid BOOLEAN,
  invalid_reason SYMBOL
) TIMESTAMP(timestamp) PARTITION BY MONTH;
```

---

## Data Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA PIPELINE ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────────────┘

PHASE 1: HISTORICAL INGESTION (One-time)
─────────────────────────────────────────
[Upstox API]
     │
     ├── Daily Candles (26yr) ───────────┐
     ├── Minute Candles (4yr) ───────────┤
     ├── India VIX (12yr) ───────────────┼───→ [QuestDB Raw Tables]
     ├── Expired Options (all) ──────────┤
     └── Expired Futures (all) ──────────┘

PHASE 2: FEATURE ENGINEERING (Batch)
────────────────────────────────────
[QuestDB Raw] ──→ [Kedro Pipeline] ──→ [training_features_54]
                       │
                       ├── Technical indicators
                       ├── Breadth computation
                       ├── Options aggregation
                       ├── Volatility metrics
                       └── Label generation

PHASE 3: LIVE COLLECTION (Continuous)
────────────────────────────────────
[Upstox WebSocket] ──→ [market-feeder] ──→ [tick_data]
     (Depth-30)              │
                             └───→ [algo-worker] (real-time features)
```

---

## Data Quality Considerations

### Historical Data
- ✅ Daily data: Complete and reliable (26 years)
- ✅ 1-min data: Complete (4 years, ~1M candles/instrument)
- ✅ VIX data: Complete from Feb 2014
- ⚠️ No historical LOB depth (only available live)
- ⚠️ No historical tick-level Greeks (compute from IV if needed)

### Live Data
- ✅ Full depth-30 (Upstox Plus)
- ✅ Real-time Greeks from exchange
- ✅ Real-time IV from exchange
- ✅ Tick-by-tick granularity

### Handling Missing Data

| Missing | Strategy |
|---------|----------|
| LOB depth (historical) | Use bid-ask spread as proxy, or skip microstructure features |
| Greeks (historical) | Compute via Black-Scholes from IV |
| Sub-minute (historical) | Aggregate 1-min data |

---

## Related Documentation

- [MODEL_ARCHITECTURE.md](./MODEL_ARCHITECTURE.md) - 3-tier model design
- [TRAINING_STRATEGY.md](./TRAINING_STRATEGY.md) - Validation methods
- [FEATURE_SPECIFICATION.md](./FEATURE_SPECIFICATION.md) - 54 feature formulas
- [QUESTDB_TRAINING_DATA.md](./QUESTDB_TRAINING_DATA.md) - Schema details
