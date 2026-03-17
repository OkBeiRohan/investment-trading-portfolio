# Wealth Management Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `services/wealth-management`  
> **Status**: Scaffolded

## Overview

Double-entry ledger service for tracking portfolio value, cash flows, dividends, and P&L across all linked brokerage accounts.

## Key Dependencies

- NestJS 11
- MongoDB 8.0 (ledger collections)
- `@repo/database` for connection management
- `@repo/schema` for Zod validation
- Redis for caching aggregated positions

## Key Changes

- Auth migrated from JWT to Better Auth via `@repo/authentication`
- Ledger entries use MongoDB transactions for atomicity
- Redis cache for real-time portfolio NAV
- Zod 4 schema validation on all inputs

## Migration Steps

1. Update NestJS to v11
2. Replace JWT auth guards with Better Auth guards
3. Update Zod schemas to v4 syntax
4. Verify MongoDB transaction support (replica set required)
5. Test ledger entry creation and reconciliation
6. Verify Redis cache invalidation on updates
7. Run full test suite: `pnpm test`
