# Market SDK - Implementation Guide

> **Step-by-Step Guide to Implementing the Complete Market SDK**

This guide provides a systematic approach to building the market SDK following the architecture defined in [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Phase 1: Core Infrastructure (DONE ✅)

### 1.1 Core Abstractions

- [x] `src/core/types.ts` - Type definitions
- [x] `src/core/provider.interface.ts` - Base interfaces
- [x] `src/core/base-provider.abstract.ts` - Abstract base class
- [x] `src/core/provider.registry.ts` - Provider registry
- [x] `src/core/provider.factory.ts` - Factory pattern
- [x] `src/core/error.ts` - Custom error hierarchy

### 1.2 HTTP Client Infrastructure

- [x] `src/core/http-client.service.ts` - HTTP client with retry logic
- [x] `src/utils/circuit-breaker.ts` - Circuit breaker service
- [x] `src/rate-limiter/rate-limiter.service.ts` - Token bucket rate limiter
- [x] `src/core/core.module.ts` - Core module registration

---

## Phase 2: Authentication Infrastructure

### 2.1 Enhanced Auth Manager

**File:** `src/auth/auth-manager.service.ts`

**Requirements:**

- L1 Cache: Redis for token storage (6-hour TTL)
- L2 Storage: MongoDB for persistence
- Support sandbox/live mode differentiation
- Automatic token refresh integration

**Implementation:**

```typescript
@Injectable()
export class AuthManagerService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly redis: RedisService,
    private readonly tokenRefresh: TokenRefreshService
  ) {}

  async getAccessToken(
    userId: string,
    provider: string,
    environment: "SANDBOX" | "LIVE" = "LIVE"
  ): Promise<string> {
    // L1: Check Redis cache
    const cacheKey = `auth:${provider}:${environment}:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return cached;
    }

    // L2: Query MongoDB
    const account = await this.accountRepository.findOne({
      userId,
      providerId: provider,
    });

    if (!account || !account.accessToken) {
      throw new UnauthorizedError(provider);
    }

    // Check expiry
    if (
      account.accessTokenExpiresAt &&
      new Date() > account.accessTokenExpiresAt
    ) {
      // Trigger refresh
      await this.tokenRefresh.refreshToken(userId, provider);
      return this.getAccessToken(userId, provider, environment);
    }

    // Cache in Redis
    const ttl = 21600; // 6 hours
    await this.redis.set(cacheKey, account.accessToken, "EX", ttl);

    return account.accessToken;
  }
}
```

### 2.2 Token Refresh Service

**File:** `src/auth/token-refresh.service.ts`

**Requirements:**

- Background job to refresh tokens 30 minutes before expiry
- Retry logic for failed refreshes
- Update both Redis cache and MongoDB

```typescript
@Injectable()
export class TokenRefreshService {
  @Cron("*/15 * * * *") // Every 15 minutes
  async refreshExpiringTokens() {
    // Find tokens expiring in next 30 minutes
    const expiringAccounts = await this.accountRepository.find({
      accessTokenExpiresAt: {
        $lt: new Date(Date.now() + 30 * 60 * 1000),
        $gt: new Date(),
      },
    });

    for (const account of expiringAccounts) {
      await this.refreshToken(account.userId, account.providerId);
    }
  }

  async refreshToken(userId: string, provider: string): Promise<void> {
    // Provider-specific refresh logic
    // Update MongoDB and Redis
  }
}
```

---

## Phase 3: Upstox Provider Implementation

### 3.1 Module Structure

```
src/providers/upstox/
├── upstox.module.ts              # Root module
├── upstox.provider.ts            # Facade
├── constants.ts                  # URLs, limits
│
├── api/
│   ├── api.module.ts             # API root module
│   ├── config/
│   │   └── http-config.service.ts
│   │
│   ├── market-data/
│   │   ├── market-data.module.ts
│   │   ├── market-data.repository.ts
│   │   ├── market-data.service.ts
│   │   └── dto/
│   │       ├── quote.dto.ts
│   │       └── option-chain.dto.ts
│   │
│   ├── historical/
│   │   ├── historical.module.ts
│   │   ├── historical.repository.ts
│   │   ├── historical.service.ts
│   │   └── dto/
│   │       └── historical.request.dto.ts
│   │
│   ├── orders/
│   │   ├── orders.module.ts
│   │   ├── orders.repository.ts
│   │   ├── orders.service.ts
│   │   └── dto/
│   │       ├── place-order.dto.ts
│   │       └── order-response.dto.ts
│   │
│   └── portfolio/
│       ├── portfolio.module.ts
│       ├── portfolio.repository.ts
│       ├── portfolio.service.ts
│       └── dto/
│           ├── position.dto.ts
│           └── holding.dto.ts
│
└── websocket/
    ├── market-stream.ts
    ├── proto-decoder.ts
    └── proto/
        └── MarketDataFeedV3.proto
```

### 3.2 Repository Pattern

**File:** `src/providers/upstox/api/market-data/market-data.repository.ts`

```typescript
@Injectable()
export class MarketDataRepository {
  private readonly baseUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly authManager: AuthManagerService
  ) {
    this.baseUrl = process.env.UPSTOX_API_URL || "https://api.upstox.com";
  }

  async getQuote(
    userId: string,
    instrumentKeys: string[]
  ): Promise<UpstoxQuoteResponse> {
    const token = await this.authManager.getAccessToken(userId, "upstox");

    return this.httpClient.request<UpstoxQuoteResponse>({
      provider: "upstox",
      endpoint: `${this.baseUrl}/v2/market-quote/quotes`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Api-Version": "2.0",
      },
      params: {
        instrument_key: instrumentKeys.join(","),
      },
    });
  }
}
```

### 3.3 Service Layer

**File:** `src/providers/upstox/api/market-data/market-data.service.ts`

```typescript
@Injectable()
export class MarketDataService {
  constructor(private readonly repository: MarketDataRepository) {}

  async getFullMarketQuote(
    userId: string,
    instrumentKeys: string[]
  ): Promise<MarketQuote[]> {
    const response = await this.repository.getQuote(userId, instrumentKeys);

    // Transform Upstox format to common format
    return this.transformToMarketQuote(response);
  }

  private transformToMarketQuote(response: UpstoxQuoteResponse): MarketQuote[] {
    return Object.entries(response.data).map(([key, data]) => ({
      instrumentKey: key,
      ltp: data.last_price,
      open: data.ohlc.open,
      high: data.ohlc.high,
      low: data.ohlc.low,
      close: data.ohlc.close,
      volume: data.volume,
      bid: data.depth.buy[0]?.price || 0,
      ask: data.depth.sell[0]?.price || 0,
      bidSize: data.depth.buy[0]?.quantity || 0,
      askSize: data.depth.sell[0]?.quantity || 0,
      timestamp: new Date(data.last_trade_time),
    }));
  }
}
```

### 3.4 Module Registration

**File:** `src/providers/upstox/api/market-data/market-data.module.ts`

```typescript
@Module({
  imports: [CoreModule],
  providers: [MarketDataRepository, MarketDataService],
  exports: [MarketDataService],
})
export class MarketDataModule {}
```

**File:** `src/providers/upstox/api/api.module.ts`

```typescript
@Module({
  imports: [MarketDataModule, HistoricalModule, OrdersModule, PortfolioModule],
  exports: [MarketDataModule, HistoricalModule, OrdersModule, PortfolioModule],
})
export class UpstoxApiModule {}
```

**File:** `src/providers/upstox/upstox.module.ts`

```typescript
@Global()
@Module({
  imports: [CoreModule, AuthModule, RateLimiterModule, UpstoxApiModule],
  providers: [UpstoxProvider],
  exports: [UpstoxProvider],
})
export class UpstoxModule {}
```

### 3.5 Provider Facade

**File:** `src/providers/upstox/upstox.provider.ts`

```typescript
@Injectable()
export class UpstoxProvider
  extends BaseProvider
  implements IMarketDataProvider, IOrderProvider
{
  readonly name = "Upstox";
  readonly version = "2.0";
  readonly supportedFeatures = {
    marketData: true,
    historicalData: true,
    orders: true,
    portfolio: true,
    websocket: true,
    optionChain: true,
  };

  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly ordersService: OrdersService,
    private readonly portfolioService: PortfolioService
  ) {
    super("UpstoxProvider");
  }

  protected async onInitialize(config: ProviderConfig): Promise<void> {
    // Initialize provider-specific config
  }

  protected async performHealthCheck(): Promise<boolean> {
    try {
      // Ping Upstox API
      return true;
    } catch {
      return false;
    }
  }

  // Delegate to services
  async getFullMarketQuote(
    userId: string,
    instrumentKeys: string[]
  ): Promise<MarketQuote[]> {
    this.ensureInitialized();
    return this.marketDataService.getFullMarketQuote(userId, instrumentKeys);
  }

  async placeOrder(userId: string, params: OrderParams): Promise<Order> {
    this.ensureInitialized();
    return this.ordersService.placeOrder(userId, params);
  }
}
```

---

## Phase 4: WebSocket Multiplexer

### 4.1 Socket Pool Service

**File:** `src/multiplexer/socket-pool.ts`

```typescript
export class SocketPool {
  private readonly sockets = new Map<string, UpstoxWebSocket>();
  private readonly MAX_SOCKETS = 5;

  async createSocket(userId: string): Promise<UpstoxWebSocket> {
    if (this.sockets.size >= this.MAX_SOCKETS) {
      throw new Error("Max socket limit reached");
    }

    const authUrl = await this.getAuthorizedUrl(userId);
    const socket = new UpstoxWebSocket(authUrl);

    await socket.connect();
    this.sockets.set(socket.id, socket);

    return socket;
  }

  getSockets(): UpstoxWebSocket[] {
    return Array.from(this.sockets.values());
  }

  getSocket(id: string): UpstoxWebSocket | undefined {
    return this.sockets.get(id);
  }
}
```

---

## Phase 5: Testing

### 5.1 Unit Tests

```typescript
// src/auth/auth-manager.service.spec.ts
describe("AuthManagerService", () => {
  it("should return cached token from Redis", async () => {
    redis.get.mockResolvedValue("cached_token");
    const token = await authManager.getAccessToken("user123", "upstox");
    expect(token).toBe("cached_token");
  });

  it("should fallback to MongoDB on cache miss", async () => {
    redis.get.mockResolvedValue(null);
    accountRepository.findOne.mockResolvedValue({
      accessToken: "db_token",
    });

    const token = await authManager.getAccessToken("user123", "upstox");
    expect(token).toBe("db_token");
  });
});
```

### 5.2 Integration Tests

```typescript
// src/providers/upstox/upstox.provider.integration.spec.ts
describe("UpstoxProvider (Integration)", () => {
  it("should fetch real market quote from sandbox", async () => {
    const quote = await upstox.getFullMarketQuote("user123", [
      "NSE_INDEX|Nifty 50",
    ]);
    expect(quote).toHaveLength(1);
    expect(quote[0].ltp).toBeGreaterThan(0);
  });
});
```

---

## Implementation Checklist

### Core (Phase 1) ✅

- [x] Provider interfaces
- [x] Base provider class
- [x] Provider registry
- [x] Provider factory
- [x] HTTP client service
- [x] Rate limiter
- [x] Circuit breaker
- [x] Error hierarchy

### Auth (Phase 2)

- [ ] Enhanced AuthManager with Redis cache
- [ ] Token refresh service
- [ ] Background refresh job
- [ ] Sandbox/Live mode support

### Upstox Provider (Phase 3)

- [ ] Module structure setup
- [ ] Market data repository
- [ ] Market data service
- [ ] Historical data repository
- [ ] Historical data service
- [ ] Orders repository
- [ ] Orders service
- [ ] Portfolio repository
- [ ] Portfolio service
- [ ] Provider facade

### WebSocket (Phase 4)

- [ ] Socket pool service
- [ ] Subscription manager
- [ ] Bin packer algorithm
- [ ] Priority queue
- [ ] Heartbeat service

### Testing (Phase 5)

- [ ] Unit tests for auth
- [ ] Unit tests for rate limiter
- [ ] Unit tests for circuit breaker
- [ ] Integration tests for Upstox
- [ ] E2E tests for full workflow

---

## Development Workflow

1. **Create module structure** (directories + empty files)
2. **Implement repository layer** (HTTP calls)
3. **Implement service layer** (business logic + transformations)
4. **Create DTOs** (Zod schemas)
5. **Wire modules** (imports/exports)
6. **Register in provider** (facade pattern)
7. **Write tests** (unit + integration)
8. **Update exports** (src/index.ts)

---

## Next Steps

1. Implement Phase 2 (Auth Manager enhancements)
2. Implement Phase 3 (Upstox provider with cascading modules)
3. Test with sandbox credentials
4. Implement Phase 4 (WebSocket multiplexer)
5. Deploy to algo-worker and test E2E

---

**Last Updated:** January 14, 2026
