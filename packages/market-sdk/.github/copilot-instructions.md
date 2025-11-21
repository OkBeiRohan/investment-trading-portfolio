# GitHub Copilot Instructions - @repo/market-sdk

## Package Role

You are working on the **unified market data SDK** for the trading monorepo. This package provides a multi-provider abstraction layer for market data access (Upstox, Yahoo Finance, Binance).

## Core Principle

**Provide a unified interface for multiple market data providers. Apps should be able to switch providers without changing code.**

## Package Structure

```
packages/market-sdk/
├── src/
│   ├── index.ts
│   ├── core/
│   │   ├── provider.factory.ts      # Provider factory with singleton pattern
│   │   ├── provider.interface.ts    # Common interfaces
│   │   └── provider.registry.ts     # Provider registration
│   ├── providers/
│   │   ├── upstox/
│   │   │   ├── upstox.provider.ts
│   │   │   ├── upstox.module.ts
│   │   │   └── api/
│   │   ├── yahoo/
│   │   │   └── yahoo.provider.ts
│   │   └── binance/
│   │       └── binance.provider.ts
│   ├── interfaces/
│   │   ├── market-data.interface.ts
│   │   ├── order.interface.ts
│   │   └── portfolio.interface.ts
│   ├── auth/
│   │   └── auth-manager.service.ts  # Multi-user authentication
│   └── multiplexer/
│       └── multiplexer.service.ts   # WebSocket connection pooling
├── docs/
│   ├── ARCHITECTURE.md
│   └── PROGRESS.md
├── README.md
└── package.json
```

## Design Patterns

### Provider Factory Pattern

```typescript
// core/provider.factory.ts
import { Injectable } from "@nestjs/common";

export type ProviderType = "upstox" | "yahoo" | "binance";

@Injectable()
export class ProviderFactory {
  private static providers: Map<ProviderType, any> = new Map();

  static register(type: ProviderType, provider: any) {
    this.providers.set(type, provider);
  }

  static create(type: ProviderType): IMarketDataProvider {
    const ProviderClass = this.providers.get(type);
    if (!ProviderClass) {
      throw new Error(`Provider ${type} not registered`);
    }
    return new ProviderClass();
  }

  // Auto-detect provider from instrument key
  static getProviderForInstrument(instrumentKey: string): ProviderType {
    if (instrumentKey.startsWith("NSE_") || instrumentKey.startsWith("BSE_")) {
      return "upstox";
    }
    if (instrumentKey.includes("BINANCE")) {
      return "binance";
    }
    return "yahoo";
  }
}
```

### Interface Segregation

```typescript
// interfaces/market-data.interface.ts
export interface IMarketDataProvider {
  getQuote(instrumentKey: string): Promise<Quote>;
  getHistoricalData(params: HistoricalParams): Promise<Candle[]>;
  getOptionChain(underlying: string): Promise<OptionChain>;
  subscribeToLiveData(
    instruments: string[],
    callback: (data: Tick) => void
  ): void;
}

// interfaces/order.interface.ts
export interface IOrderProvider {
  placeOrder(order: OrderRequest): Promise<OrderResponse>;
  modifyOrder(orderId: string, updates: OrderUpdates): Promise<OrderResponse>;
  cancelOrder(orderId: string): Promise<void>;
  getOrderStatus(orderId: string): Promise<OrderStatus>;
}

// interfaces/portfolio.interface.ts
export interface IPortfolioProvider {
  getPositions(): Promise<Position[]>;
  getHoldings(): Promise<Holding[]>;
  getFunds(): Promise<Funds>;
}
```

### Multi-User Authentication

```typescript
// auth/auth-manager.service.ts
@Injectable()
export class AuthManagerService {
  private tokens: Map<string, AccessToken> = new Map();

  async authenticate(userId: string, credentials: Credentials): Promise<void> {
    const token = await this.fetchAccessToken(credentials);
    this.tokens.set(userId, token);
  }

  getToken(userId: string): AccessToken | null {
    return this.tokens.get(userId) || null;
  }

  async refreshToken(userId: string): Promise<void> {
    // Refresh logic
  }
}
```

### WebSocket Multiplexer

```typescript
// multiplexer/multiplexer.service.ts
@Injectable()
export class MultiplexerService {
  private connections: Map<string, WebSocket> = new Map();
  private readonly MAX_KEYS_PER_SOCKET = 500;

  async subscribe(instruments: string[]): Promise<void> {
    // Load balancing logic
    // Use Redis to track which socket has which instruments
    const socketId = await this.findAvailableSocket();
    const ws = this.getOrCreateSocket(socketId);

    instruments.forEach((key) => {
      ws.subscribe(key);
      this.redisService.setSocketForInstrument(key, socketId);
    });
  }

  private async findAvailableSocket(): Promise<string> {
    // Find socket with least load
    const sockets = await this.redisService.getActiveSockets();
    for (const socketId of sockets) {
      const load = await this.redisService.getSocketLoad(socketId);
      if (load < this.MAX_KEYS_PER_SOCKET) {
        return socketId;
      }
    }
    // Create new socket if all are full
    return this.createNewSocket();
  }
}
```

## Provider Implementation Example

```typescript
// providers/upstox/upstox.provider.ts
import { Injectable } from "@nestjs/common";
import {
  IMarketDataProvider,
  IOrderProvider,
  IPortfolioProvider,
} from "../../interfaces";

@Injectable()
export class UpstoxProvider
  implements IMarketDataProvider, IOrderProvider, IPortfolioProvider
{
  constructor(
    private readonly authManager: AuthManagerService,
    private readonly marketDataApi: MarketDataApi,
    private readonly ordersApi: OrdersApi,
    private readonly portfolioApi: PortfolioApi
  ) {}

  async getQuote(instrumentKey: string): Promise<Quote> {
    const response = await this.marketDataApi.getFullMarketQuote(instrumentKey);
    return this.transformQuote(response);
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    const userId = order.userId;
    const token = this.authManager.getToken(userId);

    const response = await this.ordersApi.placeOrder(
      order,
      this.authManager.getApiVersion(),
      token
    );

    return this.transformOrderResponse(response);
  }

  // Implement all interface methods...
}
```

## NestJS Module Integration

```typescript
// providers/upstox/upstox.module.ts
import { Global, Module } from "@nestjs/common";
import { UpstoxProvider } from "./upstox.provider";
import { AuthManagerService } from "../../auth/auth-manager.service";
import { MultiplexerService } from "../../multiplexer/multiplexer.service";

@Global()
@Module({
  providers: [UpstoxProvider, AuthManagerService, MultiplexerService],
  exports: [UpstoxProvider, AuthManagerService, MultiplexerService],
})
export class UpstoxModule {}
```

## Consumer Usage

```typescript
// apps/algo-worker/src/services/market-data.service.ts
import { Injectable } from "@nestjs/common";
import { ProviderFactory } from "@repo/market-sdk";

@Injectable()
export class MarketDataService {
  async fetchQuote(instrumentKey: string): Promise<Quote> {
    // Auto-detect provider
    const providerType =
      ProviderFactory.getProviderForInstrument(instrumentKey);
    const provider = ProviderFactory.create(providerType);

    return provider.getQuote(instrumentKey);
  }

  async subscribeToLiveData(instruments: string[]): Promise<void> {
    const provider = ProviderFactory.create("upstox");

    provider.subscribeToLiveData(instruments, (tick) => {
      // Handle tick data
      this.handleTick(tick);
    });
  }
}
```

## Documentation Requirements

**After implementing features:**

1. Update `README.md` with provider examples
2. Update `docs/ARCHITECTURE.md` with design decisions
3. Update `docs/PROGRESS.md` with provider status
4. Add JSDoc for all public methods

**Progress Tracking:**

Track by provider:

- Upstox: 100% (market data, orders, portfolio, WebSocket)
- Yahoo: 70% (market data only, no orders)
- Binance: 50% (basic market data, work in progress)

## Common Mistakes to Avoid

❌ **DON'T** create provider-specific code in apps  
❌ **DON'T** hardcode provider names  
❌ **DON'T** bypass the factory pattern  
❌ **DON'T** create separate WebSocket for each instrument

✅ **DO** use provider factory for all access  
✅ **DO** implement all interface methods  
✅ **DO** use multiplexer for WebSocket efficiency  
✅ **DO** handle authentication centrally  
✅ **DO** provide unified error handling
