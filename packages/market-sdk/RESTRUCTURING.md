# Market SDK Restructuring Plan

## Overview

The `@repo/market-sdk` package is being restructured to support multiple market data providers with a unified interface.

## Current Status

✅ **Completed:**

- Created shared interfaces in `/packages/market-sdk/src/interfaces/`
  - `market-data.interface.ts`: IMarketDataProvider
  - `order.interface.ts`: IOrderProvider
  - `portfolio.interface.ts`: IPortfolioProvider
- Created provider directory structure:
  - `/providers/upstox/` (ready for migration)
  - `/providers/yahoo/` (ready for implementation)
  - `/providers/binance/` (ready for implementation)

## Migration Tasks

### Phase 1: Move Upstox Implementation ✅

**Files to move from `src/` to `src/providers/upstox/`:**

1. `api/order.api.ts` → `providers/upstox/order.api.ts`
2. `api/market-data.api.ts` → `providers/upstox/market-data.api.ts`
3. `api/portfolio.api.ts` → `providers/upstox/portfolio.api.ts`
4. `websocket/market-data.stream.ts` → `providers/upstox/market-data.stream.ts`
5. `client.ts` → `providers/upstox/upstox.provider.ts`
6. `upstox-js-sdk.d.ts` → `providers/upstox/upstox-js-sdk.d.ts`

**Files to DELETE (types moved to @repo/schema):**

- `types/order.types.ts` - Now in `@repo/schema/trading`
- `types/market-data.types.ts` - Now in `@repo/schema/trading`
- `types/instrument.types.ts` - Now in `@repo/schema/trading`

**New files to create:**

- `providers/upstox/upstox.provider.ts` - Main provider class implementing all 3 interfaces
- `providers/upstox/index.ts` - Export UpstoxProvider

### Phase 2: Implement Yahoo Finance Provider 🔄

**New files to create:**

```
providers/yahoo/
├── yahoo.provider.ts       # Implements IMarketDataProvider
├── market-data.api.ts      # Yahoo Finance API wrapper
└── index.ts                # Export YahooProvider
```

**Features:**

- Historical stock data (1m, 5m, 15m, 1h, 1d, 1w, 1M)
- Current quotes (last price, volume, open, high, low, close)
- Search instruments by ticker symbol
- No order execution (read-only)

**Dependencies:**

- `yahoo-finance2@^3.10.2` (already installed)

### Phase 3: Implement Binance Provider 🔄

**New files to create:**

```
providers/binance/
├── binance.provider.ts     # Implements all 3 interfaces
├── market-data.api.ts      # Market data wrapper
├── order.api.ts            # Spot/Futures trading
├── portfolio.api.ts        # Account balance & positions
├── websocket.stream.ts     # Real-time streams
└── index.ts                # Export BinanceProvider
```

**Features:**

- Crypto market data (BTC, ETH, etc.)
- Spot trading (MARKET, LIMIT orders)
- Futures trading (optional)
- Real-time WebSocket streams
- Portfolio tracking

**Dependencies:**

- `@binance/connector@^3.6.1` (already installed)

### Phase 4: Provider Factory & Registry 🔄

**New files to create:**

```
src/
├── provider-factory.ts     # Factory for creating providers
├── provider-registry.ts    # Register and discover providers
└── errors.ts               # Shared error classes
```

**Provider Factory Pattern:**

```typescript
export class ProviderFactory {
  static create(
    providerId: "upstox" | "yahoo" | "binance",
    config: Record<string, unknown>
  ): IMarketDataProvider & IOrderProvider & IPortfolioProvider;

  static getProvider(instrumentKey: string): string; // Auto-detect
}
```

### Phase 5: Update Main Index 🔄

**Update `/packages/market-sdk/src/index.ts`:**

```typescript
// Interfaces
export * from "./interfaces";

// Providers
export { UpstoxProvider } from "./providers/upstox";
export { YahooProvider } from "./providers/yahoo";
export { BinanceProvider } from "./providers/binance";

// Factory
export { ProviderFactory } from "./provider-factory";
export { ProviderRegistry } from "./provider-registry";

// Errors
export * from "./errors";
```

## Interface Coverage Matrix

| Feature             | Upstox  | Yahoo   | Binance |
| ------------------- | ------- | ------- | ------- |
| Market Data         | ✅ Full | ✅ Full | ✅ Full |
| Historical Data     | ✅ Full | ✅ Full | ✅ Full |
| Option Chain        | ✅ Yes  | ❌ No   | ❌ No   |
| Option Greeks       | ✅ Yes  | ❌ No   | ❌ No   |
| Order Execution     | ✅ Full | ❌ No   | ✅ Full |
| Multi-Leg Orders    | ✅ Yes  | ❌ No   | ❌ No   |
| Portfolio/Positions | ✅ Full | ❌ No   | ✅ Full |
| Real-Time Streams   | ✅ Full | ❌ No   | ✅ Full |

## Testing Strategy

Each provider should have:

1. Unit tests for API wrappers
2. Integration tests with live API (optional, gated)
3. Mock data for offline testing

## Documentation Updates

- [x] Create RESTRUCTURING.md (this file)
- [ ] Update main README.md with new architecture
- [ ] Create provider-specific READMEs:
  - [ ] providers/upstox/README.md
  - [ ] providers/yahoo/README.md
  - [ ] providers/binance/README.md

## Next Steps

1. **Immediate**: Move Upstox implementation to providers/upstox/
2. **Next**: Implement Yahoo Finance provider for historical data
3. **Then**: Implement Binance provider for crypto trading
4. **Finally**: Create provider factory and update docs

## Usage After Restructuring

```typescript
// Before (single provider)
import { UpstoxSDK } from "@repo/market-sdk";

// After (multi-provider)
import {
  UpstoxProvider,
  YahooProvider,
  BinanceProvider,
  ProviderFactory,
} from "@repo/market-sdk";

// Use specific provider
const upstox = new UpstoxProvider();
await upstox.initialize(config);

// Or use factory
const provider = ProviderFactory.create("upstox", config);
```

## Breaking Changes

⚠️ **This is a breaking change for existing code:**

- Old: `import { UpstoxSDK } from '@repo/market-sdk'`
- New: `import { UpstoxProvider } from '@repo/market-sdk'`

All existing usage in `apps/algo-worker` will need to be updated.

## Timeline

- **Phase 1** (Upstox migration): 1-2 hours
- **Phase 2** (Yahoo provider): 2-3 hours
- **Phase 3** (Binance provider): 3-4 hours
- **Phase 4** (Factory & Registry): 1 hour
- **Phase 5** (Documentation): 1 hour

**Total estimated time**: 8-11 hours
