/**
 * Database Module v2.0
 * Unified NestJS module for all database connections
 *
 * Includes:
 * - QuestDB: Time-series data (candles, features, labels)
 * - MongoDB: User, auth, trading metadata
 * - Redis: Caching, rate-limiting, sessions
 */

import { DynamicModule, Global, Module, Type } from "@nestjs/common";
import { QuestDBModule } from "./questdb/questdb.module";
import { MongoDBModule } from "./mongodb/mongodb.module";
import { RedisModule } from "./redis/redis.module";

export interface DatabaseModuleOptions {
  /**
   * Enable QuestDB (time-series: candles, features, labels)
   * Default: true
   */
  questdb?: boolean;

  /**
   * Enable MongoDB (users, auth, trading metadata)
   * Default: true
   */
  mongodb?: boolean;

  /**
   * Enable Redis (caching, rate-limiting)
   * Default: true
   */
  redis?: boolean;
}

/**
 * Unified Database Module
 *
 * Usage:
 * ```typescript
 * // Import all databases (default)
 * @Module({
 *   imports: [DatabaseModule.forRoot()],
 * })
 * export class AppModule {}
 *
 * // Import only specific databases
 * @Module({
 *   imports: [DatabaseModule.forRoot({ questdb: true, mongodb: false })],
 * })
 * export class MarketFeederModule {}
 * ```
 */
@Global()
@Module({})
export class DatabaseModule {
  /**
   * Import all or selected databases
   */
  static forRoot(options: DatabaseModuleOptions = {}): DynamicModule {
    const { questdb = true, mongodb = true, redis = true } = options;

    const imports: Type[] = [];
    const exports: Type[] = [];

    if (questdb) {
      imports.push(QuestDBModule);
      exports.push(QuestDBModule);
    }

    if (mongodb) {
      imports.push(MongoDBModule);
      exports.push(MongoDBModule);
    }

    if (redis) {
      imports.push(RedisModule);
      exports.push(RedisModule);
    }

    return {
      module: DatabaseModule,
      imports,
      exports,
    };
  }

  /**
   * Import only QuestDB (for compute services)
   */
  static forQuestDB(): DynamicModule {
    return this.forRoot({ questdb: true, mongodb: false, redis: false });
  }

  /**
   * Import only MongoDB (for auth services)
   */
  static forMongoDB(): DynamicModule {
    return this.forRoot({ questdb: false, mongodb: true, redis: false });
  }

  /**
   * Import QuestDB + Redis (for market-feeder)
   */
  static forMarketFeeder(): DynamicModule {
    return this.forRoot({ questdb: true, mongodb: true, redis: true });
  }

  /**
   * Import all databases (for full applications)
   */
  static forAll(): DynamicModule {
    return this.forRoot({ questdb: true, mongodb: true, redis: true });
  }
}

// Re-export individual modules for direct use
export { QuestDBModule } from "./questdb/questdb.module";
export { MongoDBModule } from "./mongodb/mongodb.module";
export { RedisModule } from "./redis/redis.module";
