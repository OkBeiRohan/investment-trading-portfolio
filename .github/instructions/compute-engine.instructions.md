---
applyTo: "apps/compute-engine/**"
---

# GitHub Copilot Instructions - Compute Engine

## Role & Context

You are working on the **Compute Engine** - the high-performance math kernel of the trading system written in Rust.

## Application Overview

**Purpose**: Heavy computational tasks for `algo-worker` Cortex layer
**Stack**: Rust, Cargo, Tokio, NAPI-RS (future)

**Responsibilities**:

- Vectorized technical indicator calculation
- Option Greeks and IV derivation
- Volatility surface modeling
- Low-latency signal processing

## Architecture Rules

### 1. Performance is Paramount

- **Minimize Allocations**: Use `ndarray` views or slice references where possible.
- **Vectorization**: Use SIMD-friendly patterns (e.g., `simd_json`, `ndarray`).
- **Zero-Copy**: When designing APIs, aim for zero-copy data transfer.

### 2. Safety First

**ALWAYS prioritize Rust's safety guarantees.**

- Avoid `unsafe` blocks unless for FFI or critical hot paths (documented).
- Handle all `Result` and `Option` types explicitly.
- Use `unwrap()` ONLY in tests.

### 3. Error Handling

**Use `thiserror` for library errors and `anyhow` for application errors.**

```rust
// Library code
#[derive(thiserror::Error, Debug)]
pub enum MathError {
    #[error("Division by zero")]
    DivisionByZero,
}

// App code
use anyhow::{Context, Result};
```

## Coding Standards

### 1. formatting

- Run `cargo fmt` before committing.
- Follow standard Rust style guide (RFC 1607).

### 2. Linting

- Use `cargo clippy` to catch common mistakes.
- Address all warnings.

### 3. Testing

- **Unit Tests**: Test mathematical correctness exhaustively.
- **Benchmarks**: Use `criterion` for performance regression testing.

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rsi_calculation() {
        let prices = vec![...];
        let rsi = calculate_rsi(&prices, 14).unwrap();
        assert!((rsi - 55.0).abs() < 0.01);
    }
}
```

## Turborepo Integration

This project interacts with the monorepo via `package.json` scripts.

- `pnpm build` -> `cargo build --release`
- `pnpm test` -> `cargo test`
- `pnpm lint` -> `cargo clippy`

## Documentation

- Document complex algorithms with references to papers/sources.
- Use rustdoc (`///`) for all public APIs.