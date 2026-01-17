# @repo/market-sdk

Multi-provider market data and trading SDK for Indian & international markets.

## Features

✅ **Multi-User Authentication:** Sandbox & Live OAuth2 flows
✅ **Provider-Agnostic:** Upstox, Yahoo Finance, Binance support
✅ **WebSocket Multiplexer:** Intelligent subscription management with priority-based eviction
✅ **Type-Safe:** Full TypeScript support with @repo/schema integration
✅ **Encrypted Storage:** AES-256-GCM encryption for access tokens
✅ **NestJS Native:** Built as NestJS Global Module

## Supported Providers

| Provider | Market Data | Orders | Portfolio | WebSocket |
| -------- | ----------- | ------ | --------- | --------- |
| Upstox   | ✅          | ✅     | ✅        | ✅        |
| Yahoo    | ✅          | ❌     | ❌        | ❌        |
| Binance  | ✅          | ✅     | ✅        | ✅        |

## Installation

This package is part of the monorepo. Import in your NestJS app:

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { UpstoxModule } from "@repo/market-sdk";

@Module({
  imports: [
    UpstoxModule, // Registers Upstox provider globally
  ],
})
export class AppModule {}
```

## Quick Start

### Usage Examples

```typescript
// apps/algo-worker/src/app.module.ts
import { Module } from "@nestjs/common";
import { UpstoxModule } from "@repo/market-sdk";
-@Module({
  imports: [
    UpstoxModule, // Register Upstox provider
  ],
})
export class AppModule {};

// apps/algo-worker/src/engines/data/market-connector.service.ts
import { Injectable } from "@nestjs/common";
import {
  UpstoxProvider,
  MultiplexerService,
  PriorityLevel,
} from "@repo/market-sdk";

@Injectable()
export class MarketConnectorService {
  constructor(
    private upstox: UpstoxProvider,
    private multiplexer: MultiplexerService
  ) {}

  async subscribeToMarketData(userId: string) {
    // Get Nifty 50 option chain
    const chain = await this.upstox.getOptionChain(
      "NSE_INDEX|Nifty 50",
      "2024-12-26"
    );

    // Subscribe with priorities
    const instruments = chain.map((opt) => opt.instrumentKey);
    await this.multiplexer.subscribe(userId, instruments, PriorityLevel.HIGH);

    // Listen to market data
    this.multiplexer.on("data", (data) => {
      console.log("Received market data:", data);
    });
  }

  async placeOrder(userId: string) {
    const order = await this.upstox.placeOrder(userId, {
      instrumentKey: "NSE_EQ|INE669E01016",
      quantity: 10,
      price: 0,
      transactionType: "BUY",
      orderType: "MARKET",
      product: "DELIVERY",
      validity: "DAY",
    });

    console.log("Order placed:", order.orderId);
  }
}
```

### 1. User Authentication

**Sandbox Mode (Manual Token Entry):**

```typescript
import { AuthManagerService } from "@repo/market-sdk";

// User pastes token from Upstox Dashboard
await authManager.saveSandboxToken(userId, "eyJhbG...");
```

**Live Mode (OAuth2):**

```typescript
// Step 1: Generate authorization URL
const authUrl = authManager.generateAuthorizationUrl(
  process.env.UPSTOX_API_KEY,
  process.env.UPSTOX_REDIRECT_URI
);
// Redirect user to authUrl

// Step 2: Handle callback
GET /api/upstox/callback?code=ABC123

await authManager.handleLiveCallback(userId, authCode, {
  apiKey: process.env.UPSTOX_API_KEY,
  apiSecret: process.env.UPSTOX_API_SECRET,
  redirectUri: process.env.UPSTOX_REDIRECT_URI,
});
```

### 2. Market Data

```typescript
import { UpstoxProvider } from "@repo/market-sdk";

@Injectable()
export class MarketService {
  constructor(private upstox: UpstoxProvider) {}

  async getMarketData() {
    // Get LTP
    const ltpMap = await this.upstox.getLTP(["NSE_INDEX|Nifty 50"]);

    // Get option chain
    const chain = await this.upstox.getOptionChain(
      "NSE_INDEX|Nifty 50",
      "2024-12-26"
    );

    // Get historical data
    const candles = await this.upstox.getHistoricalData({
      instrumentKey: "NSE_INDEX|Nifty 50",
      interval: "5m",
      startDate: new Date("2024-11-01"),
      endDate: new Date("2024-11-21"),
    });
  }
}
```

### 3. Place Orders

```typescript
import { UpstoxProvider, PriorityLevel } from '@repo/market-sdk';

async placeOrder(userId: string) {
  const order = await this.upstox.placeOrder(userId, {
    instrumentKey: 'NSE_EQ|INE669E01016', // TCS
    quantity: 10,
    price: 0,
    transactionType: 'BUY',
    orderType: 'MARKET',
    product: 'DELIVERY',
    validity: 'DAY',
  });

  console.log('Order ID:', order.orderId);
}
```

### 4. WebSocket Subscriptions (with Multiplexer)

```typescript
import { MultiplexerService, PriorityLevel } from "@repo/market-sdk";

@Injectable()
export class MarketStreamService {
  constructor(private multiplexer: MultiplexerService) {}

  async subscribeToOptions(userId: string) {
    // Subscribe to entire option chain with priorities
    const instruments = [
      "NSE_INDEX|Nifty 50", // CRITICAL
      "NSE_FO|NIFTY24DEC19000CE", // HIGH (ATM)
      "NSE_FO|NIFTY24DEC19000PE", // HIGH (ATM)
      "NSE_FO|NIFTY24DEC19050CE", // MEDIUM (OTM)
      // ... more instruments
    ];

    await this.multiplexer.subscribe(userId, instruments, PriorityLevel.HIGH);

    // Listen to market data
    this.multiplexer.on("data", (data) => {
      console.log("Real-time data:", data);
    });
  }
}
```

## Multi-Provider Support

```typescript
import { ProviderFactory } from "@repo/market-sdk";

// Use Yahoo for historical data
const yahoo = ProviderFactory.create("yahoo");
const historicalData = await yahoo.getHistoricalData({
  instrumentKey: "^NSEI",
  interval: "1d",
  startDate: new Date("2020-01-01"),
  endDate: new Date("2024-11-21"),
});

// Use Upstox for live trading
const upstox = ProviderFactory.create("upstox");
await upstox.placeOrder(userId, {
  /* order params */
});

// Use Binance for crypto
const binance = ProviderFactory.create("binance");
await binance.placeOrder(userId, {
  /* crypto order */
});
```

## WebSocket Multiplexer Details

**Problem:** Upstox limits WebSocket connections (2-5 sockets, 3000-5000 instruments per socket)

**Solution:** Intelligent multiplexer with bin packing & priority-based eviction

**Priority Levels:**

- `CRITICAL (1)`: Indices, Futures
- `HIGH (2)`: ATM options
- `MEDIUM (3)`: Near OTM (±5 strikes)
- `LOW (4)`: Deep OTM

**Algorithm:**

1. First-Fit allocation to existing sockets
2. Create new socket if under limit
3. Evict LOW priority if full
4. Store state in Redis for crash recovery

## Environment Variables

```bash
# Platform-level Upstox App Credentials
UPSTOX_API_KEY=your_api_key
UPSTOX_API_SECRET=your_secret
UPSTOX_REDIRECT_URI=http://localhost:3000/callback

# Encryption Key (32 characters)
ENCRYPTION_KEY=your_32_char_key

# Databases
MONGODB_URI=mongodb://localhost:27017/trading
REDIS_URL=redis://localhost:6379
```

## Testing

```bash
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
```

## Architecture

```
market-sdk/
├── core/           # Provider interfaces & factory
├── auth/           # Multi-user authentication
├── multiplexer/    # WebSocket management
├── providers/
│   ├── upstox/     # Upstox implementation
│   ├── yahoo/      # Yahoo Finance
│   └── binance/    # Binance
└── interfaces/     # Shared provider contracts
```

## Documentation

- [Upstox OAuth Guide](./docs/UPSTOX_OAUTH_INTEGRATION.md) - OAuth2 flow details
- [WebSocket Implementation](./docs/WEBSOCKET_IMPLEMENTATION.md) - Multiplexer architecture
- [Quickstart](./docs/QUICKSTART.md) - Getting started guide

---

## License

Part of the investment-trading-portfolio monorepo. MIT License.

---

**Status**: ✅ Active | Production Ready  
**Last Updated**: January 18, 2026
