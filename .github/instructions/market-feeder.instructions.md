---
applyTo: "services/market-feeder/**"
---

# GitHub Copilot Instructions - Market Feeder

## Role & Context

You are working on the **Market Feeder** - a specialized NestJS microservice responsible for ingesting real-time market data from external providers (Upstox, Yahoo Finance, Binance) and distributing it to other services.

## Application Overview

**Purpose**: Real-time market data ingestion and distribution
**Port**: 3002
**Stack**: NestJS, WebSocket, QuestDB, Redis, @repo/market-sdk

**Data Flow**:

```
External Providers (Upstox WebSocket)
  ↓
Market Feeder (this app)
  ↓
├─> QuestDB (time-series storage: ticks, candles)
└─> Redis Pub/Sub (real-time distribution to other apps)
```

## Architecture Rules

### 1. Use @repo/market-sdk for All Market Data

**NEVER directly connect to external APIs:**

```typescript
// ✅ CORRECT - Use market-sdk
import { UpstoxClient, MarketDataStream } from "@repo/market-sdk";

const client = new UpstoxClient(config);
const stream = client.createMarketDataStream();
await stream.subscribe(["ltpc", "option_greeks"], instruments);

// ❌ WRONG - Direct WebSocket connection
const ws = new WebSocket("wss://api.upstox.com/..."); // NEVER
```

### 2. Database Package for Storage

**Use @repo/database for QuestDB and Redis:**

```typescript
// ✅ CORRECT
import { QuestDBService, RedisService } from "@repo/database";

@Injectable()
export class MarketDataService {
  constructor(
    private readonly questdb: QuestDBService,
    private readonly redis: RedisService
  ) {}

  async handleTick(tick: TickData) {
    // Store in QuestDB
    await this.questdb.insertTicks([tick]);

    // Publish to Redis
    await this.redis.publishMarketData(tick);
  }
}
```

### 3. Schema Package for Types

```typescript
import { type TickData, type CandleData } from "@repo/schema";
```

## Core Responsibilities

### 1. WebSocket Connection Management

```typescript
@Injectable()
export class MarketDataIngestionService implements OnModuleInit {
  private stream: MarketDataStream;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;

  constructor(
    private readonly upstox: UpstoxClient,
    private readonly logger: Logger
  ) {}

  async onModuleInit() {
    await this.connectToMarketData();
  }

  private async connectToMarketData() {
    try {
      this.stream = this.upstox.createMarketDataStream();

      // Handle different message types
      this.stream.on("ltpc", (data) => this.handleLTPC(data));
      this.stream.on("option_greeks", (data) => this.handleGreeks(data));
      this.stream.on("error", (error) => this.handleError(error));
      this.stream.on("close", () => this.handleClose());

      // Subscribe to instruments
      const instruments = await this.getActiveInstruments();
      await this.stream.subscribe(["ltpc", "option_greeks"], instruments);

      this.logger.log("Connected to market data stream");
      this.reconnectAttempts = 0;
    } catch (error) {
      this.logger.error("Failed to connect to market data", error);
      await this.reconnect();
    }
  }

  private async reconnect() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error("Max reconnect attempts reached. Giving up.");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.logger.warn(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    await new Promise((resolve) => setTimeout(resolve, delay));
    await this.connectToMarketData();
  }
}
```

### 2. Data Processing Pipeline

```typescript
@Injectable()
export class DataProcessingService {
  constructor(
    private readonly questdb: QuestDBService,
    private readonly redis: RedisService,
    private readonly logger: Logger
  ) {}

  async handleLTPC(data: any) {
    try {
      // Transform to TickData
      const tick: TickData = {
        timestamp: new Date(data.timestamp),
        symbol: data.instrument_key,
        ltp: data.last_price,
        volume: data.volume,
        oi: data.oi,
        bid: data.best_bid_price,
        ask: data.best_ask_price,
        bidQty: data.best_bid_quantity,
        askQty: data.best_ask_quantity,
      };

      // Store in QuestDB (batched for performance)
      await this.questdb.insertTicks([tick]);

      // Publish to Redis for real-time consumers
      await this.redis.publishMarketData({
        type: "tick",
        data: tick,
      });

      this.logger.debug(`Processed tick for ${tick.symbol}`);
    } catch (error) {
      this.logger.error("Error processing LTPC data", error);
    }
  }

  async handleGreeks(data: any) {
    try {
      const greeks = {
        timestamp: new Date(data.timestamp),
        symbol: data.instrument_key,
        delta: data.delta,
        gamma: data.gamma,
        vega: data.vega,
        theta: data.theta,
        iv: data.iv,
      };

      // Store Greeks in QuestDB
      await this.questdb.query(`
        INSERT INTO option_greeks (
          timestamp, symbol, delta, gamma, vega, theta, iv
        ) VALUES (
          '${greeks.timestamp.toISOString()}',
          '${greeks.symbol}',
          ${greeks.delta},
          ${greeks.gamma},
          ${greeks.vega},
          ${greeks.theta},
          ${greeks.iv}
        )
      `);

      // Publish to Redis
      await this.redis.publishMarketData({
        type: "greeks",
        data: greeks,
      });
    } catch (error) {
      this.logger.error("Error processing Greeks data", error);
    }
  }
}
```

### 3. Candle Generation

```typescript
@Injectable()
export class CandleGeneratorService {
  private candleBuffers: Map<string, TickData[]> = new Map();
  private candleInterval = 60000; // 1 minute

  constructor(
    private readonly questdb: QuestDBService,
    private readonly redis: RedisService
  ) {
    // Generate candles every minute
    setInterval(() => this.generateCandles(), this.candleInterval);
  }

  addTick(tick: TickData) {
    const key = `${tick.symbol}_${this.getCandleKey(tick.timestamp)}`;

    if (!this.candleBuffers.has(key)) {
      this.candleBuffers.set(key, []);
    }

    this.candleBuffers.get(key)!.push(tick);
  }

  private async generateCandles() {
    for (const [key, ticks] of this.candleBuffers.entries()) {
      if (ticks.length === 0) continue;

      const candle: CandleData = {
        timestamp: new Date(
          Math.floor(ticks[0].timestamp.getTime() / this.candleInterval) *
            this.candleInterval
        ),
        symbol: ticks[0].symbol,
        open: ticks[0].ltp,
        high: Math.max(...ticks.map((t) => t.ltp)),
        low: Math.min(...ticks.map((t) => t.ltp)),
        close: ticks[ticks.length - 1].ltp,
        volume: ticks.reduce((sum, t) => sum + t.volume, 0),
        interval: "1m",
      };

      // Store candle
      await this.questdb.insertCandles([candle]);

      // Publish to Redis
      await this.redis.publishMarketData({
        type: "candle",
        data: candle,
      });

      // Clear buffer
      this.candleBuffers.delete(key);
    }
  }

  private getCandleKey(timestamp: Date): string {
    return Math.floor(timestamp.getTime() / this.candleInterval).toString();
  }
}
```

### 4. Health Monitoring

```typescript
@Injectable()
export class HealthService {
  private lastDataTimestamp: Date = new Date();
  private isConnected = false;

  @Get("health")
  async getHealth(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    checks: any;
  }> {
    const now = Date.now();
    const dataAge = now - this.lastDataTimestamp.getTime();
    const isDataFresh = dataAge < 10000; // 10 seconds

    const checks = {
      websocket: this.isConnected ? "healthy" : "unhealthy",
      dataFreshness: isDataFresh ? "healthy" : "degraded",
      questdb: (await this.questdb.healthCheck()) ? "healthy" : "unhealthy",
      redis: (await this.redis.healthCheck()) ? "healthy" : "unhealthy",
    };

    const status = Object.values(checks).every((c) => c === "healthy")
      ? "healthy"
      : Object.values(checks).some((c) => c === "unhealthy")
        ? "unhealthy"
        : "degraded";

    return { status, checks };
  }

  updateLastDataTimestamp() {
    this.lastDataTimestamp = new Date();
  }

  setConnectionStatus(connected: boolean) {
    this.isConnected = connected;
  }
}
```

## Error Handling & Resilience

### 1. Circuit Breaker Pattern

```typescript
import { CircuitBreaker } from "@nestjs/common";

@Injectable()
export class ResilientDataService {
  private circuitBreaker = new CircuitBreaker({
    threshold: 5, // Open after 5 failures
    timeout: 60000, // Reset after 1 minute
  });

  async writeToQuestDB(data: any) {
    if (this.circuitBreaker.isOpen()) {
      this.logger.warn("Circuit breaker open, skipping QuestDB write");
      return;
    }

    try {
      await this.questdb.insertTicks(data);
      this.circuitBreaker.recordSuccess();
    } catch (error) {
      this.circuitBreaker.recordFailure();
      this.logger.error("QuestDB write failed", error);
    }
  }
}
```

### 2. Graceful Shutdown

```typescript
@Injectable()
export class AppService implements OnModuleDestroy {
  async onModuleDestroy() {
    this.logger.log("Shutting down gracefully...");

    // Close WebSocket connections
    await this.stream.close();

    // Flush remaining data to QuestDB
    await this.flushBuffers();

    this.logger.log("Shutdown complete");
  }
}
```

## Performance Optimization

### 1. Batch Writes to QuestDB

```typescript
private batchBuffer: TickData[] = [];
private readonly BATCH_SIZE = 1000;
private readonly BATCH_INTERVAL = 5000; // 5 seconds

async bufferTick(tick: TickData) {
  this.batchBuffer.push(tick);

  if (this.batchBuffer.length >= this.BATCH_SIZE) {
    await this.flushBuffer();
  }
}

private async flushBuffer() {
  if (this.batchBuffer.length === 0) return;

  const toWrite = [...this.batchBuffer];
  this.batchBuffer = [];

  await this.questdb.insertTicks(toWrite);
}
```

### 2. Rate Limiting Redis Publishes

```typescript
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 100, ttl: 1000 } }) // 100 per second
async publishData(data: any) {
  await this.redis.publishMarketData(data);
}
```

## Configuration

```typescript
export default registerAs("market-feeder", () => ({
  upstox: {
    apiKey: process.env.UPSTOX_API_KEY,
    apiSecret: process.env.UPSTOX_API_SECRET,
    redirectUri: process.env.UPSTOX_REDIRECT_URI,
  },
  questdb: {
    host: process.env.QUESTDB_HOST || "localhost",
    port: parseInt(process.env.QUESTDB_PORT || "8812"),
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
  instruments: {
    symbols: process.env.INSTRUMENTS?.split(",") || ["NIFTY50"],
    refreshInterval: 3600000, // 1 hour
  },
  batching: {
    size: parseInt(process.env.BATCH_SIZE || "1000"),
    interval: parseInt(process.env.BATCH_INTERVAL || "5000"),
  },
}));
```

## Testing

```typescript
describe("MarketDataService", () => {
  it("should process tick data correctly", async () => {
    const tick = {
      timestamp: new Date(),
      symbol: "NIFTY50",
      ltp: 19500,
      volume: 1000,
    };

    await service.handleTick(tick);

    expect(questdb.insertTicks).toHaveBeenCalledWith([tick]);
    expect(redis.publishMarketData).toHaveBeenCalled();
  });
});
```

## Code Quality Standards

- **Resilience**: Handle WebSocket disconnects gracefully
- **Performance**: Batch writes, optimize memory usage
- **Monitoring**: Log all connection events and errors
- **Testing**: Mock external dependencies

## When Making Changes

1. ✅ Use @repo/market-sdk for all external connections
2. ✅ Batch writes to QuestDB for performance
3. ✅ Implement reconnection logic
4. ✅ Add circuit breakers for external dependencies
5. ✅ Monitor data freshness and connection status
6. ✅ Handle graceful shutdown
7. ✅ Log all significant events

## Anti-Patterns to Avoid

❌ Direct WebSocket connections to providers  
❌ Synchronous writes to QuestDB  
❌ Missing reconnection logic  
❌ No error boundaries  
❌ Memory leaks from unbounded buffers  
❌ Missing health checks

