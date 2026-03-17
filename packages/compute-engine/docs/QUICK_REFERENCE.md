# Compute Engine -- Quick Reference

> Last updated: 2026-03-17

---

## TL;DR

**Problem**: Compute 117 features from live and historical market data with strict latency requirements:

- Parallel execution across all 117 features (minimize tail latency)
- Zero redundant calculations (shared dependency phase)
- End-to-end type safety (Rust to TypeScript via NAPI-RS)
- Per-feature timing instrumentation
- Modular design across 14 feature categories (straightforward to extend)

**Solution**: Rust-based parallel feature processor:

1. **Phase 1** -- Compute shared dependencies (sequential, single pass)
2. **Phase 2** -- Compute all 117 features in parallel (Rayon thread pool)
3. **Export** -- Expose to TypeScript via NAPI-RS with Zod schema validation

**Performance targets**:

| Metric                 | Target                     |
| ---------------------- | -------------------------- |
| Total wall-clock (p95) | < 5 ms                     |
| Per-feature (p99)      | < 100 us                   |
| Parallelism            | All 117 features via Rayon |

---

## Architecture Overview

```
+---------------------------------------------------------------+
|                      TypeScript Layer                          |
|  market-feeder / training-pipeline                            |
|  +----------------------------------------------------------+ |
|  | computeFeatures(input: FeatureInput)                      | |
|  |   -> ComputeResult { features, timings }                  | |
|  +----------------------------------------------------------+ |
+---------------------------------------------------------------+
                          | NAPI-RS
                          v
+---------------------------------------------------------------+
|                        Rust Layer                              |
|  +----------------------------------------------------------+ |
|  | FeatureProcessor                                          | |
|  |   Phase 1: compute_dependencies()  [Sequential]          | |
|  |     - VWAP, EMA, ATR, RSI, Greeks, Bollinger Bands,      | |
|  |       historical caches, rolling statistics               | |
|  |   Phase 2: compute_all()           [Parallel via Rayon]  | |
|  |     - 117 features execute simultaneously                 | |
|  +----------------------------------------------------------+ |
|                                                                |
|  +----------------------------------------------------------+ |
|  | Features (117 across 14 categories)                       | |
|  |                                                           | |
|  |  index_breadth/       (8)    order_flow/        (8)      | |
|  |  nifty_future/       (12)    price_structure/   (8)      | |
|  |  options/            (14)    momentum/          (8)      | |
|  |  volatility/         (10)    time_context/     (13)      | |
|  |  global_macro/       (12)    regime_context/    (4)      | |
|  |  volume_profile/      (6)    cross_asset/       (4)      | |
|  |  lob_microstructure/  (6)    sentiment/         (4)      | |
|  +----------------------------------------------------------+ |
+---------------------------------------------------------------+
```

---

## Usage Examples

### Live Tick Processing (market-feeder)

```typescript
import { computeFeatures } from '@repo/compute-engine'

const tickData = await websocket.receive()

const result = computeFeatures({
  timestamp: Date.now(),
  nifty_future: {
    ltp: 19500,
    open: 19450,
    high: 19550,
    low: 19400,
    close: 19500,
    volume: 1000000,
    open_interest: 5000000,
    vwap: 19480,
  },
  constituents: [
    { symbol: 'RELIANCE', ltp: 2500, open: 2480, vwap: 2490, volume: 500000 },
    // ... 49 more constituents
  ],
  options: [
    { strike: 19500, option_type: 'CE', ltp: 100, iv: 0.15, delta: 0.5 /* ... */ },
    // ... additional strikes and expiries
  ],
  india_vix: 15.5,
  global_indices: {
    sp500_futures: 5200.0,
    nasdaq_futures: 18100.0,
    dollar_index: 104.5,
    us_10y_yield: 4.25,
  },
  order_book: {
    bid_depth: [
      /* level 2 data */
    ],
    ask_depth: [
      /* level 2 data */
    ],
  },
})

// All 117 features computed in a single call
console.log(Object.keys(result.features).length) // 117
console.log(result.features.pct_stocks_above_vwap) // 0.62
console.log(result.features.fut_macd) // 12.5
console.log(result.features.regime_label) // 1 (trending)
console.log(result.total_duration_micros) // ~3500 (3.5ms for all 117)

// Identify slowest features
result.timings
  .sort((a, b) => b.duration_micros - a.duration_micros)
  .slice(0, 5)
  .forEach((t) => {
    console.log(`${t.feature_name}: ${t.duration_micros}us`)
  })
```

### Historical Candle Processing (training-pipeline)

```typescript
import { computeFeatures, initializeProcessor } from '@repo/compute-engine'

// Initialize with 26-period lookback for rolling indicators
initializeProcessor(26)

const candles = await questdb.query(`
  SELECT * FROM market_candles
  WHERE timestamp BETWEEN '2024-01-01' AND '2024-12-31'
  ORDER BY timestamp
`)

for (const candle of groupedByTimestamp(candles)) {
  const result = computeFeatures(candle)

  // All 117 features persisted per timestamp
  await questdb.insert('instrument_features_1m', {
    timestamp: candle.timestamp,
    ...result.features, // 117 fields
  })
}
```

---

## Adding a New Feature

### Step 1: Create Feature File

```rust
// src/features/<category>/my_new_feature.rs
use crate::features::{Feature, FeatureInput, ComputedDependencies};

pub struct MyNewFeature;

impl Feature for MyNewFeature {
    fn name(&self) -> &'static str {
        "my_new_feature"
    }

    fn compute(
        &self,
        input: &FeatureInput,
        deps: &ComputedDependencies,
    ) -> f64 {
        // Your calculation here.
        // Use deps for any shared indicator (EMA, ATR, VWAP, Greeks, etc.)
        // to avoid redundant computation.
        let value = input.nifty_future.ltp / deps.vwap_future;
        value * 100.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_my_new_feature() {
        let feature = MyNewFeature;
        let input = create_test_input();
        let deps = create_test_deps();

        let result = feature.compute(&input, &deps);
        assert!((result - 100.5).abs() < 0.01);
    }
}
```

### Step 2: Register Feature

```rust
// src/features/<category>/mod.rs
mod my_new_feature;
pub use my_new_feature::MyNewFeature;
```

```rust
// src/processor.rs
impl FeatureProcessor {
    pub fn new() -> Self {
        let mut features: Vec<Box<dyn Feature>> = Vec::new();

        // ... existing 117 features
        features.push(Box::new(MyNewFeature));

        Self { features }
    }
}
```

### Step 3: Update Output Type

```rust
// src/types.rs
#[napi(object)]
pub struct FeatureOutput {
    // ... existing 117 fields
    pub my_new_feature: f64,
}
```

### Step 4: Update Zod Schema

```typescript
// packages/schema/src/compute-engine/feature-output.schema.ts
export const FeatureOutputSchema = z.object({
  // ... existing 117 fields
  my_new_feature: z.number(),
})
```

After completing all four steps, run `cargo test && pnpm build` to verify.

---

## Testing Checklist

Every new or modified feature must satisfy the following before merge:

- [ ] Unit test with known-value assertion (manually computed expected output)
- [ ] Edge-case tests: zero volume, missing optional data, NaN/Inf inputs, extreme values
- [ ] Output range validation (bounded features must stay within documented bounds)
- [ ] Benchmark confirms < 100 us per feature on CI hardware
- [ ] Full 117-feature integration test passes (`cargo test --release`)
- [ ] TypeScript build succeeds (`pnpm build`) with no type errors
- [ ] Zod schema updated and validates all 117 output fields
- [ ] No regression in total compute time (p95 remains < 5 ms for all 117 features)

### Unit Test Template

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_input() -> FeatureInput {
        FeatureInput {
            timestamp: 1234567890,
            nifty_future: FutureTick {
                ltp: 19500.0,
                open: 19450.0,
                high: 19550.0,
                low: 19400.0,
                close: 19500.0,
                volume: 1000000.0,
                open_interest: 5000000.0,
                vwap: Some(19480.0),
            },
            constituents: vec![/* ... */],
            options: vec![/* ... */],
            india_vix: Some(15.5),
            global_indices: Some(create_test_global_indices()),
            order_book: Some(create_test_order_book()),
        }
    }

    fn create_test_deps() -> ComputedDependencies {
        ComputedDependencies {
            vwap_future: 19480.0,
            ema20_future: 19490.0,
            atr14: 85.0,
            rsi14: 55.0,
            // ... other shared deps
        }
    }

    #[test]
    fn test_feature_output_range() {
        let feature = MyFeature;
        let result = feature.compute(&create_test_input(), &create_test_deps());

        assert!(result >= 0.0 && result <= 1.0, "Output must be in [0, 1]");
    }

    #[test]
    fn test_feature_known_value() {
        let feature = MyFeature;
        let input = create_test_input();
        let deps = create_test_deps();

        // Test against manually calculated expected value
        let result = feature.compute(&input, &deps);
        assert!((result - 0.625).abs() < 0.01);
    }

    #[test]
    fn test_feature_edge_cases() {
        // Zero volume
        // Missing optional data (None fields)
        // Division-by-zero scenarios
        // Extreme values (very large / very small prices)
    }
}
```

---

## Performance Optimization Tips

### 1. Avoid Allocations in the Hot Path

```rust
// BAD: allocates a Vec on every call
fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let prices: Vec<f64> = input.constituents.iter().map(|c| c.ltp).collect();
    prices.iter().sum::<f64>() / prices.len() as f64
}

// GOOD: use iterators, zero allocation
fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let sum: f64 = input.constituents.iter().map(|c| c.ltp).sum();
    sum / input.constituents.len() as f64
}
```

### 2. Use Pre-computed Dependencies

```rust
// BAD: recomputes EMA from scratch on every tick
fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let ema = compute_ema(&historical_prices, 20);
    input.nifty_future.ltp / ema
}

// GOOD: use the EMA already computed in Phase 1
fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    input.nifty_future.ltp / deps.ema20_future
}
```

### 3. Minimize Branching

```rust
// BAD: nested conditionals
fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    if input.nifty_future.volume > 0.0 {
        if deps.vwap_future > 0.0 {
            input.nifty_future.ltp / deps.vwap_future
        } else {
            1.0
        }
    } else {
        0.0
    }
}

// GOOD: early returns, flat control flow
fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    if input.nifty_future.volume == 0.0 {
        return 0.0;
    }
    if deps.vwap_future == 0.0 {
        return 1.0;
    }
    input.nifty_future.ltp / deps.vwap_future
}
```

### 4. Prefer Fixed-Size Iteration

```rust
// When the number of constituents is known (e.g., Nifty 50),
// the compiler can auto-vectorize fixed-length loops.
// Avoid dynamic resizing or conditional pushes inside the hot path.
```

---

## Benchmarking

### Run All Benchmarks

```bash
cargo bench
```

### Run a Specific Benchmark

```bash
cargo bench --bench features -- my_new_feature
```

### Add a Feature Benchmark

```rust
// benches/features.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn benchmark_my_feature(c: &mut Criterion) {
    let feature = MyNewFeature;
    let input = create_bench_input();  // full 50-constituent, multi-strike input
    let deps = create_bench_deps();

    c.bench_function("my_new_feature", |b| {
        b.iter(|| feature.compute(black_box(&input), black_box(&deps)))
    });
}

fn benchmark_full_pipeline(c: &mut Criterion) {
    let processor = FeatureProcessor::new();
    let input = create_bench_input();

    c.bench_function("all_117_features", |b| {
        b.iter(|| processor.compute_all(black_box(&input)))
    });
}

criterion_group!(benches, benchmark_my_feature, benchmark_full_pipeline);
criterion_main!(benches);
```

**Targets**:

| Benchmark             | Threshold    |
| --------------------- | ------------ |
| Single feature        | < 100 us     |
| All 117 features      | < 5 ms (p95) |
| Dependency phase only | < 500 us     |

---

## Debugging

### Enable Rust Logs

```bash
RUST_LOG=debug cargo run
```

### Per-Feature Timing Output

```rust
// The processor automatically emits structured timing logs:
// {"level":"info","message":"feature_computed","feature":"pct_stocks_above_vwap","duration_micros":45}
// {"level":"info","message":"phase_complete","phase":"dependencies","duration_micros":320}
// {"level":"info","message":"phase_complete","phase":"all_117_features","duration_micros":3100}
```

### Validate Output Against Schema

```typescript
import { FeatureOutputSchema } from '@repo/schema/compute-engine'

const result = computeFeatures(input)

const parsed = FeatureOutputSchema.safeParse(result.features)
if (!parsed.success) {
  console.error('Schema validation failed:', parsed.error.issues)
  // Identify which of the 117 fields failed
  for (const issue of parsed.error.issues) {
    console.error(`  Field: ${issue.path.join('.')}, Error: ${issue.message}`)
  }
}
```

---

## Common Patterns

### Pattern 1: Count-Based Feature

```rust
// Example: pct_stocks_above_vwap (index_breadth category)
pub fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let total = input.constituents.len() as f64;
    if total == 0.0 {
        return 0.0;
    }
    let count = input.constituents.iter()
        .filter(|c| {
            deps.vwap_constituents
                .get(&c.symbol)
                .map_or(false, |vwap| c.ltp > *vwap)
        })
        .count() as f64;

    count / total
}
```

### Pattern 2: Ratio Feature

```rust
// Example: advance_decline_ratio (index_breadth category)
pub fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let advancing = input.constituents.iter().filter(|c| c.ltp > c.open).count() as f64;
    let declining = input.constituents.iter().filter(|c| c.ltp < c.open).count() as f64;

    if declining > 0.0 {
        advancing / declining
    } else {
        advancing // avoid division by zero
    }
}
```

### Pattern 3: Statistical Feature

```rust
// Example: breadth_volatility (volatility category)
pub fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let returns: &[f64] = &deps.returns_5m;
    if returns.is_empty() {
        return 0.0;
    }

    let mean = returns.iter().sum::<f64>() / returns.len() as f64;
    let variance = returns.iter()
        .map(|r| (r - mean).powi(2))
        .sum::<f64>() / returns.len() as f64;

    variance.sqrt()
}
```

### Pattern 4: Cached Historical Feature

```rust
// Example: atm_iv_change (options category)
pub fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let current_iv = input.options.first().map(|o| o.iv).unwrap_or(0.0);
    let prev_iv = deps.historical_atm_iv.get(1).copied().unwrap_or(current_iv);

    current_iv - prev_iv
}
```

### Pattern 5: Cross-Asset Feature

```rust
// Example: nifty_sp500_beta (cross_asset category)
pub fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    if deps.sp500_variance == 0.0 {
        return 0.0;
    }
    deps.nifty_sp500_covariance / deps.sp500_variance
}
```

### Pattern 6: Regime Classification Feature

```rust
// Example: regime_label (regime_context category)
pub fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    // Encode regime as numeric label:
    // 0 = range-bound, 1 = trending-up, 2 = trending-down, 3 = volatile
    if deps.atr14 > deps.atr_threshold_high {
        return 3.0;
    }
    if deps.ema20_future > deps.ema50_future {
        return 1.0;
    }
    if deps.ema20_future < deps.ema50_future {
        return 2.0;
    }
    0.0
}
```

---

## Troubleshooting

### Type mismatch between Rust and TypeScript

Regenerate the TypeScript bindings and rebuild:

```bash
cargo test --features ts-rs
pnpm run build
```

Verify that `src/types.rs` and the Zod schema in `packages/schema` both declare all 117 feature fields.

### Feature computation exceeds latency budget

Identify which of the 117 features are slow:

```typescript
const budget_us = 100
const slow = result.timings
  .filter((t) => t.duration_micros > budget_us)
  .sort((a, b) => b.duration_micros - a.duration_micros)

console.log(`${slow.length} of 117 features exceed ${budget_us}us budget:`)
slow.forEach((t) => {
  console.log(`  ${t.feature_name}: ${t.duration_micros}us`)
})
```

Common causes:

- Heap allocation inside `compute()` (use iterators instead of collecting to Vec)
- Recomputing a value that should be a shared dependency
- Branchy logic that defeats branch prediction

### NaN or Inf in output

Add defensive guards at the top of compute:

```rust
fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let denominator = deps.vwap_future;
    if denominator == 0.0 || !denominator.is_finite() {
        return 0.0; // or an appropriate sentinel
    }
    let result = input.nifty_future.ltp / denominator;
    if !result.is_finite() {
        return 0.0;
    }
    result
}
```

### Historical cache not populating

Ensure the processor is initialized with a sufficient lookback window and that `computeFeatures()` is called sequentially for historical backfill:

```typescript
// 26-period lookback covers EMA-26, RSI-14, ATR-14, Bollinger-20, etc.
initializeProcessor(26)

for (const tick of ticks) {
  computeFeatures(tick) // internal ring buffer updated on each call
}
```

### Rayon thread pool contention

If running multiple processors concurrently (e.g., in tests), configure the thread pool explicitly:

```rust
rayon::ThreadPoolBuilder::new()
    .num_threads(num_cpus::get())
    .build_global()
    .unwrap();
```

### Build failure after adding a new feature

Verify all four registration steps are complete:

1. Feature struct implements `Feature` trait (`src/features/<category>/my_feature.rs`)
2. Module re-exported in `src/features/<category>/mod.rs`
3. Field added to `FeatureOutput` in `src/types.rs`
4. Field added to `FeatureOutputSchema` in `packages/schema`

---

## Dependencies Summary

### Rust Crates

| Crate                  | Purpose                            |
| ---------------------- | ---------------------------------- |
| `napi` / `napi-derive` | NAPI-RS bindings to TypeScript     |
| `rayon`                | Data-parallel execution (Phase 2)  |
| `chrono`               | Date/time handling, session timing |
| `serde` / `serde_json` | Serialization for logging/debug    |
| `thiserror`            | Ergonomic error types              |
| `statrs`               | Statistical distributions, Greeks  |
| `criterion`            | Micro-benchmarking framework       |
| `num_cpus`             | Thread pool sizing                 |

### TypeScript Packages

| Package          | Purpose                                 |
| ---------------- | --------------------------------------- |
| `zod`            | Runtime schema validation               |
| `@repo/schema`   | Shared Zod schemas (117 feature fields) |
| `@repo/database` | QuestDB client (training pipeline)      |

---

## Best Practices

1. **Always add unit tests** for new features -- at minimum, a known-value test and an edge-case test
2. **Use pre-computed dependencies** to guarantee zero redundant work across 117 features
3. **Handle every edge case** -- zero volume, missing optional data, NaN, Inf, division by zero
4. **Benchmark before merging** -- confirm < 100 us per feature and < 5 ms total (p95)
5. **Document the formula** in rustdoc comments on each feature struct
6. **Validate with Zod** -- every consumer should parse `FeatureOutputSchema` before trusting values
7. **Monitor timing telemetry** -- alert if any feature regresses beyond its latency budget
8. **Keep features pure** -- no I/O, no logging, no side effects inside `compute()`

---

## Reference Links

- Architecture deep-dive: `PARALLEL_FEATURE_ARCHITECTURE.md`
- Implementation roadmap: `IMPLEMENTATION_ROADMAP.md`
- Generated Rust docs: `cargo doc --no-deps --open`
- Feature catalog (all 117): `src/features/` directory, organized by category
