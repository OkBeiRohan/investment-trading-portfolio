# Feature Engineering Specification

> **100+ real-time features computed by the Rust compute-engine and Python feature pipeline.**

**Last Updated**: March 11, 2026
**Architecture**: 5-Tier Data-Bound Hierarchical
**Related**: [compute-engine README](../../packages/compute-engine/README.md)

---

## Overview

Features are organized into **two computation contexts**:

1. **Real-time (Rust compute-engine)**: 54 core features computed in <5ms from live tick data during market hours
2. **Batch (Python pipeline)**: 50+ additional features computed offline for training (global macro, cyclical time, moving averages, regime indicators)

All features feed into the **5-tier model hierarchy**:

| Tier                            | Features Used                                             | Computation                   |
| ------------------------------- | --------------------------------------------------------- | ----------------------------- |
| **Tier 0** (Pre-Market)         | Global macro (12) + Pre-market (4)                        | Python batch at 9:08 AM       |
| **Tier 1** (Macro Director)     | Regime (daily returns, MAs, VIX, breadth) + Tier 0 output | Python batch at 9:09 AM       |
| **Tier 2** (Intraday Navigator) | All 100+ features (1-min aligned)                         | Rust real-time + Python batch |
| **Tier 3** (Microstructure)     | Order Flow (8) + LOB raw (depth-30)                       | Rust real-time                |
| **Tier 4** (Meta-Learner)       | Model outputs + Regime context (~15)                      | NestJS inference              |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FEATURE COMPUTATION PIPELINE                             │
│                                                                             │
│  [Upstox WS] → [market-feeder] → [compute-engine (Rust)] → [Redis]          │
│                                         54 core features, <5ms              │
│                                                                             │
│  [QuestDB]   → [Python pipeline]  → [instrument_features table]             │
│                     100+ features (batch, for training)                     │
│                                                                             │
│  Inputs:                                                                    │
│  ├── NIFTY Future (OHLCV + OI + Depth-30)                                   │
│  ├── 50 Constituents (LTP + VWAP + Volume)                                  │
│  ├── Option Chain (ATM ± 10 strikes × 2 types = 40 options)                 │
│  ├── India VIX                                                              │
│  ├── Global Markets (GIFT Nifty, ES, NQ, Brent, Gold, USD/INR)              │
│  ├── MCX Commodities (Crude Oil, Natural Gas, Gold MCX, Silver, Copper)     │
│  └── News Sentiment (Finnhub + FinBERT)                                     │
│                                                                             │
│  Outputs: Float32Array(100+) stored in instrument_features table            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Category 1: Index Breadth (8 Features)

Measures NIFTY 50 constituent behavior for market-wide sentiment.

| #   | Feature                  | Formula                                       | Range         | Purpose            |
| --- | ------------------------ | --------------------------------------------- | ------------- | ------------------ |
| 1   | `pct_stocks_above_vwap`  | `count(ltp > vwap) / 50`                      | [0, 1]        | Bullish breadth    |
| 2   | `pct_stocks_above_ema20` | `count(ltp > ema20) / 50`                     | [0, 1]        | Trend breadth      |
| 3   | `weighted_return_top10`  | `Σ(return_i × weight_i)` for top 10 by volume | [-0.1, 0.1]   | Large-cap momentum |
| 4   | `advance_decline_ratio`  | `advances / max(declines, 1)`                 | [0, ∞)        | Market direction   |
| 5   | `breadth_momentum_5m`    | `mean(intraday_return)` across 50 stocks      | [-0.05, 0.05] | Short-term breadth |
| 6   | `breadth_volatility`     | `std(intraday_return)` across 50 stocks       | [0, 0.1]      | Dispersion         |
| 7   | `breadth_thrust`         | `advances / (advances + declines)`            | [0, 1]        | Thrust indicator   |
| 8   | `new_highs_lows_ratio`   | `(new_highs - new_lows) / 50`                 | [-1, 1]       | Extremes           |

---

## Category 2: NIFTY Future (12 Features)

Technical indicators on the primary trading instrument.

| #   | Feature              | Formula                                       | Range         | Purpose             |
| --- | -------------------- | --------------------------------------------- | ------------- | ------------------- |
| 9   | `fut_price_vs_vwap`  | `(ltp - vwap) / vwap`                         | [-0.03, 0.03] | Short-term bias     |
| 10  | `fut_range_position` | `(ltp - low) / (high - low)`                  | [0, 1]        | Intraday position   |
| 11  | `fut_return_1m`      | `(price_now - price_1m_ago) / price_1m_ago`   | [-0.02, 0.02] | 1-min momentum      |
| 12  | `fut_return_5m`      | `(price_now - price_5m_ago) / price_5m_ago`   | [-0.05, 0.05] | 5-min momentum      |
| 13  | `fut_return_15m`     | `(price_now - price_15m_ago) / price_15m_ago` | [-0.08, 0.08] | 15-min momentum     |
| 14  | `fut_atr_percent`    | `ATR(14) / ltp`                               | [0.005, 0.03] | Volatility          |
| 15  | `fut_volume_zscore`  | `(volume - mean) / std`                       | [-3, 5]       | Volume anomaly      |
| 16  | `fut_oi_change`      | `oi_now - oi_prev`                            | [-1M, 1M]     | Open interest delta |
| 17  | `fut_oi_change_pct`  | `(oi_now - oi_prev) / oi_prev`                | [-0.1, 0.1]   | OI % change         |
| 18  | `fut_rsi_14`         | `100 - 100/(1 + RS)`                          | [0, 100]      | Momentum oscillator |
| 19  | `fut_macd`           | `EMA(12) - EMA(26)`                           | [-200, 200]   | Trend strength      |
| 20  | `fut_macd_signal`    | `EMA(9) of MACD`                              | [-200, 200]   | Signal line         |

---

## Category 3: Options (14 Features)

Greeks, volatility, and positioning from the options chain.

| #   | Feature                | Formula                                   | Range           | Purpose             |
| --- | ---------------------- | ----------------------------------------- | --------------- | ------------------- |
| 21  | `atm_iv`               | Average IV of ATM call and put            | [0.08, 0.50]    | Market fear         |
| 22  | `atm_iv_change`        | `current_atm_iv - prev_atm_iv` (5min ago) | [-0.05, 0.05]   | IV momentum         |
| 23  | `iv_skew`              | `put_iv - call_iv` at ATM                 | [-0.1, 0.1]     | Put premium         |
| 24  | `iv_term_structure`    | `near_expiry_iv - next_expiry_iv`         | [-0.1, 0.1]     | Event pricing       |
| 25  | `gamma_atm`            | Average gamma at ATM                      | [0, 0.01]       | Gamma exposure      |
| 26  | `vega_atm`             | Average vega at ATM                       | [0, 100]        | Vega exposure       |
| 27  | `theta_atm`            | Average theta at ATM                      | [-50, 0]        | Time decay          |
| 28  | `pcr_oi`               | `total_put_oi / total_call_oi`            | [0.5, 2.0]      | Sentiment (OI)      |
| 29  | `pcr_volume`           | `total_put_vol / total_call_vol`          | [0.3, 3.0]      | Sentiment (volume)  |
| 30  | `max_pain_distance`    | `abs(spot - max_pain_strike)`             | [0, 500]        | Magnetic target     |
| 31  | `total_gamma_exposure` | `Σ(gamma × oi × spot²) / 1e9`             | [-100, 100]     | GEX                 |
| 32  | `charm_atm`            | `d(delta)/d(time)` approximation          | [-0.001, 0.001] | Time decay of delta |
| 33  | `vanna_atm`            | `d(delta)/d(iv)` approximation            | [-0.01, 0.01]   | IV sensitivity      |
| 34  | `iv_percentile_30d`    | IV rank over 30-day window                | [0, 100]        | IV context          |

---

## Category 4: Volatility (10 Features)

Realized and implied volatility metrics.

| #   | Feature               | Formula                                      | Range        | Purpose           |
| --- | --------------------- | -------------------------------------------- | ------------ | ----------------- |
| 35  | `india_vix`           | India VIX from NSE                           | [10, 50]     | Market fear index |
| 36  | `realized_vol_5m`     | `std(log_returns) × √(252×390)` (5 periods)  | [0.05, 0.50] | Short-term RV     |
| 37  | `realized_vol_15m`    | `std(log_returns) × √(252×390)` (15 periods) | [0.05, 0.50] | Medium-term RV    |
| 38  | `realized_vol_20d`    | 20-day daily realized volatility             | [0.05, 0.50] | Daily RV          |
| 39  | `realized_vol_60d`    | 60-day daily realized volatility             | [0.05, 0.50] | Long-term RV      |
| 40  | `vol_expansion_ratio` | `realized_vol_5m / realized_vol_15m`         | [0.5, 2.0]   | Vol regime shift  |
| 41  | `iv_rv_ratio`         | `atm_iv / realized_vol_15m`                  | [0.5, 3.0]   | VRP signal        |
| 42  | `vix_percentile_30d`  | VIX rank over 30-day window                  | [0, 100]     | VIX context       |
| 43  | `vix_percentile_1yr`  | VIX rank over 1-year window                  | [0, 100]     | VIX long-term     |
| 44  | `vix_sma_10`          | 10-day SMA of India VIX                      | [10, 50]     | VIX smoothed      |

---

## Category 5: Order Flow / Microstructure (8 Features)

LOB-based features for **Tier 3 LiT** and execution models.

| #   | Feature              | Formula                                             | Range     | Purpose          |
| --- | -------------------- | --------------------------------------------------- | --------- | ---------------- |
| 45  | `bid_ask_spread_bps` | `(best_ask - best_bid) / mid × 10000`               | [1, 50]   | Liquidity        |
| 46  | `depth_imbalance_5`  | `(bid_qty_5 - ask_qty_5) / (bid_qty_5 + ask_qty_5)` | [-1, 1]   | Supply/demand    |
| 47  | `ofi_1s`             | Order Flow Imbalance (1-second)                     | [-1, 1]   | Short-term flow  |
| 48  | `ofi_5s`             | Order Flow Imbalance (5-second)                     | [-1, 1]   | Medium-term flow |
| 49  | `ofi_30s`            | Order Flow Imbalance (30-second)                    | [-1, 1]   | Trend flow       |
| 50  | `trade_imbalance`    | `(buy_volume - sell_volume) / total_volume`         | [-1, 1]   | Aggressor side   |
| 51  | `bid_slope`          | Price impact slope on bid side                      | [0, 1000] | Resilience       |
| 52  | `ask_slope`          | Price impact slope on ask side                      | [0, 1000] | Resilience       |

---

## Category 6: Price Structure (8 Features)

Daily price-level features.

| #   | Feature             | Formula                                  | Range         | Purpose            |
| --- | ------------------- | ---------------------------------------- | ------------- | ------------------ |
| 53  | `close`             | Daily closing price                      | -             | Base price         |
| 54  | `return_1d`         | 1-day return                             | [-0.05, 0.05] | Daily momentum     |
| 55  | `return_5d`         | 5-day return                             | [-0.10, 0.10] | Weekly momentum    |
| 56  | `return_20d`        | 20-day return                            | [-0.20, 0.20] | Monthly momentum   |
| 57  | `range_hl`          | `(high - low) / close`                   | [0, 0.05]     | Day range          |
| 58  | `gap_open`          | `(today_open - prev_close) / prev_close` | [-0.05, 0.05] | Opening gap        |
| 59  | `close_vs_high_20d` | `(close - 20d_high) / 20d_high`          | [-0.20, 0]    | Distance from high |
| 60  | `close_vs_low_20d`  | `(close - 20d_low) / 20d_low`            | [0, 0.20]     | Distance from low  |

---

## Category 7: Momentum (8 Features)

Oscillators and momentum indicators.

| #   | Feature       | Formula                        | Range       | Purpose              |
| --- | ------------- | ------------------------------ | ----------- | -------------------- |
| 61  | `rsi_14`      | Standard RSI(14)               | [0, 100]    | Momentum oscillator  |
| 62  | `rsi_5`       | Fast RSI(5)                    | [0, 100]    | Short-term momentum  |
| 63  | `macd`        | `EMA(12) - EMA(26)`            | [-200, 200] | Trend                |
| 64  | `macd_signal` | `EMA(9) of MACD`               | [-200, 200] | Signal               |
| 65  | `macd_hist`   | `MACD - Signal`                | [-100, 100] | Histogram            |
| 66  | `adx_14`      | Average Directional Index (14) | [0, 100]    | Trend strength       |
| 67  | `plus_di`     | +DI(14)                        | [0, 100]    | Upward directional   |
| 68  | `minus_di`    | -DI(14)                        | [0, 100]    | Downward directional |

---

## Category 8: Moving Averages (10 Features)

| #   | Feature            | Formula                      | Range         | Purpose      |
| --- | ------------------ | ---------------------------- | ------------- | ------------ |
| 69  | `sma_10`           | 10-period SMA                | -             | Short MA     |
| 70  | `sma_20`           | 20-period SMA                | -             | Medium MA    |
| 71  | `sma_50`           | 50-period SMA                | -             | Trend MA     |
| 72  | `sma_200`          | 200-period SMA               | -             | Long-term MA |
| 73  | `ema_12`           | 12-period EMA                | -             | Fast EMA     |
| 74  | `ema_26`           | 26-period EMA                | -             | Slow EMA     |
| 75  | `price_vs_sma_20`  | `(price - SMA20) / SMA20`    | [-0.10, 0.10] | Price vs MA  |
| 76  | `price_vs_sma_50`  | `(price - SMA50) / SMA50`    | [-0.15, 0.15] | Price vs MA  |
| 77  | `price_vs_sma_200` | `(price - SMA200) / SMA200`  | [-0.20, 0.20] | Price vs MA  |
| 78  | `golden_cross`     | `1 if SMA50 > SMA200 else 0` | {0, 1}        | Bull signal  |

---

## Category 9: Bollinger & Volume (6 Features)

| #   | Feature               | Formula                             | Range     | Purpose         |
| --- | --------------------- | ----------------------------------- | --------- | --------------- |
| 79  | `bollinger_width`     | `(upper - lower) / mid`             | [0, 0.10] | Volatility band |
| 80  | `bollinger_position`  | `(price - lower) / (upper - lower)` | [0, 1]    | Band position   |
| 81  | `volume_sma_20_ratio` | `volume / SMA(volume, 20)`          | [0, 5]    | Volume relative |
| 82  | `volume_trend`        | Volume trend direction              | [-1, 1]   | Volume momentum |
| 83  | `obv_change`          | On Balance Volume change            | [-1M, 1M] | OBV             |
| 84  | `accumulation_dist`   | Accumulation/Distribution           | [-1M, 1M] | A/D line        |

---

## Category 10: Regime Indicators (4 Features)

| #   | Feature                 | Formula                         | Range     | Purpose          |
| --- | ----------------------- | ------------------------------- | --------- | ---------------- |
| 85  | `trend_strength`        | ADX-based trend measure         | [0, 1]    | Trend conviction |
| 86  | `mean_reversion_signal` | Z-score of price vs SMA         | [-3, 3]   | MR signal        |
| 87  | `momentum_regime`       | Momentum state classification   | {0, 1, 2} | Regime class     |
| 88  | `volatility_regime`     | Volatility state classification | {0, 1, 2} | Vol regime       |

---

## Category 11: Time Context + Cyclical Encoding (13 Features)

| #   | Feature             | Formula                             | Range     | Purpose           |
| --- | ------------------- | ----------------------------------- | --------- | ----------------- |
| 89  | `minutes_from_open` | Minutes since 9:15 AM IST           | [0, 375]  | Session progress  |
| 90  | `minutes_to_close`  | Minutes until 3:30 PM IST           | [0, 375]  | Session remaining |
| 91  | `day_of_week`       | Monday=1 to Friday=5                | [1, 5]    | Weekly pattern    |
| 92  | `is_expiry_day`     | 1 if weekly/monthly expiry          | {0, 1}    | Event flag        |
| 93  | `days_to_expiry`    | Trading days until nearest expiry   | [0, 30]   | Theta context     |
| 94  | `session_phase`     | 1=opening, 2=mid, 3=closing         | {1, 2, 3} | Intraday phase    |
| 95  | `is_month_end`      | Month-end flag                      | {0, 1}    | Rebalancing       |
| 96  | `is_quarter_end`    | Quarter-end flag                    | {0, 1}    | Rebalancing       |
| 97  | `time_sin`          | `sin(2π × minutes_from_open / 375)` | [-1, 1]   | Cyclical time     |
| 98  | `time_cos`          | `cos(2π × minutes_from_open / 375)` | [-1, 1]   | Cyclical time     |
| 99  | `day_of_week_sin`   | `sin(2π × day_of_week / 5)`         | [-1, 1]   | Cyclical day      |
| 100 | `day_of_week_cos`   | `cos(2π × day_of_week / 5)`         | [-1, 1]   | Cyclical day      |
| 101 | `month_of_year`     | Month (1-12)                        | [1, 12]   | Seasonality       |

---

## Category 12: Global Macro (12 Features) — **NEW**

Computed from Yahoo Finance / Alpha Vantage data. Forward-filled during Indian market hours.

| #   | Feature                   | Formula                             | Range         | Purpose             |
| --- | ------------------------- | ----------------------------------- | ------------- | ------------------- |
| 102 | `gift_nifty_premium`      | GIFT Nifty LTP - prev NIFTY close   | [-200, 200]   | Gap predictor       |
| 103 | `sp500_overnight_return`  | S&P 500 E-mini overnight %          | [-0.05, 0.05] | US sentiment        |
| 104 | `nasdaq_overnight_return` | Nasdaq 100 E-mini overnight %       | [-0.05, 0.05] | Tech sentiment      |
| 105 | `nikkei_return`           | Nikkei 225 session return %         | [-0.05, 0.05] | Asia sentiment      |
| 106 | `ftse_return`             | FTSE 100 session return %           | [-0.05, 0.05] | Europe sentinel     |
| 107 | `brent_crude_change`      | Brent crude overnight % change      | [-0.10, 0.10] | Oil impact          |
| 108 | `wti_crude_change`        | WTI crude overnight % change        | [-0.10, 0.10] | Oil impact          |
| 109 | `brent_wti_spread`        | Brent - WTI price spread            | [-5, 15]      | Supply signal       |
| 110 | `gold_change`             | Gold (XAU/USD) overnight % change   | [-0.05, 0.05] | Safe haven (global) |
| 111 | `silver_change`           | Silver (XAG/USD) overnight % change | [-0.08, 0.08] | Metals (global)     |
| 112 | `usd_inr_change`          | USD/INR overnight % change          | [-0.02, 0.02] | FX impact           |
| 113 | `us_10y_yield_change`     | US 10Y Treasury yield change        | [-0.05, 0.05] | Rate regime         |

---

## Category 13: Pre-Market (4 Features) — **NEW**

Computed at 9:08 AM from pre-open session data + Tier 0 model output.

| #   | Feature                       | Formula                                  | Range         | Purpose      |
| --- | ----------------------------- | ---------------------------------------- | ------------- | ------------ |
| 114 | `actual_gap_pct`              | `(9:08 price - prev close) / prev close` | [-0.05, 0.05] | Actual gap   |
| 115 | `expected_opening_volatility` | Tier 0 model output                      | [0, 1]        | Vol forecast |
| 116 | `pre_market_bias`             | Directional bias from Tier 0             | [-1, 1]       | Opening bias |
| 117 | `overnight_news_sentiment`    | Aggregated overnight FinBERT sentiment   | [-1, 1]       | News impact  |

---

## Category 14: MCX Global Commodities (8 Features) — **NEW**

> **Source**: Upstox WebSocket (real-time during MCX hours: 09:00–23:30 IST, Copper/Agri until 17:00 IST). These are LIVE Upstox instrument ticks — not Yahoo Finance estimates. Forward-filled outside MCX hours using previous session close.

MCX instruments available via Upstox (`MCX_FO|*`). The **nearest active contract** is used for each commodity (auto-rolled by `InstrumentSyncService` on expiry).

| #   | Feature                     | Formula                                 | Upstox Instrument Key | Range                  | Purpose                      |
| --- | --------------------------- | --------------------------------------- | --------------------- | ---------------------- | ---------------------------- |
| 118 | `mcx_crudeoil_change`       | Intraday % change from prev close       | `MCX_FO               | CRUDEOIL{expiry}FUT`   | [-0.10, 0.10]                |
| 119 | `mcx_naturalgas_change`     | Intraday % change from prev close       | `MCX_FO               | NATURALGAS{expiry}FUT` | [-0.15, 0.15]                |
| 120 | `mcx_gold_change`           | Intraday % change from prev close       | `MCX_FO               | GOLD{expiry}FUT`       | [-0.05, 0.05]                |
| 121 | `mcx_silver_change`         | Intraday % change from prev close       | `MCX_FO               | SILVER{expiry}FUT`     | [-0.08, 0.08]                |
| 122 | `mcx_copper_change`         | Intraday % change from prev close       | `MCX_FO               | COPPER{expiry}FUT`     | [-0.08, 0.08]                |
| 123 | `brent_mcx_crudeoil_spread` | Brent price (USD) - MCX Crude (INR-adj) | derived               | [-500, 500]            | Import cost vs domestic      |
| 124 | `mcx_commodity_breadth`     | Count(MCX instruments up) / 5           | derived               | [0, 1]                 | Commodity market breadth     |
| 125 | `mcx_intraday_regime`       | Rolling zscore of all MCX changes       | derived               | [-3, 3]                | Risk-on/off commodity regime |

### Why MCX over NYMEX/ICE for Indian market features?

- **INR-denomination**: MCX prices reflect USD/INR exchange + India import duties + domestic demand — a direct input cost signal for Indian companies
- **Same session overlap**: MCX Energy (09:00–23:30 IST) overlaps Indian equity session entirely
- **Already streaming**: As MCX instruments are already subscribed for admin data collection, there is zero additional WebSocket cost
- **Model relevance**: Crude Oil MCX ↔ airlines, paints, OMCs; Gold MCX ↔ jewellery stocks, jewellery exports; Copper MCX ↔ capital goods, infrastructure

### MCX Feature Ingestion Pipeline

```
Upstox WebSocket (MCX_FO|* instruments)
  │
  ▼
market-feeder: TickRouter → MCX Handler (new)
  │  - Calculates intraday % change from prev_close
  │  - Updates rolling OHLCV in memory
  │
  ▼
GlobalDataService.getMCXSnapshot()
  │  - Returns latest tick states for 5 MCX instruments
  │  - Falls back to Yahoo Finance (Brent as proxy for Crude) if MCX session closed
  │
  ▼
Feature Computation: mcx_* features injected into FeatureInput
  │
  ▼
QuestDB: stored in instrument_features table (same as other batch features)
```

---

## Model Feature Mapping (Updated)

| Model                   | Features Used                                                               | Count  |
| ----------------------- | --------------------------------------------------------------------------- | ------ |
| **Tier 0 XGBoost**      | Global Macro (12) + MCX Commodities (8) + Pre-Market (4)                    | 24     |
| **Tier 1 HMM**          | Price Structure + MAs + Volatility + Breadth + Global + MCX + Tier 0 output | ~43    |
| **Tier 1 PatchTST**     | Daily sequence (512 days × 15 features)                                     | 15×512 |
| **Tier 2 LightGBM**     | All except Order Flow                                                       | ~116   |
| **Tier 2 TFT**          | Time-series (120 timesteps × 20 features)                                   | 20×120 |
| **Tier 2 Mamba**        | Time-series (120 timesteps × 20 features)                                   | 20×120 |
| **Tier 3 LiT**          | Order Flow (8) + LOB depth-30 raw                                           | 14     |
| **Tier 4 Meta-Learner** | Model outputs + Regime context                                              | ~15    |

---

## Performance Targets

| Metric                    | Target   | Typical |
| ------------------------- | -------- | ------- |
| Real-time (Rust, 54 core) | <5ms     | 2-4ms   |
| Dependencies (Phase 1)    | <3ms     | 1.5-2ms |
| Features (Phase 2)        | <2ms     | 0.5-1ms |
| Batch (Python, 100+ full) | <30s/day | ~15s    |
| Memory Footprint          | <100KB   | ~60KB   |

---

## Related Documentation

- [compute-engine README](../../packages/compute-engine/README.md) - Rust implementation
- [MODEL_ARCHITECTURE.md](./MODEL_ARCHITECTURE.md) - 5-tier model design
- [TRAINING_PIPELINE.md](./TRAINING_PIPELINE.md) - Model training
- [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) - Data sources
