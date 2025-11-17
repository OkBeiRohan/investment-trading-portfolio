/**
 * Database Module for NestJS with Mongoose
 * Provides separate database connections for different modules
 */

import { Module, DynamicModule, Global } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import * as schemas from "./schemas";

/**
 * Database configuration interface
 */
export interface DatabaseModuleOptions {
  uri: string;
  connectionName?: string;
}

/**
 * Root Database Module
 * Provides the main database connection
 */
@Global()
@Module({})
export class DatabaseModule {
  /**
   * Register database with simple configuration
   */
  static forRoot(options: DatabaseModuleOptions): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        MongooseModule.forRoot(options.uri, {
          connectionName: options.connectionName,
        }),
      ],
      exports: [MongooseModule],
    };
  }

  /**
   * Register database with async configuration (recommended)
   */
  static forRootAsync(options: {
    imports?: any[];
    useFactory: (
      ...args: any[]
    ) => Promise<DatabaseModuleOptions> | DatabaseModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        MongooseModule.forRootAsync({
          imports: options.imports,
          useFactory: async (...args: any[]) => {
            const config = await options.useFactory(...args);
            return {
              uri: config.uri,
              connectionName: config.connectionName,
            };
          },
          inject: options.inject,
        }),
      ],
      exports: [MongooseModule],
    };
  }
}

/**
 * Trading Database Module
 * For algo-worker - stores signals, orders, positions, strategies
 */
@Module({})
export class TradingDatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: TradingDatabaseModule,
      imports: [
        MongooseModule.forRootAsync({
          connectionName: "trading",
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => {
            const baseUri =
              configService.get<string>("MONGODB_URI") ||
              "mongodb://localhost:27017";
            return {
              uri: `${baseUri}/trading`,
            };
          },
          inject: [ConfigService],
        }),
        MongooseModule.forFeature(
          [
            {
              name: schemas.TradingSignal.name,
              schema: schemas.TradingSignalSchema,
            },
            { name: schemas.Order.name, schema: schemas.OrderSchema },
            { name: schemas.Position.name, schema: schemas.PositionSchema },
            { name: schemas.Strategy.name, schema: schemas.StrategySchema },
            {
              name: schemas.PerformanceMetrics.name,
              schema: schemas.PerformanceMetricsSchema,
            },
            {
              name: schemas.RLAgentState.name,
              schema: schemas.RLAgentStateSchema,
            },
            {
              name: schemas.FeatureSnapshot.name,
              schema: schemas.FeatureSnapshotSchema,
            },
          ],
          "trading"
        ),
      ],
      exports: [MongooseModule],
    };
  }
}

/**
 * User Database Module
 * For api - stores users, sessions, portfolios
 */
@Module({})
export class UserDatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: UserDatabaseModule,
      imports: [
        MongooseModule.forRootAsync({
          connectionName: "users",
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => {
            const baseUri =
              configService.get<string>("MONGODB_URI") ||
              "mongodb://localhost:27017";
            return {
              uri: `${baseUri}/users`,
            };
          },
          inject: [ConfigService],
        }),
        // Add user schemas here when needed
      ],
      exports: [MongooseModule],
    };
  }
}

/**
 * Analytics Database Module
 * For analytics and reporting - separate for performance
 */
@Module({})
export class AnalyticsDatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: AnalyticsDatabaseModule,
      imports: [
        MongooseModule.forRootAsync({
          connectionName: "analytics",
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => {
            const baseUri =
              configService.get<string>("MONGODB_URI") ||
              "mongodb://localhost:27017";
            return {
              uri: `${baseUri}/analytics`,
            };
          },
          inject: [ConfigService],
        }),
        MongooseModule.forFeature(
          [
            {
              name: schemas.PerformanceMetrics.name,
              schema: schemas.PerformanceMetricsSchema,
            },
            {
              name: schemas.FeatureSnapshot.name,
              schema: schemas.FeatureSnapshotSchema,
            },
          ],
          "analytics"
        ),
      ],
      exports: [MongooseModule],
    };
  }
}
