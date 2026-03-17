# tRPC Package Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `packages/trpc` (`@repo/trpc`)

## Overview

Shared tRPC v11 configuration with TanStack Query integration for type-safe API communication.

## Key Changes

- tRPC upgraded from v10 to v11
- New `useTRPC()` hook replaces `trpc.useQuery()`
- `queryOptions()` for SSR-compatible queries
- Server-side `prefetch()` + `HydrateClient` pattern for RSC
- NestJS integration via `nestjs-trpc-v2` decorators
- Rust-powered type generation (10-50x faster builds)

## Migration Steps

1. Update `@trpc/server`, `@trpc/client`, `@trpc/react-query` to v11
2. Update `@tanstack/react-query` to v5.75+
3. Replace `trpc.useQuery()` with `useTRPC().queryOptions()`
4. Update server-side prefetching to use new RSC pattern
5. Verify NestJS tRPC router decorators compile
6. Test all tRPC endpoints end-to-end
7. Run type-check and tests: `pnpm tsc --noEmit && pnpm test`
