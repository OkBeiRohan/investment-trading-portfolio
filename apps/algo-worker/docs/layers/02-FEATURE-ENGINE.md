# Layer 2: Feature Engine (Rust compute-engine)

> **Transforms raw market data into 117 ML-ready features in <5ms using Rust NAPI-RS with Rayon parallel execution.**

**Last Updated**: March 13, 2026

---

## Overview

The Feature Engine layer receives raw market data (candles, option chain, constituents, LOB depth) and produces 117 numerical features via the `@repo/compute-engine` Rust native module. It uses a two-phase architecture: Phase 1 computes shared dependencies sequentially, Phase 2 computes all features in parallel via Rayon.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          LAYER 2: FEATURE ENGINE                              │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                         RAW MARKET DATA                                │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐          │  │
│  │  │ NIFTY     │  │ 50        │  │ Option    │  │ Market    │          │  │
│  │  │ Future    │  │ Stocks    │  │ Chain     │  │ Depth     │          │  │
│  │  │ OHLCV+OI  │  │ LTP+VWAP │  │ Greeks+IV │  │ LOB-30    │          │  │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘          │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                    ↓                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                COMPUTE-ENGINE (Rust, NAPI-RS, <5ms)                    │  │
│  │                                                                        │  │
│  │   Phase 1: Shared Dependencies (sequential)              ~2ms         │  │
│  │   ├── VWAP, SMA, EMA (9, 20, 26)                                     │  │
│  │   ├── ATR(14), RSI(14), MACD(12,26,9)                                │  │
│  │   ├── ADX(14), CCI(20), Bollinger Bands                              │  │
│  │   ├── Realized Vol (5m, 15m), Vol-of-Vol                             │  │
│  │   ├── Option Greeks (via Black-76), IV Surface                        │  │
│  │   └── Historical Cache (RingBuffer: last 120 values per series)       │  │
│  │                                                                        │  │
│  │   Phase 2: 117 Features (parallel via Rayon)             ~1ms         │  │
│  │   └── All features computed in parallel using pre-computed deps       │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                    ↓                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                      OUTPUT: 117 FEATURES (JSON)                       │  │
│  │                                                                        │  │
│  │   Index Breadth (8)  │ NIFTY Future (12)  │ Options (14)              │  │
│  │   Volatility (10)    │ Order Flow (8)      │ Price Structure (8)      │  │
│  │   Momentum (8)       │ Time Context (13)   │ Global Macro (12)        │  │
│  │   Regime Context (4) │ Volume Profile (6)  │ Cross-Asset (4)          │  │
│  │   LOB Microstructure(6) │ Sentiment (4)                               │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 117 Features — Complete Reference

### Index Breadth (8)

| #   | Feature                  | Formula                   | Range         | Purpose            |
| --- | ------------------------ | ------------------------- | ------------- | ------------------ |
| 1   | `pct_stocks_above_vwap`  | count(ltp > vwap) / 50    | [0, 1]        | Bullish breadth    |
| 2   | `pct_stocks_above_ema20` | count(ltp > ema20) / 50   | [0, 1]        | Trend breadth      |
| 3   | `weighted_return_top10`  | Σ(return × weight) top 10 | [-0.1, 0.1]   | Large-cap momentum |
| 4   | `advance_decline_ratio`  | advances / declines       | [0, ∞)        | Market direction   |
| 5   | `breadth_momentum_5m`    | mean(intraday_returns)    | [-0.05, 0.05] | Short-term breadth |
| 6   | `breadth_volatility`     | std(intraday_returns)     | [0, 0.1]      | Dispersion         |
| 7   | `breadth_thrust`         | advances / (adv + dec)    | [0, 1]        | Thrust indicator   |
| 8   | `new_highs_lows_ratio`   | (highs - lows) / 50       | [-1, 1]       | Extremes           |

### NIFTY Future (12)

| #   | Feature              | Formula                         | Range         | Purpose             |
| --- | -------------------- | ------------------------------- | ------------- | ------------------- |
| 9   | `fut_price_vs_vwap`  | (ltp - vwap) / vwap             | [-0.03, 0.03] | Short-term bias     |
| 10  | `fut_range_position` | (ltp - low) / (high - low)      | [0, 1]        | Intraday position   |
| 11  | `fut_return_1m`      | (price - price_1m) / price_1m   | [-0.02, 0.02] | 1-min momentum      |
| 12  | `fut_return_5m`      | (price - price_5m) / price_5m   | [-0.05, 0.05] | 5-min momentum      |
| 13  | `fut_return_15m`     | (price - price_15m) / price_15m | [-0.08, 0.08] | 15-min momentum     |
| 14  | `fut_atr_pct`        | ATR(14) / ltp                   | [0.005, 0.03] | Volatility          |
| 15  | `fut_volume_zscore`  | (vol - mean) / std              | [-3, 5]       | Volume anomaly      |
| 16  | `fut_oi_change`      | oi_now - oi_prev                | raw           | OI delta            |
| 17  | `fut_oi_change_pct`  | oi_change / oi_prev             | [-0.1, 0.1]   | OI % change         |
| 18  | `fut_rsi_14`         | RSI(14)                         | [0, 100]      | Momentum oscillator |
| 19  | `fut_macd`           | EMA(12) - EMA(26)               | [-200, 200]   | Trend indicator     |
| 20  | `fut_macd_signal`    | EMA(9) of MACD                  | [-200, 200]   | Signal line         |

### Options (14)

| #   | Feature                | Formula                      | Range           | Purpose          |
| --- | ---------------------- | ---------------------------- | --------------- | ---------------- |
| 21  | `atm_iv`               | avg(call_iv, put_iv) at ATM  | [0.08, 0.50]    | Market fear      |
| 22  | `atm_iv_change`        | atm_iv - atm_iv_5min_ago     | [-0.05, 0.05]   | IV momentum      |
| 23  | `iv_skew`              | put_iv - call_iv             | [-0.1, 0.1]     | Put premium      |
| 24  | `iv_term_structure`    | near_iv - next_iv            | [-0.1, 0.1]     | Event pricing    |
| 25  | `gamma_atm`            | avg(gamma) at ATM            | [0, 0.01]       | Gamma exposure   |
| 26  | `vega_atm`             | avg(vega) at ATM             | [0, 100]        | Vega exposure    |
| 27  | `theta_atm`            | avg(theta) at ATM            | [-50, 0]        | Time decay       |
| 28  | `pcr_oi`               | put_oi / call_oi             | [0.5, 2.0]      | OI sentiment     |
| 29  | `pcr_volume`           | put_vol / call_vol           | [0.3, 3.0]      | Volume sentiment |
| 30  | `max_pain_distance`    | abs(spot - max_pain)         | [0, 500]        | Magnetic target  |
| 31  | `total_gamma_exposure` | Σ(gamma × oi × S²)           | [-100, 100]     | GEX              |
| 32  | `charm_atm`            | d(delta)/d(time)             | [-0.001, 0.001] | 2nd order Greek  |
| 33  | `vanna_atm`            | d(delta)/d(iv)               | [-0.01, 0.01]   | 2nd order Greek  |
| 34  | `iv_percentile_30d`    | IV rank over 30 trading days | [0, 100]        | IV context       |

### Volatility (10)

| #   | Feature               | Formula                               | Range        | Purpose             |
| --- | --------------------- | ------------------------------------- | ------------ | ------------------- |
| 35  | `india_vix`           | India VIX raw                         | [10, 50]     | Fear index          |
| 36  | `realized_vol_5m`     | annualized std (5 periods)            | [0.05, 0.50] | Short-term RV       |
| 37  | `realized_vol_15m`    | annualized std (15 periods)           | [0.05, 0.50] | Medium-term RV      |
| 38  | `vol_expansion_ratio` | rv_5m / rv_15m                        | [0.5, 2.0]   | Vol regime          |
| 39  | `iv_rv_ratio`         | atm_iv / realized_vol                 | [0.5, 3.0]   | VRP signal          |
| 40  | `vix_percentile_30d`  | VIX rank                              | [0, 100]     | VIX context         |
| 41  | `vol_of_vol`          | std(vix) over 20 periods              | [0, 10]      | Vol stability       |
| 42  | `parkinson_vol`       | HL estimator: √(1/4n·ln²·Σ(ln(H/L))²) | [0.05, 0.50] | Range-based vol     |
| 43  | `garman_klass_vol`    | OHLC estimator                        | [0.05, 0.50] | Better vol estimate |
| 44  | `vol_smile_slope`     | d(IV)/d(moneyness) at ATM             | [-5, 5]      | Skew steepness      |

### Order Flow (8)

| #   | Feature              | Formula                                | Range     | Purpose         |
| --- | -------------------- | -------------------------------------- | --------- | --------------- |
| 45  | `bid_ask_spread_bps` | (ask - bid) / mid × 10000              | [1, 50]   | Liquidity       |
| 46  | `depth_imbalance_5`  | (bid_qty - ask_qty) / total (5 levels) | [-1, 1]   | Supply/demand   |
| 47  | `ofi_1s`             | Order Flow Imbalance (1s window)       | [-1, 1]   | Short-term flow |
| 48  | `ofi_5s`             | OFI (5s window)                        | [-1, 1]   | Medium flow     |
| 49  | `ofi_30s`            | OFI (30s window)                       | [-1, 1]   | Trend flow      |
| 50  | `trade_imbalance`    | (buy_vol - sell_vol) / total           | [-1, 1]   | Aggressor side  |
| 51  | `bid_slope`          | Price impact slope (bid side)          | [0, 1000] | Bid resilience  |
| 52  | `ask_slope`          | Price impact slope (ask side)          | [0, 1000] | Ask resilience  |

### Price Structure (8)

| #   | Feature              | Formula                                    | Range         | Purpose            |
| --- | -------------------- | ------------------------------------------ | ------------- | ------------------ |
| 53  | `return_1m`          | (close - prev_close) / prev_close          | [-0.02, 0.02] | Micro return       |
| 54  | `return_5m`          | Compounded 5-min return                    | [-0.05, 0.05] | Short return       |
| 55  | `return_15m`         | Compounded 15-min return                   | [-0.08, 0.08] | Medium return      |
| 56  | `gap_open`           | (open - prev_close) / prev_close           | [-0.05, 0.05] | Opening gap        |
| 57  | `range_position`     | (close - day_low) / (day_high - day_low)   | [0, 1]        | Daily range        |
| 58  | `bb_position`        | (close - bb_lower) / (bb_upper - bb_lower) | [0, 1]        | Bollinger position |
| 59  | `price_vs_sma20`     | (close - SMA20) / SMA20                    | [-0.05, 0.05] | Trend deviation    |
| 60  | `price_acceleration` | return_1m - prev_return_1m                 | [-0.02, 0.02] | Momentum change    |

### Momentum (8)

| #   | Feature          | Formula           | Range       | Purpose             |
| --- | ---------------- | ----------------- | ----------- | ------------------- |
| 61  | `rsi_5`          | RSI(5)            | [0, 100]    | Fast oscillator     |
| 62  | `rsi_14`         | RSI(14)           | [0, 100]    | Standard oscillator |
| 63  | `macd_histogram` | MACD - Signal     | [-200, 200] | Momentum strength   |
| 64  | `adx_14`         | ADX(14)           | [0, 100]    | Trend strength      |
| 65  | `cci_20`         | CCI(20)           | [-200, 200] | Overbought/oversold |
| 66  | `stoch_k`        | Stochastic %K(14) | [0, 100]    | Fast stochastic     |
| 67  | `stoch_d`        | Stochastic %D(3)  | [0, 100]    | Slow stochastic     |
| 68  | `williams_r`     | Williams %R(14)   | [-100, 0]   | Momentum extreme    |

### Time Context (13)

| #   | Feature             | Formula                        | Range     | Purpose            |
| --- | ------------------- | ------------------------------ | --------- | ------------------ |
| 69  | `minutes_from_open` | Minutes since 09:15 IST        | [0, 375]  | Session progress   |
| 70  | `minutes_to_close`  | Minutes until 15:30 IST        | [0, 375]  | Session remaining  |
| 71  | `day_of_week`       | 1=Mon to 5=Fri                 | [1, 5]    | Weekly pattern     |
| 72  | `is_expiry_day`     | Boolean flag                   | {0, 1}    | Event day          |
| 73  | `days_to_expiry`    | Trading days to nearest expiry | [0, 30]   | Theta context      |
| 74  | `session_phase`     | 1=open, 2=mid, 3=close         | {1, 2, 3} | Intraday phase     |
| 75  | `sin_time_of_day`   | sin(2π × minutes/375)          | [-1, 1]   | Cyclical encoding  |
| 76  | `cos_time_of_day`   | cos(2π × minutes/375)          | [-1, 1]   | Cyclical encoding  |
| 77  | `sin_day_of_week`   | sin(2π × day/5)                | [-1, 1]   | Weekly cycle       |
| 78  | `cos_day_of_week`   | cos(2π × day/5)                | [-1, 1]   | Weekly cycle       |
| 79  | `sin_month`         | sin(2π × month/12)             | [-1, 1]   | Monthly cycle      |
| 80  | `cos_month`         | cos(2π × month/12)             | [-1, 1]   | Monthly cycle      |
| 81  | `is_first_hour`     | minutes_from_open < 60         | {0, 1}    | Opening volatility |

### Global Macro (12)

| #   | Feature               | Formula                       | Range         | Purpose              |
| --- | --------------------- | ----------------------------- | ------------- | -------------------- |
| 82  | `es_return_overnight` | S&P 500 overnight return      | [-0.05, 0.05] | US sentiment         |
| 83  | `nq_return_overnight` | Nasdaq overnight return       | [-0.05, 0.05] | Tech sentiment       |
| 84  | `gift_nifty_premium`  | GIFT Nifty - prev NIFTY close | [-500, 500]   | Gap proxy            |
| 85  | `dxy_change`          | Dollar Index change           | [-0.02, 0.02] | Forex impact         |
| 86  | `eur_inr_change`      | EUR/INR change                | [-0.02, 0.02] | Currency             |
| 87  | `usd_inr_change`      | USD/INR change                | [-0.02, 0.02] | Currency             |
| 88  | `brent_return`        | Brent crude overnight return  | [-0.05, 0.05] | Energy proxy         |
| 89  | `gold_return`         | Gold overnight return         | [-0.03, 0.03] | Safe-haven           |
| 90  | `us10y_change`        | US 10Y yield change (bps)     | [-20, 20]     | Rate expectations    |
| 91  | `vix_cboe`            | CBOE VIX value                | [10, 80]      | Global fear          |
| 92  | `nikkei_return`       | Nikkei 225 return             | [-0.03, 0.03] | Asia sentiment       |
| 93  | `hangseng_return`     | Hang Seng return              | [-0.03, 0.03] | Asia/China sentiment |

### Regime Context (4)

| #   | Feature                | Formula                     | Range  | Purpose     |
| --- | ---------------------- | --------------------------- | ------ | ----------- |
| 94  | `regime_bull_trending` | From Tier 1 cache (one-hot) | {0, 1} | Bull market |
| 95  | `regime_bear_trending` | From Tier 1 cache (one-hot) | {0, 1} | Bear market |
| 96  | `regime_volatile`      | From Tier 1 cache (one-hot) | {0, 1} | High vol    |
| 97  | `regime_ranging`       | From Tier 1 cache (one-hot) | {0, 1} | Sideways    |

### Volume Profile (6)

| #   | Feature                  | Formula                        | Range       | Purpose             |
| --- | ------------------------ | ------------------------------ | ----------- | ------------------- |
| 98  | `volume_ratio_5m`        | vol_5m / avg_vol_5m_20d        | [0, 5]      | Volume surge        |
| 99  | `volume_ratio_15m`       | vol_15m / avg_vol_15m_20d      | [0, 5]      | Medium volume       |
| 100 | `cum_volume_vs_expected` | cum_vol / expected_cum_vol     | [0, 3]      | Daily participation |
| 101 | `oi_change_pct_calls`    | near-month call OI change %    | [-0.2, 0.2] | Call build-up       |
| 102 | `oi_change_pct_puts`     | near-month put OI change %     | [-0.2, 0.2] | Put build-up        |
| 103 | `delivery_pct`           | delivery_volume / total_volume | [0, 1]      | Conviction          |

### Cross-Asset Correlation (4)

| #   | Feature                   | Formula                              | Range           | Purpose                |
| --- | ------------------------- | ------------------------------------ | --------------- | ---------------------- |
| 104 | `nifty_banknifty_corr_20` | 20-day rolling correlation           | [-1, 1]         | Sector alignment       |
| 105 | `nifty_vix_corr_20`       | 20-day rolling NIFTY-VIX correlation | [-1, 0]         | Fear correlation       |
| 106 | `futures_spot_basis`      | (future - spot) / spot               | [-0.01, 0.01]   | Contango/backwardation |
| 107 | `futures_basis_change`    | basis - basis_prev                   | [-0.005, 0.005] | Basis momentum         |

### LOB Microstructure (6)

| #   | Feature                  | Formula                                 | Range           | Purpose                |
| --- | ------------------------ | --------------------------------------- | --------------- | ---------------------- |
| 108 | `depth_imbalance_10`     | (bid_qty - ask_qty) / total (10 levels) | [-1, 1]         | Deep book imbalance    |
| 109 | `volume_at_bid_pct`      | bid_volume / total_volume               | [0, 1]          | Execution side         |
| 110 | `sweep_detection`        | Large order consuming >3 levels         | {0, 1}          | Institutional activity |
| 111 | `cancellation_rate`      | cancelled / (placed + cancelled)        | [0, 1]          | Spoofing proxy         |
| 112 | `large_trade_ratio`      | large_trades_vol / total_vol            | [0, 1]          | Block activity         |
| 113 | `mid_price_return_100ms` | (mid - mid_100ms_ago) / mid             | [-0.001, 0.001] | Tick momentum          |

### Sentiment (4)

| #   | Feature                 | Formula                          | Range      | Purpose         |
| --- | ----------------------- | -------------------------------- | ---------- | --------------- |
| 114 | `finbert_sentiment`     | FinBERT aggregate score          | [-1, 1]    | News sentiment  |
| 115 | `sentiment_momentum_1h` | sentiment_now - sentiment_1h_ago | [-1, 1]    | Sentiment shift |
| 116 | `fii_flow_signal`       | FII net flow direction (daily)   | {-1, 0, 1} | Foreign flow    |
| 117 | `dii_flow_signal`       | DII net flow direction (daily)   | {-1, 0, 1} | Domestic flow   |

---

## Two-Phase Computation

### Phase 1: Shared Dependencies (Sequential, ~2ms)

Dependencies are values needed by multiple features. Computing them once eliminates redundancy.

| Dependency       | Used By                                        | Warm-Up           |
| ---------------- | ---------------------------------------------- | ----------------- |
| VWAP             | `pct_stocks_above_vwap`, `fut_price_vs_vwap`   | 1 period          |
| EMA(9, 20, 26)   | `pct_stocks_above_ema20`, `fut_macd`, `adx_14` | 20 periods        |
| ATR(14)          | `fut_atr_pct`, volatility features             | 14 periods        |
| RSI(14)          | `fut_rsi_14`, `rsi_14`                         | 14 periods        |
| MACD(12,26,9)    | `fut_macd`, `macd_histogram`                   | 26 periods        |
| Realized Vol     | `realized_vol_5m`, `iv_rv_ratio`               | 5 periods         |
| Option Greeks    | `gamma_atm`, `vega_atm`, `total_gex`           | 1 period          |
| Historical Cache | All lookback features                          | 120 periods (2hr) |

### Phase 2: 117 Features (Parallel via Rayon, ~1ms)

All 117 features computed in parallel, each reading from the shared dependency cache. Rayon schedules across available CPU threads.

```rust
pub fn compute_all(&self, input: &FeatureInput, cache: &HistoricalCache) -> ComputeResult {
    let start = Instant::now();

    // Phase 1: Shared dependencies (sequential)
    let deps = self.compute_dependencies(input, cache);

    // Phase 2: All features in parallel (Rayon)
    let features: Vec<FeatureResult> = self.features
        .par_iter()
        .map(|f| {
            let t = Instant::now();
            let value = f.compute(input, &deps);
            FeatureResult { name: f.name(), value, duration: t.elapsed() }
        })
        .collect();

    ComputeResult {
        features: self.to_output(features),
        total_duration: start.elapsed(),
    }
}
```

---

## Integration with algo-worker

```typescript
import {
  computeFeatures,
  type FeatureInput,
  type ComputeResult,
} from '@repo/compute-engine';

@Injectable()
export class FeatureComputationService {
  async computeAndPublish(marketData: MarketDataEvent): Promise<ComputeResult> {
    const input: FeatureInput = this.transformToFeatureInput(marketData);

    // Rust computes 117 features in <5ms
    const result = computeFeatures(input);

    // Publish to Redis for inference
    await this.redis.publish('features:live', JSON.stringify(result.features));

    // Store to QuestDB for training
    await this.questdb.insert('instrument_features_1m', result.features);

    return result;
  }
}
```

---

## Performance

| Metric                 | Target    | Typical   |
| ---------------------- | --------- | --------- |
| Phase 1 (dependencies) | <3ms      | 1.5-2ms   |
| Phase 2 (117 features) | <2ms      | 0.8-1.2ms |
| Total compute-engine   | <5ms      | 2.5-3.5ms |
| Redis publish          | <1ms      | 0.5ms     |
| QuestDB store          | <5ms      | 2-3ms     |
| **Total Layer 2**      | **<10ms** | **5-7ms** |

---

**See Also**:

- [01-DATA-INGESTION.md](./01-DATA-INGESTION.md) — Previous layer
- [03-PREDICTION.md](./03-PREDICTION.md) — Next layer
- [compute-engine README](../../../packages/compute-engine/README.md) — Rust implementation
- [FEATURE_REFERENCE.md](../../../packages/compute-engine/docs/FEATURE_REFERENCE.md) — Feature formulas
