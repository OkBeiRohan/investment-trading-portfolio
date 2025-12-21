/**
 * @repo/database
 * NestJS Mongoose database package with separate databases per module
 */

// Export database modules
// export {
//   DatabaseModule,
//   TradingDatabaseModule,
//   UserDatabaseModule,
//   AnalyticsDatabaseModule,
// } from "./database.module";

// export type { DatabaseModuleOptions } from "./database.module";

// Export all schemas and document types
// export * from "./schemas";
export * from "./redis";

// Export QuestDB module
export * from "./questdb";

// MongoDB
export * from "./mongodb/repositories";
export { MongoDBModule } from "./mongodb/mongodb.module";
export { MongoDBService } from "./mongodb/mongodb.service";
export * from "./mongodb/schemas";
export * from "./mongodb/adapter/adapter.factory";
export * from "./mongodb/adapter/auth-repositories.interface";
