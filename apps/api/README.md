# API Server

REST API and authentication server for the investment trading portfolio system.

## Overview

**Port**: 3001  
**Purpose**: User management, authentication, portfolio data, and gateway to trading engines

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

- ✅ JWT authentication with refresh tokens
- ✅ User registration and profile management
- ✅ Portfolio aggregation and reporting
- ✅ Trade history queries
- ✅ Rate limiting and security middleware
- ✅ tRPC integration for type-safe APIs

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with credentials
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout

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

- `@repo/schema` - Type definitions
- `@repo/database` - Database access (MongoDB)
- `@repo/trpc-router` - tRPC routes

## Documentation

- [Copilot Instructions](.github/copilot-instructions.md)
- [API Documentation](docs/API.md) (TODO)
- [Authentication Flow](docs/AUTHENTICATION.md) (TODO)

## Stack

- NestJS
- MongoDB (via @repo/database)
- JWT + Passport.js
- tRPC
- TypeScript

## Testing

```bash
pnpm test
pnpm test:e2e
pnpm test:cov
```

## Contributing

Follow the coding standards in `.github/copilot-instructions.md`.
