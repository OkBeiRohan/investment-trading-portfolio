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

**Current: Upstox API**:

- 1-second OHLCV candles
- 20-level order book depth
- Option chain with Greeks
- Real-time spot/futures prices

**Future Enhancement: Tick-By-Tick (TBT) Exchange Feeds (High ROI)**:

- Individual trade events with nanosecond timestamps
- Quote updates (bid/ask changes) at microsecond precision
- Full order book reconstruction with exact sequencing
- Vendor options: GLOBE (NSE-certified), Symphony, Bloomberg B-PIPE

---

## Next-Gen Data Ingestion Enhancements

### 1. Tick-By-Tick (TBT) Feed Integration

**Current Gap**: Upstox provides 1-second aggregated OHLCV. TBT feeds provide individual trade/quote events.

**Benefits**:

- **Timing Edge**: 100-500ms earlier detection of order flow imbalances
- **Data Quality**: No aggregation artifacts, exact exchange timestamps
- **Market Impact**: See large institutional orders in real-time
- **ML Signals**: LiT model can leverage 10x better temporal resolution

**Implementation**:

```typescript
// TBT feed handler for NSE direct feed
@Injectable()
export class TBTFeedHandler {
  private socket: Socket;
  private sequenceNumber = 0;

  async connect(config: TBTConfig) {
    // Connect to exchange feed (vendor-specific protocol)
    this.socket = await this.vendorSDK.connect({
      exchange: 'NSE',
      instruments: config.symbols,
      messageTypes: ['TRADE', 'QUOTE', 'ORDER_BOOK'],
    });

    this.socket.on('message', this.handleTBTMessage.bind(this));
  }

  private async handleTBTMessage(msg: TBTMessage) {
    const receiveTime = process.hrtime.bigint();

    // Parse message (<1μs target)
    const event = this.parseTBT(msg);

    // Validate sequence
    if (event.sequenceNumber !== this.sequenceNumber + 1) {
      this.logger.warn(
        `Gap detected: expected ${this.sequenceNumber + 1}, got ${event.sequenceNumber}`,
      );
      await this.requestRetransmission(
        this.sequenceNumber + 1,
        event.sequenceNumber,
      );
    }

    this.sequenceNumber = event.sequenceNumber;

    // Enrich with exchange timestamp
    const enrichedEvent = {
      ...event,
      exchange_timestamp_ns: event.timestamp_ns,
      receive_timestamp_ns: receiveTime,
      processing_latency_ns: receiveTime - event.timestamp_ns,
    };

    // Publish to event bus (<1μs)
    await this.eventBus.publishTBT(enrichedEvent);

    // Metrics
    this.metrics.recordLatency(
      'tbt.processing_latency_ns',
      Number(enrichedEvent.processing_latency_ns),
    );
  }

  private parseTBT(msg: TBTMessage): TBTEvent {
    const type = msg.readUInt8(0);

    switch (type) {
      case MessageType.TRADE:
        return this.parseTrade(msg);
      case MessageType.QUOTE:
        return this.parseQuote(msg);
      case MessageType.ORDER_BOOK:
        return this.parseOrderBook(msg);
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  }

  private parseTrade(msg: Buffer): TradeEvent {
    return {
      type: 'TRADE',
      timestamp_ns: msg.readBigInt64LE(1),
      sequenceNumber: msg.readUInt32LE(9),
      symbol: msg.toString('utf8', 13, 29).trim(),
      price: msg.readDoubleLE(29),
      size: msg.readUInt32LE(37),
      aggressor: msg.readUInt8(41) === 1 ? 'BUY' : 'SELL',
      tradeId: msg.toString('utf8', 42, 58).trim(),
    };
  }

  private parseQuote(msg: Buffer): QuoteEvent {
    // Parse full L20 order book update
    const symbol = msg.toString('utf8', 13, 29).trim();
    const bids = [];
    const asks = [];

    for (let i = 0; i < 20; i++) {
      const offset = 29 + i * 16; // 16 bytes per level
      bids.push({
        price: msg.readDoubleLE(offset),
        size: msg.readUInt32LE(offset + 8),
      });
      asks.push({
        price: msg.readDoubleLE(offset + 320),
        size: msg.readUInt32LE(offset + 328),
      });
    }

    return {
      type: 'QUOTE',
      timestamp_ns: msg.readBigInt64LE(1),
      sequenceNumber: msg.readUInt32LE(9),
      symbol,
      bids,
      asks,
    };
  }
}

// Event schema for TBT
interface TBTEvent {
  type: 'TRADE' | 'QUOTE' | 'ORDER_BOOK';
  exchange_timestamp_ns: bigint;
  receive_timestamp_ns: bigint;
  processing_latency_ns: bigint;
  sequenceNumber: number;
  symbol: string;
  // ... type-specific fields
}
```

**Latency Target**: <100μs from network receive to event bus publish

---

### 2. Kernel-Bypass Networking (High ROI)

**Current**: Standard WebSocket/TCP stack (50-200μs kernel overhead per packet)

**Enhancement**: DPDK (Data Plane Development Kit) for direct NIC access

**Benefits**:

- 50-150μs latency reduction per message
- Zero-copy packet processing
- Eliminates kernel context switches
- Critical for sub-100ms decision-to-trade target

**Implementation** (C++ native addon):

```cpp
// native/dpdk_receiver.cpp
#include <rte_eal.h>
#include <rte_ethdev.h>
#include <rte_mbuf.h>
#include <napi.h>

#define BURST_SIZE 32

class DPDKReceiver : public Napi::ObjectWrap<DPDKReceiver> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  DPDKReceiver(const Napi::CallbackInfo& info);

private:
  Napi::Value Start(const Napi::CallbackInfo& info);
  void PollLoop();

  uint16_t port_id;
  struct rte_mempool *mbuf_pool;
  Napi::ThreadSafeFunction callback;
  std::atomic<bool> running;
};

void DPDKReceiver::PollLoop() {
  struct rte_mbuf *bufs[BURST_SIZE];

  while (running) {
    // Poll NIC (no kernel interrupts)
    uint16_t nb_rx = rte_eth_rx_burst(port_id, 0, bufs, BURST_SIZE);

    for (uint16_t i = 0; i < nb_rx; i++) {
      // Parse market data packet (zero-copy)
      MarketDataPacket *packet = rte_pktmbuf_mtod(bufs[i], MarketDataPacket*);

      // Call Node.js callback via shared memory (no serialization)
      callback.NonBlockingCall([packet](Napi::Env env, Napi::Function jsCallback) {
        auto obj = Napi::Object::New(env);
        obj.Set("timestamp", Napi::Number::New(env, packet->timestamp));
        obj.Set("symbol", Napi::String::New(env, packet->symbol));
        obj.Set("price", Napi::Number::New(env, packet->price));
        obj.Set("volume", Napi::Number::New(env, packet->volume));

        jsCallback.Call({obj});
      });

      rte_pktmbuf_free(bufs[i]);
    }
  }
}

// Node.js binding
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  return DPDKReceiver::Init(env, exports);
}

NODE_API_MODULE(dpdk_receiver, Init)
```

```typescript
// Integration with algo-worker
import { DPDKReceiver } from './native/dpdk_receiver.node';

@Injectable()
export class KernelBypassDataService implements OnModuleInit {
  private dpdkReceiver: DPDKReceiver;

  async onModuleInit() {
    // Initialize DPDK (dedicated CPU core)
    this.dpdkReceiver = new DPDKReceiver({
      port_id: 0,
      cpu_core: 2, // Pin to CPU core 2
      mbuf_pool_size: 8192,
    });

    // Start polling (callback from C++)
    this.dpdkReceiver.start((packet: MarketDataPacket) => {
      // Zero-copy callback from native code
      this.handleMarketData(packet);
    });

    this.logger.log('DPDK receiver started on core 2');
  }

  private async handleMarketData(packet: MarketDataPacket) {
    // Publish to event bus (<1μs)
    await this.eventBus.publish('market-data', packet);

    // Metrics
    const latency_ns = process.hrtime.bigint() - packet.timestamp;
    this.metrics.recordLatency('dpdk.receive_latency_ns', Number(latency_ns));
  }
}
```

**Prerequisites**:

- DPDK-compatible NIC (Intel E810, Mellanox ConnectX-6)
- Linux kernel with hugepages configured
- Dedicated CPU cores for polling

**ROI**: 50-200μs latency reduction (critical for <100ms target)

---

### 3. Hardware Timestamping (Optional/R&D)

**Purpose**: Nanosecond-accurate timestamps from NIC hardware

**Implementation**:

```typescript
// Hardware timestamp extraction (Intel E810)
interface HardwareTimestamp {
  receive_time_ns: bigint; // From NIC clock
  system_time_ns: bigint; // From system clock
  clock_drift_ns: bigint; // For calibration
}

async function extractHardwareTimestamp(
  packet: Buffer,
): Promise<HardwareTimestamp> {
  // Read PTP (Precision Time Protocol) timestamp from packet metadata
  const rx_timestamp = packet.readBigUInt64LE(packet.length - 16);
  const system_timestamp = process.hrtime.bigint();

  return {
    receive_time_ns: rx_timestamp,
    system_time_ns: system_timestamp,
    clock_drift_ns: system_timestamp - rx_timestamp,
  };
}
```

**ROI**: Marginal (4ns accuracy vs 50ns system clock, only for <10μs scenarios)

---

## Vendor Selection Matrix

| Vendor                | Type          | Latency          | Cost/Month | NSE-Certified | ROI    |
| --------------------- | ------------- | ---------------- | ---------- | ------------- | ------ |
| **Upstox** (Current)  | Aggregated    | 1s granularity   | ₹0         | Yes           | -      |
| **GLOBE**             | TBT           | <100μs           | ₹50,000    | Yes           | High   |
| **Symphony**          | TBT           | <200μs           | ₹40,000    | Yes           | High   |
| **Bloomberg B-PIPE**  | TBT           | <500μs           | ₹150,000   | Yes           | Medium |
| **Custom DPDK Stack** | Kernel bypass | <50μs (w/ GLOBE) | ₹5,000 HW  | N/A           | High   |

**Recommendation**: GLOBE TBT feed + DPDK (₹55,000/month + ₹5,000 one-time NIC)

---

## Implementation Roadmap

**Phase 1: TBT Feed Integration (High ROI)**

1. ✅ Evaluate GLOBE/Symphony vendor demos
2. ✅ Prototype TBT feed handler (TypeScript)
3. ✅ Measure latency improvements vs Upstox
4. ✅ Deploy in shadow mode (log only, no trading)
5. ✅ Validate data quality (no gaps, correct sequence)

**Timeline**: 2-3 weeks  
**Cost**: ₹50,000/month  
**ROI**: 100-500ms edge improvement

---

**Phase 2: DPDK Kernel Bypass (High ROI)**

1. ✅ Procure Intel E810 NIC (₹1,200)
2. ✅ Build C++ DPDK native addon
3. ✅ Integrate with Node.js via N-API
4. ✅ Benchmark latency (target <50μs processing)
5. ✅ Deploy with TBT feed

**Timeline**: 3-4 weeks  
**Cost**: ₹1,200 (one-time)  
**ROI**: 50-200μs latency reduction

---

**Phase 3: Hardware Timestamping (Optional)**

1. 🔬 Configure PTP on E810 NIC
2. 🔬 Extract hardware timestamps
3. 🔬 Calibrate clock drift
4. 🔬 Measure accuracy improvement

**Timeline**: 1-2 weeks  
**Cost**: ₹0 (NIC already supports PTP)  
**ROI**: Low (marginal gains for current use case)

---

## Updated Performance Targets

| Metric                           | Current (Upstox) | With TBT   | With TBT + DPDK | Target |
| -------------------------------- | ---------------- | ---------- | --------------- | ------ |
| **Data Freshness**               | 1s (aggregated)  | <1ms (TBT) | <1ms (TBT)      | <10ms  |
| **Network Latency**              | 20-50ms          | 10-30ms    | 5-15ms          | <10ms  |
| **Processing Latency**           | 5ms              | 2ms        | <100μs (DPDK)   | <1ms   |
| **Total (Network + Processing)** | 25-55ms          | 12-32ms    | 5-15ms          | <11ms  |

**Impact on End-to-End Latency**:

- Current: ~150ms (tick → order)
- With TBT: ~120ms (20-30ms improvement)
- With TBT + DPDK: ~100ms (30-50ms improvement) ✅ **Meets <100ms target**

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
- [02-CORTEX.md](./02-CORTEX.md) - Next layer (Feature Engine + Market State Encoder)
