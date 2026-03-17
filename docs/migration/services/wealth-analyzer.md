# Wealth Analyzer Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `services/wealth-analyzer`  
> **Status**: Scaffolded

## Overview

AI-powered analytics service providing portfolio insights, risk analysis, tax optimization suggestions, and performance attribution.

## Key Dependencies

- NestJS 11
- `@repo/compute-engine` (Rust NAPI-RS) for numerical computation
- MongoDB 8.0 for analysis results
- ONNX Runtime for ML-based predictions
- Redis for caching analysis results

## Key Changes

- Heavy computation offloaded to `@repo/compute-engine` (Rust)
- Auth migrated from JWT to Better Auth
- Analysis results cached in Redis with TTL
- New risk metrics: VaR, CVaR, Sharpe, Sortino, Max Drawdown

## Migration Steps

1. Update NestJS to v11
2. Add `@repo/compute-engine` as dependency
3. Replace JWT auth with Better Auth guards
4. Migrate numerical computations from JS to Rust bindings
5. Configure Redis cache TTLs for analysis endpoints
6. Verify analysis accuracy against reference data
7. Run test suite: `pnpm test`
