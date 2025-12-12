# Market Feeder

Real-time market data ingestion microservice.

## Overview

**Port**: 3002  
**Purpose**: Ingest real-time market data from external providers and distribute to other services

## Data Flow

```
External Providers (Upstox WebSocket)
  ↓
Market Feeder (this app)
  ↓
├─> QuestDB (time-series storage)
└─> Redis Pub/Sub (real-time distribution)
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Development
pnpm dev

# Production
pnpm build
pnpm start:prod
```

## Features

- ✅ WebSocket connections to market data providers
- ✅ Automatic reconnection with exponential backoff
- ✅ Real-time tick data ingestion
- ✅ 1-minute candle generation
- ✅ Option Greeks streaming
- ✅ Batch writes to QuestDB
- ✅ Redis pub/sub for real-time distribution
- ✅ Health monitoring and circuit breakers

## Environment Variables

See `.env.example` for required configuration.

## Architecture

Uses shared packages:

- `@repo/market-sdk` - Market data clients (Upstox, Yahoo, Binance)
- `@repo/database` - QuestDB and Redis access
- `@repo/schema` - Type definitions

## Documentation

- [Copilot Instructions](.github/copilot-instructions.md)

## Stack

- NestJS
- WebSocket (via @repo/market-sdk)
- QuestDB (time-series storage)
- Redis (pub/sub)
- TypeScript

## Testing

```bash
pnpm test
pnpm test:e2e
```

## Monitoring

Health endpoint: `GET /health`

Returns connection status for:

- WebSocket connection
- QuestDB
- Redis
- Data freshness

## Contributing

Follow the coding standards in `.github/copilot-instructions.md`.
