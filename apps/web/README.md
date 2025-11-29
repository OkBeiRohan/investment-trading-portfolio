# Web Dashboard

Next.js frontend dashboard for the investment trading portfolio system.

## Overview

**Port**: 3000  
**Purpose**: Real-time trading dashboard, portfolio visualization, and system monitoring

## Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with API URL and authentication settings

# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## Features

- ✅ Real-time portfolio overview
- ✅ Live trading signal visualization
- ✅ Position and P&L tracking
- ✅ Trade history with filtering
- ✅ System health monitoring
- ✅ User authentication with NextAuth
- ✅ Type-safe API calls with tRPC

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: TailwindCSS
- **Authentication**: NextAuth.js
- **API Layer**: tRPC client (via @repo/trpc)
- **State Management**: React Query (via tRPC)
- **Charts**: Recharts / Chart.js
- **TypeScript**: Strict mode

## Architecture

Uses shared packages:

- `@repo/schema` - Type definitions
- `@repo/trpc` - Type-safe API client
- `@repo/eslint-config` - Linting rules
- `@repo/typescript-config` - TypeScript config

## Key Routes

- `/` - Portfolio dashboard
- `/signals` - Trading signals history
- `/positions` - Active positions
- `/trades` - Trade history
- `/settings` - User settings

## Environment Variables

See `.env.example` for required configuration:

- `NEXTAUTH_SECRET` - NextAuth secret
- `NEXTAUTH_URL` - Application URL
- `NEXT_PUBLIC_API_URL` - API server URL

## Documentation

- [Copilot Instructions](.github/copilot-instructions.md)
- [Component Library](docs/COMPONENTS.md) (TODO)
- [Deployment Guide](docs/DEPLOYMENT.md) (TODO)

## Development

```bash
# Run development server
pnpm dev

# Type checking
pnpm type-check

# Linting
pnpm lint

# Testing
pnpm test
```

## Production Build

```bash
pnpm build
pnpm start
```

## Contributing

Follow the coding standards in `.github/copilot-instructions.md`.
