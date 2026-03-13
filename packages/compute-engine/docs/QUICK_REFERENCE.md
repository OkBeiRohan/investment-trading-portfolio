# Parallel Feature Computation - Quick Reference

## 🎯 TL;DR

**Problem**: Need to compute 117 features from live/historical data with:

- ✅ Parallel execution (minimize latency)
- ✅ Zero redundant calculations
- ✅ End-to-end type safety
- ✅ Per-feature timing logs
- ✅ Modular design (easy to add features)

**Solution**: Rust-based parallel processor with:

1. **Phase 1**: Compute shared dependencies (sequential)
2. **Phase 2**: Compute all features in parallel (Rayon)
3. Export via NAPI-RS to TypeScript

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    TypeScript Layer                         │
│  market-feeder / training-pipeline                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │ computeFeatures(input: FeatureInput)                │    │
│  │   → ComputeResult { features, timings }            │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ↓ NAPI-RS
┌─────────────────────────────────────────────────────────────┐
│                      Rust Layer                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ FeatureProcessor                                     │  │
│  │   Phase 1: compute_dependencies() [Sequential]      │  │
│  │     - VWAP, EMA, ATR, RSI, Greeks                   │  │
│  │   Phase 2: compute_all() [Parallel via Rayon]       │  │
│  │     - 117 features execute simultaneously            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Features (33 files)                                  │  │
│  │  index_breadth/  (6)                                 │  │
│  │  nifty_future/   (9)                                 │  │
│  │  options/        (11)                                │  │
│  │  volatility/     (4)                                 │  │
│  │  time_context/   (3)                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Usage Examples

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
    // ... 49 more stocks
  ],
  options: [
    { strike: 19500, option_type: 'CE', ltp: 100, iv: 0.15, delta: 0.5 /* ... */ },
    // ... more options
  ],
  india_vix: 15.5,
})

console.log(result.features.pct_stocks_above_vwap) // 0.62
console.log(result.features.fut_macd) // 12.5
console.log(result.total_duration_micros) // 3500 (3.5ms)

// Log slowest features
result.timings
  .sort((a, b) => b.duration_micros - a.duration_micros)
  .slice(0, 5)
  .forEach((t) => {
    console.log(`${t.feature_name}: ${t.duration_micros / 1000}ms`)
  })
```

### Historical Candle Processing (training-pipeline)

```typescript
import { computeFeatures, initializeProcessor } from '@repo/compute-engine'

// Initialize with 26-period lookback
initializeProcessor(26)

const candles = await questdb.query(`
  SELECT * FROM market_candles
  WHERE timestamp BETWEEN '2024-01-01' AND '2024-12-31'
  ORDER BY timestamp
`)

for (const candle of groupedByTimestamp(candles)) {
  const result = computeFeatures(candle)

  // Store features
  await questdb.insert('instrument_features_1m', {
    timestamp: candle.timestamp,
    ...result.features,
  })
}
```

---

## 🏗️ Adding a New Feature

### Step 1: Create Feature File

```rust
// src/features/my_category/my_new_feature.rs
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
        // Your calculation here
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
// src/features/my_category/mod.rs
mod my_new_feature;
pub use my_new_feature::MyNewFeature;
```

```rust
// src/processor.rs
impl FeatureProcessor {
    pub fn new() -> Self {
        let mut features: Vec<Box<dyn Feature>> = Vec::new();

        // ... existing features
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
    // ... existing fields
    pub my_new_feature: f64,
}
```

### Step 4: Update Zod Schema

```typescript
// packages/schema/src/compute-engine/feature-output.schema.ts
export const FeatureOutputSchema = z.object({
  // ... existing fields
  my_new_feature: z.number(),
})
```

**Done!** Run `cargo test` and `pnpm build`.

---

## 🧪 Testing Checklist

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
        }
    }

    fn create_test_deps() -> ComputedDependencies {
        ComputedDependencies {
            vwap_future: 19480.0,
            // ... other deps
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
        // Test against manually calculated value
        let result = feature.compute(&input, &deps);
        assert!((result - 0.625).abs() < 0.01);
    }

    #[test]
    fn test_feature_edge_cases() {
        // Test zero volume
        // Test missing data
        // Test extreme values
    }
}
```

---

## ⚡ Performance Optimization Tips

### 1. Avoid Allocations in Hot Path

```rust
// ❌ BAD: Allocates vector every call
fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let prices: Vec<f64> = input.constituents.iter().map(|c| c.ltp).collect();
    prices.iter().sum::<f64>() / prices.len() as f64
}

// ✅ GOOD: Use iterator
fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let sum: f64 = input.constituents.iter().map(|c| c.ltp).sum();
    sum / input.constituents.len() as f64
}
```

### 2. Use Pre-computed Dependencies

```rust
// ❌ BAD: Re-compute EMA every time
fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let ema = compute_ema(&historical_prices, 20);
    input.nifty_future.ltp / ema
}

// ✅ GOOD: Use cached EMA from deps
fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    input.nifty_future.ltp / deps.ema20_future
}
```

### 3. Minimize Branching

```rust
// ❌ BAD: Multiple branches
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

// ✅ GOOD: Early return
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

---

## 📈 Benchmarking

### Run Benchmarks

```bash
cargo bench
```

### Add Feature Benchmark

```rust
// benches/features.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn benchmark_my_feature(c: &mut Criterion) {
    let feature = MyNewFeature;
    let input = create_test_input();
    let deps = create_test_deps();

    c.bench_function("my_new_feature", |b| {
        b.iter(|| feature.compute(black_box(&input), black_box(&deps)))
    });
}

criterion_group!(benches, benchmark_my_feature);
criterion_main!(benches);
```

**Target**: <100µs per feature

---

## 🔍 Debugging

### Enable Rust Logs

```bash
RUST_LOG=debug cargo run
```

### Print Timings

```rust
// Processor automatically logs all timings
// Check output:
// {"level":"info","message":"feature_computed","feature":"pct_stocks_above_vwap","duration_micros":45}
```

### Validate Output

```typescript
import { FeatureOutputSchema } from '@repo/schema/compute-engine'

const result = computeFeatures(input)

try {
  FeatureOutputSchema.parse(result.features)
  console.log('✅ Valid output')
} catch (error) {
  console.error('❌ Invalid output:', error)
}
```

---

## 📚 Common Patterns

### Pattern 1: Count-Based Feature

```rust
// Example: pct_stocks_above_vwap
pub fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let total = input.constituents.len() as f64;
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
// Example: advance_decline_ratio
pub fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let advancing = input.constituents.iter().filter(|c| c.ltp > c.open).count() as f64;
    let declining = input.constituents.iter().filter(|c| c.ltp < c.open).count() as f64;

    if declining > 0.0 {
        advancing / declining
    } else {
        advancing // Avoid division by zero
    }
}
```

### Pattern 3: Statistical Feature

```rust
// Example: breadth_volatility
pub fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let returns: Vec<f64> = deps.returns_5m.clone();

    let mean = returns.iter().sum::<f64>() / returns.len() as f64;
    let variance = returns.iter()
        .map(|r| (r - mean).powi(2))
        .sum::<f64>() / returns.len() as f64;

    variance.sqrt() // Standard deviation
}
```

### Pattern 4: Cached Historical Feature

```rust
// Example: atm_iv_change
pub fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let current_iv = input.options.first().map(|o| o.iv).unwrap_or(0.0);
    let prev_iv = deps.historical_atm_iv.get(1).copied().unwrap_or(current_iv);

    current_iv - prev_iv
}
```

---

## 🛠️ Troubleshooting

### Issue: "Type mismatch between Rust and TypeScript"

**Solution**: Regenerate types

```bash
cargo test --features ts-rs
pnpm run build
```

### Issue: "Feature computation takes too long"

**Solution**: Check which feature is slow

```typescript
const slowFeatures = result.timings.filter((t) => t.duration_micros > 500).map((t) => t.feature_name)

console.log('Slow features:', slowFeatures)
```

### Issue: "NaN in output"

**Solution**: Add defensive checks

```rust
fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> f64 {
    let denominator = deps.vwap_future;
    if denominator == 0.0 || !denominator.is_finite() {
        return 0.0; // Or appropriate default
    }
    input.nifty_future.ltp / denominator
}
```

### Issue: "Historical cache not working"

**Solution**: Ensure `update()` is called

```typescript
initializeProcessor(26)

for (const tick of ticks) {
  computeFeatures(tick) // Cache is updated internally
}
```

---

## 📦 Dependencies Summary

### Rust

- `napi` / `napi-derive`: TypeScript bindings
- `rayon`: Parallel execution
- `chrono`: Date/time handling
- `serde` / `serde_json`: Serialization
- `thiserror`: Error handling
- `black76` or `statrs`: Option Greeks

### TypeScript

- `zod`: Schema validation
- `@repo/schema`: Shared types
- `@repo/database`: QuestDB client (for training)

---

## 🎓 Best Practices

1. **Always add unit tests** for new features
2. **Use pre-computed dependencies** to avoid redundancy
3. **Handle edge cases** (zero volume, missing data, NaN)
4. **Benchmark** new features to ensure <100µs target
5. **Document** feature equations in rustdoc comments
6. **Validate** output with Zod schemas
7. **Log** timing data for performance monitoring

---

## 📞 Support

- **Architecture**: See `PARALLEL_FEATURE_ARCHITECTURE.md`
- **Implementation**: See `IMPLEMENTATION_ROADMAP.md`
- **Rust Docs**: Run `cargo doc --no-deps --open`
- **Issues**: Check GitHub Issues or ask in team chat
