# Data Processor

Feature engineering and technical indicator calculation microservice.

## Overview

**Port**: 3003  
**Purpose**: Consume market data, compute technical indicators, store features for ML models

## Data Flow

```
Redis Pub/Sub (from market-feeder)
  ↓
Data Processor (this app)
  ↓
Compute Features (RSI, MACD, Volatility, etc.)
  ↓
├─> QuestDB (time-series features)
└─> Redis Pub/Sub (real-time features to algo-worker)
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env

# Development
pnpm dev

# Production
pnpm build
pnpm start:prod
```

## Features

- ✅ Real-time feature computation
- ✅ Technical indicators (RSI, MACD, SMA, EMA, Volatility)
- ✅ Option market features (PCR, Max Pain, ATM IV, Skew)
- ✅ Batch storage to QuestDB
- ✅ Redis pub/sub for real-time distribution
- ✅ Configurable indicator parameters

## Computed Features

### Underlying Features

- Realized Volatility (5d, 10d, 20d)
- RSI (14-period)
- MACD (12, 26, 9)
- Moving Averages (SMA 20/50, EMA)

### Market Sentiment

- India VIX
- Put-Call Ratio (Volume & OI)
- Max Pain

### Option-Specific

- ATM Implied Volatility
- Volatility Skew
- Term Structure

## Environment Variables

See `.env.example` for configuration.

## Architecture

Uses shared packages:

- `@repo/database` - QuestDB and Redis access
- `@repo/schema` - Type definitions

## Documentation

- [Copilot Instructions](.github/copilot-instructions.md)

## Stack

- NestJS
- Redis (consumer + publisher)
- QuestDB (feature storage)
- TypeScript

## Testing

```bash
pnpm test
pnpm test:watch
pnpm test:cov
```

## Configuration

Edit `src/config/data-processor.config.ts` to adjust:

- Indicator parameters
- Batch sizes
- Flush intervals
- History sizes

## Contributing

Follow the coding standards in `.github/copilot-instructions.md`.
