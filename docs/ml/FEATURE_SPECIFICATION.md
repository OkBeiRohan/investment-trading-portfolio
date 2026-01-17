# Feature Engineering Specification

> **Complete specification for 54 real-time features computed by the Rust compute-engine.**

**Last Updated**: January 18, 2026  
**Status**: Production Architecture  
**Related**: [compute-engine README](../../packages/compute-engine/README.md)

---

## Overview

The compute-engine calculates **54 features** in <5ms from live tick data. These features feed into:

- **LightGBM**: Macro direction prediction (5-15min horizon)
- **TFT**: Regime classification and multi-horizon forecasting
- **LiT**: Microstructure signals (10s-1min horizon)
- **Meta-Learner**: Signal fusion across all models

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FEATURE COMPUTATION (Rust)                            │
│                                                                              │
│  Upstox WS → market-feeder → compute-engine (54 features, <5ms) → Redis     │
│                                                                              │
│  Inputs:                                                                     │
│  ├── NIFTY Future (OHLCV + OI)                                               │
│  ├── 50 Constituents (LTP + VWAP + Volume)                                   │
│  ├── Option Chain (20 strikes × 2 types = 40 options)                        │
│  ├── India VIX                                                               │
│  └── Market Depth (20 levels)                                                │
│                                                                              │
│  Outputs: Float32Array(54) + FeatureTimings                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Feature Inventory (54 Features)

### Category 1: Index Breadth (8 Features)

Measures NIFTY 50 constituent behavior for market-wide sentiment.

| # | Feature | Formula | Range | Purpose |
|---|---------|---------|-------|---------|
| 1 | `pct_stocks_above_vwap` | `count(ltp > vwap) / 50` | [0, 1] | Bullish breadth |
| 2 | `pct_stocks_above_ema20` | `count(ltp > ema20) / 50` | [0, 1] | Trend breadth |
| 3 | `weighted_return_top10` | `Σ(return_i × weight_i)` for top 10 by volume | [-0.1, 0.1] | Large-cap momentum |
| 4 | `advance_decline_ratio` | `advances / max(declines, 1)` | [0, ∞) | Market direction |
| 5 | `breadth_momentum_5m` | `mean(intraday_return)` across 50 stocks | [-0.05, 0.05] | Short-term breadth |
| 6 | `breadth_volatility` | `std(intraday_return)` across 50 stocks | [0, 0.1] | Dispersion |
| 7 | `breadth_thrust` | `advances / (advances + declines)` | [0, 1] | Thrust indicator |
| 8 | `new_highs_lows_ratio` | `(new_highs - new_lows) / 50` | [-1, 1] | Extremes |

---

### Category 2: NIFTY Future (12 Features)

Technical indicators and price action on the primary trading instrument.

| # | Feature | Formula | Range | Purpose |
|---|---------|---------|-------|---------|
| 9 | `fut_price_vs_vwap` | `(ltp - vwap) / vwap` | [-0.03, 0.03] | Short-term bias |
| 10 | `fut_range_position` | `(ltp - low) / (high - low)` | [0, 1] | Intraday position |
| 11 | `fut_return_1m` | `(price_now - price_1m_ago) / price_1m_ago` | [-0.02, 0.02] | 1-min momentum |
| 12 | `fut_return_5m` | `(price_now - price_5m_ago) / price_5m_ago` | [-0.05, 0.05] | 5-min momentum |
| 13 | `fut_return_15m` | `(price_now - price_15m_ago) / price_15m_ago` | [-0.08, 0.08] | 15-min momentum |
| 14 | `fut_atr_percent` | `ATR(14) / ltp` | [0.005, 0.03] | Volatility |
| 15 | `fut_volume_zscore` | `(volume - mean) / std` | [-3, 5] | Volume anomaly |
| 16 | `fut_oi_change` | `oi_now - oi_prev` | [-1M, 1M] | Open interest delta |
| 17 | `fut_oi_change_pct` | `(oi_now - oi_prev) / oi_prev` | [-0.1, 0.1] | OI % change |
| 18 | `fut_rsi_14` | `100 - 100/(1 + RS)` where RS=EMA(gains)/EMA(losses) | [0, 100] | Momentum oscillator |
| 19 | `fut_macd` | `EMA(12) - EMA(26)` | [-200, 200] | Trend strength |
| 20 | `fut_macd_signal` | `EMA(9) of MACD` | [-200, 200] | Signal line |

---

### Category 3: Options (14 Features)

Greeks, volatility, and positioning from the options chain.

| # | Feature | Formula | Range | Purpose |
|---|---------|---------|-------|---------|
| 21 | `atm_iv` | Average IV of ATM call and put | [0.08, 0.50] | Market fear |
| 22 | `atm_iv_change` | `current_atm_iv - prev_atm_iv` (5min ago) | [-0.05, 0.05] | IV momentum |
| 23 | `iv_skew` | `put_iv - call_iv` at ATM | [-0.1, 0.1] | Put premium |
| 24 | `iv_term_structure` | `near_expiry_iv - next_expiry_iv` | [-0.1, 0.1] | Event pricing |
| 25 | `gamma_atm` | Average gamma at ATM | [0, 0.01] | Gamma exposure |
| 26 | `vega_atm` | Average vega at ATM | [0, 100] | Vega exposure |
| 27 | `theta_atm` | Average theta at ATM | [-50, 0] | Time decay |
| 28 | `pcr_oi` | `total_put_oi / total_call_oi` | [0.5, 2.0] | Sentiment (OI) |
| 29 | `pcr_volume` | `total_put_vol / total_call_vol` | [0.3, 3.0] | Sentiment (volume) |
| 30 | `max_pain_distance` | `abs(spot - max_pain_strike)` | [0, 500] | Magnetic target |
| 31 | `total_gamma_exposure` | `Σ(gamma × oi × spot²) / 1e9` | [-100, 100] | GEX |
| 32 | `charm_atm` | `d(delta)/d(time)` approximation | [-0.001, 0.001] | Time decay of delta |
| 33 | `vanna_atm` | `d(delta)/d(iv)` approximation | [-0.01, 0.01] | IV sensitivity |
| 34 | `iv_percentile_30d` | IV rank over 30-day window | [0, 100] | IV context |

---

### Category 4: Volatility (6 Features)

Realized and implied volatility metrics.

| # | Feature | Formula | Range | Purpose |
|---|---------|---------|-------|---------|
| 35 | `india_vix` | India VIX from NSE | [10, 50] | Market fear index |
| 36 | `realized_vol_5m` | `std(log_returns) × √(252×390)` (5 periods) | [0.05, 0.50] | Short-term RV |
| 37 | `realized_vol_15m` | `std(log_returns) × √(252×390)` (15 periods) | [0.05, 0.50] | Medium-term RV |
| 38 | `vol_expansion_ratio` | `realized_vol_5m / realized_vol_15m` | [0.5, 2.0] | Vol regime shift |
| 39 | `iv_rv_ratio` | `atm_iv / realized_vol_15m` | [0.5, 3.0] | VRP signal |
| 40 | `vix_percentile_30d` | VIX rank over 30-day window | [0, 100] | VIX context |

---

### Category 5: Order Flow / Microstructure (8 Features)

LOB-based features for LiT and execution models.

| # | Feature | Formula | Range | Purpose |
|---|---------|---------|-------|---------|
| 41 | `bid_ask_spread_bps` | `(best_ask - best_bid) / mid × 10000` | [1, 50] | Liquidity |
| 42 | `depth_imbalance_5` | `(bid_qty_5 - ask_qty_5) / (bid_qty_5 + ask_qty_5)` | [-1, 1] | Supply/demand |
| 43 | `ofi_1s` | Order Flow Imbalance (1-second) | [-1, 1] | Short-term flow |
| 44 | `ofi_5s` | Order Flow Imbalance (5-second) | [-1, 1] | Medium-term flow |
| 45 | `ofi_30s` | Order Flow Imbalance (30-second) | [-1, 1] | Trend flow |
| 46 | `trade_imbalance` | `(buy_volume - sell_volume) / total_volume` | [-1, 1] | Aggressor side |
| 47 | `bid_slope` | Price impact slope on bid side | [0, 1000] | Resilience |
| 48 | `ask_slope` | Price impact slope on ask side | [0, 1000] | Resilience |

---

### Category 6: Time Context (6 Features)

Intraday time-based features for seasonality.

| # | Feature | Formula | Range | Purpose |
|---|---------|---------|-------|---------|
| 49 | `minutes_from_open` | Minutes since 9:15 AM IST | [0, 375] | Session progress |
| 50 | `minutes_to_close` | Minutes until 3:30 PM IST | [0, 375] | Session remaining |
| 51 | `day_of_week` | Monday=1 to Friday=5 | [1, 5] | Weekly pattern |
| 52 | `is_expiry_day` | 1 if weekly/monthly expiry, 0 otherwise | {0, 1} | Event flag |
| 53 | `days_to_expiry` | Trading days until nearest expiry | [0, 30] | Theta context |
| 54 | `session_phase` | 1=opening, 2=mid, 3=closing | {1, 2, 3} | Intraday phase |

---

## Feature Dependencies

Features are computed in **two phases** for efficiency:

### Phase 1: Shared Dependencies (Sequential, ~2ms)

Computed once and reused by multiple features:

```rust
struct ComputedDependencies {
    // VWAP (from historical cache)
    nifty_future_vwap: f64,
    constituent_vwaps: Vec<f64>,  // 50 values
    
    // Moving Averages
    nifty_future_ema12: f64,
    nifty_future_ema20: f64,
    nifty_future_ema26: f64,
    constituent_ema20s: Vec<f64>,
    
    // Technical Indicators
    nifty_future_atr: f64,
    nifty_future_rsi_14: f64,
    
    // Lookback Returns
    nifty_future_return_1m: f64,
    nifty_future_return_5m: f64,
    nifty_future_return_15m: f64,
    
    // Volatility
    realized_vol_5m: f64,
    realized_vol_15m: f64,
    
    // Volume Statistics
    volume_mean: f64,
    volume_std: f64,
    
    // ATM Options Greeks (aggregated)
    atm_call_greeks: OptionGreeks,
    atm_put_greeks: OptionGreeks,
    
    // ATM IV (for change calculation)
    prev_atm_iv: f64,
}
```

### Phase 2: Feature Computation (Parallel, ~1ms)

54 features computed in parallel using Rayon:

```rust
self.features
    .par_iter()
    .map(|feature| feature.compute(&input, &deps))
    .collect()
```

---

## Input Data Requirements

### Per-Tick Input (from market-feeder)

```typescript
interface FeatureInput {
  timestamp: number;                    // Unix ms
  
  niftyFuture: {
    ltp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    openInterest: number;
  };
  
  constituents: Array<{                 // 50 stocks
    symbol: string;
    ltp: number;
    open: number;
    volume: number;
  }>;
  
  options: Array<{                      // ~40 options
    strike: number;
    optionType: 'CE' | 'PE';
    ltp: number;
    iv: number;
    delta: number;
    gamma: number;
    vega: number;
    theta: number;
    openInterest: number;
    volume: number;
  }>;
  
  indiaVix: number;
  
  marketDepth?: {                       // Optional LOB
    bids: Array<{ price: number; qty: number }>;
    asks: Array<{ price: number; qty: number }>;
  };
}
```

---

## Output Format

```typescript
interface ComputeResult {
  features: FeatureOutput;              // 54 features
  timings: FeatureTimingLog[];          // Per-feature timing
  totalDurationMicros: number;          // Total <5000µs
}

interface FeatureOutput {
  timestamp: number;
  
  // Index Breadth (8)
  pctStocksAboveVwap: number;
  pctStocksAboveEma20: number;
  weightedReturnTop10: number;
  advanceDeclineRatio: number;
  breadthMomentum5m: number;
  breadthVolatility: number;
  breadthThrust: number;
  newHighsLowsRatio: number;
  
  // NIFTY Future (12)
  futPriceVsVwap: number;
  futRangePosition: number;
  futReturn1m: number;
  futReturn5m: number;
  futReturn15m: number;
  futAtrPercent: number;
  futVolumeZscore: number;
  futOiChange: number;
  futOiChangePct: number;
  futRsi14: number;
  futMacd: number;
  futMacdSignal: number;
  
  // Options (14)
  atmIv: number;
  atmIvChange: number;
  ivSkew: number;
  ivTermStructure: number;
  gammaAtm: number;
  vegaAtm: number;
  thetaAtm: number;
  pcrOi: number;
  pcrVolume: number;
  maxPainDistance: number;
  totalGammaExposure: number;
  charmAtm: number;
  vannaAtm: number;
  ivPercentile30d: number;
  
  // Volatility (6)
  indiaVix: number;
  realizedVol5m: number;
  realizedVol15m: number;
  volExpansionRatio: number;
  ivRvRatio: number;
  vixPercentile30d: number;
  
  // Order Flow (8)
  bidAskSpreadBps: number;
  depthImbalance5: number;
  ofi1s: number;
  ofi5s: number;
  ofi30s: number;
  tradeImbalance: number;
  bidSlope: number;
  askSlope: number;
  
  // Time Context (6)
  minutesFromOpen: number;
  minutesToClose: number;
  dayOfWeek: number;
  isExpiryDay: number;
  daysToExpiry: number;
  sessionPhase: number;
}
```

---

## Performance Targets

| Metric | Target | Typical |
|--------|--------|---------|
| Total Computation | <5ms | 2-4ms |
| Dependencies (Phase 1) | <3ms | 1.5-2ms |
| Features (Phase 2) | <2ms | 0.5-1ms |
| Memory Footprint | <100KB | ~60KB |
| Cache Size | 26 periods | ~50KB |

---

## Model Feature Mapping

| Model | Features Used | Count |
|-------|---------------|-------|
| **LightGBM** | All except Order Flow | 46 |
| **TFT** | Index + Future + Options + Volatility + Time | 46 |
| **LiT** | Order Flow + Future returns | 14 |
| **Mamba** | Time-series of all features (120 timesteps) | 54×120 |
| **Meta-Learner** | Model outputs + Regime features | ~10 |

---

## Related Documentation

- [compute-engine README](../../packages/compute-engine/README.md) - Implementation
- [INFERENCE_PIPELINE.md](./INFERENCE_PIPELINE.md) - ONNX inference
- [TRAINING_PIPELINE.md](./TRAINING_PIPELINE.md) - Model training
- [TIER1_MODELS.md](./TIER1_MODELS.md) - Model architectures
