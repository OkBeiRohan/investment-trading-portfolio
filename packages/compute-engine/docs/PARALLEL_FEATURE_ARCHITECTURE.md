# Parallel Feature Computation Architecture

**Last Updated**: March 17, 2026
**Status**: Implementation Complete

## Executive Summary

**Objective**: The compute-engine is a **parallel, dependency-aware feature computation system** that:

- Processes live tick data OR historical candle data
- Computes 117 features in parallel across 14 categories with zero redundancy
- Uses Rayon for data-parallel execution within a two-phase pipeline
- Logs per-feature and total processing times
- Maintains end-to-end type safety (Rust to TypeScript via NAPI-RS + ts-rs)
- Provides modular, extensible feature modules

**Performance**: <5ms total (p95) — Phase 1 shared deps ~2ms, Phase 2 parallel features ~1ms.

---

## 1. Input Data Models

### 1.1 Live Tick Data (Real-Time)

```typescript
// From market-feeder WebSocket
interface LiveTickData {
  timestamp: Date
  niftyFuture: {
    ltp: number
    open: number
    high: number
    low: number
    close: number
    volume: number
    openInterest: number
    vwap: number
  }
  nifty50Constituents: Array<{
    symbol: string
    ltp: number
    open: number
    high: number
    low: number
    vwap: number
    volume: number
  }>
  options: Array<{
    strike: number
    type: 'CE' | 'PE'
    ltp: number
    iv: number
    delta: number
    gamma: number
    vega: number
    theta: number
    openInterest: number
    volume: number
  }>
  orderBook: {
    bidPrices: number[] // depth-20
    bidSizes: number[]
    askPrices: number[]
    askSizes: number[]
  }
  globalIndices: {
    esReturn: number // S&P 500 futures
    nqReturn: number // NASDAQ futures
    dxyChange: number
    us10yChange: number
    goldReturn: number
    brentReturn: number
    nikkeiReturn: number
    giftNiftyReturn: number
    vixClose: number
    dxyLevel: number
    us10yLevel: number
    fiiDiiNet: number
  }
  indiaVix: number | null
  sentiment: {
    finbertScore: number
    fiiFlowSignal: number
    diiFlowSignal: number
    newsEventFlag: number
  }
}
```

### 1.2 Historical Candle Data (Training)

```typescript
// From QuestDB (market_candles table)
interface CandleBatch {
  timestamp: Date
  candles: {
    niftyFuture: CandleData
    nifty50Constituents: CandleData[]
    options: CandleData[]
  }
  orderBook: OrderBookSnapshot | null
  globalIndices: GlobalMacroData
  indiaVix: number | null
  sentiment: SentimentData
}
```

---

## 2. Feature Dependency Analysis

### 2.1 Shared Dependencies (Compute Once, Reuse Many)

| Dependency               | Used By Features                                      | Computation                         |
| ------------------------ | ----------------------------------------------------- | ----------------------------------- |
| **VWAP**                 | #1 pct_stocks_above_vwap, #9 fut_price_vs_vwap        | `sum(price * volume) / sum(volume)` |
| **EMA(12, 26)**          | #19 fut_macd, #20 fut_macd_signal, #63 macd_histogram | Exponential moving average          |
| **EMA(20)**              | #2 pct_stocks_above_ema20, #65 cci_20                 | EMA + mean deviation                |
| **ATR(14)**              | #14 fut_atr_percent                                   | Average true range                  |
| **RSI(5, 14)**           | #18 fut_rsi_14, #61 rsi_5, #62 rsi_14                 | Relative strength index             |
| **ADX(14)**              | #64 adx_14                                            | Average directional index           |
| **Stochastic(14/3)**     | #67 stochastic_k, #68 stochastic_d                    | Stochastic oscillator               |
| **Period Returns**       | #53-56 returns, #36-37 realized vol                   | `(P_t - P_{t-N}) / P_{t-N}`         |
| **Realized Vol**         | #36-38, #42-44 volatility features                    | `std(log_returns) * annualize`      |
| **Option Greeks (BSM)**  | #25-27, #32-33 Greeks                                 | Black-Scholes-Merton model          |
| **Rolling Correlations** | #104 nifty_banknifty_corr                             | 20-period Pearson correlation       |
| **High/Low(14)**         | #66 williams_r, #67-68 stochastic                     | Rolling high/low windows            |

### 2.2 Dependency Graph

```
Raw Market Data
    │
    ├──→ [Phase 1 Dependencies — Sequential, ~2ms]
    │     ├── VWAP (future + 50 constituents)
    │     ├── EMA (12, 20, 26 periods)
    │     ├── ATR (14 periods)
    │     ├── RSI (5, 14 periods)
    │     ├── MACD (12/26/9)
    │     ├── ADX (14 periods)
    │     ├── Stochastic (14/3)
    │     ├── CCI (20 periods / mean deviation)
    │     ├── Bollinger Bands (20, 2-sigma)
    │     ├── Realized Volatility (5m, 15m, 30m)
    │     ├── Option Greeks (BSM: delta, gamma, vega, theta, charm, vanna)
    │     ├── Rolling Correlations (20-period)
    │     └── Historical Cache Update (120-bar lookback)
    │
    └──→ [Phase 2 Features — All 117 in Parallel via Rayon, ~1ms]
          ├── Index Breadth (8)           uses: VWAP, EMA20
          ├── NIFTY Future (12)           uses: VWAP, ATR, RSI, EMA12/26
          ├── Options (14)                uses: Greeks (BSM)
          ├── Volatility (10)             uses: Realized Vol, historical IV
          ├── Order Flow (8)              uses: LOB history
          ├── Price Structure (8)         uses: Return cache
          ├── Momentum (8)                uses: RSI, MACD, ADX, Stochastic
          ├── Time Context (13)           uses: (none — pure calendar)
          ├── Global Macro (12)           uses: (none — pass-through)
          ├── Regime Context (4)          uses: (none — from Redis cache)
          ├── Volume Profile (6)          uses: Volume history, OI history
          ├── Cross-Asset (4)             uses: Rolling correlations
          ├── LOB Microstructure (6)      uses: LOB depth, trade events
          └── Sentiment (4)               uses: (none — pass-through)
```

### 2.3 Computation Phases

**Phase 1: Shared Dependencies** (~2ms, sequential within phase)

Compute all shared indicators that multiple features depend on. Each dependency is computed once and stored in `ComputedDependencies`.

**Phase 2: Parallel Feature Computation** (~1ms, all 117 features via Rayon)

Every feature receives read-only references to the input data and pre-computed dependencies. Each feature's `compute()` function is pure (no I/O, no side effects).

---

## 3. Architecture Design

### 3.1 File Structure

```
packages/compute-engine/
├── src/
│   ├── lib.rs                    # NAPI entry point
│   ├── types.rs                  # TypeScript-compatible types (ts-rs)
│   ├── processor.rs              # Main orchestrator
│   ├── timer.rs                  # Performance logging
│   │
│   ├── dependencies/             # Shared calculations (Phase 1)
│   │   ├── mod.rs
│   │   ├── vwap.rs               # VWAP computation
│   │   ├── ema.rs                # EMA computation (12, 20, 26)
│   │   ├── atr.rs                # ATR computation (14)
│   │   ├── returns.rs            # Period returns (1m, 5m, 15m, 30m)
│   │   ├── rsi.rs                # RSI computation (5, 14)
│   │   ├── macd.rs               # MACD + signal (12/26/9)
│   │   ├── adx.rs                # ADX computation (14)
│   │   ├── stochastic.rs         # Stochastic %K/%D (14/3)
│   │   ├── bollinger.rs          # Bollinger Bands (20, 2-sigma)
│   │   ├── realized_vol.rs       # Realized volatility (5m, 15m, 30m)
│   │   ├── greeks.rs             # Black-Scholes Greeks
│   │   └── correlations.rs       # Rolling Pearson correlations
│   │
│   ├── features/                 # 117 features across 14 categories
│   │   ├── mod.rs                # Feature trait + registry
│   │   ├── index_breadth/        # 8 features
│   │   ├── nifty_future/         # 12 features
│   │   ├── options/              # 14 features
│   │   ├── volatility/           # 10 features
│   │   ├── order_flow/           # 8 features
│   │   ├── price_structure/      # 8 features
│   │   ├── momentum/             # 8 features
│   │   ├── time_context/         # 13 features
│   │   ├── global_macro/         # 12 features
│   │   ├── regime_context/       # 4 features
│   │   ├── volume_profile/       # 6 features
│   │   ├── cross_asset/          # 4 features
│   │   ├── lob_microstructure/   # 6 features
│   │   └── sentiment/            # 4 features
│   │
│   └── cache/                    # Historical data cache
│       ├── mod.rs
│       └── rolling_window.rs
│
├── Cargo.toml
└── package.json
```

### 3.2 Core Abstractions

#### 3.2.1 Feature Trait

```rust
// src/features/mod.rs
pub trait Feature: Send + Sync {
    /// Feature name (for logging and output mapping)
    fn name(&self) -> &'static str;

    /// Compute feature value from input data and pre-computed dependencies
    fn compute(
        &self,
        input: &FeatureInput,
        deps: &ComputedDependencies,
    ) -> f64;
}

/// All computed shared dependencies (Phase 1 output)
pub struct ComputedDependencies {
    // VWAP
    pub vwap_future: f64,
    pub vwap_constituents: HashMap<String, f64>,

    // EMAs
    pub ema12_future: f64,
    pub ema20_future: f64,
    pub ema20_constituents: HashMap<String, f64>,
    pub ema26_future: f64,

    // Momentum indicators
    pub atr14_future: f64,
    pub rsi5_future: f64,
    pub rsi14_future: f64,
    pub macd_future: f64,
    pub macd_signal_future: f64,
    pub adx14_future: f64,
    pub stochastic_k14: f64,
    pub stochastic_d14: f64,
    pub cci20_future: f64,
    pub williams_r14: f64,
    pub highest_high_14: f64,
    pub lowest_low_14: f64,

    // Bollinger
    pub bollinger_upper: f64,
    pub bollinger_lower: f64,
    pub bollinger_sma20: f64,
    pub bollinger_mean_dev: f64,

    // Returns and volatility
    pub returns_1m: f64,
    pub returns_5m: f64,
    pub returns_15m: f64,
    pub returns_30m: f64,
    pub realized_vol_5m: f64,
    pub realized_vol_15m: f64,
    pub realized_vol_30m: f64,

    // Greeks
    pub greeks_atm: OptionGreeks,

    // Correlations
    pub nifty_banknifty_corr_20: f64,
}

/// Timing data for feature computation
pub struct FeatureTiming {
    pub feature_name: String,
    pub duration_micros: u64,
}

pub struct FeatureResult {
    pub features: HashMap<String, f64>,
    pub timings: Vec<FeatureTiming>,
    pub total_duration_micros: u64,
}
```

#### 3.2.2 Main Processor

```rust
// src/processor.rs
use rayon::prelude::*;
use std::time::Instant;

pub struct FeatureProcessor {
    features: Vec<Box<dyn Feature>>,
}

impl FeatureProcessor {
    pub fn new() -> Self {
        let mut features: Vec<Box<dyn Feature>> = Vec::with_capacity(117);

        // Register all 117 features across 14 categories
        // Index Breadth (8)
        features.push(Box::new(PctStocksAboveVwap));
        features.push(Box::new(PctStocksAboveEma20));
        features.push(Box::new(WeightedReturnTop10));
        features.push(Box::new(AdvanceDeclineRatio));
        features.push(Box::new(BreadthMomentum5m));
        features.push(Box::new(BreadthVolatility));
        features.push(Box::new(BreadthThrust));
        features.push(Box::new(NewHighsLowsRatio));

        // NIFTY Future (12)
        features.push(Box::new(FutPriceVsVwap));
        // ... (12 more)

        // Options (14), Volatility (10), Order Flow (8), Price Structure (8),
        // Momentum (8), Time Context (13), Global Macro (12), Regime Context (4),
        // Volume Profile (6), Cross-Asset (4), LOB Microstructure (6), Sentiment (4)
        // ... register all 117 features

        assert_eq!(features.len(), 117, "Expected 117 features");

        Self { features }
    }

    /// Main entry point: compute all 117 features
    pub fn compute_all(
        &self,
        input: &FeatureInput,
        cache: &HistoricalCache,
    ) -> FeatureResult {
        let start = Instant::now();

        // Phase 1: Compute shared dependencies (sequential)
        let dep_start = Instant::now();
        let deps = self.compute_dependencies(input, cache);
        let dep_duration = dep_start.elapsed();

        // Phase 2: Compute all 117 features in parallel via Rayon
        let feature_results: Vec<(String, f64, u64)> = self.features
            .par_iter()
            .map(|feature| {
                let feature_start = Instant::now();
                let value = feature.compute(input, &deps);
                let duration = feature_start.elapsed().as_micros() as u64;
                (feature.name().to_string(), value, duration)
            })
            .collect();

        // Build result
        let mut features = HashMap::with_capacity(117);
        let mut timings = Vec::with_capacity(118); // 117 features + 1 deps

        for (name, value, duration) in feature_results {
            features.insert(name.clone(), value);
            timings.push(FeatureTiming {
                feature_name: name,
                duration_micros: duration,
            });
        }

        timings.push(FeatureTiming {
            feature_name: "shared_dependencies".to_string(),
            duration_micros: dep_duration.as_micros() as u64,
        });

        FeatureResult {
            features,
            timings,
            total_duration_micros: start.elapsed().as_micros() as u64,
        }
    }

    fn compute_dependencies(
        &self,
        input: &FeatureInput,
        cache: &HistoricalCache,
    ) -> ComputedDependencies {
        ComputedDependencies {
            vwap_future: compute_vwap(&input.nifty_future, cache),
            vwap_constituents: input.constituents
                .iter()
                .map(|c| (c.symbol.clone(), compute_vwap(c, cache)))
                .collect(),
            ema12_future: compute_ema(&input.nifty_future, 12, cache),
            ema20_future: compute_ema(&input.nifty_future, 20, cache),
            ema20_constituents: input.constituents
                .iter()
                .map(|c| (c.symbol.clone(), compute_ema(c, 20, cache)))
                .collect(),
            ema26_future: compute_ema(&input.nifty_future, 26, cache),
            atr14_future: compute_atr(&input.nifty_future, 14, cache),
            rsi5_future: compute_rsi(&input.nifty_future, 5, cache),
            rsi14_future: compute_rsi(&input.nifty_future, 14, cache),
            macd_future: compute_macd(&input.nifty_future, cache),
            macd_signal_future: compute_macd_signal(&input.nifty_future, cache),
            adx14_future: compute_adx(&input.nifty_future, 14, cache),
            stochastic_k14: compute_stochastic_k(&input.nifty_future, 14, cache),
            stochastic_d14: compute_stochastic_d(&input.nifty_future, 14, 3, cache),
            cci20_future: compute_cci(&input.nifty_future, 20, cache),
            williams_r14: compute_williams_r(&input.nifty_future, 14, cache),
            highest_high_14: compute_rolling_high(&input.nifty_future, 14, cache),
            lowest_low_14: compute_rolling_low(&input.nifty_future, 14, cache),
            bollinger_upper: compute_bollinger_upper(&input.nifty_future, 20, 2.0, cache),
            bollinger_lower: compute_bollinger_lower(&input.nifty_future, 20, 2.0, cache),
            bollinger_sma20: compute_sma(&input.nifty_future, 20, cache),
            bollinger_mean_dev: compute_mean_deviation(&input.nifty_future, 20, cache),
            returns_1m: compute_return(&input.nifty_future, 1, cache),
            returns_5m: compute_return(&input.nifty_future, 5, cache),
            returns_15m: compute_return(&input.nifty_future, 15, cache),
            returns_30m: compute_return(&input.nifty_future, 30, cache),
            realized_vol_5m: compute_realized_vol(5, cache),
            realized_vol_15m: compute_realized_vol(15, cache),
            realized_vol_30m: compute_realized_vol(30, cache),
            greeks_atm: compute_atm_greeks(&input.options, input.nifty_future.ltp),
            nifty_banknifty_corr_20: compute_rolling_correlation(cache, 20),
        }
    }
}
```

---

## 4. Type Safety (Rust to TypeScript)

### 4.1 Output Types

```rust
#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/schema/src/compute-engine/")]
pub struct FeatureOutput {
    pub timestamp: i64,

    // Index Breadth (8)
    pub pct_stocks_above_vwap: f64,
    pub pct_stocks_above_ema20: f64,
    pub weighted_return_top10: f64,
    pub advance_decline_ratio: f64,
    pub breadth_momentum_5m: f64,
    pub breadth_volatility: f64,
    pub breadth_thrust: f64,
    pub new_highs_lows_ratio: f64,

    // NIFTY Future (12)
    pub fut_price_vs_vwap: f64,
    pub fut_range_position: f64,
    pub fut_return_1m: f64,
    pub fut_return_5m: f64,
    pub fut_return_15m: f64,
    pub fut_atr_percent: f64,
    pub fut_volume_zscore: f64,
    pub fut_oi_change: f64,
    pub fut_oi_change_pct: f64,
    pub fut_rsi_14: f64,
    pub fut_macd: f64,
    pub fut_macd_signal: f64,

    // Options (14)
    pub atm_iv: f64,
    pub atm_iv_change: f64,
    pub iv_skew: f64,
    pub iv_term_structure: f64,
    pub gamma_atm: f64,
    pub vega_atm: f64,
    pub theta_atm: f64,
    pub pcr_oi: f64,
    pub pcr_volume: f64,
    pub max_pain_distance: f64,
    pub total_gamma_exposure: f64,
    pub charm_atm: f64,
    pub vanna_atm: f64,
    pub iv_percentile_30d: f64,

    // Volatility (10)
    pub india_vix: f64,
    pub realized_vol_5m: f64,
    pub realized_vol_15m: f64,
    pub vol_expansion_ratio: f64,
    pub iv_rv_ratio: f64,
    pub vix_percentile_30d: f64,
    pub vix_term_structure: f64,
    pub realized_vol_30m: f64,
    pub vol_of_vol: f64,
    pub iv_change_rate: f64,

    // Order Flow (8)
    pub bid_ask_spread_bps: f64,
    pub depth_imbalance_5: f64,
    pub ofi_1s: f64,
    pub ofi_5s: f64,
    pub ofi_30s: f64,
    pub trade_imbalance: f64,
    pub bid_slope: f64,
    pub ask_slope: f64,

    // Price Structure (8)
    pub return_1m: f64,
    pub return_5m: f64,
    pub return_15m: f64,
    pub return_30m: f64,
    pub gap_open: f64,
    pub intraday_range: f64,
    pub upper_shadow: f64,
    pub lower_shadow: f64,

    // Momentum (8)
    pub rsi_5: f64,
    pub rsi_14: f64,
    pub macd_histogram: f64,
    pub adx_14: f64,
    pub cci_20: f64,
    pub williams_r_14: f64,
    pub stochastic_k_14: f64,
    pub stochastic_d_14: f64,

    // Time Context (13)
    pub minutes_from_open: f64,
    pub minutes_to_close: f64,
    pub day_of_week: f64,
    pub is_expiry_day: f64,
    pub days_to_expiry: f64,
    pub session_phase: f64,
    pub sin_time_of_day: f64,
    pub cos_time_of_day: f64,
    pub sin_day_of_week: f64,
    pub cos_day_of_week: f64,
    pub is_weekly_expiry: f64,
    pub is_monthly_expiry: f64,
    pub minutes_to_expiry_close: f64,

    // Global Macro (12)
    pub es_return: f64,
    pub nq_return: f64,
    pub dxy_change: f64,
    pub us10y_change: f64,
    pub gold_return: f64,
    pub brent_return: f64,
    pub nikkei_return: f64,
    pub gift_nifty_return: f64,
    pub vix_close: f64,
    pub dxy_level: f64,
    pub us10y_level: f64,
    pub fii_dii_net: f64,

    // Regime Context (4)
    pub regime_bull_trending: f64,
    pub regime_bear_trending: f64,
    pub regime_volatile: f64,
    pub regime_ranging: f64,

    // Volume Profile (6)
    pub volume_ratio_5m: f64,
    pub volume_ratio_15m: f64,
    pub oi_change_pct_calls: f64,
    pub oi_change_pct_puts: f64,
    pub volume_weighted_iv: f64,
    pub cumulative_delta: f64,

    // Cross-Asset (4)
    pub nifty_banknifty_corr_20: f64,
    pub futures_spot_basis: f64,
    pub nifty_banknifty_ratio: f64,
    pub cross_asset_momentum: f64,

    // LOB Microstructure (6)
    pub depth_imbalance_10: f64,
    pub sweep_detection: f64,
    pub large_order_flow: f64,
    pub price_impact_coefficient: f64,
    pub queue_position_estimate: f64,
    pub hidden_liquidity_score: f64,

    // Sentiment (4)
    pub finbert_sentiment: f64,
    pub fii_flow_signal: f64,
    pub dii_flow_signal: f64,
    pub news_event_flag: f64,
}
```

### 4.2 Zod Schema (TypeScript Side)

```typescript
// packages/schema/src/compute-engine/feature-computation.schema.ts
import { z } from 'zod'

// All 117 features with range validation
export const FeatureOutputSchema = z.object({
  timestamp: z.number().int(),

  // Index Breadth (8)
  pct_stocks_above_vwap: z.number().min(0).max(1),
  pct_stocks_above_ema20: z.number().min(0).max(1),
  weighted_return_top10: z.number(),
  advance_decline_ratio: z.number().nonnegative(),
  breadth_momentum_5m: z.number(),
  breadth_volatility: z.number().nonnegative(),
  breadth_thrust: z.number().min(0).max(1),
  new_highs_lows_ratio: z.number().min(-1).max(1),

  // ... (all 117 features with appropriate Zod validators)

  // Sentiment (4)
  finbert_sentiment: z.number().min(-1).max(1),
  fii_flow_signal: z.number().min(-1).max(1),
  dii_flow_signal: z.number().min(-1).max(1),
  news_event_flag: z.number().min(0).max(1),
})

export type FeatureOutput = z.infer<typeof FeatureOutputSchema>
```

---

## 5. Historical Data Cache

### 5.1 Rolling Window Cache

```rust
// src/cache/rolling_window.rs
pub struct RollingWindow<T> {
    capacity: usize,
    data: VecDeque<T>,
}

impl<T: Clone> RollingWindow<T> {
    pub fn new(capacity: usize) -> Self {
        Self {
            capacity,
            data: VecDeque::with_capacity(capacity),
        }
    }

    pub fn push(&mut self, value: T) {
        if self.data.len() >= self.capacity {
            self.data.pop_front();
        }
        self.data.push_back(value);
    }

    pub fn len(&self) -> usize { self.data.len() }
    pub fn is_empty(&self) -> bool { self.data.is_empty() }
    pub fn get(&self, index: usize) -> Option<&T> { self.data.get(index) }
    pub fn iter(&self) -> impl Iterator<Item = &T> { self.data.iter() }
}

pub struct HistoricalCache {
    // Future price data (120-bar lookback for TFT/Mamba sequence)
    future_prices: RollingWindow<f64>,
    future_highs: RollingWindow<f64>,
    future_lows: RollingWindow<f64>,
    future_closes: RollingWindow<f64>,
    future_volumes: RollingWindow<f64>,
    future_oi: RollingWindow<f64>,

    // Constituent prices (for EMA20)
    constituent_prices: HashMap<String, RollingWindow<f64>>,

    // Options ATM IV (for IV change)
    atm_ivs: RollingWindow<f64>,

    // Log returns (for realized vol)
    log_returns: RollingWindow<f64>,

    // Cross-asset (for correlations)
    banknifty_prices: RollingWindow<f64>,

    // Volume stats (for zscore)
    volume_stats: RollingWindow<f64>,

    // Trade imbalance history (for cumulative delta)
    trade_imbalances: RollingWindow<f64>,
}

impl HistoricalCache {
    pub fn new(lookback_periods: usize) -> Self {
        Self {
            future_prices: RollingWindow::new(lookback_periods),
            future_highs: RollingWindow::new(lookback_periods),
            future_lows: RollingWindow::new(lookback_periods),
            future_closes: RollingWindow::new(lookback_periods),
            future_volumes: RollingWindow::new(lookback_periods),
            future_oi: RollingWindow::new(lookback_periods),
            constituent_prices: HashMap::new(),
            atm_ivs: RollingWindow::new(lookback_periods),
            log_returns: RollingWindow::new(lookback_periods),
            banknifty_prices: RollingWindow::new(lookback_periods),
            volume_stats: RollingWindow::new(lookback_periods),
            trade_imbalances: RollingWindow::new(lookback_periods),
        }
    }

    pub fn update(&mut self, input: &FeatureInput) {
        self.future_prices.push(input.nifty_future.ltp);
        self.future_highs.push(input.nifty_future.high);
        self.future_lows.push(input.nifty_future.low);
        self.future_closes.push(input.nifty_future.close);
        self.future_volumes.push(input.nifty_future.volume);
        self.future_oi.push(input.nifty_future.open_interest);

        // Log return
        if self.future_prices.len() >= 2 {
            let prev = self.future_prices.get(self.future_prices.len() - 2).unwrap();
            if *prev > 0.0 {
                self.log_returns.push((input.nifty_future.ltp / prev).ln());
            }
        }

        for constituent in &input.constituents {
            self.constituent_prices
                .entry(constituent.symbol.clone())
                .or_insert_with(|| RollingWindow::new(26))
                .push(constituent.ltp);
        }

        if let Some(atm_option) = input.options.first() {
            self.atm_ivs.push(atm_option.iv);
        }
    }
}
```

---

## 6. NAPI-RS Entry Point

```rust
// src/lib.rs
#![deny(clippy::all)]

mod types;
mod processor;
mod timer;
mod dependencies;
mod features;
mod cache;

use napi_derive::napi;
use types::*;
use processor::FeatureProcessor;
use cache::HistoricalCache;
use std::sync::Mutex;

// Thread-safe global state (Mutex for interior mutability of cache)
static PROCESSOR: once_cell::sync::Lazy<FeatureProcessor> =
    once_cell::sync::Lazy::new(|| FeatureProcessor::new());
static CACHE: once_cell::sync::Lazy<Mutex<HistoricalCache>> =
    once_cell::sync::Lazy::new(|| Mutex::new(HistoricalCache::new(120)));

#[napi]
pub fn initialize_processor(lookback_periods: u32) {
    let mut cache = CACHE.lock().unwrap();
    *cache = HistoricalCache::new(lookback_periods as usize);
}

#[napi]
pub fn compute_features(input: FeatureInput) -> ComputeResult {
    let mut cache = CACHE.lock().unwrap();

    // Update cache with new data
    cache.update(&input);

    // Compute all 117 features
    let result = PROCESSOR.compute_all(&input, &cache);

    // Log timings (structured JSON)
    timer::log_feature_timings(&result);

    // Convert to NAPI result
    ComputeResult {
        features: convert_to_feature_output(result.features),
        timings: result.timings.into_iter()
            .map(|t| FeatureTimingLog {
                feature_name: t.feature_name,
                duration_micros: t.duration_micros,
            })
            .collect(),
        total_duration_micros: result.total_duration_micros,
    }
}
```

---

## 7. Integration Examples

### 7.1 Live Data Processing (market-feeder)

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { initializeProcessor, computeFeatures } from '@repo/compute-engine'
import type { FeatureInput, ComputeResult } from '@repo/schema/compute-engine'

@Injectable()
export class ComputeEngineService {
  private readonly logger = new Logger(ComputeEngineService.name)

  constructor() {
    initializeProcessor(120) // 120-bar lookback for TFT/Mamba sequence
  }

  processTickData(tickData: MarketTickData): ComputeResult {
    const result = computeFeatures(this.mapToFeatureInput(tickData))

    this.logger.log({
      event: 'features_computed',
      total_duration_ms: result.total_duration_micros / 1000,
      feature_count: 117,
      slowest_features: result.timings
        .sort((a, b) => b.duration_micros - a.duration_micros)
        .slice(0, 5)
        .map((t) => ({ name: t.feature_name, ms: t.duration_micros / 1000 })),
    })

    return result
  }
}
```

---

## 8. Performance Targets

| Metric                              | Target                     | Critical Threshold |
| ----------------------------------- | -------------------------- | ------------------ |
| **Total Computation Time**          | <5ms (p95)                 | <10ms (p99)        |
| **Phase 1 (Shared Dependencies)**   | <2ms                       | <4ms               |
| **Phase 2 (117 Features Parallel)** | <1ms                       | <3ms               |
| **Single Feature**                  | <100us                     | <500us             |
| **Memory Usage**                    | <50MB                      | <100MB             |
| **Parallelism**                     | All 117 features via Rayon | -                  |

---

## 9. Resolved Design Decisions

| Question              | Decision                    | Rationale                                     |
| --------------------- | --------------------------- | --------------------------------------------- |
| Historical cache size | 120 periods                 | Covers TFT/Mamba 120-bar sequence requirement |
| VWAP calculation      | Computed internally         | No dependency on broker-provided VWAP         |
| Error handling        | Return 0.0 for missing data | Neutral default, models trained to handle     |
| Logging format        | JSON structured logs        | Compatible with Pino, Grafana Loki            |
| Parallelism           | Rayon (data-parallel)       | Best for CPU-bound parallel computation       |

---

## Related Documentation

- [FEATURE_REFERENCE.md](./FEATURE_REFERENCE.md) — Complete 117-feature specification
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) — Development quick-start guide
- [02-FEATURE-ENGINE.md](../../../apps/algo-worker/docs/layers/02-FEATURE-ENGINE.md) — algo-worker integration
