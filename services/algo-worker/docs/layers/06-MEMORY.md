# Layer 6: Memory

> **Multi-tier storage: Redis (hot), QuestDB (warm), MongoDB (cold)**

**Latency Target**: <20ms write latency (Redis), async sync to QuestDB/MongoDB

---

## Purpose

The Memory layer persists all trading state, market data, and audit trails across a 3-tier storage system. Hot data (current positions, orders) is stored in Redis for <1ms access. Warm data (tick history, PnL) is stored in QuestDB for fast time-series queries. Cold data (audit logs, trade history) is stored in MongoDB for long-term retention.

---

## Storage Tiers

| Tier     | Database | Purpose                             | Retention | Access Pattern              |
| -------- | -------- | ----------------------------------- | --------- | --------------------------- |
| **Hot**  | Redis    | Active positions, orders, cache     | 1 hour    | Write: <1ms, Read: <1ms     |
| **Warm** | QuestDB  | Tick data, PnL, performance metrics | 2 years   | Write: <10ms, Read: <50ms   |
| **Cold** | MongoDB  | Audit trail, trade history, models  | 5+ years  | Write: <100ms, Read: <500ms |

---

## Components

### **1. RedisStateService**

**File**: `src/memory/redis-state.service.ts`

**Responsibilities**:

- Store active positions, orders, PnL in Redis
- Provide O(1) access for Cognition/Execution layers
- Expire stale data (TTL)

**Example**:

```typescript
async savePosition(position: Position): Promise<void> {
  await this.redis.hset(
    `position:${position.symbol}`,
    {
      quantity: position.quantity,
      avgPrice: position.avgPrice,
      pnl: position.pnl,
    },
  );
  await this.redis.expire(`position:${position.symbol}`, 3600); // 1 hour TTL
}

async getPosition(symbol: string): Promise<Position | null> {
  const data = await this.redis.hgetall(`position:${symbol}`);
  return data ? Position.fromRedis(data) : null;
}
```

---

### **2. QuestDBWriterService**

**File**: `src/memory/questdb-writer.service.ts`

**Responsibilities**:

- Batch write ticks, trades, PnL to QuestDB
- Use ILP (Influx Line Protocol) for maximum throughput

**Example**:

```typescript
async writeTick(tick: MarketData): Promise<void> {
  const line = `ticks,symbol=${tick.symbol} ltp=${tick.ltp},volume=${tick.volume},oi=${tick.oi} ${tick.timestamp}000000`;
  await this.questDBWriter.write(line);
}

async writeTrade(trade: Trade): Promise<void> {
  const line = `trades,symbol=${trade.symbol},side=${trade.side} quantity=${trade.quantity},price=${trade.price},pnl=${trade.pnl} ${trade.timestamp}000000`;
  await this.questDBWriter.write(line);
}
```

**Batching Strategy**:

```typescript
private batch: string[] = [];

async writeTick(tick: MarketData): Promise<void> {
  this.batch.push(this.formatILP(tick));

  if (this.batch.length >= 1000) {
    await this.flush();
  }
}

async flush(): Promise<void> {
  await this.questDBWriter.write(this.batch.join('\n'));
  this.batch = [];
}
```

---

### **3. MongoDBSyncService**

**File**: `src/memory/mongodb-sync.service.ts`

**Responsibilities**:

- Async sync audit trail, trade history to MongoDB
- Handle 5-year retention for SEBI compliance

**Example**:

```typescript
async syncAuditTrail(order: Order): Promise<void> {
  await this.mongo.collection('audit_trail').insertOne({
    algoId: order.algoId,
    timestamp: order.timestamp,
    symbol: order.symbol,
    side: order.side,
    quantity: order.quantity,
    price: order.price,
    riskChecks: order.riskChecks,
  });
}

async syncTradeHistory(trade: Trade): Promise<void> {
  await this.mongo.collection('trades').insertOne({
    tradeId: trade.id,
    timestamp: trade.timestamp,
    symbol: trade.symbol,
    side: trade.side,
    quantity: trade.quantity,
    price: trade.price,
    pnl: trade.pnl,
    commission: trade.commission,
  });
}
```

---

## Data Models

### **Redis Keys**

```
position:{symbol}           # Hash (quantity, avgPrice, pnl)
order:{orderId}             # Hash (symbol, side, quantity, status)
pnl:daily:{date}            # String (total daily PnL)
portfolio:exposure          # String (total notional exposure)
cache:features:{symbol}     # String (cached feature vector)
```

### **QuestDB Tables**

```sql
CREATE TABLE ticks (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  ltp DOUBLE,
  volume LONG,
  oi LONG,
  bid DOUBLE,
  ask DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY;

CREATE TABLE trades (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  side SYMBOL,
  quantity INT,
  price DOUBLE,
  pnl DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY;

CREATE TABLE pnl (
  timestamp TIMESTAMP,
  daily_pnl DOUBLE,
  cumulative_pnl DOUBLE,
  sharpe_ratio DOUBLE
) TIMESTAMP(timestamp) PARTITION BY HOUR;
```

### **MongoDB Collections**

```typescript
// audit_trail (5-year retention)
{
  algoId: string;
  timestamp: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  riskChecks: { ... };
}

// trades (5-year retention)
{
  tradeId: string;
  timestamp: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  pnl: number;
  commission: number;
}
```

---

## Data Flow

```
Event (OrderFilledEvent)
        ↓
RedisStateService (hot)
        ↓ (async)
QuestDBWriterService (warm)
        ↓ (async)
MongoDBSyncService (cold)
```

---

## Performance Targets

| Tier    | Write Latency (p95) | Read Latency (p95) | Throughput    |
| ------- | ------------------- | ------------------ | ------------- |
| Redis   | <1ms                | <1ms               | >100k ops/sec |
| QuestDB | <10ms               | <50ms              | >10k rows/sec |
| MongoDB | <100ms              | <500ms             | >1k docs/sec  |

---

## Monitoring

### **Metrics** (Prometheus)

```typescript
memory.redis_writes_total                     // Counter
memory.questdb_writes_total                   // Counter
memory.mongodb_writes_total                   // Counter
memory.write_duration_ms{tier="redis"}        // Histogram
memory.write_duration_ms{tier="questdb"}      // Histogram
memory.write_duration_ms{tier="mongodb"}      // Histogram
memory.storage_lag_ms{tier="questdb"}         // Gauge
memory.storage_lag_ms{tier="mongodb"}         // Gauge
```

---

## Error Handling

### **QuestDB Connection Errors**

- **Retry Logic**: 5 retries with exponential backoff
- **Fallback**: Buffer in memory (max 10k rows), flush when reconnected
- **Alerting**: Emit `QuestDBDownEvent`

### **MongoDB Connection Errors**

- **Retry Logic**: Infinite retries (async sync)
- **Fallback**: Buffer in Redis queue (`queue:mongodb_sync`)
- **Alerting**: Emit `MongoDBDownEvent` after 10 failures

---

## Testing

**File**: `test/memory.e2e-spec.ts`

```typescript
describe('Memory Layer (e2e)', () => {
  it('should write to Redis', async () => {
    await redisStateService.savePosition({
      symbol: 'NIFTY',
      quantity: 50,
      avgPrice: 21000,
      pnl: 500,
    });
    const position = await redisStateService.getPosition('NIFTY');
    expect(position.quantity).toBe(50);
  });

  it('should write to QuestDB', async () => {
    await questDBWriter.writeTick({
      symbol: 'NIFTY',
      ltp: 21000,
      timestamp: Date.now(),
    });
    // Query QuestDB to verify
  });

  it('should sync to MongoDB', async () => {
    await mongoDBSyncService.syncAuditTrail(mockOrder);
    const doc = await mongo
      .collection('audit_trail')
      .findOne({ algoId: mockOrder.algoId });
    expect(doc).toBeDefined();
  });
});
```

---

## Dependencies

- **Upstream**: All layers (emit events for persistence)
- **Downstream**: None (final layer)
- **External**: Redis, QuestDB, MongoDB

---

## See Also

- [Layer 5: Execution](./05-EXECUTION.md)
- [Layer 7: Control](./07-CONTROL.md)
- [QuestDB ILP Documentation](https://questdb.io/docs/reference/api/ilp/overview/)
