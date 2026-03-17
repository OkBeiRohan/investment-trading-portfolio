# Market SDK Package Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `packages/market-sdk` (`@repo/market-sdk`)

## Overview

Upstox v3 API client with WebSocket support for market data streaming and order management.

## Key Changes

- Upstox API v3 (from v2) with improved rate limits
- WebSocket reconnection with exponential backoff
- Order placement with retry and idempotency
- Instrument master sync utilities
- Token management integrated with `@repo/authentication`

## Migration Steps

1. Update Upstox API endpoints to v3
2. Replace manual token handling with `AuthManagerService`
3. Update WebSocket connection for v3 protocol
4. Verify order placement in sandbox mode
5. Test instrument master sync
6. Verify market data streaming accuracy
7. Run tests: `pnpm test`
