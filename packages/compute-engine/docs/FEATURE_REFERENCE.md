# Feature Reference Guide

> **Complete reference for all 117 features computed by the compute-engine.**

**Last Updated**: March 13, 2026
**Total Features**: 117 across 14 categories
**Performance**: <5ms (p95) via Rayon parallel computation

---

## Quick Reference Table

### Index Breadth (8)

| #   | Feature                | Range         | Dependencies       |
| --- | ---------------------- | ------------- | ------------------ |
| 1   | pct_stocks_above_vwap  | [0, 1]        | constituent_vwaps  |
| 2   | pct_stocks_above_ema20 | [0, 1]        | constituent_ema20s |
| 3   | weighted_return_top10  | [-0.1, 0.1]   | -                  |
| 4   | advance_decline_ratio  | [0, inf)      | -                  |
| 5   | breadth_momentum_5m    | [-0.05, 0.05] | -                  |
| 6   | breadth_volatility     | [0, 0.1]      | -                  |
| 7   | breadth_thrust         | [0, 1]        | -                  |
| 8   | new_highs_lows_ratio   | [-1, 1]       | -                  |

### NIFTY Future (12)

| #   | Feature            | Range         | Dependencies        |
| --- | ------------------ | ------------- | ------------------- |
| 9   | fut_price_vs_vwap  | [-0.03, 0.03] | nifty_future_vwap   |
| 10  | fut_range_position | [0, 1]        | -                   |
| 11  | fut_return_1m      | [-0.02, 0.02] | cache               |
| 12  | fut_return_5m      | [-0.05, 0.05] | cache               |
| 13  | fut_return_15m     | [-0.08, 0.08] | cache               |
| 14  | fut_atr_percent    | [0.005, 0.03] | nifty_future_atr    |
| 15  | fut_volume_zscore  | [-3, 5]       | volume_stats        |
| 16  | fut_oi_change      | [-1M, 1M]     | cache               |
| 17  | fut_oi_change_pct  | [-0.1, 0.1]   | cache               |
| 18  | fut_rsi_14         | [0, 100]      | nifty_future_rsi_14 |
| 19  | fut_macd           | [-200, 200]   | ema12, ema26        |
| 20  | fut_macd_signal    | [-200, 200]   | macd_history        |

### Options (14)

| #   | Feature              | Range           | Dependencies     |
| --- | -------------------- | --------------- | ---------------- |
| 21  | atm_iv               | [0.08, 0.50]    | find_atm_options |
| 22  | atm_iv_change        | [-0.05, 0.05]   | prev_atm_iv      |
| 23  | iv_skew              | [-0.1, 0.1]     | find_atm_options |
| 24  | iv_term_structure    | [-0.1, 0.1]     | expiry grouping  |
| 25  | gamma_atm            | [0, 0.01]       | atm_greeks       |
| 26  | vega_atm             | [0, 100]        | atm_greeks       |
| 27  | theta_atm            | [-50, 0]        | atm_greeks       |
| 28  | pcr_oi               | [0.5, 2.0]      | -                |
| 29  | pcr_volume           | [0.3, 3.0]      | -                |
| 30  | max_pain_distance    | [0, 500]        | -                |
| 31  | total_gamma_exposure | [-100, 100]     | -                |
| 32  | charm_atm            | [-0.001, 0.001] | black_scholes    |
| 33  | vanna_atm            | [-0.01, 0.01]   | black_scholes    |
| 34  | iv_percentile_30d    | [0, 100]        | historical_iv    |

### Volatility (10)

| #   | Feature             | Range         | Dependencies      |
| --- | ------------------- | ------------- | ----------------- |
| 35  | india_vix           | [10, 50]      | -                 |
| 36  | realized_vol_5m     | [0.05, 0.50]  | cache             |
| 37  | realized_vol_15m    | [0.05, 0.50]  | cache             |
| 38  | vol_expansion_ratio | [0.5, 2.0]    | rv_5m, rv_15m     |
| 39  | iv_rv_ratio         | [0.5, 3.0]    | atm_iv, rv_15m    |
| 40  | vix_percentile_30d  | [0, 100]      | historical_vix    |
| 41  | vix_term_structure  | [-5, 5]       | near_vix, far_vix |
| 42  | realized_vol_30m    | [0.05, 0.50]  | cache             |
| 43  | vol_of_vol          | [0, 0.2]      | rolling_rv        |
| 44  | iv_change_rate      | [-0.02, 0.02] | iv_history        |

### Order Flow (8)

| #   | Feature            | Range     | Dependencies  |
| --- | ------------------ | --------- | ------------- |
| 45  | bid_ask_spread_bps | [1, 50]   | -             |
| 46  | depth_imbalance_5  | [-1, 1]   | -             |
| 47  | ofi_1s             | [-1, 1]   | lob_history   |
| 48  | ofi_5s             | [-1, 1]   | lob_history   |
| 49  | ofi_30s            | [-1, 1]   | lob_history   |
| 50  | trade_imbalance    | [-1, 1]   | trade_history |
| 51  | bid_slope          | [0, 1000] | lob_levels    |
| 52  | ask_slope          | [0, 1000] | lob_levels    |

### Price Structure (8)

| #   | Feature        | Range         | Dependencies |
| --- | -------------- | ------------- | ------------ |
| 53  | return_1m      | [-0.02, 0.02] | cache        |
| 54  | return_5m      | [-0.05, 0.05] | cache        |
| 55  | return_15m     | [-0.08, 0.08] | cache        |
| 56  | return_30m     | [-0.10, 0.10] | cache        |
| 57  | gap_open       | [-0.05, 0.05] | prev_close   |
| 58  | intraday_range | [0, 0.05]     | -            |
| 59  | upper_shadow   | [0, 1]        | -            |
| 60  | lower_shadow   | [0, 1]        | -            |

### Momentum (8)

| #   | Feature         | Range       | Dependencies              |
| --- | --------------- | ----------- | ------------------------- |
| 61  | rsi_5           | [0, 100]    | rsi_5                     |
| 62  | rsi_14          | [0, 100]    | rsi_14                    |
| 63  | macd_histogram  | [-200, 200] | ema12, ema26, macd_signal |
| 64  | adx_14          | [0, 100]    | adx_14                    |
| 65  | cci_20          | [-300, 300] | sma_20, mean_dev          |
| 66  | williams_r_14   | [-100, 0]   | high_14, low_14           |
| 67  | stochastic_k_14 | [0, 100]    | high_14, low_14           |
| 68  | stochastic_d_14 | [0, 100]    | stochastic_k history      |

### Time Context (13)

| #   | Feature                 | Range     | Dependencies |
| --- | ----------------------- | --------- | ------------ |
| 69  | minutes_from_open       | [0, 375]  | -            |
| 70  | minutes_to_close        | [0, 375]  | -            |
| 71  | day_of_week             | [1, 5]    | -            |
| 72  | is_expiry_day           | {0, 1}    | calendar     |
| 73  | days_to_expiry          | [0, 30]   | calendar     |
| 74  | session_phase           | {1, 2, 3} | -            |
| 75  | sin_time_of_day         | [-1, 1]   | -            |
| 76  | cos_time_of_day         | [-1, 1]   | -            |
| 77  | sin_day_of_week         | [-1, 1]   | -            |
| 78  | cos_day_of_week         | [-1, 1]   | -            |
| 79  | is_weekly_expiry        | {0, 1}    | calendar     |
| 80  | is_monthly_expiry       | {0, 1}    | calendar     |
| 81  | minutes_to_expiry_close | [0, inf)  | calendar     |

### Global Macro (12)

| #   | Feature           | Range         | Dependencies |
| --- | ----------------- | ------------- | ------------ |
| 82  | es_return         | [-0.05, 0.05] | external API |
| 83  | nq_return         | [-0.05, 0.05] | external API |
| 84  | dxy_change        | [-0.02, 0.02] | external API |
| 85  | us10y_change      | [-20, 20]     | external API |
| 86  | gold_return       | [-0.03, 0.03] | external API |
| 87  | brent_return      | [-0.05, 0.05] | external API |
| 88  | nikkei_return     | [-0.05, 0.05] | external API |
| 89  | gift_nifty_return | [-0.03, 0.03] | external API |
| 90  | vix_close         | [10, 80]      | external API |
| 91  | dxy_level         | [90, 120]     | external API |
| 92  | us10y_level       | [1, 6]        | external API |
| 93  | fii_dii_net       | [-5000, 5000] | external API |

### Regime Context (4)

| #   | Feature              | Range  | Dependencies |
| --- | -------------------- | ------ | ------------ |
| 94  | regime_bull_trending | {0, 1} | Tier 1 cache |
| 95  | regime_bear_trending | {0, 1} | Tier 1 cache |
| 96  | regime_volatile      | {0, 1} | Tier 1 cache |
| 97  | regime_ranging       | {0, 1} | Tier 1 cache |

### Volume Profile (6)

| #   | Feature             | Range        | Dependencies   |
| --- | ------------------- | ------------ | -------------- |
| 98  | volume_ratio_5m     | [0, 5]       | volume_history |
| 99  | volume_ratio_15m    | [0, 5]       | volume_history |
| 100 | oi_change_pct_calls | [-0.1, 0.1]  | oi_history     |
| 101 | oi_change_pct_puts  | [-0.1, 0.1]  | oi_history     |
| 102 | volume_weighted_iv  | [0.08, 0.50] | option_volume  |
| 103 | cumulative_delta    | unbounded    | trade_history  |

### Cross-Asset (4)

| #   | Feature                 | Range      | Dependencies |
| --- | ----------------------- | ---------- | ------------ |
| 104 | nifty_banknifty_corr_20 | [-1, 1]    | rolling_corr |
| 105 | futures_spot_basis      | [-1, 1]    | -            |
| 106 | nifty_banknifty_ratio   | [0.4, 0.6] | -            |
| 107 | cross_asset_momentum    | [-1, 1]    | composite    |

### LOB Microstructure (6)

| #   | Feature                  | Range   | Dependencies      |
| --- | ------------------------ | ------- | ----------------- |
| 108 | depth_imbalance_10       | [-1, 1] | lob_depth         |
| 109 | sweep_detection          | {0, 1}  | lob_events        |
| 110 | large_order_flow         | [-1, 1] | block_detection   |
| 111 | price_impact_coefficient | [0, 10] | lob_regression    |
| 112 | queue_position_estimate  | [0, 1]  | lob_levels        |
| 113 | hidden_liquidity_score   | [0, 1]  | iceberg_heuristic |

### Sentiment (4)

| #   | Feature           | Range   | Dependencies |
| --- | ----------------- | ------- | ------------ |
| 114 | finbert_sentiment | [-1, 1] | external API |
| 115 | fii_flow_signal   | [-1, 1] | external API |
| 116 | dii_flow_signal   | [-1, 1] | external API |
| 117 | news_event_flag   | {0, 1}  | external API |

---

## Feature to Tier Mapping

Each tier consumes a specific subset of the 117 features based on its data resolution:

| Tier  | Model(s)       | Input                  | Features Consumed                                                |
| ----- | -------------- | ---------------------- | ---------------------------------------------------------------- |
| **0** | XGBoost        | [1, 12]                | #82-93 (12 global macro overnight features)                      |
| **1** | HMM + PatchTST | [1, 32] + [1, 252, 32] | 32 aggregated daily features from Breadth, Future, Vol, Momentum |
| **2** | LightGBM       | [1, 84]                | #1-81 point-in-time + #94-97 regime context = 84                 |
| **2** | TFT / Mamba    | [1, 120, 80]           | 120 bars x 80 features (selected from #1-81 + engineered)        |
| **3** | LiT            | [1, 14]                | #45-52 (Order Flow) + #108-113 (LOB Microstructure) = 14         |
| **4** | Meta-Learner   | [1, 24]                | Cached tier outputs only: T0(4) + T1(6) + T2(9) + T3(5) = 24     |

---

## Detailed Feature Specifications

### Index Breadth Features (8)

#### 1. pct_stocks_above_vwap

**Formula**: `count(constituent.ltp > constituent.vwap) / 50`

**Purpose**: Measures what percentage of NIFTY 50 stocks are trading above their VWAP, indicating bullish breadth.

```rust
pub fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let count_above = input.constituents
        .iter()
        .zip(&deps.constituent_vwaps)
        .filter(|(stock, vwap)| stock.ltp > **vwap)
        .count();

    count_above as f64 / input.constituents.len().max(1) as f64
}
```

**Edge Cases**: Empty constituents returns 0.0. VWAP = 0 excludes stock from count.

---

#### 2. pct_stocks_above_ema20

**Formula**: `count(constituent.ltp > constituent.ema20) / 50`

**Purpose**: Percentage of NIFTY 50 stocks above their 20-period EMA, indicating trend breadth.

---

#### 3. weighted_return_top10

**Formula**: `sum(return_i * weight_i)` for top 10 stocks by volume

**Purpose**: Volume-weighted average return of the 10 most active stocks. High values with high breadth confirm move.

```rust
let mut stocks: Vec<_> = input.constituents.iter().collect();
stocks.sort_by(|a, b| b.volume.partial_cmp(&a.volume).unwrap_or(Ordering::Equal));

stocks.iter().take(10)
    .map(|s| (s.ltp - s.open) / s.open.max(0.01))
    .sum::<f64>() / 10.0
```

---

#### 4. advance_decline_ratio

**Formula**: `advances / max(declines, 1)`

**Purpose**: Ratio of advancing to declining stocks. >1 indicates bullish market. Division-safe.

---

#### 5-6. breadth_momentum_5m / breadth_volatility

**Formula**: mean and std of intraday returns across 50 constituents.

**Purpose**: Average momentum (directional) and dispersion (uncertainty) of the broad market.

---

#### 7. breadth_thrust

**Formula**: `advances / (advances + declines)`

**Purpose**: Thrust indicator. Values >0.7 indicate strong buying pressure.

---

#### 8. new_highs_lows_ratio

**Formula**: `(new_52w_highs - new_52w_lows) / 50`

**Purpose**: Net new highs vs lows as fraction. Extreme values indicate turning points.

---

### NIFTY Future Features (12)

#### 9. fut_price_vs_vwap

**Formula**: `(ltp - vwap) / vwap`
**Purpose**: Percentage deviation from VWAP. Positive = above VWAP (bullish institutional flow).

#### 10. fut_range_position

**Formula**: `(ltp - low) / (high - low)`
**Purpose**: Position within day's range. 1 = at high, 0 = at low.

#### 11-13. fut_return_1m / 5m / 15m

**Formula**: `(price_now - price_N_ago) / price_N_ago`
**Purpose**: Multi-horizon momentum signals.

#### 14. fut_atr_percent

**Formula**: `ATR(14) / ltp`
**Purpose**: Volatility as percentage of price.

#### 15. fut_volume_zscore

**Formula**: `(current_volume - mean) / std`
**Purpose**: Volume anomaly detection. >2 is unusual.

#### 16-17. fut_oi_change / fut_oi_change_pct

**Formula**: `oi_now - oi_prev` and `(oi_now - oi_prev) / oi_prev`
**Purpose**: Open interest changes indicate new positions or unwinding.

#### 18. fut_rsi_14

**Formula**: `100 - 100 / (1 + RS)` where `RS = EMA(gains, 14) / EMA(losses, 14)`
**Purpose**: Momentum oscillator. >70 overbought, <30 oversold.

#### 19-20. fut_macd / fut_macd_signal

**Formula**: `EMA(12) - EMA(26)` and `EMA(MACD, 9)`
**Purpose**: Trend following. MACD > Signal = bullish crossover.

---

### Options Features (14)

#### 21. atm_iv

**Formula**: `(call_iv + put_iv) / 2` at ATM strike
**Purpose**: At-the-money implied volatility, the market's fear gauge.

#### 22. atm_iv_change

**Formula**: `atm_iv_now - atm_iv_5min_ago`
**Purpose**: Change in ATM IV over 5 minutes. Detects fear spikes.

#### 23. iv_skew

**Formula**: `put_iv - call_iv` at ATM
**Purpose**: Put premium over calls. Positive = demand for downside protection.

#### 24. iv_term_structure

**Formula**: `near_expiry_iv - next_expiry_iv`
**Purpose**: IV spread between expirations. Positive = near-term event premium.

#### 25-27. gamma_atm / vega_atm / theta_atm

**Formula**: Average of respective Greeks at ATM.
**Purpose**: ATM Greeks reveal option market exposure and risks.

#### 28-29. pcr_oi / pcr_volume

**Formula**: `total_put_oi / total_call_oi` and `total_put_vol / total_call_vol`
**Purpose**: Put-Call Ratio. >1 = bearish sentiment, <1 = bullish.

#### 30. max_pain_distance

**Formula**: `abs(spot - max_pain_strike)`
**Purpose**: Distance to max pain. Market gravitates toward max pain near expiry.

#### 31. total_gamma_exposure

**Formula**: `sum(gamma * oi * spot^2) / 1e9`
**Purpose**: GEX. Positive = dealers hedge bullish moves (dampened volatility).

#### 32-33. charm_atm / vanna_atm

**Formula**: Second-order Greeks via Black-Scholes.
**Purpose**: Charm = delta change with time. Vanna = delta change with IV.

#### 34. iv_percentile_30d

**Formula**: `percentile_rank(current_iv, iv_30d_history) * 100`
**Purpose**: IV rank over 30 days. >80 = expensive options.

---

### Volatility Features (10)

#### 35. india_vix

**Formula**: Direct from India VIX index.
**Purpose**: Market fear index derived from option prices.

#### 36-37. realized_vol_5m / realized_vol_15m

**Formula**: `std(log_returns) * sqrt(252 * 390)`
**Purpose**: Annualized realized volatility from recent price history.

#### 38. vol_expansion_ratio

**Formula**: `realized_vol_5m / realized_vol_15m`
**Purpose**: >1 = volatility expanding (regime shift signal).

#### 39. iv_rv_ratio

**Formula**: `atm_iv / realized_vol_15m`
**Purpose**: Volatility Risk Premium. >1 = options overpriced vs realized.

#### 40. vix_percentile_30d

**Formula**: `percentile_rank(current_vix, vix_30d_history) * 100`
**Purpose**: VIX rank over 30 days for context.

#### 41. vix_term_structure

**Formula**: `near_vix - far_vix`
**Purpose**: VIX spread between terms. Positive = near-term fear premium.

#### 42. realized_vol_30m

**Formula**: `std(log_returns, 30m_window) * annualize_factor`
**Purpose**: Medium-term realized volatility for trend confirmation.

#### 43. vol_of_vol

**Formula**: `std(rolling_rv_values)`
**Purpose**: Volatility of volatility. High values = uncertain regime.

#### 44. iv_change_rate

**Formula**: `d(iv)/dt` over 5-minute window
**Purpose**: Rate of change of implied volatility. Fast IV moves precede price moves.

---

### Order Flow Features (8)

#### 45. bid_ask_spread_bps

**Formula**: `(best_ask - best_bid) / mid_price * 10000`
**Purpose**: Liquidity indicator. Higher spread = less liquid.

#### 46. depth_imbalance_5

**Formula**: `(bid_qty_5 - ask_qty_5) / (bid_qty_5 + ask_qty_5)`
**Purpose**: Supply/demand imbalance in top 5 levels.

#### 47-49. ofi_1s / ofi_5s / ofi_30s

**Formula**: Order Flow Imbalance over 1s, 5s, 30s windows.
**Purpose**: Directional pressure from order book changes at different horizons.

#### 50. trade_imbalance

**Formula**: `(buy_volume - sell_volume) / total_volume`
**Purpose**: Aggressor-side imbalance in executed trades.

#### 51-52. bid_slope / ask_slope

**Formula**: Price impact slope from LOB levels (regression).
**Purpose**: Market resilience. Steeper slope = more price impact per lot.

---

### Price Structure Features (8)

#### 53-56. return_1m / 5m / 15m / 30m

**Formula**: `log(price_now / price_N_ago)`
**Purpose**: Multi-horizon log returns for momentum and mean-reversion signals.

#### 57. gap_open

**Formula**: `(open - prev_close) / prev_close`
**Purpose**: Opening gap percentage. Large gaps often partially fill.

#### 58. intraday_range

**Formula**: `(high - low) / open`
**Purpose**: Current day's range as percentage of opening. Higher = more volatile day.

#### 59-60. upper_shadow / lower_shadow

**Formula**: Shadow ratios from candlestick anatomy.
**Purpose**: Long upper shadow = selling pressure. Long lower shadow = buying support.

---

### Momentum Features (8)

#### 61-62. rsi_5 / rsi_14

**Formula**: Standard RSI at 5 and 14 periods.
**Purpose**: Short-term and medium-term momentum oscillators.

#### 63. macd_histogram

**Formula**: `MACD - Signal_line`
**Purpose**: MACD momentum. Positive and increasing = strengthening uptrend.

#### 64. adx_14

**Formula**: Average Directional Index (14 periods).
**Purpose**: Trend strength (direction-agnostic). >25 = trending, <20 = ranging.

#### 65. cci_20

**Formula**: `(typical_price - SMA) / (0.015 * mean_deviation)`
**Purpose**: Commodity Channel Index. Extreme values indicate momentum.

#### 66. williams_r_14

**Formula**: `(highest_high - close) / (highest_high - lowest_low) * -100`
**Purpose**: Bounded momentum. -80 to -100 = oversold.

#### 67-68. stochastic_k_14 / stochastic_d_14

**Formula**: Stochastic %K and %D (3-period SMA of %K).
**Purpose**: Mean-reversion momentum oscillators.

---

### Time Context Features (13)

#### 69-70. minutes_from_open / minutes_to_close

**Formula**: Minutes since 9:15 IST / until 15:30 IST.
**Purpose**: Session timing for intraday patterns (U-shape volume, expiry effects).

#### 71. day_of_week

**Formula**: Monday=1 to Friday=5.
**Purpose**: Weekly seasonality (Monday effect, Friday positioning).

#### 72. is_expiry_day

**Formula**: 1 if weekly/monthly expiry, 0 otherwise.
**Purpose**: Expiry day patterns (gamma squeeze, theta decay acceleration).

#### 73. days_to_expiry

**Formula**: Trading days until nearest expiry.
**Purpose**: Theta acceleration context. <2 days = rapid time decay.

#### 74. session_phase

**Formula**: 1=opening (9:15-10:30), 2=mid (10:30-14:30), 3=closing (14:30-15:30).
**Purpose**: Intraday phase patterns. Opening and closing have different dynamics.

#### 75-78. sin/cos time_of_day / day_of_week

**Formula**: Cyclical encoding via sin(2*pi*t/T) and cos(2*pi*t/T).
**Purpose**: Enable models to learn smooth cyclical time patterns without discontinuities.

#### 79-80. is_weekly_expiry / is_monthly_expiry

**Formula**: Binary flags.
**Purpose**: Monthly expiry has different dynamics than weekly (higher OI, more institutional).

#### 81. minutes_to_expiry_close

**Formula**: Minutes until the expiry day 15:30 close.
**Purpose**: Absolute countdown to expiry. Drives theta and gamma behavior.

---

### Global Macro Features (12)

#### 82-83. es_return / nq_return

**Formula**: Overnight log return of S&P 500 / NASDAQ 100 futures.
**Purpose**: US market signal. Strong correlation with Indian market open direction.

#### 84. dxy_change

**Formula**: Change in USD index (DXY).
**Purpose**: Strong dollar = headwind for EM equities like NIFTY.

#### 85. us10y_change

**Formula**: Change in US 10-Year yield (basis points).
**Purpose**: Rising yields = risk-off for equities, particularly growth.

#### 86-87. gold_return / brent_return

**Formula**: Overnight returns of gold and Brent crude futures.
**Purpose**: Safe haven and energy signals. Crude affects Indian inflation expectations.

#### 88. nikkei_return

**Formula**: Nikkei 225 session return.
**Purpose**: Asian market sentiment proxy.

#### 89. gift_nifty_return

**Formula**: GIFT Nifty (SGX) return.
**Purpose**: Most direct indicator of NIFTY opening gap.

#### 90-92. vix_close / dxy_level / us10y_level

**Formula**: Closing levels of CBOE VIX, DXY index, US 10Y yield.
**Purpose**: Macro regime context. High VIX + strong DXY = risk-off.

#### 93. fii_dii_net

**Formula**: FII + DII net flow in crores (INR).
**Purpose**: Institutional money flow. Large FII selling = bearish. From NSDL/BSE data.

---

### Regime Context Features (4)

One-hot encoded regime state from Tier 1 HMM output (cached at market open):

#### 94-97. regime_bull_trending / regime_bear_trending / regime_volatile / regime_ranging

**Formula**: One-hot encoding of Tier 1 detected regime.
**Purpose**: Appended to Tier 2 LightGBM input as extra context features. Regime informs strategy selection and position sizing downstream.

---

### Volume Profile Features (6)

#### 98-99. volume_ratio_5m / volume_ratio_15m

**Formula**: `current_volume / average_volume_at_same_time_of_day`
**Purpose**: Volume anomaly vs time-of-day norm. >2 = unusually active.

#### 100-101. oi_change_pct_calls / oi_change_pct_puts

**Formula**: `sum(call/put OI change) / sum(call/put OI)`
**Purpose**: Net OI addition/unwinding by option type. Building OI + rising price = bullish.

#### 102. volume_weighted_iv

**Formula**: `sum(iv * volume) / sum(volume)`
**Purpose**: Volume-weighted IV more representative than simple ATM IV.

#### 103. cumulative_delta

**Formula**: Running sum of trade_imbalance.
**Purpose**: Cumulative aggressor flow. Divergence from price signals smart money positioning.

---

### Cross-Asset Features (4)

#### 104. nifty_banknifty_corr_20

**Formula**: 20-period rolling Pearson correlation.
**Purpose**: Correlation breakdown signals sector rotation or risk regime change.

#### 105. futures_spot_basis

**Formula**: `(futures_price - spot_price) / spot_price * 100`
**Purpose**: Futures premium/discount. Widening basis = strong directional expectation.

#### 106. nifty_banknifty_ratio

**Formula**: `nifty_index / banknifty_index` (normalized).
**Purpose**: Relative strength. Rising ratio = NIFTY outperforming banks.

#### 107. cross_asset_momentum

**Formula**: Composite signal from multiple cross-asset indicators.
**Purpose**: Aggregated cross-market momentum for diversified signal.

---

### LOB Microstructure Features (6)

These features are primarily consumed by Tier 3 LiT Transformer at 100ms frequency.

#### 108. depth_imbalance_10

**Formula**: `(bid_qty_10 - ask_qty_10) / (bid_qty_10 + ask_qty_10)`
**Purpose**: Deeper imbalance (10 levels) captures institutional positioning vs retail (5 levels).

#### 109. sweep_detection

**Formula**: Binary flag when aggressive market orders consume multiple price levels.
**Purpose**: Sweeps indicate urgent, large-size institutional execution.

#### 110. large_order_flow

**Formula**: Block order detection via size threshold and time clustering.
**Purpose**: Institutional block trades signal informed directional conviction.

#### 111. price_impact_coefficient

**Formula**: Estimated price impact per lot from LOB regression.
**Purpose**: Higher coefficient = thinner book = more post-trade price movement.

#### 112. queue_position_estimate

**Formula**: Estimated position in the bid queue (0=front, 1=back).
**Purpose**: Queue priority affects fill probability and execution slippage.

#### 113. hidden_liquidity_score

**Formula**: Iceberg detection heuristic from recurring same-size fills.
**Purpose**: Hidden (iceberg) orders indicate large institutional interest at a level.

---

### Sentiment Features (4)

#### 114. finbert_sentiment

**Formula**: FinBERT model score on financial news corpus.
**Purpose**: Pre-computed NLP sentiment from latest financial news. Range: -1 (bearish) to +1 (bullish).

#### 115-116. fii_flow_signal / dii_flow_signal

**Formula**: Normalized FII/DII buy-sell data as signal.
**Purpose**: Institutional flow direction. Combined with price action for confirmation.

#### 117. news_event_flag

**Formula**: Binary flag for breaking news events (RBI policy, earnings, geopolitical).
**Purpose**: High-impact news events trigger caution mode (reduce position size).

---

## Cache Warmup Requirements

| Dependency       | Periods Required | Time to Warm | Features Affected  |
| ---------------- | ---------------- | ------------ | ------------------ |
| VWAP             | 1+               | 1 tick       | #1, #9             |
| EMA(12)          | 12               | 12 ticks     | #19, #63           |
| EMA(20)          | 20               | 20 ticks     | #2, #65            |
| EMA(26)          | 26               | 26 ticks     | #19, #20, #63      |
| ATR(14)          | 15               | 15 ticks     | #14                |
| RSI(5)           | 6                | 6 ticks      | #61                |
| RSI(14)          | 15               | 15 ticks     | #18, #62           |
| ADX(14)          | 28               | 28 ticks     | #64                |
| Stochastic(14)   | 17               | 17 ticks     | #67, #68           |
| CCI(20)          | 20               | 20 ticks     | #65                |
| Realized Vol     | 5-30             | 5-30 ticks   | #36-38, #42, #43   |
| OFI              | 30s              | ~30 ticks    | #47-49             |
| Rolling Corr(20) | 20               | 20 ticks     | #104               |
| Lookback Window  | 120 bars         | 120 ticks    | TFT/Mamba sequence |

**Full warmup**: ~120 ticks (120 minutes at 1-minute candles = 2 hours for full sequence).
**Minimum warmup**: ~30 ticks (30 minutes for basic indicators).

During warmup, features return sensible defaults (0.0, 0.5, or neutral values depending on the feature range).

---

## Two-Phase Computation

```
Phase 1: Shared Dependencies (~2ms, sequential)
├── VWAP computation (future + 50 constituents)
├── EMA computation (12, 20, 26 periods)
├── ATR(14) computation
├── RSI(5, 14) computation
├── MACD (EMA12, EMA26, Signal9)
├── ADX(14), Stochastic(14/3), CCI(20), Williams %R
├── Bollinger Bands (20, 2-sigma)
├── Realized Volatility (5m, 15m, 30m)
├── Option Greeks (BSM: delta, gamma, vega, theta, charm, vanna)
├── Rolling Correlations (20-period)
└── Historical Cache Update (120-bar lookback)

Phase 2: 117 Features in Parallel (~1ms via Rayon)
├── 8 Index Breadth features
├── 12 NIFTY Future features
├── 14 Options features
├── 10 Volatility features
├── 8 Order Flow features
├── 8 Price Structure features
├── 8 Momentum features
├── 13 Time Context features
├── 12 Global Macro features
├── 4 Regime Context features
├── 6 Volume Profile features
├── 4 Cross-Asset features
├── 6 LOB Microstructure features
└── 4 Sentiment features

Total: Phase 1 (~2ms) + Phase 2 (~1ms) = <5ms (p95)
```

---

## Performance Targets

| Metric                 | Target     | Critical Threshold |
| ---------------------- | ---------- | ------------------ |
| Total computation time | <5ms (p95) | <10ms (p99)        |
| Phase 1 (shared deps)  | <2ms       | <4ms               |
| Phase 2 (117 parallel) | <1ms       | <3ms               |
| Single feature         | <100us     | <500us             |
| Memory usage           | <50 MB     | <100 MB            |

---

## Related Documentation

- [PARALLEL_FEATURE_ARCHITECTURE.md](./PARALLEL_FEATURE_ARCHITECTURE.md) — Execution model and Rust implementation
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) — Quick-start guide for development
- [02-FEATURE-ENGINE.md](../../../apps/algo-worker/docs/layers/02-FEATURE-ENGINE.md) — algo-worker integration
