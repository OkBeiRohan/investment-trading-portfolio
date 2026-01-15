---
applyTo: "packages/compute-engine/**"
---

# GitHub Copilot Instructions - Compute Engine

## Role & Context

You are working on the **Compute Engine** - the high-performance parallel feature computation system written in Rust.

## Application Overview

**Purpose**: High-performance feature computation for algo-worker Cortex layer  
**Stack**: Rust, Cargo, Rayon (parallelism), NAPI-RS (Node.js FFI), Serde (JSON serialization)

**Responsibilities**:

- Parallel computation of 33 market features (<5ms target)
- Shared dependency calculation (VWAP, EMA, ATR, RSI, Greeks, volatility)
- Historical data caching with rolling windows
- Type-safe Rust ↔ TypeScript integration via JSON

**Current Status** (Phase 3 Complete):

- ✅ 33/33 features implemented (27 fully functional, 6 placeholders)
- ✅ 28/28 tests passing
- ✅ Type definitions with JSON serialization
- ✅ Historical cache with RollingWindow<T>
- ✅ 18 dependency calculation functions
- ⏳ Phase 4: Parallel execution with Rayon (NEXT)

## Architecture Overview

### File Structure

```
src/
├── lib.rs                    # NAPI entry point (JSON in/out)
├── types.rs                  # Type definitions (JSON serialization, NOT #[napi(object)])
├── cache/
│   ├── mod.rs                # HistoricalCache for NIFTY + constituents
│   └── rolling_window.rs     # Generic RollingWindow<T>
├── dependencies/
│   └── mod.rs                # 18 shared dependency calculations
├── features/
│   ├── mod.rs                # Feature trait + ComputedDependencies
│   ├── index_breadth.rs      # 6 features (single file)
│   ├── nifty_future.rs       # 9 features (single file)
│   ├── options.rs            # 11 features (single file)
│   ├── volatility.rs         # 4 features (single file)
│   └── time_context.rs       # 3 features (single file)
```

**Note**: Features are organized in single files per category (not individual files per feature). This is the pragmatic approach for 33 features.

### Two-Phase Execution Model

**Phase 1: Shared Dependencies** (Sequential, ~2ms)

- VWAP calculation from historical cache
- EMA(20), ATR(14), RSI(14) computation
- Option Greeks aggregation
- Realized volatility (5m, 15m)

**Phase 2: Feature Computation** (Parallel via Rayon, ~150µs)

- All 33 features execute in parallel
- Each feature receives input + ComputedDependencies
- Returns f64 scalar value

### Critical Design Decisions

1. **JSON Serialization** (NOT NAPI Objects)
   - Reason: NAPI has 32-field limit, FeatureOutput has 34 fields
   - Solution: `FeatureInput::from_json()` and `ComputeResult::to_json()`
   - Dependencies: `serde`, `serde_json`

2. **VWAP is COMPUTED** (NOT provided as input)
   - Source: Historical price/volume data in cache
   - Calculation: `Σ(price × volume) / Σ(volume)`
   - NEVER add `vwap` field to FutureTick or ConstituentTick

3. **Feature Trait Pattern**

   ```rust
   pub trait Feature: Send + Sync {
       fn name(&self) -> &'static str;
       fn category(&self) -> &'static str;
       fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue;
   }
   ```

4. **Historical Cache**
   - Fixed-size RollingWindow<T> (26 periods max)
   - O(1) access via `last_n(n)` method
   - Separate caches for NIFTY future and 50 constituents

## Architecture Rules

### 1. Performance is Paramount

- **Zero Allocations in Hot Path**: Use iterator chains, avoid `.collect()` in features
- **Use Pre-computed Dependencies**: Never recalculate VWAP/EMA/ATR in features
- **Minimize Branching**: Use early returns, avoid nested if/else
- **Target Latency**: <5ms total (2ms deps + 150µs features + 300µs overhead)

**Example - Good Pattern**:

```rust
fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    if input.constituents.is_empty() {
        return FeatureValue::Scalar(0.0);
    }

    let count = input.constituents.iter()
        .zip(&deps.constituent_vwaps)
        .filter(|(c, &vwap)| c.ltp > vwap)
        .count();

    FeatureValue::Scalar(count as f64 / input.constituents.len() as f64)
}
```

**Example - Bad Pattern**:

```rust
fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    // ❌ Unnecessary allocation
    let vwaps: Vec<f64> = deps.constituent_vwaps.clone();

    // ❌ Recalculating shared dependency
    let ema = compute_ema(&prices, 20); // Should use deps.nifty_future_ema20

    // ...
}
```

### 2. Safety First

- Avoid `unsafe` blocks (only for NAPI FFI if needed)
- Handle all `Result` and `Option` explicitly
- Use `unwrap()` ONLY in tests
- Validate input data (check for NaN, infinity, division by zero)

### 3. Error Handling

Use `thiserror` for domain errors, return sensible defaults:

```rust
// Handle edge cases gracefully
fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    let denominator = input.nifty_future.high - input.nifty_future.low;

    if denominator == 0.0 || !denominator.is_finite() {
        return FeatureValue::Scalar(0.0); // Sensible default
    }

    FeatureValue::Scalar((input.nifty_future.close - input.nifty_future.low) / denominator)
}
```

## Coding Standards

### 1. Feature Implementation

Each feature MUST:

- Implement the `Feature` trait
- Have a unit test in `#[cfg(test)]` module
- Handle edge cases (empty data, zero denominators, NaN)
- Use pre-computed dependencies when available
- Return `FeatureValue::Scalar(f64)` or `FeatureValue::Integer(i32)`

**Template**:

```rust
pub struct MyFeature;

impl Feature for MyFeature {
    fn name(&self) -> &'static str {
        "my_feature"
    }

    fn category(&self) -> &'static str {
        "my_category"
    }

    fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
        // Implementation with edge case handling
        FeatureValue::Scalar(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_my_feature() {
        let input = create_test_input();
        let deps = ComputedDependencies::default();
        let feature = MyFeature;

        let result = feature.compute(&input, &deps);

        if let FeatureValue::Scalar(val) = result {
            assert!(val.is_finite());
            // Add specific assertions
        }
    }
}
```

### 2. Testing Requirements

- **Unit Tests**: Every feature must have at least 1 test
- **Edge Cases**: Test with empty data, zero values, NaN
- **Accuracy**: For mathematical functions, test against known values
- **Performance**: Use `#[bench]` for critical paths (future)

### 3. Formatting & Linting

- Run `cargo fmt` before committing
- Run `cargo clippy` and address all warnings
- Follow Rust style guide (RFC 1607)
- Use 2-space indentation (matches existing codebase)

### 4. Dependencies

**Current Dependencies**:

- `serde = { version = "1", features = ["derive"] }`
- `serde_json = "1.0.149"`
- `rayon = "1.8"` (for Phase 4 parallelism)
- `chrono = { version = "0.4", features = ["serde"] }`

**DO NOT add**:

- `napi-derive` decorators on types (causes field limit issues)
- Heavy dependencies like `ndarray` (overkill for current use case)

## Phase 4 TODO (Next Steps)

### 1. Create Feature Processor

Create `src/processor.rs`:

```rust
use rayon::prelude::*;

pub struct FeatureProcessor {
    features: Vec<Box<dyn Feature>>,
}

impl FeatureProcessor {
    pub fn new() -> Self {
        // Register all 33 features
    }

    pub fn compute_all(&self, input: &FeatureInput, cache: &HistoricalCache) -> ComputeResult {
        // Phase 1: Compute dependencies (sequential)
        let deps = compute_all_dependencies(input, cache);

        // Phase 2: Compute features (parallel)
        let features: Vec<_> = self.features
            .par_iter()
            .map(|f| (f.name(), f.compute(input, &deps)))
            .collect();

        // Build FeatureOutput and ComputeResult
    }
}
```

### 2. Update NAPI Entry Point

Update `src/lib.rs`:

```rust
#[napi]
pub fn compute_features(input_json: String) -> napi::Result<String> {
    let input = FeatureInput::from_json(&input_json)
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    // Use global processor + cache
    let result = PROCESSOR.compute_all(&input, &CACHE);

    result.to_json()
        .map_err(|e| napi::Error::from_reason(e.to_string()))
}
```

### 3. Cache Enhancements (for placeholders)

Add to `cache/mod.rs`:

```rust
impl HistoricalCache {
    pub fn get_nifty_future_price_n_ago(&self, n: usize) -> Option<f64>
    pub fn get_nifty_future_oi_n_ago(&self, n: usize) -> Option<f64>
    pub fn get_nifty_future_volume_stats(&self) -> (f64, f64) // (mean, std)
}
```

### 4. Dependency Enhancements

Add to `dependencies/mod.rs`:

```rust
pub fn compute_nifty_future_ema12(cache: &HistoricalCache) -> f64
pub fn compute_nifty_future_ema26(cache: &HistoricalCache) -> f64
```

Update `ComputedDependencies` in `features/mod.rs`:

```rust
pub struct ComputedDependencies {
    // ...existing fields
    pub nifty_future_ema12: f64,  // For MACD
    pub nifty_future_ema26: f64,  // For MACD
}
```

## Common Pitfalls

1. **❌ Adding vwap to input types**
   - VWAP is computed, not provided
2. **❌ Using #[napi(object)] decorators**
   - Causes 32-field limit errors
   - Use JSON serialization instead

3. **❌ Allocating in hot path**
   - Use iterators, not .collect()
4. **❌ Ignoring edge cases**
   - Always check for zero denominators, NaN, empty arrays

5. **❌ Not using dependencies**
   - Use `deps.nifty_future_vwap` instead of recalculating

## Documentation

- Use rustdoc (`///`) for all public APIs
- Document algorithms with references: `/// Implements RSI-14 (Wilder, 1978)`
- Include examples in doc comments for complex functions
- Keep inline comments minimal and meaningful

## Turborepo Integration

- `pnpm build` → `cargo build --release` (builds NAPI module)
- `pnpm test` → `cargo test`
- `pnpm lint` → `cargo clippy`

**Build Output**: `index.node` (NAPI module for Node.js)

---

**Last Updated**: January 15, 2026 (Phase 3 Complete)  
**Next Milestone**: Phase 4 - Parallel Execution System
