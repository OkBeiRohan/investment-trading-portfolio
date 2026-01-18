/**
 * @repo/database
 * Unified database package for MongoDB, QuestDB, and Redis
 */

// Main Database Module (unified)
export { DatabaseModule, type DatabaseModuleOptions } from "./database.module";

// Individual Database Modules
export { QuestDBModule } from "./questdb/questdb.module";
export { MongoDBModule } from "./mongodb/mongodb.module";
export { RedisModule } from "./redis/redis.module";

// QuestDB
export { QuestDBService } from "./questdb/questdb.service";
export * from "./questdb/repositories";

// MongoDB
export { MongoDBService } from "./mongodb/mongodb.service";
export * from "./mongodb/repositories";
export * from "./mongodb/schemas";
export { AuthRepositoryFactory } from "./mongodb/adapter/adapter.factory";
export type { AuthRepositories } from "./mongodb/adapter/auth-repositories.interface";

// Redis
export * from "./redis";
