# Compute Engine — High-Performance Parallel Feature Computation

> **Rust-based parallel computation engine that transforms raw market data into 117 trading features in under 5ms. Uses a two-phase dependency-aware architecture with Rayon thread-pool parallelism, NAPI-RS bindings for Node.js, and end-to-end type safety via ts-rs code generation.**

Built with **Rust**, **Rayon** (parallelism), **NAPI-RS v3** (Node.js FFI + WebAssembly target), **Serde** (JSON), **ts-rs** (TypeScript codegen).

**Last Updated**: March 17, 2026

---

## System Overview

The Compute Engine is a **shared Rust library** consumed by two different services:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     COMPUTE ENGINE INTEGRATION                           │
│                                                                          │
│  ┌── market-feeder (LIVE) ──────────────────────────────────────────┐   │
│  │  Every 60s: 1-min candle + option chain + LOB                    │   │
│  │  → computeFeatures(JSON) → 117 features → Redis → algo-worker   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌── training-pipeline (BATCH) ─────────────────────────────────────┐   │
│  │  Historical: QuestDB rows → computeFeatures(JSON) × millions     │   │
│  │  → Training features → QuestDB instrument_features_1m            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌── algo-worker (INDIRECT) ────────────────────────────────────────┐   │
│  │  Receives features from Redis (computed by market-feeder)         │   │
│  │  Uses TypeScript types auto-generated from Rust via ts-rs         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Properties

| Property            | Value                                                |
| ------------------- | ---------------------------------------------------- |
| **Language**        | Rust (2021 edition)                                  |
| **Node.js Binding** | NAPI-RS v3 (`#[napi]` macro, WebAssembly target support) |
| **Serialization**   | JSON via Serde (NOT NAPI objects — 32-field limit)   |
| **Parallelism**     | Rayon thread pool (`par_iter`)                       |
| **Type Safety**     | Rust → TypeScript via ts-rs auto-generation          |
| **Total Features**  | 117 across 6 categories                              |
| **Target Latency**  | <5ms p95 (deps ~2ms + features ~1ms + overhead ~2ms) |
| **Memory**          | <100KB per invocation                                |

---

## Two-Phase Computation Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     COMPUTE ENGINE INTERNALS                             │
│                                                                          │
│  INPUT: JSON string (FeatureInput)                                      │
│  ├── niftyFuture: { ltp, open, high, low, close, volume, OI }          │
│  ├── constituents: [ 50 × { ltp, high, low, close, volume } ]          │
│  ├── options: [ N × { ltp, OI, delta, gamma, theta, vega, IV } ]       │
│  ├── indiaVix: f64                                                       │
│  └── marketDepth: { bids: [...], asks: [...] }                           │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 1: Shared Dependencies (Sequential, ~2ms)                 │    │
│  │                                                                  │    │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌─────────┐  │    │
│  │  │ VWAP   │  │ EMA    │  │ ATR/   │  │ Greeks │  │ Realized│  │    │
│  │  │ (50+1) │  │ 12,20, │  │ RSI    │  │ Aggr.  │  │ Vol     │  │    │
│  │  │        │  │ 26     │  │ (14)   │  │ (OI-   │  │ (5m,15m)│  │    │
│  │  │ Σ(P×V)/│  │        │  │        │  │  wtd)  │  │         │  │    │
│  │  │  Σ(V)  │  │        │  │        │  │        │  │         │  │    │
│  │  └────────┘  └────────┘  └────────┘  └────────┘  └─────────┘  │    │
│  │                                                                  │    │
│  │  All computed from HistoricalCache (RingBuffer, O(1) access)     │    │
│  └──────────────────────────────────────┬──────────────────────────┘    │
│                                          │                               │
│                                          ▼                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 2: Feature Computation (Parallel via Rayon, ~1ms)         │    │
│  │                                                                  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │    │
│  │  │ Index    │ │ Futures  │ │ Options  │ │ Volatility│           │    │
│  │  │ Breadth  │ │ (12)     │ │ (14)     │ │ (6)       │           │    │
│  │  │ (8)      │ │          │ │          │ │           │           │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │    │
│  │  ┌──────────┐ ┌──────────┐                                      │    │
│  │  │ Order    │ │ Time     │  All 117 features run in parallel    │    │
│  │  │ Flow (8) │ │ Context  │  via Rayon par_iter()                │    │
│  │  │          │ │ (6)      │                                      │    │
│  │  └──────────┘ └──────────┘                                      │    │
│  └──────────────────────────────────────┬──────────────────────────┘    │
│                                          │                               │
│  OUTPUT: JSON string (ComputeResult)     │                               │
│  ├── features: { ...117 named fields }   │                               │
│  ├── timings: { per_feature_micros }     │                               │
│  └── totalDurationMicros: u64            │                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why Two Phases?

**Phase 1** computes values that multiple features depend on:

- VWAP is used by `pct_stocks_above_vwap`, `vwap_distance`, `breadth_thrust`
- EMA(20) is used by `fut_ema_ratio`, `fut_price_vs_ema20`
- RSI(14) is used by `fut_rsi_14` and as input to momentum features
- Computing these once and sharing them eliminates 50+ redundant calculations

**Phase 2** uses `rayon::par_iter()` to compute all 117 features simultaneously across CPU cores. Each feature receives the input data plus the pre-computed dependencies from Phase 1.

---

## Feature Categories (117 Total)

| Category          | Count | Key Features                                                                                      | Dependency         |
| ----------------- | ----- | ------------------------------------------------------------------------------------------------- | ------------------ |
| **Index Breadth** | 8     | `pct_stocks_above_vwap`, `breadth_thrust`, `advance_decline_ratio`, `new_highs_lows_ratio`        | Constituent VWAPs  |
| **NIFTY Futures** | 12    | `fut_rsi_14`, `fut_macd`, `fut_atr_pct`, `fut_return_1m/5m/15m`, `fut_oi_change_pct`              | EMA, ATR, RSI      |
| **Options**       | 14    | `atm_iv`, `pcr_oi`, `pcr_volume`, `iv_skew`, `total_gex`, `charm`, `vanna`, `iv_percentile_30d`   | Greeks aggregation |
| **Volatility**    | 6     | `india_vix`, `realized_vol_5m`, `realized_vol_15m`, `iv_rv_ratio`, `vol_of_vol`, `vix_percentile` | Realized vol       |
| **Order Flow**    | 8     | `ofi_1s`, `ofi_5s`, `ofi_30s`, `depth_imbalance_5`, `depth_imbalance_10`, `trade_imbalance`       | None (live data)   |
| **Time Context**  | 6     | `minutes_from_open`, `session_phase`, `is_expiry_day`, `time_sin`, `time_cos`                     | None (clock)       |

See [FEATURE_SPECIFICATION.md](../../docs/ml/FEATURE_SPECIFICATION.md) for complete formulas and value ranges.

---

## Core Abstractions

### Feature Trait

```rust
pub trait Feature: Send + Sync {
    fn name(&self) -> &'static str;
    fn category(&self) -> &'static str;
    fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue;
}
```

Every feature implements this trait. `Send + Sync` is required for Rayon parallelism.

### ComputedDependencies

```rust
pub struct ComputedDependencies {
    // NIFTY Future
    pub nifty_future_vwap: f64,
    pub nifty_future_ema12: f64,
    pub nifty_future_ema20: f64,
    pub nifty_future_ema26: f64,
    pub nifty_future_atr14: f64,
    pub nifty_future_rsi14: f64,

    // Constituents
    pub constituent_vwaps: Vec<f64>,  // 50 VWAPs

    // Options
    pub aggregated_greeks: AggregatedGreeks,

    // Volatility
    pub realized_vol_5m: f64,
    pub realized_vol_15m: f64,
}
```

### Historical Cache

```rust
pub struct HistoricalCache {
    nifty_future_pv: RingBuffer<PriceVolumeTick>,   // 26 periods for EMA26
    nifty_future_ohlc: RingBuffer<OhlcTick>,          // 14 periods for ATR14
    constituent_pv: HashMap<String, RingBuffer<PriceVolumeTick>>,
    prev_atm_iv: Option<f64>,
}
```

The `RingBuffer<T>` provides O(1) access to the last N elements without allocation.

---

## NAPI-RS Entry Point

```rust
#[napi]
pub fn compute_features(input_json: String) -> napi::Result<String> {
    let input = FeatureInput::from_json(&input_json)
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    CACHE.lock().unwrap().update(&input);

    let result = PROCESSOR.compute_all(&input, &CACHE.lock().unwrap());

    result.to_json()
        .map_err(|e| napi::Error::from_reason(e.to_string()))
}
```

**Why JSON, not NAPI objects?** NAPI-RS has a hard 32-field limit on `#[napi(object)]` structs. FeatureOutput has 117+ fields. JSON serialization via Serde bypasses this limitation with negligible overhead (<0.5ms).

---

## Type Safety: Rust → TypeScript

Auto-generated TypeScript types via ts-rs ensure type safety across the Rust-TypeScript boundary:

```typescript
// Auto-generated by ts-rs — DO NOT EDIT
export interface FeatureInput {
  timestamp: number
  niftyFuture: FutureTick
  constituents: ConstituentTick[]
  options: OptionTick[]
  indiaVix: number
  marketDepth?: MarketDepth
}

export interface ComputeResult {
  features: FeatureOutput
  timings: FeatureTimingLog[]
  totalDurationMicros: number
}
```

---

## Usage

### Live Data (market-feeder)

```typescript
import { computeFeatures } from '@repo/compute-engine'

const inputJson = JSON.stringify({
  timestamp: Date.now(),
  niftyFuture: {
    ltp: 23500,
    open: 23450,
    high: 23550,
    low: 23400,
    close: 23500,
    volume: 1000000,
    openInterest: 5000000,
  },
  constituents: [
    /* 50 stocks */
  ],
  options: [
    /* ATM ± 10 strikes */
  ],
  indiaVix: 15.5,
})

const resultJson = computeFeatures(inputJson)
const result = JSON.parse(resultJson)

console.log(result.features.pctStocksAboveVwap) // 0.62
console.log(result.features.futRsi14) // 55.3
console.log(result.totalDurationMicros) // ~2500 (2.5ms)
```

### Batch Processing (training-pipeline)

```python
# Python reads historical data from QuestDB, calls compute-engine via subprocess/FFI
import subprocess, json

for row in historical_candles:
    input_json = json.dumps(build_feature_input(row))
    result = subprocess.run(['compute_features', input_json], capture_output=True)
    features = json.loads(result.stdout)
    store_to_questdb(features)
```

---

## Performance Benchmarks

| Operation              | Time     | Notes                                      |
| ---------------------- | -------- | ------------------------------------------ |
| Phase 1 (Dependencies) | ~2ms     | Sequential, cache access, VWAP/EMA/ATR/RSI |
| Phase 2 (117 Features) | ~1ms     | Parallel (8 threads via Rayon)             |
| JSON serialization     | ~0.5ms   | Serde input + output                       |
| **Total**              | **<5ms** | P95 target                                 |
| Memory per invocation  | ~60KB    | Cache + input buffer                       |
| Per-feature compute    | <100μs   | P95 target                                 |

---

## Project Structure

```
packages/compute-engine/
├── src/
│   ├── lib.rs                    # NAPI-RS entry point
│   ├── processor.rs              # FeatureProcessor (orchestrates computation)
│   ├── types.rs                  # Type definitions (Serde + ts-rs)
│   ├── cache/
│   │   └── mod.rs                # HistoricalCache + RingBuffer<T>
│   ├── dependencies/
│   │   └── mod.rs                # 18 shared dependency calculations
│   └── features/
│       ├── mod.rs                # Feature trait + ComputedDependencies
│       ├── index_breadth.rs      # 8 features
│       ├── nifty_future.rs       # 12 features
│       ├── options.rs            # 14 features
│       ├── volatility.rs         # 6 features
│       ├── order_flow.rs         # 8 features
│       └── time_context.rs       # 6 features
├── docs/
│   ├── PARALLEL_FEATURE_ARCHITECTURE.md  # Detailed architecture specification
│   ├── QUICK_REFERENCE.md                # Patterns, testing, debugging
│   └── FEATURE_REFERENCE.md             # Per-feature formulas
├── Cargo.toml
├── package.json
└── index.d.ts                    # Auto-generated TypeScript types
```

---

## Adding a New Feature

1. **Create the feature** in the appropriate category file (e.g., `features/volatility.rs`):

```rust
pub struct MyNewFeature;

impl Feature for MyNewFeature {
    fn name(&self) -> &'static str { "my_new_feature" }
    fn category(&self) -> &'static str { "volatility" }

    fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
        // Use deps for pre-computed values, input for raw data
        // Handle edge cases (zero denominator, NaN, empty arrays)
        FeatureValue::Scalar(result)
    }
}
```

2. **Register** in `processor.rs`:

```rust
features.push(Box::new(volatility::MyNewFeature));
```

3. **Add field** to `FeatureOutput` in `types.rs`
4. **Add test** in `#[cfg(test)]` module
5. **Run**: `cargo test && cargo clippy && cargo fmt`

---

## Development

```bash
# Build
cargo build --release           # Rust library
pnpm build                      # NAPI-RS → index.node

# Test
cargo test                      # Rust unit tests
cargo test -- --nocapture       # With output
pnpm test                       # Via turborepo

# Lint
cargo clippy                    # Rust linter
cargo fmt                       # Formatter

# Benchmark
cargo bench                     # Criterion benchmarks
```

---

## Documentation

- [**PARALLEL_FEATURE_ARCHITECTURE.md**](./docs/PARALLEL_FEATURE_ARCHITECTURE.md) — Detailed two-phase architecture, type system, migration plan
- [**QUICK_REFERENCE.md**](./docs/QUICK_REFERENCE.md) — Patterns, testing, debugging, troubleshooting
- [**FEATURE_REFERENCE.md**](./docs/FEATURE_REFERENCE.md) — Per-feature formulas and ranges
- [**FEATURE_SPECIFICATION.md**](../../docs/ml/FEATURE_SPECIFICATION.md) — Complete 117 feature definitions (docs/ml/)
- [market-feeder](../../services/market-feeder/README.md) — Primary consumer (live)
- [algo-worker](../../apps/algo-worker/README.md) — End consumer (ML inference)

---

## Critical Design Rules

- **VWAP is COMPUTED** (from historical cache), never provided as input
- **JSON serialization** (via Serde), NOT NAPI objects (32-field limit)
- **Zero allocations in hot path**: Use iterators, not `.collect()`
- **Use pre-computed dependencies**: Never recalculate VWAP/EMA/ATR in features
- **Handle all edge cases**: Zero denominators, NaN, empty arrays, infinity

---

**Status**: Production Ready
**Features**: 117 (33 complete, remaining in development)
**Performance**: <5ms target | ~2-4ms actual
**Memory**: <100KB target | ~60KB estimated
**Test Coverage**: >90% target
