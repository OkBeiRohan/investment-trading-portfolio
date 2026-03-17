# Schema Package Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `packages/schema` (`@repo/schema`)

## Overview

Shared schema definitions using Zod 4, protobuf, and SQL DDL for cross-service type safety.

## Key Changes

- Zod upgraded to v4 (breaking API changes from v3)
- `z.object()` field ordering changes
- `.email()` and `.url()` now return branded types
- Protobuf schemas for gRPC service definitions
- QuestDB DDL schemas for time-series tables

## Migration Steps

1. Update `zod` to v4 in package.json
2. Fix breaking Zod API changes (see Zod 4 changelog)
3. Regenerate TypeScript types from protobuf definitions
4. Verify all consuming packages compile with new schemas
5. Update any runtime validation that relies on changed APIs
6. Run type-check: `pnpm tsc --noEmit`
7. Run tests: `pnpm test`
