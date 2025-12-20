# Layer 1: Perception

> **Event consumption from Redis Streams - market data and news ingestion**

**Latency Target**: <5ms per event

---

## Purpose

The Perception layer subscribes to Redis Streams and consumes raw market events from the `market-feeder` service. It transforms external data (ticks, candles, order book, news) into internal domain events for downstream layers.

**Configuration-Aware Filtering**: Only subscribes to instruments enabled by at least one active user to reduce event processing overhead.

---

## Components

### **1. MarketDataConsumer**

**File**: `src/perception/market-data-consumer.service.ts`

**Responsibilities**:

- Subscribe to Redis Stream: `stream:market-data`
- Consume tick, candle, and order book events
- **New**: Consume pre-calculated Greeks (Delta, Gamma) from Upstox V3
- Validate schema using `@repo/schema`
- Emit internal event: `MarketDataReceivedEvent`

**Example**:

```typescript
@Injectable()
export class MarketDataConsumer implements OnModuleInit {
  constructor(
    private redis: RedisService,
    private eventBus: EventBus,
  ) {}

  async onModuleInit() {
    await this.consumeStream('stream:market-data');
  }

  private async consumeStream(streamKey: string) {
    while (true) {
      const messages = await this.redis.xread(
        'BLOCK',
        5000,
        'STREAMS',
        streamKey,
        '$',
      );

      for (const [stream, msgs] of messages) {
        for (const [id, fields] of msgs) {
          const event = this.parseMarketData(fields);
          this.eventBus.publish(new MarketDataReceivedEvent(event));
        }
      }
    }
  }
}
```

---

### **2. NewsImpactScorer** (formerly NewsConsumer)

**File**: `src/perception/news-impact-scorer.service.ts`

**Responsibilities**:

- Subscribe to Redis Stream: `stream:news`
- **RAG Analysis**: Retrieve historical context for headlines
- **LLM Scoring**: Use Phi-3 (ONNX) to score Impact (High/Low) and Sentiment
- Emit internal event: `NewsReceivedEvent`

**Example**:

```typescript
@Injectable()
export class NewsConsumer implements OnModuleInit {
  constructor(
    private redis: RedisService,
    private eventBus: EventBus,
  ) {}

  async onModuleInit() {
    await this.consumeStream('stream:news');
  }
}
```

---

## Events Consumed

### **Redis Stream: `stream:market-data`**

**Schema** (from `@repo/schema`):

```typescript
{
  symbol: string; // "NIFTY24DEC21000CE"
  timestamp: number; // Unix ms
  ltp: number; // Last traded price
  volume: number; // Volume
  oi: number; // Open interest
  bid: number;
  ask: number;
  bidQty: number;
  askQty: number;
}
```

**Source**: Published by `market-feeder` service

---

### **Redis Stream: `stream:news`**

**Schema**:

```typescript
{
  id: string;
  timestamp: number;
  headline: string;
  content: string;
  source: string; // "MoneyControl", "NSE"
  sentiment: number; // -1 to 1
}
```

**Source**: Published by `market-feeder` service

---

## Events Published (Internal)

### **`MarketDataReceivedEvent`**

```typescript
export class MarketDataReceivedEvent {
  constructor(
    public readonly symbol: string,
    public readonly timestamp: number,
    public readonly data: MarketData,
  ) {}
}
```

**Consumed By**: Cortex layer (FeatureEngineService)

---

### **`NewsReceivedEvent`**

```typescript
export class NewsReceivedEvent {
  constructor(
    public readonly id: string,
    public readonly timestamp: number,
    public readonly sentiment: number,
  ) {}
}
```

**Consumed By**: Cortex layer (SentimentAggregatorService)

---

## Error Handling

### **Connection Errors**

- **Retry Logic**: Exponential backoff (1s, 2s, 4s, 8s, max 60s)
- **Circuit Breaker**: Open after 5 consecutive failures
- **Alerting**: Emit `PerceptionLayerDownEvent` → Prometheus alert

```typescript
private async consumeWithRetry(streamKey: string) {
  let retryDelay = 1000;

  while (true) {
    try {
      await this.consumeStream(streamKey);
      retryDelay = 1000; // Reset on success
    } catch (err) {
      this.logger.error(`Stream ${streamKey} error:`, err);
      await this.sleep(retryDelay);
      retryDelay = Math.min(retryDelay * 2, 60000);
    }
  }
}
```

---

### **Schema Validation Errors**

- **Action**: Log error, skip message, emit `InvalidMessageEvent`
- **Metric**: `perception.invalid_messages_total` (Prometheus counter)

```typescript
private parseMarketData(fields: Record<string, string>): MarketData {
  try {
    return MarketDataSchema.parse(JSON.parse(fields.data));
  } catch (err) {
    this.logger.warn('Invalid market data:', err);
    this.metrics.increment('perception.invalid_messages_total');
    return null; // Skip message
  }
}
```

---

## Monitoring

### **Metrics** (Prometheus)

```typescript
perception.events_consumed_total{stream="market-data"}  // Counter
perception.events_consumed_total{stream="news"}         // Counter
perception.event_processing_duration_ms{stream="..."}   // Histogram
perception.invalid_messages_total{stream="..."}         // Counter
perception.stream_lag_ms{stream="..."}                  // Gauge
```

### **Health Check**

```typescript
@Injectable()
export class PerceptionHealthIndicator extends HealthIndicator {
  check() {
    const isHealthy = this.redis.isConnected && this.streamLag < 1000;
    return this.getStatus('perception', isHealthy, {
      streamLag: this.streamLag,
      messagesPerSecond: this.messagesPerSecond,
    });
  }
}
```

---

## Testing

### **Unit Tests**

**File**: `src/perception/__tests__/market-data-consumer.spec.ts`

```typescript
describe('MarketDataConsumer', () => {
  it('should parse valid market data', () => {
    const consumer = new MarketDataConsumer(mockRedis, mockEventBus);
    const event = consumer.parseMarketData({ data: validJson });
    expect(event).toBeDefined();
    expect(event.symbol).toBe('NIFTY24DEC21000CE');
  });

  it('should skip invalid market data', () => {
    const consumer = new MarketDataConsumer(mockRedis, mockEventBus);
    const event = consumer.parseMarketData({ data: invalidJson });
    expect(event).toBeNull();
  });
});
```

---

### **Integration Tests**

**File**: `test/perception.e2e-spec.ts`

```typescript
describe('Perception Layer (e2e)', () => {
  it('should consume from Redis Stream', async () => {
    // Publish to stream:market-data
    await redis.xadd('stream:market-data', '*', 'data', JSON.stringify(tick));

    // Wait for internal event
    const event = await waitForEvent(MarketDataReceivedEvent, 1000);
    expect(event.symbol).toBe('NIFTY24DEC21000CE');
  });
});
```

---

## Configuration

**File**: `src/config/perception.config.ts`

```typescript
export const perceptionConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  streams: {
    marketData: 'stream:market-data',
    news: 'stream:news',
  },
  consumer: {
    blockMs: 5000, // XREAD BLOCK timeout
    batchSize: 100, // Max messages per read
    consumerGroup: 'algo-worker',
    consumerId: process.env.HOSTNAME || 'worker-1',
  },
  retry: {
    initialDelayMs: 1000,
    maxDelayMs: 60000,
    maxRetries: Infinity, // Retry forever
  },
};
```

---

## Performance Targets

| Metric                | Target           | Current |
| --------------------- | ---------------- | ------- |
| Event processing time | <5ms p95         | TBD     |
| Stream lag            | <100ms           | TBD     |
| Invalid message rate  | <0.1%            | TBD     |
| Throughput            | >1000 events/sec | TBD     |

---

## Dependencies

- **Upstream**: `market-feeder` service (publishes to Redis Streams)
- **Downstream**: Cortex layer (consumes `MarketDataReceivedEvent`)
- **External**: Redis Streams

---

## See Also

- [Layer 2: Cortex](./02-CORTEX.md) - Feature engineering
- [Architecture Overview](../ARCHITECTURE.md)
- [Redis Streams Documentation](https://redis.io/docs/data-types/streams/)
