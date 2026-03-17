# Migration Guides

> **Last Updated**: March 17, 2026

Comprehensive migration guides for upgrading each component of the Quantum Investments monorepo to the latest production-grade architecture (March 2026).

## Architecture Summary

- **Framework**: Next.js 16 (Turbopack default) + NestJS 11 + Kedro (Python)
- **Auth**: Better Auth (self-hosted, multi-tenant, 2FA, passkeys)
- **API**: tRPC v11 with NestJS decorators and Rust-powered type generation
- **Compute**: Rust NAPI-RS v3 (WebAssembly support)
- **ML**: ONNX Runtime 1.24+ with worker thread support
- **Databases**: QuestDB (time-series), MongoDB 8.0 (documents), Redis 7+ (hot state)
- **Observability**: OpenTelemetry + Grafana LGTM (Loki, Grafana, Tempo, Mimir)
- **Compliance**: SEBI 2025-2026 retail algo trading (April 1, 2026 deadline)

## Guides by Category

### Apps
- [Web Dashboard](apps/web.md) -- Next.js 16 with Turbopack, Better Auth client, tRPC v11
- [API Gateway](apps/api.md) -- NestJS 11, Better Auth server, tRPC decorators
- [Algo Worker](apps/algo-worker.md) -- 5-tier inference, ONNX Runtime, Redis Streams

### Services
- [Market Feeder](services/market-feeder.md) -- Instrument sync, WebSocket, feature computation
- [Data Processor](services/data-processor.md) -- DEPRECATED, migrate to compute-engine
- [Training Pipeline](services/training-pipeline.md) -- Kedro, CPCV, ONNX export
- [Document Processor](services/document-processor.md) -- LayoutLMv3, OCR
- [Wealth Management](services/wealth-management.md) -- Double-entry ledger
- [Wealth Analyzer](services/wealth-analyzer.md) -- AI analytics
- [Notification Service](services/notification-service.md) -- Multi-channel alerts

### Packages
- [Authentication](packages/authentication.md) -- Better Auth NestJS integration
- [Auth Client](packages/auth-client.md) -- Better Auth React client
- [Compute Engine](packages/compute-engine.md) -- Rust NAPI-RS v3
- [Database](packages/database.md) -- MongoDB 8.0, QuestDB, Redis
- [Market SDK](packages/market-sdk.md) -- Upstox v3 API, WebSocket
- [Schema](packages/schema.md) -- Zod 4, protobuf, SQL
- [tRPC](packages/trpc.md) -- tRPC v11 with TanStack Query
- [Observability](packages/observability.md) -- OpenTelemetry instrumentation
- [ESLint Config](packages/eslint-config.md) -- Shared linting rules
- [Jest Config](packages/jest-config.md) -- Shared test configuration
- [TypeScript Config](packages/typescript-config.md) -- Shared TS settings

### Infrastructure
- [Docker](infrastructure/docker.md) -- Docker Compose, Dockerfiles
- [Observability Stack](infrastructure/observability-stack.md) -- LGTM deployment

## Common Migration Steps

1. Update Node.js to >=20.9 (Next.js 16 requirement)
2. Update pnpm to 10.32+
3. Run `pnpm install` to refresh lockfile
4. Run `pnpm build` to verify all packages compile
5. Run `pnpm test` to verify no regressions

## Breaking Changes Summary

| Component | Breaking Change | Migration Action |
|-----------|----------------|------------------|
| Next.js 16 | Turbopack default, no Node.js 18 | Update Node.js to >=20.9 |
| Better Auth | Replaces Passport.js/JWT | Use `@repo/authentication` package |
| tRPC v11 | New `useTRPC()` hook, `queryOptions()` | Update client hooks |
| Zod 4 | Schema API changes | Update schema definitions |
| data-processor | DEPRECATED | Use compute-engine in market-feeder |
| ESLint config | Export names `nest-js`/`next-js` | Update import paths |
