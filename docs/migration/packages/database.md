# Database Package Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `packages/database` (`@repo/database`)

## Overview

Shared database connection management for MongoDB 8.0, QuestDB, and Redis 7+.

## Key Changes

- MongoDB driver upgraded to 6.x (MongoDB 8.0 support)
- QuestDB client with connection pooling
- Redis 7+ with client-side caching support
- Connection health checks and auto-reconnect
- Consistent key naming: `quantum:{service}:{entity}:{id}`

## Migration Steps

1. Update MongoDB connection strings for 8.0 compatibility
2. Verify QuestDB schema migrations are applied
3. Update Redis configuration for v7+ features
4. Replace direct DB client usage with `@repo/database` utilities
5. Verify connection pooling settings for production load
6. Test failover and reconnection behavior
7. Run integration tests: `pnpm test`
