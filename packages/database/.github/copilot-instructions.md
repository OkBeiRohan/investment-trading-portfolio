# GitHub Copilot Instructions - @repo/database

## Package Role

You are working on the **centralized database package** for the trading monorepo. This package is the **ONLY** place where database connections, schemas, and repositories exist.

## Core Principle

**ALL database-related code MUST live in this package. Apps and other packages consume this package but NEVER create their own database connections or schemas.**

## Package Structure

```
packages/database/
├── src/
│   ├── database.module.ts          # Main module exports
│   ├── index.ts                    # Public exports
│   ├── schemas/                    # Mongoose schemas
│   │   ├── index.ts
│   │   ├── user.schema.ts
│   │   ├── trading-signal.schema.ts
│   │   ├── order.schema.ts
│   │   ├── position.schema.ts
│   │   └── strategy.schema.ts
│   ├── repositories/               # Data access layer
│   │   ├── index.ts
│   │   ├── trading-signal.repository.ts
│   │   ├── order.repository.ts
│   │   └── position.repository.ts
│   ├── questdb/                    # QuestDB time-series client
│   │   ├── questdb.module.ts
│   │   ├── questdb.service.ts
│   │   └── index.ts
│   └── redis/                      # Redis cache & pub/sub
│       ├── redis.module.ts
│       ├── redis.service.ts
│       ├── keys.factory.ts
│       └── index.ts
├── docs/
│   ├── ARCHITECTURE.md
│   ├── PROGRESS.md
│   └── API.md
├── README.md
└── package.json
```

## What Belongs Here

### ✅ DO Include

1. **Database Connections**
   - MongoDB connection configuration
   - QuestDB PostgreSQL wire protocol client
   - Redis connection pools

2. **Mongoose Schemas**
   - All MongoDB schema definitions
   - Schema validation rules
   - Indexes and compound indexes
   - Virtual fields and methods

3. **Repositories**
   - Data access patterns
   - Query builders
   - Transaction handling
   - Bulk operations

4. **Database-Specific Services**
   - QuestDBService for time-series operations
   - RedisService for cache and pub/sub
   - Migration utilities
   - Health check methods

5. **NestJS Modules**
   - DatabaseModule (MongoDB)
   - TradingDatabaseModule (trading-specific)
   - UserDatabaseModule (user-specific)
   - QuestDBModule
   - RedisModule

### ❌ DON'T Include

1. **Business Logic** - That belongs in apps
2. **API Controllers** - Apps handle HTTP/WebSocket
3. **ML Models** - Those belong in apps/algo-worker
4. **Feature Engineering** - That's app-specific logic

## Database Layers

### Layer 1: Connection Modules

```typescript
// database.module.ts
import { Module, DynamicModule } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";

@Module({})
export class DatabaseModule {
  static forRoot(options?: DatabaseModuleOptions): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        MongooseModule.forRootAsync({
          useFactory: (configService: ConfigService) => ({
            uri: options?.uri || configService.get("MONGODB_URI"),
          }),
          inject: [ConfigService],
        }),
      ],
      exports: [MongooseModule],
    };
  }
}
```

### Layer 2: Schema Definitions

```typescript
// schemas/trading-signal.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { type TradingSignal as TradingSignalType } from "@repo/schema";

@Schema({ timestamps: true, collection: "trading_signals" })
export class TradingSignal extends Document implements TradingSignalType {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, index: true })
  timestamp: Date;

  @Prop({ required: true, enum: ["VOL_UP", "VOL_DOWN", "NEUTRAL"] })
  prediction: "VOL_UP" | "VOL_DOWN" | "NEUTRAL";

  @Prop({ required: true, min: 0, max: 1 })
  confidence: number;

  // ... more fields
}

export const TradingSignalSchema = SchemaFactory.createForClass(TradingSignal);
export type TradingSignalDocument = TradingSignal & Document;
```

### Layer 3: Repositories

```typescript
// repositories/trading-signal.repository.ts
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TradingSignalDocument } from "../schemas/trading-signal.schema";
import { type TradingSignal, tradingSignalSchema } from "@repo/schema";

@Injectable()
export class TradingSignalRepository {
  constructor(
    @InjectModel("TradingSignal")
    private readonly model: Model<TradingSignalDocument>
  ) {}

  async create(data: Omit<TradingSignal, "_id">): Promise<TradingSignal> {
    // Validate with Zod
    const validated = tradingSignalSchema.parse(data);
    const created = new this.model(validated);
    return created.save();
  }

  async findRecent(userId: string, limit = 50): Promise<TradingSignal[]> {
    return this.model
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
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
      .lean()
      .exec();
  }
}
```

### Layer 4: Feature-Specific Modules

```typescript
// Separate modules for different domains
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "TradingSignal", schema: TradingSignalSchema },
      { name: "Order", schema: OrderSchema },
      { name: "Position", schema: PositionSchema },
    ]),
  ],
  providers: [TradingSignalRepository, OrderRepository, PositionRepository],
  exports: [TradingSignalRepository, OrderRepository, PositionRepository],
})
export class TradingDatabaseModule {}
```

## Health Checks

**ALWAYS provide health check methods:**

```typescript
// questdb/questdb.service.ts
async healthCheck(): Promise<boolean> {
  try {
    const client = await this.pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    this.logger.error('QuestDB health check failed', error);
    return false;
  }
}

// redis/redis.service.ts
async healthCheck(): Promise<boolean> {
  try {
    const result = await this.client.ping();
    return result === 'PONG';
  } catch (error) {
    this.logger.error('Redis health check failed', error);
    return false;
  }
}
```

## Type Safety

**Use types from @repo/schema:**

```typescript
import { type TradingSignal, tradingSignalSchema } from '@repo/schema';

// ✅ Validate before saving
const validated = tradingSignalSchema.parse(data);

// ✅ Return typed results
async findById(id: string): Promise<TradingSignal | null> {
  return this.model.findById(id).lean().exec();
}
```

## Export Pattern

**Always export through index.ts:**

```typescript
// src/index.ts
export * from "./database.module";
export * from "./schemas";
export * from "./repositories";
export { QuestDBModule, QuestDBService } from "./questdb";
export { RedisModule, RedisService } from "./redis";
```

## Consumer Usage in Apps

```typescript
// apps/algo-worker/src/app.module.ts
import {
  TradingDatabaseModule,
  QuestDBModule,
  RedisModule,
} from "@repo/database";

@Module({
  imports: [
    TradingDatabaseModule, // MongoDB schemas + repositories
    QuestDBModule, // QuestDB client
    RedisModule, // Redis client
  ],
})
export class AppModule {}

// apps/algo-worker/src/services/signal.service.ts
import { Injectable } from "@nestjs/common";
import { TradingSignalRepository, QuestDBService } from "@repo/database";

@Injectable()
export class SignalService {
  constructor(
    private readonly signalRepo: TradingSignalRepository,
    private readonly questdb: QuestDBService
  ) {}

  async save(signal: any) {
    // Save to MongoDB
    await this.signalRepo.create(signal);

    // Save features to QuestDB
    await this.questdb.insertFeatures([signal.features]);
  }
}
```

## Common Mistakes to Avoid

❌ **DON'T** let apps create their own database connections  
❌ **DON'T** define schemas in apps  
❌ **DON'T** use `@InjectModel()` in apps  
❌ **DON'T** install `mongoose` in apps  
❌ **DON'T** bypass repositories with direct DB calls

✅ **DO** export all database functionality from this package  
✅ **DO** provide repository methods for common operations  
✅ **DO** use TypeScript strict mode  
✅ **DO** validate with Zod schemas from @repo/schema  
✅ **DO** provide health checks for all connections

## Documentation Requirements

**After implementing any feature:**

1. Update `README.md` with API examples
2. Update `docs/ARCHITECTURE.md` with design decisions
3. Update `docs/PROGRESS.md` with completion status
4. Add JSDoc comments to all exported methods

**Progress Tracking:**

- Track completed repositories
- Track completed schemas
- Track health check implementations
- Track optimization work (indexes, queries)
