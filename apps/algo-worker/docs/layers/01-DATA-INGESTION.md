# Layer 1: Data Ingestion

**Purpose**: Interface to market data feeds and publish timestamped events

---

## Overview

The Data Ingestion layer connects to external market data sources (Upstox WebSocket API) and publishes normalized, timestamped events to the internal event bus (Redis Streams).

---

## Components

### MarketDataGateway

- Upstox WebSocket connection manager
- Handles 1s OHLCV candles
- L20 order book depth
- Real-time Greeks (IV, Delta, Gamma, Theta, Vega)
- NIFTY/BANKNIFTY spot & futures prices

### DataNormalizer

- Ensures consistent timestamp format
- Handles out-of-order data
- Validates data integrity
- Converts to canonical format

### StreamPublisher

- Publishes to Redis Streams (`stream:market-data`)
- Guaranteed event ordering
- Consumer group support for load balancing

---

## Data Sources

**Upstox API**:

- 1-second OHLCV candles
- 20-level order book depth
- Option chain with Greeks
- Real-time spot/futures prices

**Additional Sources** (Future):

- NSE official feeds
- Alternative data providers

---

## Event Format

```typescript
interface MarketDataEvent {
  timestamp: number;
  symbol: string;
  instrumentKey: string;
  type: 'TICK' | 'OHLCV' | 'ORDER_BOOK' | 'GREEKS';
  data: {
    price?: number;
    volume?: number;
    ohlcv?: OHLCV;
    orderBook?: OrderBookDepth;
    greeks?: GreeksData;
  };
}
```

---

## Performance Considerations

- **Latency Target**: <5ms from WebSocket receive to Redis publish
- **Connection Resilience**: Auto-reconnect with exponential backoff
- **Rate Limiting**: Respect Upstox API limits (25 req/s)
- **Buffering**: In-memory ring buffer for burst handling

---

## Error Handling

- Connection drops → trigger circuit breaker
- Stale data (>5s old) → alert monitoring
- Malformed packets → log and skip
- Out-of-sequence events → reorder buffer (100ms window)

---

## Monitoring Metrics

- `data_ingestion.events_received_total`
- `data_ingestion.events_published_total`
- `data_ingestion.latency_ms` (p50, p95, p99)
- `data_ingestion.connection_errors_total`
- `data_ingestion.stale_data_total`

---

## Configuration

```typescript
// config/data-ingestion.config.ts
export const dataIngestionConfig = {
  upstox: {
    wsUrl: 'wss://api-v2.upstox.com/websocket',
    reconnectDelay: 1000,
    maxReconnectAttempts: 10,
  },
  redis: {
    stream: 'stream:market-data',
    maxLen: 10000, // Trim to last 10k events
  },
  instruments: [
    'NSE_INDEX|Nifty 50',
    'NSE_INDEX|Nifty Bank',
    // ... option instruments
  ],
};
```

---

## Testing

```typescript
describe('DataIngestionLayer', () => {
  it('should publish market data events within 5ms', async () => {
    const start = performance.now();
    await gateway.handleWebSocketMessage(mockTick);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5);
  });

  it('should handle connection drops gracefully', async () => {
    gateway.simulateDisconnect();
    await sleep(2000);
    expect(gateway.isConnected()).toBe(true);
  });
});
```

---

**See Also**:

- [ALGO_TRADING_ARCHITECTURE.md](../../../../docs/ALGO_TRADING_ARCHITECTURE.md) - System overview
- [02-FEATURE-ENGINE.md](./02-FEATURE-ENGINE.md) - Next layer
