# Compute Engine Package Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `packages/compute-engine` (`@repo/compute-engine`)

## Overview

Rust NAPI-RS v3 native addon for high-performance feature computation, replacing the deprecated `data-processor` service.

## Key Changes

- NAPI-RS v3 with WebAssembly fallback support
- 117 technical indicators computed in Rust
- 10-50x faster than equivalent TypeScript
- Thread-safe: can run in Node.js worker threads
- Configurable feature sets via MongoDB `feature_configs`

## Migration Steps

1. Install Rust toolchain (if building from source)
2. Run `pnpm build` in `packages/compute-engine`
3. Verify prebuilt binaries for target platform
4. Add `@repo/compute-engine` to consuming services
5. Replace any `data-processor` RPC calls with direct function calls
6. Benchmark feature computation latency
7. Run tests: `pnpm test`
