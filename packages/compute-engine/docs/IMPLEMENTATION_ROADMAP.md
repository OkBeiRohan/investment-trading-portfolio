# Parallel Feature Computation - Implementation Roadmap

## Phase 1: Core Infrastructure (Week 1)

### 1.1 Type Definitions & Schema

- [ ] Create `types.rs` with NAPI + ts-rs decorators
  - `FeatureInput` struct
  - `FutureTick`, `ConstituentTick`, `OptionTick` structs
  - `FeatureOutput` struct (33 fields)
  - `ComputeResult` struct (features + timings)
  - `FeatureTimingLog` struct
- [ ] Generate TypeScript types (`cargo test --features ts-rs`)
- [ ] Create Zod schemas in `@repo/schema/src/compute-engine/`
  - `feature-input.schema.ts`
  - `feature-output.schema.ts`
  - `compute-result.schema.ts`
- [ ] Add validation tests (Zod ↔ ts-rs parity)

**Acceptance Criteria**:

- Types compile in Rust
- TypeScript types auto-generated
- Zod schemas validate example data
- No type mismatches

---

### 1.2 Feature Trait & Registry

- [ ] Create `features/mod.rs` with `Feature` trait

```rust
pub trait Feature: Send + Sync {
    fn name(&self) -> &'static str;
    fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64;
}
```

- [ ] Create `ComputedDependencies` struct
- [ ] Create `FeatureRegistry` for dynamic feature management
- [ ] Add feature registration macro (optional)

**Acceptance Criteria**:

- Trait compiles
- Can register dummy feature
- Can iterate over registered features

---

### 1.3 Historical Cache

- [ ] Create `cache/rolling_window.rs`
  - Generic `RollingWindow<T>` struct
  - `push()`, `get()`, `as_slice()` methods
- [ ] Create `cache/mod.rs` with `HistoricalCache`
  - Price/volume/OI windows
  - Per-constituent caches
  - `update()` method
- [ ] Add unit tests for cache

**Acceptance Criteria**:

- Can store 26 periods of data
- Can retrieve N-periods-ago data
- No memory leaks

---

## Phase 2: Shared Dependencies (Week 1-2)

### 2.1 Basic Calculations

- [ ] `dependencies/vwap.rs`
  - `compute_vwap(prices: &[f64], volumes: &[f64]) -> f64`
  - Handle zero volume edge case
- [ ] `dependencies/returns.rs`
  - `compute_returns(prices: &[f64], period: usize) -> Vec<f64>`
  - `compute_return(current: f64, past: f64) -> f64`
- [ ] Add unit tests with known values

**Tests**:

```rust
#[test]
fn test_vwap() {
    let prices = vec![100.0, 101.0, 99.0];
    let volumes = vec![10.0, 20.0, 15.0];
    let vwap = compute_vwap(&prices, &volumes);
    assert!((vwap - 100.111).abs() < 0.01);
}
```

---

### 2.2 Exponential Moving Average (EMA)

- [ ] `dependencies/ema.rs`
  - `compute_ema(prices: &[f64], period: usize) -> f64`
  - Use smoothing factor: `α = 2 / (period + 1)`
- [ ] Handle insufficient data (return NaN or 0.0)
- [ ] Add benchmark for EMA12, EMA20, EMA26

**Tests**:

- Compare against known TA-Lib values
- Test edge cases (empty array, single value)

---

### 2.3 Average True Range (ATR)

- [ ] `dependencies/atr.rs`
  - `compute_atr(highs: &[f64], lows: &[f64], closes: &[f64], period: usize) -> f64`
  - True Range = max(H-L, |H-C_prev|, |L-C_prev|)
  - ATR = EMA of True Range
- [ ] Add unit tests

---

### 2.4 Relative Strength Index (RSI)

- [ ] `dependencies/rsi.rs`
  - `compute_rsi(prices: &[f64], period: usize) -> f64`
  - Average gain = EMA of positive changes
  - Average loss = EMA of negative changes
  - RSI = 100 - (100 / (1 + RS))
- [ ] Handle all gains/losses edge case
- [ ] Add unit tests

---

### 2.5 Option Greeks (Black-Scholes-Merton)

- [ ] `dependencies/greeks.rs`
  - Add `black76` or `rust-quant` dependency
  - `compute_atm_greeks(spot: f64, strike: f64, iv: f64, time_to_expiry: f64) -> OptionGreeks`
  - Compute: gamma, vega, theta, charm, vanna
- [ ] Add tests against known values

---

### 2.6 Dependency Orchestrator

- [ ] Update `processor.rs::compute_dependencies()`
  - Call all dependency functions
  - Populate `ComputedDependencies` struct
  - Add timing for dependency phase
- [ ] Add integration test (full dependency computation)

**Acceptance Criteria**:

- All shared values computed correctly
- Dependency phase completes in <2ms
- No allocations in hot path

---

## Phase 3: Feature Implementation (Week 2-3)

### 3.1 Index Breadth Features (6 features)

Each file follows this template:

```rust
// features/index_breadth/pct_stocks_above_vwap.rs
use crate::features::Feature;

pub struct PctStocksAboveVwap;

impl Feature for PctStocksAboveVwap {
    fn name(&self) -> &'static str {
        "pct_stocks_above_vwap"
    }

    fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
        // Implementation
    }
}

#[cfg(test)]
mod tests {
    // Unit tests
}
```

**Features to implement**:

- [ ] `pct_stocks_above_vwap.rs`
- [ ] `pct_stocks_above_ema20.rs`
- [ ] `weighted_return_top10.rs`
- [ ] `advance_decline_ratio.rs`
- [ ] `breadth_momentum_5m.rs`
- [ ] `breadth_volatility.rs`
- [ ] `index_breadth/mod.rs` (re-exports)

---

### 3.2 NIFTY Future Features (9 features)

- [ ] `fut_price_vs_vwap.rs`
- [ ] `fut_range_position.rs`
- [ ] `fut_return_1m.rs`
- [ ] `fut_return_5m.rs`
- [ ] `fut_atr_percent.rs`
- [ ] `fut_volume_zscore.rs`
- [ ] `fut_oi_change.rs`
- [ ] `fut_rsi_14.rs`
- [ ] `fut_macd.rs`
- [ ] `nifty_future/mod.rs`

---

### 3.3 Option Features (11 features)

- [ ] `atm_iv.rs` (pass-through)
- [ ] `atm_iv_change.rs` (needs cache)
- [ ] `iv_skew.rs` (OTM put IV - OTM call IV)
- [ ] `gamma_atm.rs` (from deps)
- [ ] `vega_atm.rs` (from deps)
- [ ] `theta_atm.rs` (from deps)
- [ ] `pcr_oi.rs` (put OI / call OI)
- [ ] `pcr_volume.rs` (put vol / call vol)
- [ ] `max_pain_distance.rs` (requires max pain calc)
- [ ] `charm_atm.rs` (from deps)
- [ ] `vanna_atm.rs` (from deps)
- [ ] `options/mod.rs`

**Note**: `max_pain_distance` requires additional logic:

```rust
fn compute_max_pain(options: &[OptionTick], spot: f64) -> f64 {
    // Find strike with minimum total loss for option writers
    // Iterate strikes, sum intrinsic values
}
```

---

### 3.4 Volatility Features (4 features)

- [ ] `india_vix.rs` (pass-through from input)
- [ ] `realized_vol_5m.rs` (sqrt(sum(returns²)))
- [ ] `realized_vol_15m.rs` (sqrt(sum(returns²)))
- [ ] `vol_expansion_ratio.rs` (RV5m / RV15m)
- [ ] `volatility/mod.rs`

---

### 3.5 Time Context Features (3 features)

- [ ] `minutes_from_open.rs`

```rust
let market_open = 9 * 60 + 15; // 9:15 AM IST
let current = hour * 60 + minute;
(current - market_open) as f64
```

- [ ] `minutes_to_close.rs`

```rust
let market_close = 15 * 60 + 30; // 3:30 PM IST
let current = hour * 60 + minute;
(market_close - current) as f64
```

- [ ] `day_of_week.rs`

```rust
dt.weekday().num_days_from_monday() as f64 // 0=Mon, 4=Fri
```

- [ ] `time_context/mod.rs`

---

## Phase 4: Parallel Execution (Week 3)

### 4.1 Feature Processor

- [ ] Update `processor.rs::FeatureProcessor::new()`
  - Register all 33 features in `Vec<Box<dyn Feature>>`
- [ ] Implement `compute_all()`
  - Phase 1: Compute dependencies (sequential)
  - Phase 2: Parallel feature computation (Rayon)
  - Return `FeatureResult`
- [ ] Add Rayon dependency to `Cargo.toml`

```rust
let feature_results: Vec<_> = self.features
    .par_iter()
    .map(|f| {
        let start = Instant::now();
        let value = f.compute(input, deps);
        (f.name(), value, start.elapsed())
    })
    .collect();
```

---

### 4.2 Performance Logging

- [ ] Create `timer.rs`
  - `log_feature_timings(result: &FeatureResult)`
  - Output JSON structured logs
- [ ] Add `tracing` or `serde_json` dependency
- [ ] Test log output format

---

### 4.3 NAPI Entry Point

- [ ] Update `lib.rs`
  - `initialize_processor(lookback_periods: u32)`
  - `compute_features(input: FeatureInput) -> ComputeResult`
  - Add global static for processor + cache
- [ ] Add NAPI-RS dependencies to `Cargo.toml`

```toml
[dependencies]
napi = { version = "2", features = ["async", "serde-json"] }
napi-derive = "2"
```

- [ ] Test NAPI binding compilation

```bash
pnpm build
```

---

## Phase 5: Integration & Testing (Week 4)

### 5.1 TypeScript Integration

- [ ] Update `@repo/schema/src/compute-engine/index.ts`
  - Export Zod schemas
  - Export TypeScript types
- [ ] Create wrapper in `market-feeder`
  - `feature-computation.service.ts`
  - Call `computeFeatures()`
  - Log timings
- [ ] Add integration test (end-to-end)

---

### 5.2 Unit Tests

- [ ] Add tests for each feature
- [ ] Add tests for shared dependencies
- [ ] Add tests for cache
- [ ] Add tests for processor
- [ ] Run `cargo test`

**Coverage target**: >90%

---

### 5.3 Benchmarks

- [ ] Create `benches/feature_computation.rs`

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn benchmark_compute_all(c: &mut Criterion) {
    let processor = FeatureProcessor::new();
    let input = load_test_data();

    c.bench_function("compute_all_features", |b| {
        b.iter(|| processor.compute_all(black_box(&input), &cache))
    });
}

criterion_group!(benches, benchmark_compute_all);
criterion_main!(benches);
```

- [ ] Run benchmarks

```bash
cargo bench
```

**Performance targets**:

- Total computation: <5ms (p95)
- Shared dependencies: <2ms
- Single feature: <100µs

---

### 5.4 Historical Data Processing

- [ ] Create script in `training-pipeline`
  - Fetch candles from QuestDB
  - Convert to `FeatureInput`
  - Call `computeFeatures()`
  - Store in `instrument_features_1m` table
- [ ] Add CLI for batch processing

```bash
pnpm run generate-features --start 2024-01-01 --end 2024-12-31
```

---

## Phase 6: Documentation & Deployment (Week 4)

### 6.1 Documentation

- [ ] Update `compute-engine/README.md`
  - Architecture overview
  - Usage examples
  - Performance benchmarks
- [ ] Add rustdoc comments to all public APIs
- [ ] Generate docs

```bash
cargo doc --no-deps --open
```

---

### 6.2 Migration Guide

- [ ] Create `MIGRATION.md`
  - Breaking changes
  - How to update existing code
  - Performance comparison

---

### 6.3 Deployment

- [ ] Update `package.json` build scripts
- [ ] Add pre-build hooks for TypeScript generation
- [ ] Test on Windows + ArchLinux
- [ ] Update `pm2-deploy-*.ps1` scripts

---

## Checklist Summary

**Phase 1: Infrastructure**

- [ ] Type definitions (Rust + TypeScript + Zod)
- [ ] Feature trait
- [ ] Historical cache

**Phase 2: Dependencies**

- [ ] VWAP, EMA, ATR, RSI
- [ ] Returns calculation
- [ ] Option Greeks (BSM)

**Phase 3: Features**

- [ ] 6 index breadth features
- [ ] 9 NIFTY future features
- [ ] 11 option features
- [ ] 4 volatility features
- [ ] 3 time context features

**Phase 4: Execution**

- [ ] Parallel processor (Rayon)
- [ ] Performance logging
- [ ] NAPI bindings

**Phase 5: Testing**

- [ ] Unit tests (>90% coverage)
- [ ] Integration tests
- [ ] Benchmarks (<5ms target)

**Phase 6: Deployment**

- [ ] Documentation
- [ ] Migration guide
- [ ] Production deployment

---

## Dependencies to Add

### Rust (Cargo.toml)

```toml
[dependencies]
napi = { version = "2", features = ["async", "serde-json"] }
napi-derive = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rayon = "1.8"
chrono = { version = "0.4", features = ["serde"] }
thiserror = "1"

# Option Greeks
black76 = "0.1" # or statrs for stats functions

[dev-dependencies]
criterion = "0.5"
ts-rs = "7"

[build-dependencies]
napi-build = "2"
```

### TypeScript (package.json)

```json
{
  "dependencies": {
    "@repo/schema": "workspace:*",
    "zod": "^3.22.4"
  }
}
```

---

## Risk Mitigation

**Risk 1: Performance degradation**

- Mitigation: Benchmark each phase
- Threshold: If >10ms, optimize hot path

**Risk 2: Type mismatches (Rust ↔ TypeScript)**

- Mitigation: Auto-generate types with ts-rs
- Validation: Zod schema tests

**Risk 3: Historical cache memory usage**

- Mitigation: Use fixed-size rolling windows
- Monitor: Track heap allocations

**Risk 4: Option Greeks accuracy**

- Mitigation: Test against QuantLib/TA-Lib
- Validation: Compare with broker Greeks

---

## Success Metrics

1. **Performance**: All features computed in <5ms (p95)
2. **Type Safety**: Zero runtime type errors
3. **Test Coverage**: >90% line coverage
4. **Modularity**: Can add new feature in <30 minutes
5. **Logging**: Per-feature timings captured
6. **Accuracy**: Greeks match QuantLib within 1%

---

## Next Steps

1. Review this roadmap
2. Confirm Phase 1 scope
3. Begin implementation (start with types.rs)
4. Set up continuous benchmarking
5. Plan weekly reviews
