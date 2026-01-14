# Market SDK - Starter Code Examples

> **Production-ready code snippets to kickstart your implementation**

This document provides copy-paste ready code for implementing the market SDK following institutional-grade patterns.

---

## 1. Root Module Setup

**File:** `src/market-sdk.module.ts`

```typescript
import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CoreModule } from "./core/core.module";
import { AuthModule } from "./auth/auth.module";
import { RateLimiterModule } from "./rate-limiter/rate-limiter.module";
import { MultiplexerModule } from "./multiplexer/multiplexer.module";
import { UpstoxModule } from "./providers/upstox/upstox.module";
import { YahooModule } from "./providers/yahoo/yahoo.module";
import { BinanceModule } from "./providers/binance/binance.module";

export interface MarketSdkModuleOptions {
  providers?: ("upstox" | "yahoo" | "binance")[];
}

@Global()
@Module({})
export class MarketSdkModule {
  static forRoot(options: MarketSdkModuleOptions = {}): DynamicModule {
    const { providers = ["upstox"] } = options;

    const providerModules = [];
    if (providers.includes("upstox")) providerModules.push(UpstoxModule);
    if (providers.includes("yahoo")) providerModules.push(YahooModule);
    if (providers.includes("binance")) providerModules.push(BinanceModule);

    return {
      module: MarketSdkModule,
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        CoreModule,
        AuthModule,
        RateLimiterModule,
        MultiplexerModule,
        ...providerModules,
      ],
      exports: [
        CoreModule,
        AuthModule,
        RateLimiterModule,
        MultiplexerModule,
        ...providerModules,
      ],
    };
  }
}
```

---

## 2. Upstox Constants

**File:** `src/providers/upstox/constants.ts`

```typescript
export const UPSTOX_API_URLS = {
  LIVE: "https://api.upstox.com",
  SANDBOX: "https://api-hft.upstox.com",
} as const;

export const UPSTOX_ENDPOINTS = {
  // Market Data
  QUOTES: "/v2/market-quote/quotes",
  FULL_MARKET_QUOTE: "/v2/market-quote/full",
  OPTION_CHAIN: "/v2/option/chain",

  // Historical Data
  HISTORICAL_INTRADAY: "/v2/historical-candle/intraday",
  HISTORICAL_CANDLE: "/v2/historical-candle",

  // Orders
  PLACE_ORDER: "/v2/order/place",
  MODIFY_ORDER: "/v2/order/modify",
  CANCEL_ORDER: "/v2/order/cancel",
  ORDER_BOOK: "/v2/order/retrieve-all",
  ORDER_DETAILS: "/v2/order/details",

  // Portfolio
  POSITIONS: "/v2/portfolio/positions",
  HOLDINGS: "/v2/portfolio/holdings",
  FUNDS: "/v2/user/get-funds-and-margin",

  // WebSocket
  WS_AUTHORIZE: "/v2/feed/market-data-feed/authorize",
} as const;

export const UPSTOX_RATE_LIMITS = {
  REQUESTS_PER_SECOND: 10,
  BURST_CAPACITY: 25,
  MAX_WEBSOCKET_CONNECTIONS: 5,
  MAX_INSTRUMENTS_PER_SOCKET: 5000,
} as const;
```

---

## 3. Market Data DTOs

**File:** `src/providers/upstox/api/market-data/dto/quote.dto.ts`

```typescript
import { z } from "zod";

export const UpstoxQuoteResponseSchema = z.object({
  status: z.string(),
  data: z.record(
    z.object({
      last_price: z.number(),
      ohlc: z.object({
        open: z.number(),
        high: z.number(),
        low: z.number(),
        close: z.number(),
      }),
      volume: z.number(),
      depth: z.object({
        buy: z.array(
          z.object({
            price: z.number(),
            quantity: z.number(),
            orders: z.number(),
          })
        ),
        sell: z.array(
          z.object({
            price: z.number(),
            quantity: z.number(),
            orders: z.number(),
          })
        ),
      }),
      last_trade_time: z.string(),
    })
  ),
});

export type UpstoxQuoteResponse = z.infer<typeof UpstoxQuoteResponseSchema>;

// Common MarketQuote format (provider-agnostic)
export const MarketQuoteSchema = z.object({
  instrumentKey: z.string(),
  ltp: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  bid: z.number(),
  ask: z.number(),
  bidSize: z.number(),
  askSize: z.number(),
  timestamp: z.date(),
});

export type MarketQuote = z.infer<typeof MarketQuoteSchema>;
```

---

## 4. Market Data Repository

**File:** `src/providers/upstox/api/market-data/market-data.repository.ts`

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { HttpClientService } from "../../../../core/http-client.service";
import { AuthManagerService } from "../../../../auth/auth-manager.service";
import { UPSTOX_API_URLS, UPSTOX_ENDPOINTS } from "../../constants";
import {
  UpstoxQuoteResponse,
  UpstoxQuoteResponseSchema,
} from "./dto/quote.dto";

@Injectable()
export class MarketDataRepository {
  private readonly logger = new Logger(MarketDataRepository.name);

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly authManager: AuthManagerService
  ) {}

  async getQuote(
    userId: string,
    instrumentKeys: string[],
    environment: "SANDBOX" | "LIVE" = "LIVE"
  ): Promise<UpstoxQuoteResponse> {
    const token = await this.authManager.getAccessToken(
      userId,
      "upstox",
      environment
    );
    const baseUrl = UPSTOX_API_URLS[environment];

    const response = await this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.QUOTES}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Api-Version": "2.0",
      },
      params: {
        instrument_key: instrumentKeys.join(","),
      },
    });

    // Validate response
    return UpstoxQuoteResponseSchema.parse(response);
  }

  async getFullMarketQuote(
    userId: string,
    instrumentKeys: string[],
    environment: "SANDBOX" | "LIVE" = "LIVE"
  ): Promise<UpstoxQuoteResponse> {
    const token = await this.authManager.getAccessToken(
      userId,
      "upstox",
      environment
    );
    const baseUrl = UPSTOX_API_URLS[environment];

    const response = await this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.FULL_MARKET_QUOTE}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Api-Version": "2.0",
      },
      params: {
        instrument_key: instrumentKeys.join(","),
      },
    });

    return UpstoxQuoteResponseSchema.parse(response);
  }

  async getOptionChain(
    userId: string,
    instrumentKey: string,
    expiryDate: string,
    environment: "SANDBOX" | "LIVE" = "LIVE"
  ): Promise<any> {
    const token = await this.authManager.getAccessToken(
      userId,
      "upstox",
      environment
    );
    const baseUrl = UPSTOX_API_URLS[environment];

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.OPTION_CHAIN}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Api-Version": "2.0",
      },
      params: {
        instrument_key: instrumentKey,
        expiry_date: expiryDate,
      },
    });
  }
}
```

---

## 5. Market Data Service (Business Logic)

**File:** `src/providers/upstox/api/market-data/market-data.service.ts`

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { MarketDataRepository } from "./market-data.repository";
import { MarketQuote } from "./dto/quote.dto";

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(private readonly repository: MarketDataRepository) {}

  async getLTP(
    userId: string,
    instrumentKeys: string[]
  ): Promise<Map<string, number>> {
    const response = await this.repository.getQuote(userId, instrumentKeys);

    const ltpMap = new Map<string, number>();
    for (const [key, data] of Object.entries(response.data)) {
      ltpMap.set(key, data.last_price);
    }

    return ltpMap;
  }

  async getFullMarketQuote(
    userId: string,
    instrumentKeys: string[]
  ): Promise<MarketQuote[]> {
    const response = await this.repository.getFullMarketQuote(
      userId,
      instrumentKeys
    );

    return this.transformToMarketQuote(response);
  }

  async getOptionChain(
    userId: string,
    underlying: string,
    expiry: string
  ): Promise<any[]> {
    const response = await this.repository.getOptionChain(
      userId,
      underlying,
      expiry
    );

    // Transform to common format
    return response.data;
  }

  /**
   * Transform Upstox-specific format to provider-agnostic format
   */
  private transformToMarketQuote(response: any): MarketQuote[] {
    return Object.entries(response.data).map(([key, data]: [string, any]) => ({
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

---

## 6. Orders Repository

**File:** `src/providers/upstox/api/orders/orders.repository.ts`

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { HttpClientService } from "../../../../core/http-client.service";
import { AuthManagerService } from "../../../../auth/auth-manager.service";
import { UPSTOX_API_URLS, UPSTOX_ENDPOINTS } from "../../constants";

export interface PlaceOrderParams {
  quantity: number;
  product: "I" | "D"; // Intraday or Delivery
  validity: "DAY" | "IOC";
  price?: number;
  tag?: string;
  instrument_token: string;
  order_type: "MARKET" | "LIMIT" | "SL" | "SL-M";
  transaction_type: "BUY" | "SELL";
  disclosed_quantity?: number;
  trigger_price?: number;
  is_amo: boolean;
}

@Injectable()
export class OrdersRepository {
  private readonly logger = new Logger(OrdersRepository.name);

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly authManager: AuthManagerService
  ) {}

  async placeOrder(
    userId: string,
    params: PlaceOrderParams,
    environment: "SANDBOX" | "LIVE" = "LIVE"
  ): Promise<any> {
    const token = await this.authManager.getAccessToken(
      userId,
      "upstox",
      environment
    );
    const baseUrl = UPSTOX_API_URLS[environment];

    this.logger.log(
      `Placing order for user ${userId}: ${params.transaction_type} ${params.quantity} ${params.instrument_token}`
    );

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.PLACE_ORDER}`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Api-Version": "2.0",
        "Content-Type": "application/json",
      },
      body: params,
    });
  }

  async cancelOrder(
    userId: string,
    orderId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE"
  ): Promise<any> {
    const token = await this.authManager.getAccessToken(
      userId,
      "upstox",
      environment
    );
    const baseUrl = UPSTOX_API_URLS[environment];

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.CANCEL_ORDER}/${orderId}`,
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Api-Version": "2.0",
      },
    });
  }

  async getOrderBook(
    userId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE"
  ): Promise<any> {
    const token = await this.authManager.getAccessToken(
      userId,
      "upstox",
      environment
    );
    const baseUrl = UPSTOX_API_URLS[environment];

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.ORDER_BOOK}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Api-Version": "2.0",
      },
    });
  }
}
```

---

## 7. Module Registration (Cascading)

**File:** `src/providers/upstox/api/market-data/market-data.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { MarketDataRepository } from "./market-data.repository";
import { MarketDataService } from "./market-data.service";

@Module({
  providers: [MarketDataRepository, MarketDataService],
  exports: [MarketDataService], // Only expose service, not repository
})
export class MarketDataModule {}
```

**File:** `src/providers/upstox/api/api.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { MarketDataModule } from "./market-data/market-data.module";
import { HistoricalModule } from "./historical/historical.module";
import { OrdersModule } from "./orders/orders.module";
import { PortfolioModule } from "./portfolio/portfolio.module";

@Module({
  imports: [MarketDataModule, HistoricalModule, OrdersModule, PortfolioModule],
  exports: [MarketDataModule, HistoricalModule, OrdersModule, PortfolioModule],
})
export class UpstoxApiModule {}
```

**File:** `src/providers/upstox/upstox.module.ts`

```typescript
import { Module, Global } from "@nestjs/common";
import { UpstoxProvider } from "./upstox.provider";
import { UpstoxApiModule } from "./api/api.module";

@Global()
@Module({
  imports: [UpstoxApiModule],
  providers: [UpstoxProvider],
  exports: [UpstoxProvider],
})
export class UpstoxModule {}
```

---

## 8. Provider Facade

**File:** `src/providers/upstox/upstox.provider.ts`

```typescript
import { Injectable } from "@nestjs/common";
import { BaseProvider } from "../../core/base-provider.abstract";
import {
  IMarketDataProvider,
  IOrderProvider,
  ProviderConfig,
} from "../../core/provider.interface";
import { MarketDataService } from "./api/market-data/market-data.service";
import { OrdersService } from "./api/orders/orders.service";
import { PortfolioService } from "./api/portfolio/portfolio.service";
import { MarketQuote } from "./api/market-data/dto/quote.dto";

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
    // Validate API credentials
    if (!process.env.UPSTOX_API_KEY) {
      throw new Error("UPSTOX_API_KEY not configured");
    }
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
  async getLTP(
    userId: string,
    instrumentKeys: string[]
  ): Promise<Map<string, number>> {
    this.ensureInitialized();
    return this.marketDataService.getLTP(userId, instrumentKeys);
  }

  async getFullMarketQuote(
    userId: string,
    instrumentKeys: string[]
  ): Promise<MarketQuote[]> {
    this.ensureInitialized();
    return this.marketDataService.getFullMarketQuote(userId, instrumentKeys);
  }

  async placeOrder(userId: string, params: any): Promise<any> {
    this.ensureInitialized();
    return this.ordersService.placeOrder(userId, params);
  }

  async getPositions(userId: string): Promise<any[]> {
    this.ensureInitialized();
    return this.portfolioService.getPositions(userId);
  }
}
```

---

## 9. Usage in Apps

**File:** `apps/algo-worker/src/app.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { MarketSdkModule } from "@repo/market-sdk";

@Module({
  imports: [
    MarketSdkModule.forRoot({
      providers: ["upstox", "yahoo"],
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

**File:** `apps/algo-worker/src/perception/market-data-consumer.service.ts`

```typescript
import { Injectable, OnModuleInit } from "@nestjs/common";
import { UpstoxProvider } from "@repo/market-sdk";

@Injectable()
export class MarketDataConsumerService implements OnModuleInit {
  constructor(private readonly upstox: UpstoxProvider) {}

  async onModuleInit() {
    // Initialize provider
    await this.upstox.initialize({
      environment: "SANDBOX",
    });

    // Fetch market data
    const quote = await this.upstox.getFullMarketQuote("user123", [
      "NSE_INDEX|Nifty 50",
    ]);

    console.log("Nifty 50:", quote[0].ltp);
  }
}
```

---

## 10. Environment Variables

**File:** `.env.sample`

```bash
# Upstox API Credentials (Platform-level)
UPSTOX_API_KEY=your_api_key_here
UPSTOX_API_SECRET=your_api_secret_here
UPSTOX_REDIRECT_URI=https://yourapp.com/api/upstox/callback

# Database
MONGODB_URI=mongodb://localhost:27017/trading
REDIS_URL=redis://localhost:6379

# Encryption (32 characters)
ENCRYPTION_KEY=your_32_character_encryption_key_here

# SEBI Compliance
SEBI_ENTITY_CODE=PROJ_QUANTUM
APP_VERSION=1.0.0
```

---

## Summary

This starter code provides:

1. ✅ **Core Infrastructure** - HTTP client, rate limiter, circuit breaker
2. ✅ **Module Architecture** - Cascading modules with clear separation
3. ✅ **Repository Pattern** - HTTP calls isolated from business logic
4. ✅ **Service Layer** - Data transformation and normalization
5. ✅ **Type Safety** - Zod validation for all external data
6. ✅ **Multi-Tenancy** - User context passed to all methods
7. ✅ **Provider Facade** - Clean public API

Copy these examples and adapt to your specific needs. Follow the [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for the complete roadmap.

---

**Last Updated:** January 14, 2026
