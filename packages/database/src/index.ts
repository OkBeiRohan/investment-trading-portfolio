/**
 * @repo/database
 * NestJS Mongoose database package with separate databases per module
 */

// Export database modules
export {
  DatabaseModule,
  TradingDatabaseModule,
  UserDatabaseModule,
  AnalyticsDatabaseModule,
} from "./database.module";

export type { DatabaseModuleOptions } from "./database.module";

// Export all schemas and document types
export * from "./schemas";
