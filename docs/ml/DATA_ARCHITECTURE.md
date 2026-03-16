# Data Architecture: Multi-Source Global Trading Pipeline

**Last Updated**: March 11, 2026
**Architecture Version**: 2026 5-Tier Data-Bound

---

## Data Sources Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GLOBAL DATA UNIVERSE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ INDIAN MARKETS (Upstox API)                                         │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  Daily OHLCV (26 Years: 2000-2026)                                  │    │
│  │  ├── NIFTY 50 Spot, NIFTY Futures, NIFTY Options                    │    │
│  │  ├── 50 Constituent Stocks                                          │    │
│  │  └── India VIX (from Feb 2014)                                      │    │
│  │  1-Min OHLCV (4 Years: 2022-2026)                                   │    │
│  │  └── All above instruments (~1M candles/instrument)                 │    │
│  │  Live Tick (Today onwards)                                          │    │
│  │  ├── Full Depth-30, Greeks, IV, OI (NSE_FO/NSE_EQ/NSE_INDEX)        │    │
│  │  └── Option chain with all strikes                                  │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  MCX Commodities (Upstox, 09:00–23:30 IST) — NEW                    │    │
│  │  ├── Crude Oil (MCX_FO|CRUDEOIL*): ~20yr history, live WS           │    │
│  │  ├── Natural Gas (MCX_FO|NATURALGAS*): ~20yr history, live WS       │    │
│  │  ├── Gold (MCX_FO|GOLD*): ~23yr history, live WS                    │    │
│  │  ├── Silver (MCX_FO|SILVER*): ~20yr history, live WS                │    │
│  │  └── Copper (MCX_FO|COPPER*): ~17yr history, live WS                │    │
│  │      Mode: LTPC (LTP + volume only, no L2 depth needed)             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ GLOBAL MARKETS (Yahoo Finance + Alpha Vantage)                      │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  Leading Indicators                                                 │    │
│  │  └── GIFT Nifty (24hr bridge to Indian open)                        │    │
│  │  Global Equity Futures (US session + overnight)                     │    │
│  │  ├── S&P 500 E-mini (ES), Nasdaq 100 E-mini (NQ)                    │    │
│  │  ├── FTSE 100, Nikkei 225                                           │    │
│  │  └── Hang Seng, DAX                                                 │    │
│  │  Commodities (Reference prices, overnight only)                     │    │
│  │  ├── Brent Crude, WTI Crude                                         │    │
│  │  ├── Gold (GC), Silver (SI)                                         │    │
│  │  └── Brent-WTI Spread (engineered)                                  │    │
│  │  Currency & Rates                                                   │    │
│  │  ├── USD/INR (primary)                                              │    │
│  │  └── US 10-Year Treasury Yield                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ NEWS & SENTIMENT (Finnhub + FinBERT)                                │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  RSS Feeds: Reuters, Bloomberg, Moneycontrol, ET Markets            │    │
│  │  Processing: FinBERT → Sentiment [-1, 1] + Impact [0, 1]            │    │
│  │  Entity Tagging: Crude, RBI, Fed, specific stocks                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Coverage Matrix

### Indian Markets (Upstox)

| Data Type       | Start Date | End Date | Granularity  | Instruments               |
| --------------- | ---------- | -------- | ------------ | ------------------------- |
| NIFTY 50 Spot   | Jan 2000   | Today    | Daily, 1-min | Index                     |
| NIFTY Futures   | Jun 2000   | Today    | Daily, 1-min | Near/Next/Far             |
| NIFTY Options   | Jun 2001   | Today    | Daily, 1-min | Full chain                |
| India VIX       | Feb 2014   | Today    | Daily, 1-min | Index                     |
| Constituents    | Jan 2000   | Today    | Daily, 1-min | 50 stocks                 |
| MCX Crude Oil   | ~2006      | Today    | Daily, 1-min | `MCX_FO\|CRUDEOIL*`      |
| MCX Natural Gas | ~2006      | Today    | Daily, 1-min | `MCX_FO\|NATURALGAS*`    |
| MCX Gold        | ~2003      | Today    | Daily, 1-min | `MCX_FO\|GOLD*`          |
| MCX Silver      | ~2006      | Today    | Daily, 1-min | `MCX_FO\|SILVER*`        |
| MCX Copper      | ~2009      | Today    | Daily, 1-min | `MCX_FO\|COPPER*`        |
| Live Tick (NSE) | Today      | Ongoing  | Sub-second   | All subscribed (Full D30) |
| Live Tick (MCX) | Today      | Ongoing  | Sub-second   | 5 commodities (LTPC)      |

### Global Markets (Yahoo Finance / Alpha Vantage)

| Data Type              | Source        | Granularity | Coverage      |
| ---------------------- | ------------- | ----------- | ------------- |
| GIFT Nifty             | Yahoo Finance | 1-min       | ~24hr trading |
| S&P 500 E-mini (ES)    | Yahoo Finance | 1-min       | ~23hr/day     |
| Nasdaq 100 E-mini (NQ) | Yahoo Finance | 1-min       | ~23hr/day     |
| FTSE 100               | Yahoo Finance | 1-min       | London hours  |
| Nikkei 225             | Yahoo Finance | 1-min       | Tokyo hours   |
| Brent Crude            | Yahoo Finance | 1-min       | ~23hr/day     |
| WTI Crude              | Yahoo Finance | 1-min       | ~23hr/day     |
| Gold (GC)              | Yahoo Finance | 1-min       | ~23hr/day     |
| Silver (SI)            | Yahoo Finance | 1-min       | ~23hr/day     |
| USD/INR                | Yahoo Finance | 1-min       | Forex hours   |
| US 10Y Treasury        | Alpha Vantage | Daily       | Daily         |

### News & Sentiment

| Source       | Type               | Frequency  |
| ------------ | ------------------ | ---------- |
| Finnhub      | RSS/News feeds     | Real-time  |
| Reuters      | Headlines          | Continuous |
| Moneycontrol | Indian market news | Continuous |
| ET Markets   | Indian market news | Continuous |

---

## Data Provider Stack

| Provider                | Purpose                       | Auth    | Rate Limit                         | npm Package                     |
| ----------------------- | ----------------------------- | ------- | ---------------------------------- | ------------------------------- |
| **Upstox**        | Indian markets (primary)      | OAuth2  | Paid subscription                  | `@repo/market-sdk` (existing) |
| **Yahoo Finance** | Global markets, commodities   | None    | ~2000/hr                           | `yahoo-finance2`              |
| **Alpha Vantage** | Backup + Treasury yields      | API Key | 500/day (free)                     | `alphavantage`                |
| **Finnhub**       | News/RSS + sentiment          | API Key | 60/min (free)                      | `finnhub`                     |
| **Twelve Data**   | WebSocket streaming (upgrade) | API Key | 800/day (free), unlimited ($29/mo) | `twelvedata`                  |

---

## Upstox API Endpoints

### Historical Data

| Endpoint                                                                   | Purpose              | Data        |
| -------------------------------------------------------------------------- | -------------------- | ----------- |
| `/v2/historical-candle/{key}/{interval}/{to}/{from}`                     | Active instruments   | OHLCV       |
| `/v3/historical-candle/{key}/{interval}/{to}/{from}`                     | V3 with pagination   | OHLCV       |
| `/v2/expired-instruments/historical-candle/{key}/{interval}/{to}/{from}` | Expired F&O          | OHLCV + OI  |
| `/v2/option/chain`                                                       | Current option chain | Greeks, IV  |
| `/v2/option/contract`                                                    | Option contracts     | All strikes |

### Expired Instruments Discovery

| Endpoint                                                    | Purpose                     |
| ----------------------------------------------------------- | --------------------------- |
| `/v2/expired-instruments/expiries/{key}`                  | Get all expiry dates        |
| `/v2/expired-instruments/option-contracts/{key}/{expiry}` | Option contracts for expiry |
| `/v2/expired-instruments/future-contracts/{key}/{expiry}` | Future contracts for expiry |

### Live Data (WebSocket)

| Feed Type           | Fields                                 | Use Case            |
| ------------------- | -------------------------------------- | ------------------- |
| `LTPC`            | LTP, LTT, LTQ, CP                      | Basic price         |
| `Option Greeks`   | Delta, Theta, Gamma, Vega, Rho, IV, OI | Options analysis    |
| `Full`            | OHLC, depth-5, Greeks                  | Standard feed       |
| `Full D30` (Plus) | OHLC, depth-30, Greeks, TBQ/TSQ        | Full microstructure |

---

## QuestDB Storage Schema (8 Tables)

### Table 1: `instrument_master`

Instrument registry with metadata. Source of truth for all instrument identities.

### Table 2: `market_candles`

Universal OHLCV table for **all instruments** (Indian + global), all timeframes, using `instrument_key` + `interval_value` + `interval_unit` as dedup keys.

### Table 3: `orderbook_l2_snapshots`

Level-2 order book snapshots (bid/ask per level per side).

### Table 4: `tick_data`

Live tick-by-tick data with full Depth-30 order book and Greeks. Stores all 30 levels flat for columnar query performance.

### Table 5: `option_chain_snapshot`

Option chain with Greeks, IV, strike, expiry. Used for training options-specific models.

### Table 6: `instrument_features`

All ML features (125+) with interval-based storage. Covers index breadth, futures, options, volatility, order flow, price structure, momentum, moving averages, regime, time context, **cyclical time encoding**, **global macro**, **pre-market**, and **MCX commodities** features.

### Table 7: `training_labels`

All ML labels with interval-based storage. Multi-horizon regression, classification, volatility, and regime labels.

### Table 8: `macro_sentiment` (NEW)

NLP-processed news sentiment and global macro events. Used by Tier 0 and Tier 1.

```sql
CREATE TABLE IF NOT EXISTS macro_sentiment (
  timestamp TIMESTAMP,
  entity SYMBOL CAPACITY 256 CACHE INDEX,
  event_type SYMBOL CAPACITY 32,
  sentiment_score DOUBLE,
  impact_score DOUBLE,
  headline STRING,
  source SYMBOL CAPACITY 32
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL
DEDUP UPSERT KEYS(timestamp, entity, event_type);
```

---

## Data Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DATA PIPELINE ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────┘

PHASE 1: HISTORICAL INGESTION (Cron job, incremental)
──────────────────────────────────────────────────────
[Upstox API]
     ├── Daily Candles (26yr) ──────────┐
     ├── Minute Candles (4yr) ──────────┤
     ├── India VIX (12yr) ──────────────┤
     ├── Expired Options (all) ─────────┼──→ [QuestDB: market_candles]
     └── Expired Futures (all) ─────────┘

[Yahoo Finance]
     ├── GIFT Nifty, ES, NQ, Brent ────┐
     ├── Gold, Silver, USD/INR ────────┼──→ [QuestDB: market_candles]
     └── FTSE, Nikkei, DAX ────────────┘

[Finnhub + FinBERT]
     └── News → NLP Processing ────────→ [QuestDB: macro_sentiment]

PHASE 2: FEATURE ENGINEERING (Cron job, daily)
──────────────────────────────────────────────
[QuestDB Raw] ──→ [Python Pipeline] ──→ [instrument_features + training_labels]
                       │
                       ├── Technical indicators
                       ├── Breadth computation
                       ├── Options aggregation
                       ├── Global macro features
                       ├── Cyclical time encoding
                       └── Multi-horizon label generation

PHASE 3: LIVE COLLECTION (Continuous during market hours)
─────────────────────────────────────────────────────────
[Upstox WebSocket]
     ├── Tick data (NSE_FO/NSE_EQ/NSE_INDEX) ──→ [tick_data + option_chain_snapshot]
     │        (Depth-30)              │
     │                                └──→ [Redis] (real-time features for algo-worker)
     └── MCX Tick data (MCX_FO|*, ltpc mode) ──→ [market_candles] (intraday % changes)
          5 commodities bundled into existing WS pool

[Yahoo Finance]
     └── Global 1-min candles ──→ [market_candles] (during Indian session)
```

---

## EOD Reconciliation

At 4:00 PM IST, a reconciliation job compares live ticks against official candles:

```sql
-- Synthetic 1m candles from raw ticks
SELECT
    instrument_key,
    first(ltp) as calc_open,
    max(ltp) as calc_high,
    min(ltp) as calc_low,
    last(ltp) as calc_close,
    sum(ltq) as calc_volume,
    timestamp
FROM tick_data
WHERE instrument_key = 'NSE_INDEX|Nifty 50' AND timestamp IN today
SAMPLE BY 1m ALIGN TO CALENDAR;
```

If `calc_volume` doesn't match `market_candles.volume`, the timestamp is flagged as dropped data.

---

## Related Documentation

- [MODEL_ARCHITECTURE.md](./MODEL_ARCHITECTURE.md) - 5-tier model design
- [TRAINING_STRATEGY.md](./TRAINING_STRATEGY.md) - Validation methods
- [FEATURE_SPECIFICATION.md](./FEATURE_SPECIFICATION.md) - 100+ feature formulas
- [QUESTDB_TRAINING_DATA.md](./QUESTDB_TRAINING_DATA.md) - Schema details
