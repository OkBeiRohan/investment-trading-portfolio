# @repo/database

Multi-database package providing MongoDB, QuestDB, and Redis integration for the investment trading portfolio monorepo.

## Overview

**Purpose**: Centralized database access layer supporting multiple database systems with a unified API.

**Key Features**:

- ✅ **MongoDB**: Application data, user accounts, trading signals, orders, positions
- ✅ **QuestDB**: High-performance time-series data (ticks, candles, features)
- ✅ **Redis**: Caching, pub/sub, session management, rate limiting
- ✅ NestJS module integration
- ✅ Repository pattern for MongoDB
- ✅ Connection pooling and health checks
- ✅ Type-safe with @repo/schema

## Database Strategy

### Why Three Databases?

```
┌──────────────────────────────────────────────┐
│  MongoDB (Document Store)                    │
│  - Complex queries and relationships         │
│  - Flexible schema                           │
│  - Users, organizations, auth data           │
│  - Trading signals, orders, positions        │
│  - Performance metrics                       │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  QuestDB (Time-Series Database)              │
│  - 10-20x faster than TimescaleDB            │
│  - Production-grade v2.0 schema (Jan 2026)   │
│  - ✅ Upstox V3 API aligned                  │
│  - ✅ Unified market_candles (all intervals) │
│  - ✅ Market State Encoder output            │
│  - ✅ ML training labels (explicit)          │
│  - Optimized for append-only workloads       │
│  - Training data: ~50GB/year (90% reduction) │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  Redis (In-Memory Cache)                     │
│  - Sub-millisecond latency                   │
│  - Pub/sub for real-time data               │
│  - Session storage                           │
│  - Rate limiting                             │
│  - WebSocket connection state                │
└──────────────────────────────────────────────┘
```

### QuestDB Schema v2.0 (Production-Grade)

**Core Tables** (Data Contract Frozen):

1. `instrument_master` - Instrument registry (spot, futures, options, stocks)
2. `market_candles` - Unified OHLCV data (all instruments, all intervals)
3. `orderbook_l2_snapshots` - Level 2 order book (optional, for execution models)
4. `instrument_features_1m` - Derived intraday features (VWAP, ATR, RSI, etc.)
5. `option_chain_snapshot` - Option chain with Greeks (feeds Market State Encoder)
6. `market_state_1m` - Market State Encoder output (THIS feeds LightGBM)
7. `training_labels_1m` - Supervised learning labels (EXPLICIT & SEPARATE)
8. `system_audit` - Distributed tracing logs

**Design Principles**:

- ✅ One unified raw table per data "shape"
- ✅ No derived data mixed with raw
- ✅ Instrument identity matches Upstox `instrument_key`
- ✅ Time-series first (timestamp is king)
- ✅ Training must be reproducible from DB alone

📖 **See**:

- [`migrations/MIGRATION_v2.md`](./migrations/MIGRATION_v2.md) - Full migration guide
- [`docs/TRAINING_DATA_SCHEMA.md`](./docs/TRAINING_DATA_SCHEMA.md) - Legacy schema reference
- `@repo/schema/market-data/questdb-tables-v2.schema.ts` - TypeScript types

## Installation

This package is part of the monorepo. Import modules in your NestJS apps:

```typescript
// apps/algo-worker/src/app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DatabaseModule } from "@repo/database";

@Module({
  imports: [
    ConfigModule.forRoot(),

    // Simple configuration
    DatabaseModule.forRoot({
      uri: process.env.MONGODB_URI || "mongodb://localhost:27017/trading",
    }),

    // OR async configuration with ConfigService
    DatabaseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI")!,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 2. Import DatabaseModelsModule in Feature Modules

```typescript
// apps/algo-worker/src/engines/signal/signal-engine.module.ts
import { Module } from "@nestjs/common";
import { DatabaseModelsModule } from "@repo/database";
import { SignalEngineService } from "./signal-engine.service";

@Module({
  imports: [DatabaseModelsModule],
  providers: [SignalEngineService],
  exports: [SignalEngineService],
})
export class SignalEngineModule {}
```

### 3. Inject Models in Services

```typescript
// apps/algo-worker/src/engines/signal/signal-engine.service.ts
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { type TradingSignal, tradingSignalSchema } from "@repo/schema";

@Injectable()
export class SignalEngineService {
  constructor(
    @InjectModel("TradingSignal")
    private signalModel: Model<TradingSignal>
  ) {}

  async saveSignal(signal: Omit<TradingSignal, "_id">): Promise<TradingSignal> {
    // Validate with Zod
    const validated = tradingSignalSchema.parse(signal);

    // Save to MongoDB
    const created = new this.signalModel(validated);
    return created.save();
  }

  async getRecentSignals(userId: string, limit = 50): Promise<TradingSignal[]> {
    return this.signalModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async getSignalById(id: string): Promise<TradingSignal | null> {
    return this.signalModel.findById(id).exec();
  }
}
```

## Available Models

All models are available for injection:

| Model Name           | Type                        | Description                      |
| -------------------- | --------------------------- | -------------------------------- |
| `TradingSignal`      | `Model<TradingSignal>`      | ML model predictions and signals |
| `Order`              | `Model<Order>`              | Order placement and tracking     |
| `Position`           | `Model<Position>`           | Trading positions with P&L       |
| `Strategy`           | `Model<Strategy>`           | Trading strategy definitions     |
| `PerformanceMetrics` | `Model<PerformanceMetrics>` | Performance analytics            |
| `RLAgentState`       | `Model<RLAgentState>`       | RL agent state persistence       |
| `FeatureSnapshot`    | `Model<FeatureSnapshot>`    | Time-series feature storage      |

## Model Examples

### Trading Signal Operations

```typescript
@Injectable()
export class SignalService {
  constructor(
    @InjectModel("TradingSignal")
    private signalModel: Model<TradingSignal>
  ) {}

  // Create signal
  async create(signal: Omit<TradingSignal, "_id">): Promise<TradingSignal> {
    const doc = new this.signalModel(signal);
    return doc.save();
  }

  // Find by prediction type
  async findByPrediction(
    userId: string,
    prediction: "VOL_UP" | "VOL_DOWN" | "NEUTRAL",
    days = 7
  ): Promise<TradingSignal[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.signalModel
      .find({ userId, prediction, timestamp: { $gte: startDate } })
      .sort({ timestamp: -1 })
      .exec();
  }

  // Aggregate statistics
  async getStats(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.signalModel.aggregate([
      { $match: { userId, timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalSignals: { $sum: 1 },
          avgConfidence: { $avg: "$confidence" },
          highConfidenceCount: {
            $sum: { $cond: [{ $gte: ["$confidence", 0.7] }, 1, 0] },
          },
        },
      },
    ]);
  }
}
```

### Order Operations

```typescript
@Injectable()
export class OrderService {
  constructor(
    @InjectModel("Order")
    private orderModel: Model<Order>
  ) {}

  // Create order
  async create(order: Omit<Order, "_id">): Promise<Order> {
    const doc = new this.orderModel(order);
    return doc.save();
  }

  // Update order status
  async updateStatus(
    orderId: string,
    status: string,
    updates?: Partial<Order>
  ): Promise<Order | null> {
    return this.orderModel
      .findOneAndUpdate(
        { orderId },
        { $set: { status, ...updates, updatedAt: new Date() } },
        { new: true }
      )
      .exec();
  }

  // Get orders by status
  async getByStatus(userId: string, status: string): Promise<Order[]> {
    return this.orderModel
      .find({ userId, status })
      .sort({ createdAt: -1 })
      .exec();
  }
}
```

### Position Operations

```typescript
@Injectable()
export class PositionService {
  constructor(
    @InjectModel("Position")
    private positionModel: Model<Position>
  ) {}

  // Get open positions
  async getOpenPositions(userId: string): Promise<Position[]> {
    return this.positionModel
      .find({ userId, status: "OPEN" })
      .sort({ entryDate: -1 })
      .exec();
  }

  // Update P&L
  async updatePnL(
    positionId: string,
    unrealizedPnL: number,
    legs?: any[]
  ): Promise<Position | null> {
    return this.positionModel
      .findByIdAndUpdate(
        positionId,
        { $set: { unrealizedPnL, legs, updatedAt: new Date() } },
        { new: true }
      )
      .exec();
  }

  // Close position
  async closePosition(
    positionId: string,
    realizedPnL: number
  ): Promise<Position | null> {
    return this.positionModel
      .findByIdAndUpdate(
        positionId,
        {
          $set: {
            status: "CLOSED",
            realizedPnL,
            exitDate: new Date(),
            updatedAt: new Date(),
          },
        },
        { new: true }
      )
      .exec();
  }
}
```

## Repository Pattern (Recommended)

Create repository services for cleaner separation:

```typescript
// apps/algo-worker/src/persistence/repositories/signal.repository.ts
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { type TradingSignal, tradingSignalSchema } from "@repo/schema";

@Injectable()
export class SignalRepository {
  constructor(
    @InjectModel("TradingSignal")
    private model: Model<TradingSignal>
  ) {}

  async create(signal: Omit<TradingSignal, "_id">): Promise<string> {
    const validated = tradingSignalSchema.parse(signal);
    const doc = new this.model(validated);
    const saved = await doc.save();
    return saved._id.toString();
  }

  async findById(id: string): Promise<TradingSignal | null> {
    return this.model.findById(id).exec();
  }

  async findRecent(userId: string, limit = 50): Promise<TradingSignal[]> {
    return this.model
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TradingSignal[]> {
    return this.model
      .find({
        userId,
        timestamp: { $gte: startDate, $lte: endDate },
      })
      .sort({ timestamp: -1 })
      .exec();
  }
}
```

Then in your module:

```typescript
@Module({
  imports: [DatabaseModelsModule],
  providers: [SignalRepository],
  exports: [SignalRepository],
})
export class PersistenceModule {}
```

## Standalone Usage (Non-NestJS)

For scripts or non-NestJS applications:

```typescript
import { DatabaseClient, collections } from "@repo/database";
import { type TradingSignal } from "@repo/schema";

// Connect to database
const db = DatabaseClient.getInstance();
await db.connect({
  uri: "mongodb://localhost:27017/trading",
  database: "trading",
});

// Use collections
const signal: TradingSignal = {
  userId: "user123",
  timestamp: new Date(),
  prediction: "VOL_UP",
  confidence: 0.75,
  // ... other fields
};

await collections.tradingSignals.create(signal);

// Query
const signals = await collections.tradingSignals
  .find({ userId: "user123" })
  .sort({ timestamp: -1 })
  .limit(10)
  .exec();

// Disconnect
await db.disconnect();
```

## Environment Variables

```env
# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/trading

# OR for production (MongoDB Atlas)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/trading?retryWrites=true&w=majority
```

## Schema Validation

All models use types from `@repo/schema` with Zod validation:

```typescript
import { tradingSignalSchema } from "@repo/schema";

// Validate before saving
const result = tradingSignalSchema.safeParse(data);
if (!result.success) {
  console.error("Validation errors:", result.error);
  throw new Error("Invalid signal data");
}

// result.data is fully typed
const validated = result.data;
```

## Indexes

All models have appropriate indexes for performance:

- `TradingSignal`: `{ userId, timestamp }`, `{ prediction, createdAt }`
- `Order`: `{ orderId }`, `{ userId, createdAt }`, `{ status, userId }`
- `Position`: `{ userId, status }`, `{ userId, entryDate }`
- `Strategy`: Timestamps
- `PerformanceMetrics`: `{ userId, period, startDate }`
- `RLAgentState`: `{ agentType, userId, updatedAt }`
- `FeatureSnapshot`: `{ instrument, timestamp }`

## Time-Series Collections

For `FeatureSnapshot`, consider creating a time-series collection in production:

```typescript
// In MongoDB shell or setup script
db.createCollection("featuresnapshots", {
  timeseries: {
    timeField: "timestamp",
    metaField: "instrument",
    granularity: "minutes",
  },
});
```

## Testing

```typescript
// In test files
import { Test, TestingModule } from "@nestjs/testing";
import { MongooseModule } from "@nestjs/mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

describe("SignalService", () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    module = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), DatabaseModelsModule],
      providers: [SignalService],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
    await mongod.stop();
  });

  it("should create signal", async () => {
    const service = module.get<SignalService>(SignalService);
    // ... test logic
  });
});
```

## Migration from Old System

If you were using the standalone client:

**Before:**

```typescript
import { db, collections } from "@repo/database";

await db.connect({ uri: "..." });
await collections.tradingSignals.create(signal);
```

**After (NestJS):**

```typescript
@Injectable()
export class MyService {
  constructor(
    @InjectModel("TradingSignal")
    private signalModel: Model<TradingSignal>
  ) {}

  async saveSignal(signal: TradingSignal) {
    const doc = new this.signalModel(signal);
    return doc.save();
  }
}
```

## Troubleshooting

### Connection Issues

```typescript
// Enable Mongoose debug mode
import mongoose from "mongoose";
mongoose.set("debug", true);
```

### Type Issues

Ensure you're importing types from `@repo/schema`:

```typescript
import { type TradingSignal } from "@repo/schema";
// NOT from local files
```

### Model Not Found

Make sure you've imported `DatabaseModelsModule` in your feature module:

```typescript
@Module({
  imports: [DatabaseModelsModule], // Required!
  providers: [MyService],
})
```

## References

- [NestJS Mongoose Documentation](https://docs.nestjs.com/techniques/mongodb)
- [Mongoose Documentation](https://mongoosejs.com/)
- [@repo/schema README](../schema/README.md)

---

**Last Updated**: March 17, 2026
