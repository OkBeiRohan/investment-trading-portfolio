# Performance Benchmarks & Targets

> **Performance goals, optimization strategies, and benchmarking methodology.**

The Compute Engine exists because JavaScript is insufficient for heavy numerical computing at HFT latencies. This document defines the standards for success.

---

## 1. Performance Targets

| Metric | Target | Context |
|--------|--------|---------|
| **Cold Start** | < 50ms | Module load time |
| **Single Call Overhead** | < 10μs | NAPI-RS boundary crossing |
| **Indicator Batch** | < 100μs | RSI + MACD + BB for 1000 candles |
| **Option Chain Greeks** | < 1ms | Full chain (100 strikes) Delta/Gamma/Vega |
| **IV Calculation** | < 5μs | Single option implied volatility |

---

## 2. Optimization Strategies

### Zero-Copy Data Transfer
- **Problem**: Copying large arrays from V8 heap to Rust heap is expensive.
- **Solution**: Pass `TypedArray` (e.g., `Float64Array`) references. Rust accesses the underlying buffer directly using `unsafe` (checked) pointers.
- **Impact**: Removes O(N) copy cost. Complexity becomes O(1).

### SIMD (Single Instruction, Multiple Data)
- **Tooling**: Explicit usage of `std::simd` (portable SIMD) or `packed_simd`.
- **Application**:
  - Vectorized arithmetic for indicators (e.g., adding arrays).
  - Parallel evaluation of BSM formulas (computing d1/d2 for 4 or 8 options at once).
- **Target**: AVX2 (x86_64) and NEON (ARM64).

### Memoization
- **Context**: Volatility surfaces and risk-free rates change slowly compared to price.
- **Strategy**: Cache intermediate calculations (like $\sqrt{T}$ or $e^{-rT}$) that remain constant across the option chain for the same expiry.

### Branch Prediction Optimization
- **Code Structure**: Avoid branching in hot loops. Sort option chains to process similar moneyness together.
- **Hints**: Use `#[inline(always)]` for small math kernels to allow LLVM to unroll loops effectively.

---

## 3. Benchmarking Methodology

We use **Criterion.rs** for statistically significant benchmarking.

### Setup
Benchmarks are located in `benches/`.

```rust
// Example benchmark code
pub fn benchmark_greeks(c: &mut Criterion) {
    let strikes = vec![...]; // 100 strikes
    let spot = 18000.0;
    
    c.bench_function("calc_chain_greeks", |b| {
        b.iter(|| black_scholes_batch(black_box(&strikes), black_box(spot), ...))
    });
}
```

### Regression Testing
- CI/CD pipeline runs benchmarks on every PR.
- Fails if performance degrades by > 5%.

### Profiling
- **Tools**: `perf` (Linux), `Instruments` (Linux), `VTune` (macOS).
- **Flamegraphs**: Generated to identify CPU hotspots.

---

## 4. Current Baselines (Estimated)

*To be populated with actual run data.*

| Operation | Implementation | Est. Time (1000 items) |
|-----------|----------------|------------------------|
| SMA       | Naive Loop     | 15μs                   |
| SMA       | SIMD           | 2μs                    |
| Greeks    | Sequential     | 1.5ms                  |
| Greeks    | Rayon (Parallel)| 0.2ms                  |
