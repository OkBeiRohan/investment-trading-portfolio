# @repo/database - Coding Instructions

> Centralized database access layer for QuestDB, MongoDB, and Redis.

---

## Design Principles

### 1. Single Source of Truth

**RULE**: Apps MUST NEVER import `mongoose`, `@questdb/pg`, or `redis` directly. Always use `@repo/database`.

```typescript
// ❌ BAD: Direct import
import mongoose from 'mongoose';

// ✅ GOOD: Use shared module
import { TradingDatabaseModule, QuestDBService } from '@repo/database';
```

**Why**: Prevents code duplication, ensures consistent connection pooling, simplifies testing with mocks.

### 2. Database Separation by Purpose

| Database | Purpose | Data Types |
|----------|---------|-----------|
| **QuestDB** | Time-series | Ticks, candles, features, Greeks snapshots |
| **MongoDB** | Documents | Signals, orders, positions, users, audit logs |
| **Redis** | Hot state + Events | Active positions, circuit breaker state, event streams |

**NEVER mix responsibilities**. If it's time-series → QuestDB. If it's a document → MongoDB. If it's ephemeral/hot → Redis.

---

## QuestDB Service

### Connection

Uses PostgreSQL wire protocol (port 8812):

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.QUESTDB_HOST || 'localhost',
  port: parseInt(process.env.QUESTDB_PORT || '8812'),
  user: 'admin',
  database: 'qdb',
  max: 20, // Connection pool size
});
```

### Inserting Time-Series Data

**ALWAYS use batch inserts** for performance:

```typescript
class QuestDBService {
  async insertTicksBatch(ticks: Tick[]): Promise<void> {
    const values = ticks.map(t => 
      `('${t.timestamp.toISOString()}', '${t.instrumentKey}', ${t.price}, ${t.volume})`
    ).join(',');
    
    const query = `
      INSERT INTO ticks (timestamp, instrument_key, price, volume)
      VALUES ${values}
    `;
    
    await this.pool.query(query);
  }
}
```

**Performance**: 10K inserts/sec with batching vs. 100/sec with individual inserts.

### Time-Series Queries

**Use `SAMPLE BY` for downsampling**:

```typescript
async getOHLCV(instrumentKey: string, interval: '1m' | '5m' | '1h'): Promise<Candle[]> {
  const query = `
    SELECT
      timestamp,
      first(price) as open,
      max(price) as high,
      min(price) as low,
      last(price) as close,
      sum(volume) as volume
    FROM ticks
    WHERE instrument_key = '${instrumentKey}'
    SAMPLE BY ${interval}
    ALIGN TO CALENDAR
  `;
  
  const result = await this.pool.query(query);
  return result.rows.map(row => ({
    timestamp: new Date(row.timestamp),
    open: parseFloat(row.open),
    high: parseFloat(row.high),
    low: parseFloat(row.low),
    close: parseFloat(row.close),
    volume: parseInt(row.volume),
  }));
}
```

---

## MongoDB Service

### Schema Definition (Mongoose)

**ALWAYS use Zod schemas** from `@repo/schema` for validation:

```typescript
import { TradingSignalSchema } from '@repo/schema';
import { Schema, model } from 'mongoose';

const tradingSignalMongooseSchema = new Schema({
  userId: { type: String, required: true, index: true },
  instrumentKey: { type: String, required: true },
  prediction: { type: String, enum: ['VOL_UP', 'VOL_DOWN', 'NEUTRAL'], required: true },
  confidence: { type: Number, required: true },
  modelScores: { type: Map, of: Number },
  timestamp: { type: Date, default: Date.now, index: true },
});

export const TradingSignalModel = model('TradingSignal', tradingSignalMongooseSchema);
```

### Repository Pattern

```typescript
@Injectable()
export class TradingSignalRepository {
  constructor(
    @InjectModel('TradingSignal') private signalModel: Model<TradingSignal>
  ) {}

  async create(signalDto: CreateTradingSignalDto): Promise<TradingSignal> {
    // Validate with Zod
    const validated = TradingSignalSchema.parse(signalDto);
    
    const signal = new this.signalModel(validated);
    return signal.save();
  }

  async findByUserId(userId: string, limit = 100): Promise<TradingSignal[]> {
    return this.signalModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean(); // Use lean() for read-only queries (faster)
  }
}
```

---

## Redis Service

### Event Streams (Redis Streams)

**Use for event-driven communication**:

```typescript
class RedisService {
  async publishEvent(stream: string, event: Record<string, any>): Promise<string> {
    const id = await this.client.xadd(
      stream,
      '*', // Auto-generate ID
      ...Object.entries(event).flat()
    );
    return id;
  }

  async consumeEvents(
    stream: string,
    consumerGroup: string,
    consumerId: string,
    count = 10
  ): Promise<Array<StreamEvent>> {
    const events = await this.client.xreadgroup(
      'GROUP', consumerGroup, consumerId,
      'COUNT', count,
      'BLOCK', 1000, // 1s timeout
      'STREAMS', stream, '>'
    );
    
    return this.parseStreamEvents(events);
  }
}
```

### Hot State (Hashes)

```typescript
async setActivePosition(instrumentKey: string, position: Position): Promise<void> {
  await this.client.hset(
    'positions:active',
    instrumentKey,
    JSON.stringify(position)
  );
}

async getActivePosition(instrumentKey: string): Promise<Position | null> {
  const data = await this.client.hget('positions:active', instrumentKey);
  return data ? JSON.parse(data) : null;
}
```

### Circuit Breaker State

```typescript
async setCircuitBreakerOpen(reason: string, ttl = 300): Promise<void> {
  await this.client.set('circuit-breaker:status', 'OPEN', 'EX', ttl);
  await this.client.set('circuit-breaker:reason', reason, 'EX', ttl);
}

async isCircuitBreakerOpen(): Promise<boolean> {
  const status = await this.client.get('circuit-breaker:status');
  return status === 'OPEN';
}
```

---

## Testing Guidelines

### Mock Repositories

```typescript
const mockSignalRepository = {
  create: jest.fn(),
  findByUserId: jest.fn(),
};

it('should create signal', async () => {
  mockSignalRepository.create.mockResolvedValue(mockSignal);
  
  const result = await service.createSignal(signalDto);
  
  expect(mockSignalRepository.create).toHaveBeenCalledWith(signalDto);
  expect(result).toEqual(mockSignal);
});
```

### Integration Tests (with TestContainers)

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('SignalRepository (Integration)', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    // Connect to in-memory MongoDB
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it('should persist signal to MongoDB', async () => {
    const signal = await repository.create(signalDto);
    const found = await repository.findById(signal.id);
    expect(found).toEqual(signal);
  });
});
```

---

## Performance Guidelines

### QuestDB
- **Batch Inserts**: 10K rows at a time
- **Partitioning**: By day (automatic in QuestDB)
- **Indexes**: Only on `timestamp` and `instrument_key`

### MongoDB
- **Indexes**: On frequently queried fields (`userId`, `timestamp`)
- **Lean Queries**: Use `.lean()` for read-only data
- **Aggregation Pipelines**: For complex analytics

### Redis
- **Pipelining**: Batch multiple commands
- **Persistence**: AOF for durability, RDB for snapshots
- **Memory**: Set `maxmemory` with LRU eviction policy

---

**Last Updated**: November 29, 2025
**Status**: Production-Ready
