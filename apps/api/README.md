# API Server

> **NestJS API gateway with tRPC and Better Auth authentication.**

**Port**: 3004 (HTTP), 50050 (gRPC)  
**Last Updated**: March 17, 2026

---

## Purpose

The API server is the **gateway layer** for the web dashboard:

- ✅ User authentication via Better Auth
- ✅ tRPC router for type-safe API calls
- ✅ Portfolio and trading status endpoints
- ✅ Gateway to local algo-worker (via Redis events)

### What This Service Does NOT Do

- ❌ ML inference (use algo-worker)
- ❌ Feature computation (use compute-engine)
- ❌ Market data ingestion (use market-feeder)

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

- ✅ Better Auth authentication (session-based, organization plugin)
- ✅ User registration and profile management
- ✅ Portfolio aggregation and reporting
- ✅ Trade history queries
- ✅ Rate limiting and security middleware
- ✅ tRPC integration for type-safe APIs

## API Endpoints

### Authentication (Better Auth)

- `POST /api/auth/sign-up` - Register new user
- `POST /api/auth/sign-in/email` - Sign in with email/password
- `GET /api/auth/session` - Get current session
- `POST /api/auth/sign-out` - Sign out

### Portfolio

- `GET /api/portfolio/summary` - Portfolio summary
- `GET /api/portfolio/positions` - Active positions
- `GET /api/portfolio/trades` - Trade history

### Trading

- `POST /api/trading/start` - Start algo-worker
- `POST /api/trading/stop` - Stop algo-worker
- `GET /api/trading/status` - Trading status

## Environment Variables

See `.env.example` for required configuration.

## Architecture

Uses shared packages:

- `@repo/schema` - Type definitions and tRPC AppRouter export
- `@repo/database` - Database access (MongoDB)
- `@repo/authentication` - Better Auth server configuration

tRPC routers are defined in this API app and the AppRouter type is auto-exported to `@repo/schema/src/api/app-router.ts`.

## Documentation

- [Copilot Instructions](.github/copilot-instructions.md)
- [API Documentation](docs/API.md) (TODO)
- [Authentication Flow](docs/AUTHENTICATION.md) (TODO)

## Stack

- NestJS 11
- MongoDB (via @repo/database)
- Better Auth (via @repo/authentication)
- tRPC v11
- TypeScript

## Testing

```bash
pnpm test
pnpm test:e2e
pnpm test:cov
```

## Contributing

Follow the coding standards in `.github/copilot-instructions.md`.
