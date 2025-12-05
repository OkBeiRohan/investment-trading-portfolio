# Web Dashboard - Unified Financial Operating System (UFOS)

Next.js frontend implementing a comprehensive trading and wealth management platform.

## Overview

**Port**: 3000  
**Purpose**: Unified Financial Operating System bridging algorithmic trading execution and holistic wealth management

**Architecture Philosophy**: Multi-dashboard ecosystem with organization-level access control, team collaboration, and highly configurable algorithmic trading.

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

## Core Modules

### 1. **Wealth Management Dashboard** ("Financial Sanctum")

Unified view of all assets with net worth tracking, asset allocation, and legacy planning.

- **Net Worth Waterfall**: Liquid vs. Locked capital visualization
- **Multi-Asset Integration**: PF, NPS, Insurance, Crypto, Equities, Real Estate
- **Time-Machine Analytics**: Historical performance attribution with Sankey diagrams
- **Life Beat Protocol**: Digital estate planning with dead man's switch

### 2. **Algorithmic Trading Cockpit** ("Combat Cockpit")

High-density interface for Nifty Options algorithmic trading with real-time Greeks analytics.

- **Advanced Greeks Visualization**: 3D Volatility Surface, GEX Dashboard, Vanna/Charm heatmaps
- **Strategy Micromanagement**: Live parameter tuning, no-code strategy canvas
- **Execution Quality**: Slippage tracking, tick-to-trade latency monitoring
- **Max Pain & OI Analysis**: Institutional positioning insights

### 3. **Account Dashboard**

User account management, KYC, linked accounts, API credentials, and preferences.

- **Multi-Account Aggregation**: Brokerage, banking, crypto exchange connections
- **Security Center**: 2FA, session management, API token lifecycle
- **Notification Preferences**: Alert routing, risk threshold notifications

### 4. **Organization Management Dashboard**

Enterprise-grade multi-tenancy with teams, roles, and shared strategy access.

- **Organization Structure**: Create/manage organizations with hierarchical teams
- **Team Collaboration**: Share dashboards, strategies, and risk limits across teams
- **Role-Based Access Control (RBAC)**: Admin, Manager, Trader, Viewer roles
- **Member Management**: Invite users, assign roles, manage permissions

### 5. **Admin "God Mode" Dashboard**

Forensic AI observability and system governance for administrators.

- **AI Model MRI**: Training telemetry, layer-wise activations, gradient monitoring
- **Agentic Tracing**: Decision path visualization with trace waterfalls
- **Kill Switch Architecture**: Global/granular emergency stops with circuit breakers
- **Compliance Dashboard**: Audit trail, regulatory limit monitoring

## Key Features

### Wealth Management

- ✅ Unified Net Worth tracking (Liquid vs. Locked)
- ✅ Multi-asset aggregation (PF, NPS, Insurance, Crypto, Stocks)
- ✅ Sunburst/Treemap asset allocation visualization
- ✅ Legacy planning with dead man's switch
- ✅ Time-weighted vs. Money-weighted returns
- ✅ Sankey diagrams for capital flow analysis

### Algorithmic Trading

- ✅ Real-time Nifty Options Greeks analytics (Delta, Gamma, Vega, Theta)
- ✅ 3D Volatility Surface visualization
- ✅ Gamma Exposure (GEX) flip zone detection
- ✅ Vanna/Charm second-order Greeks heatmaps
- ✅ Live strategy parameter tuning (no restart required)
- ✅ Node-based strategy canvas (no-code configuration)
- ✅ Slippage and latency monitoring

### Organization & Teams

- ✅ Multi-organization support with switching
- ✅ Team-based strategy sharing and collaboration
- ✅ Member invitation and role management
- ✅ Dashboard access control per organization/team
- ✅ Shared risk limits and compliance policies

### Admin & Observability

- ✅ AI model training telemetry and drift detection
- ✅ Layer-wise neural network activation heatmaps
- ✅ Agentic decision trace waterfalls
- ✅ SHAP explainability for predictions
- ✅ Kill switch UI with granular control
- ✅ Automated circuit breakers (drawdown, liquidity, correlation)
- ✅ Immutable audit trail for compliance

## Tech Stack

- **Framework**: Next.js 16 (App Router, React Server Components)
- **Styling**: TailwindCSS + Shadcn/ui components
- **Authentication**: Better Auth (with organization plugin, 2FA, passkey)
- **API Layer**: tRPC client (via @repo/trpc) + Better Auth client
- **State Management**: React Query (via tRPC), Zustand (local UI state)
- **Charts & Visualization**:
  - **Recharts**: Line/area charts for time-series (P&L, equity curves)
  - **D3.js**: 3D Volatility Surface, Sunburst charts, Sankey diagrams
  - **Plotly.js**: Interactive 3D surfaces, heatmaps (Greeks, GEX)
  - **Cytoscape.js**: Node-based strategy canvas
- **Real-Time**: WebSocket subscriptions (tRPC subscriptions)
- **TypeScript**: Strict mode with discriminated unions

## Architecture

### Modular Dashboard Architecture

The application uses a **Multi-Dashboard Pattern** where each dashboard is a self-contained module with its own:

- **Layout**: Sidebar navigation, header controls, action panels
- **Data Layer**: Dedicated tRPC routers and Better Auth contexts
- **Access Control**: Organization/team-level permissions
- **State**: Isolated Zustand stores per dashboard

### Shared Packages

- `@repo/schema` - Zod schemas and TypeScript types (source of truth)
- `@repo/trpc` - Type-safe API client with auto-generated routers
- `@repo/authentication` - Better Auth client configuration
- `@repo/eslint-config` - Linting rules
- `@repo/typescript-config` - TypeScript config

### Route Structure

```
app/
├── (auth)/
│   ├── login/
│   ├── register/
│   └── verify/
├── (dashboards)/
│   ├── wealth/              # Module 1: Wealth Management
│   │   ├── overview/        # Net Worth Waterfall
│   │   ├── assets/          # Asset Allocation (Sunburst)
│   │   ├── [assetId]/       # Deep dive (PF, NPS, Crypto, etc.)
│   │   ├── legacy/          # Life Beat & Estate Planning
│   │   └── analytics/       # Time-Machine, Sankey flows
│   ├── trade/               # Module 2: Algo Trading Cockpit
│   │   ├── options/         # Nifty Options Analytics
│   │   │   ├── greeks/      # Greeks Command Center
│   │   │   ├── volatility/  # 3D Surface, Max Pain
│   │   │   └── gex/         # Gamma Exposure Dashboard
│   │   ├── strategies/      # Strategy Management
│   │   │   ├── active/      # Running strategies with live tuner
│   │   │   ├── create/      # Node-based canvas (no-code)
│   │   │   └── [strategyId]/# Strategy detail & backtests
│   │   ├── execution/       # Order book, fills, slippage
│   │   └── analytics/       # Performance attribution
│   ├── account/             # Module 3: Account Dashboard
│   │   ├── profile/         # User profile & KYC
│   │   ├── linked-accounts/ # Brokerage/bank/exchange connections
│   │   ├── security/        # 2FA, API tokens, sessions
│   │   └── preferences/     # Notifications, display settings
│   ├── organization/        # Module 4: Organization Management
│   │   ├── overview/        # Org dashboard home
│   │   ├── teams/           # Team creation & management
│   │   ├── members/         # Member list, invitations, roles
│   │   ├── access-control/  # RBAC configuration
│   │   └── billing/         # Subscription & usage (future)
│   └── admin/               # Module 5: God Mode (Admin only)
│       ├── ai-models/       # Model training telemetry
│       │   ├── training/    # Loss curves, epoch tracking
│       │   ├── inference/   # Drift detection, confidence vs. reality
│       │   └── explainability/ # SHAP plots, feature importance
│       ├── agents/          # Agentic trace waterfalls
│       ├── risk/            # Kill switches, circuit breakers
│       ├── compliance/      # Audit trail, regulatory limits
│       └── system/          # Infrastructure health
└── api/
    └── trpc/[trpc]/         # tRPC API endpoint
```

## Environment Variables

See `.env.example` for required configuration:

### Authentication

- `BETTER_AUTH_SECRET` - Better Auth encryption secret
- `BETTER_AUTH_URL` - Application URL (e.g., http://localhost:3000)
- `NEXT_PUBLIC_APP_URL` - Public-facing URL

### API Configuration

- `NEXT_PUBLIC_API_URL` - API server URL (e.g., http://localhost:3004)
- `NEXT_PUBLIC_TRPC_URL` - tRPC endpoint URL

### Feature Flags

- `NEXT_PUBLIC_ENABLE_ADMIN_MODE` - Enable God Mode dashboard
- `NEXT_PUBLIC_ENABLE_LEGACY_PLANNING` - Enable Life Beat features
- `NEXT_PUBLIC_ENABLE_CRYPTO_ASSETS` - Enable crypto/DeFi tracking

### External Services

- `UPSTOX_API_KEY` - Upstox broker integration
- `BLOCKCHAIN_RPC_URL` - For crypto on-chain sync
- `INSURANCE_OCR_API_KEY` - Policy document parsing

## Documentation

- [Copilot Instructions](.github/copilot-instructions.md) - Development guidelines
- [Architecture](docs/ARCHITECTURE.md) - Detailed system architecture
- [Progress Tracking](docs/PROGRESS.md) - Implementation status
- [Component Library](docs/COMPONENTS.md) - Reusable UI components (TODO)
- [Dashboard Patterns](docs/DASHBOARD_PATTERNS.md) - Multi-dashboard design patterns (TODO)
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment (TODO)

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
