# Compute Engine - High Performance Trading Math

> **Rust-based computational engine for latency-sensitive financial calculations.**

Handles technical indicators, option Greeks, and complex mathematical modeling with zero-cost abstractions.

## Overview

The **Compute Engine** is the specialized component responsible for heavy lifting in the `cortex` layer of the algorithmic trading system. It is designed to offload CPU-intensive tasks from the Node.js `algo-worker`.

**Key Responsibilities**:
- **Technical Indicators**: RSI, MACD, Bollinger Bands, ATR, Supertrend (vectorized)
- **Volatility Surface**: SVI parameterization and interpolation for smile/skew modeling
- **Theoretical Pricing**: BSM model for "Fair Value" estimation and arbitrage detection
- **Signal Processing**: Fast Fourier Transform (FFT), Wavelet transforms (future)

*Note: Real-time Delta/Gamma/Vega are ingested directly from Upstox V3. This engine handles derived metrics and theoretical models.*

## Features

- ⚡ **Zero-Cost Abstractions**: Rust performance with high-level safety.
- 🛡️ **Memory Safety**: No garbage collection pauses (critical for HFT).
- 🚀 **NAPI-RS Ready**: Structured to be exposed as a native Node.js addon.
- 🧵 **Fearless Concurrency**: Parallel processing of market data streams.

## Project Structure

```
apps/compute-engine/
├── src/
│   └── main.rs          # Entry point (standalone mode)
│   └── lib.rs           # Library exports (for NAPI)
├── docs/                # Mathematical documentation
├── Cargo.toml           # Dependencies
└── package.json         # Turborepo integration
```

## Getting Started

### Prerequisites

- Rust (latest stable)
- Cargo

### Commands

```bash
# Build release binary
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format

# Run development mode
pnpm dev
```

## Integration

Used by `apps/algo-worker` in the **Cortex Layer** (`RustComputeEngine`).

**Communication Patterns**:
1. **Standalone**: Runs as a sidecar process, communicating via Redis Streams / gRPC.
2. **Embedded**: Compiled as a Node.js addon (NAPI-RS) and loaded directly into `algo-worker` process (Recommended for lowest latency).

## License

Part of the investment-trading-portfolio monorepo.