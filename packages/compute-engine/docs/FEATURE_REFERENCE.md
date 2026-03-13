# Feature Reference Guide

> **Complete reference for all 117 features computed by the compute-engine.**

**Last Updated**: January 18, 2026

---

## Quick Reference Table

| # | Feature | Category | Range | Dependencies |
|---|---------|----------|-------|--------------|
| 1 | pct_stocks_above_vwap | Index Breadth | [0, 1] | constituent_vwaps |
| 2 | pct_stocks_above_ema20 | Index Breadth | [0, 1] | constituent_ema20s |
| 3 | weighted_return_top10 | Index Breadth | [-0.1, 0.1] | - |
| 4 | advance_decline_ratio | Index Breadth | [0, ∞) | - |
| 5 | breadth_momentum_5m | Index Breadth | [-0.05, 0.05] | - |
| 6 | breadth_volatility | Index Breadth | [0, 0.1] | - |
| 7 | breadth_thrust | Index Breadth | [0, 1] | - |
| 8 | new_highs_lows_ratio | Index Breadth | [-1, 1] | - |
| 9 | fut_price_vs_vwap | NIFTY Future | [-0.03, 0.03] | nifty_future_vwap |
| 10 | fut_range_position | NIFTY Future | [0, 1] | - |
| 11 | fut_return_1m | NIFTY Future | [-0.02, 0.02] | cache |
| 12 | fut_return_5m | NIFTY Future | [-0.05, 0.05] | cache |
| 13 | fut_return_15m | NIFTY Future | [-0.08, 0.08] | cache |
| 14 | fut_atr_percent | NIFTY Future | [0.005, 0.03] | nifty_future_atr |
| 15 | fut_volume_zscore | NIFTY Future | [-3, 5] | volume_stats |
| 16 | fut_oi_change | NIFTY Future | [-1M, 1M] | cache |
| 17 | fut_oi_change_pct | NIFTY Future | [-0.1, 0.1] | cache |
| 18 | fut_rsi_14 | NIFTY Future | [0, 100] | nifty_future_rsi_14 |
| 19 | fut_macd | NIFTY Future | [-200, 200] | ema12, ema26 |
| 20 | fut_macd_signal | NIFTY Future | [-200, 200] | macd_history |
| 21 | atm_iv | Options | [0.08, 0.50] | find_atm_options |
| 22 | atm_iv_change | Options | [-0.05, 0.05] | prev_atm_iv |
| 23 | iv_skew | Options | [-0.1, 0.1] | find_atm_options |
| 24 | iv_term_structure | Options | [-0.1, 0.1] | expiry grouping |
| 25 | gamma_atm | Options | [0, 0.01] | atm_greeks |
| 26 | vega_atm | Options | [0, 100] | atm_greeks |
| 27 | theta_atm | Options | [-50, 0] | atm_greeks |
| 28 | pcr_oi | Options | [0.5, 2.0] | - |
| 29 | pcr_volume | Options | [0.3, 3.0] | - |
| 30 | max_pain_distance | Options | [0, 500] | - |
| 31 | total_gamma_exposure | Options | [-100, 100] | - |
| 32 | charm_atm | Options | [-0.001, 0.001] | black_scholes |
| 33 | vanna_atm | Options | [-0.01, 0.01] | black_scholes |
| 34 | iv_percentile_30d | Options | [0, 100] | historical_iv |
| 35 | india_vix | Volatility | [10, 50] | - |
| 36 | realized_vol_5m | Volatility | [0.05, 0.50] | cache |
| 37 | realized_vol_15m | Volatility | [0.05, 0.50] | cache |
| 38 | vol_expansion_ratio | Volatility | [0.5, 2.0] | rv_5m, rv_15m |
| 39 | iv_rv_ratio | Volatility | [0.5, 3.0] | atm_iv, rv_15m |
| 40 | vix_percentile_30d | Volatility | [0, 100] | historical_vix |
| 41 | bid_ask_spread_bps | Order Flow | [1, 50] | - |
| 42 | depth_imbalance_5 | Order Flow | [-1, 1] | - |
| 43 | ofi_1s | Order Flow | [-1, 1] | lob_history |
| 44 | ofi_5s | Order Flow | [-1, 1] | lob_history |
| 45 | ofi_30s | Order Flow | [-1, 1] | lob_history |
| 46 | trade_imbalance | Order Flow | [-1, 1] | trade_history |
| 47 | bid_slope | Order Flow | [0, 1000] | lob_levels |
| 48 | ask_slope | Order Flow | [0, 1000] | lob_levels |
| 49 | minutes_from_open | Time Context | [0, 375] | - |
| 50 | minutes_to_close | Time Context | [0, 375] | - |
| 51 | day_of_week | Time Context | [1, 5] | - |
| 52 | is_expiry_day | Time Context | {0, 1} | calendar |
| 53 | days_to_expiry | Time Context | [0, 30] | calendar |
| 54 | session_phase | Time Context | {1, 2, 3} | - |

---

## Detailed Feature Specifications

### Index Breadth Features (8)

#### 1. pct_stocks_above_vwap

**Formula**: `count(constituent.ltp > constituent.vwap) / 50`

**Purpose**: Measures what percentage of NIFTY 50 stocks are trading above their VWAP, indicating bullish breadth.

```rust
pub fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    let count_above = input.constituents
        .iter()
        .zip(&deps.constituent_vwaps)
        .filter(|(stock, vwap)| stock.ltp > **vwap)
        .count();
    
    FeatureValue::Scalar(count_above as f64 / input.constituents.len() as f64)
}
```

**Edge Cases**:
- Empty constituents: Returns 0.0
- VWAP = 0: Stock excluded from count

---

#### 2. pct_stocks_above_ema20

**Formula**: `count(constituent.ltp > constituent.ema20) / 50`

**Purpose**: Measures what percentage of NIFTY 50 stocks are above their 20-period EMA, indicating trend breadth.

---

#### 3. weighted_return_top10

**Formula**: `Σ(return_i × weight_i)` for top 10 stocks by volume

**Purpose**: Weighted average return of the 10 most actively traded stocks.

```rust
let mut stocks: Vec<_> = input.constituents.iter().collect();
stocks.sort_by(|a, b| b.volume.partial_cmp(&a.volume).unwrap());

let top10_return: f64 = stocks
    .iter()
    .take(10)
    .map(|s| (s.ltp - s.open) / s.open)
    .sum::<f64>() / 10.0;
```

---

#### 4. advance_decline_ratio

**Formula**: `advances / max(declines, 1)`

**Purpose**: Ratio of advancing to declining stocks. >1 indicates bullish market.

**Edge Cases**:
- Zero declines: Returns count of advances (avoids division by zero)

---

#### 5. breadth_momentum_5m

**Formula**: `mean((constituent.ltp - constituent.open) / constituent.open)`

**Purpose**: Average intraday return across all 50 constituents.

---

#### 6. breadth_volatility

**Formula**: `std((constituent.ltp - constituent.open) / constituent.open)`

**Purpose**: Standard deviation of intraday returns, measuring market dispersion.

---

#### 7. breadth_thrust

**Formula**: `advances / (advances + declines)`

**Purpose**: Thrust indicator, measures ratio of advances to total moved stocks.

---

#### 8. new_highs_lows_ratio

**Formula**: `(new_52w_highs - new_52w_lows) / 50`

**Purpose**: Ratio of new 52-week highs minus lows, indicates extreme positioning.

---

### NIFTY Future Features (12)

#### 9. fut_price_vs_vwap

**Formula**: `(ltp - vwap) / vwap`

**Purpose**: Percentage deviation from VWAP. Positive = above VWAP (bullish).

---

#### 10. fut_range_position

**Formula**: `(ltp - low) / (high - low)`

**Purpose**: Position within day's range. 1 = at high, 0 = at low.

---

#### 11-13. fut_return_1m/5m/15m

**Formula**: `(price_now - price_N_ago) / price_N_ago`

**Purpose**: Momentum over 1, 5, and 15-minute windows.

---

#### 14. fut_atr_percent

**Formula**: `ATR(14) / ltp`

**Purpose**: Volatility as percentage of price. Higher = more volatile.

---

#### 15. fut_volume_zscore

**Formula**: `(current_volume - mean) / std`

**Purpose**: Volume anomaly detection. >2 indicates unusual volume.

---

#### 16-17. fut_oi_change / fut_oi_change_pct

**Formula**: `oi_now - oi_prev` and `(oi_now - oi_prev) / oi_prev`

**Purpose**: Open interest changes indicate new positions or unwinding.

---

#### 18. fut_rsi_14

**Formula**: `100 - 100 / (1 + RS)` where `RS = EMA(gains, 14) / EMA(losses, 14)`

**Purpose**: Momentum oscillator. >70 overbought, <30 oversold.

---

#### 19-20. fut_macd / fut_macd_signal

**Formula**: `EMA(12) - EMA(26)` and `EMA(MACD, 9)`

**Purpose**: Trend following indicator. MACD > Signal = bullish crossover.

---

### Options Features (14)

#### 21. atm_iv

**Formula**: `(call_iv + put_iv) / 2` at ATM strike

**Purpose**: At-the-money implied volatility, market's fear gauge.

---

#### 22. atm_iv_change

**Formula**: `atm_iv_now - atm_iv_5min_ago`

**Purpose**: Change in ATM IV over 5 minutes, indicates fear spike/collapse.

---

#### 23. iv_skew

**Formula**: `put_iv - call_iv` at ATM

**Purpose**: Put premium over calls. Positive = demand for downside protection.

---

#### 24. iv_term_structure

**Formula**: `near_expiry_iv - next_expiry_iv`

**Purpose**: IV spread between expirations. Positive = event premium.

---

#### 25-27. gamma_atm / vega_atm / theta_atm

**Formula**: Average of respective Greeks at ATM

**Purpose**: ATM Greeks indicate option market exposure.

---

#### 28-29. pcr_oi / pcr_volume

**Formula**: `total_put_oi / total_call_oi`

**Purpose**: Put-Call Ratio. >1 = bearish sentiment, <1 = bullish.

---

#### 30. max_pain_distance

**Formula**: `abs(spot - max_pain_strike)`

**Purpose**: Distance to max pain. Market often gravitates toward max pain at expiry.

---

#### 31. total_gamma_exposure

**Formula**: `Σ(gamma × oi × spot²) / 1e9`

**Purpose**: Gamma Exposure (GEX). Positive = dealers hedge bullish moves.

---

#### 32-33. charm_atm / vanna_atm

**Formula**: Second-order Greeks via Black-Scholes

**Purpose**: 
- Charm: How delta changes with time
- Vanna: How delta changes with IV

---

#### 34. iv_percentile_30d

**Formula**: `percentile_rank(current_iv, iv_30d_history) × 100`

**Purpose**: IV rank over 30 days. >80 = expensive options.

---

### Volatility Features (6)

#### 35. india_vix

**Formula**: Direct from India VIX index

**Purpose**: Market fear index derived from option prices.

---

#### 36-37. realized_vol_5m / realized_vol_15m

**Formula**: `std(log_returns) × sqrt(252 × 390)`

**Purpose**: Annualized realized volatility from recent price history.

---

#### 38. vol_expansion_ratio

**Formula**: `realized_vol_5m / realized_vol_15m`

**Purpose**: Volatility regime shift. >1 = volatility expanding.

---

#### 39. iv_rv_ratio

**Formula**: `atm_iv / realized_vol_15m`

**Purpose**: Volatility Risk Premium. >1 = options overpriced vs realized.

---

#### 40. vix_percentile_30d

**Formula**: `percentile_rank(current_vix, vix_30d_history) × 100`

**Purpose**: VIX rank over 30 days for context.

---

### Order Flow Features (8)

#### 41. bid_ask_spread_bps

**Formula**: `(best_ask - best_bid) / mid_price × 10000`

**Purpose**: Liquidity indicator. Higher spread = less liquid.

---

#### 42. depth_imbalance_5

**Formula**: `(bid_qty_5 - ask_qty_5) / (bid_qty_5 + ask_qty_5)`

**Purpose**: Supply/demand imbalance in top 5 levels.

---

#### 43-45. ofi_1s / ofi_5s / ofi_30s

**Formula**: Order Flow Imbalance over 1s, 5s, 30s windows

**Purpose**: Directional pressure from order book changes.

---

#### 46. trade_imbalance

**Formula**: `(buy_volume - sell_volume) / total_volume`

**Purpose**: Aggressor side imbalance in trades.

---

#### 47-48. bid_slope / ask_slope

**Formula**: Price impact slope from LOB levels

**Purpose**: Market resilience, steeper slope = more price impact.

---

### Time Context Features (6)

#### 49-50. minutes_from_open / minutes_to_close

**Formula**: Minutes since 9:15 IST / until 3:30 IST

**Purpose**: Session timing for intraday patterns.

---

#### 51. day_of_week

**Formula**: Monday=1 to Friday=5

**Purpose**: Weekly seasonality patterns.

---

#### 52. is_expiry_day

**Formula**: 1 if weekly/monthly expiry, 0 otherwise

**Purpose**: Expiry day volatility patterns.

---

#### 53. days_to_expiry

**Formula**: Trading days until nearest expiry

**Purpose**: Theta acceleration context.

---

#### 54. session_phase

**Formula**: 1=opening (9:15-10:30), 2=mid (10:30-14:30), 3=closing (14:30-15:30)

**Purpose**: Intraday phase patterns.

---

## Cache Warmup Requirements

| Dependency | Periods Required | Time to Warm |
|------------|-----------------|--------------|
| VWAP | 1+ | 1 tick |
| EMA(12) | 12 | 12 ticks |
| EMA(20) | 20 | 20 ticks |
| EMA(26) | 26 | 26 ticks |
| ATR(14) | 15 | 15 ticks |
| RSI(14) | 15 | 15 ticks |
| Realized Vol | 5/15 | 5-15 ticks |
| OFI | 30s | ~30 ticks |

**Full warmup**: ~30 ticks (30 seconds at 1-tick/second)

During warmup, features return sensible defaults (0.0, 0.5, or neutral values).

---

## Related Documentation

- [PARALLEL_FEATURE_ARCHITECTURE.md](./PARALLEL_FEATURE_ARCHITECTURE.md) - Execution model
- [FEATURE_SPECIFICATION.md](../../docs/ml/FEATURE_SPECIFICATION.md) - Architecture overview
- [QUESTDB_TRAINING_DATA.md](../../docs/ml/QUESTDB_TRAINING_DATA.md) - Storage schema
