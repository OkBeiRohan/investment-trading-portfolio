/**
 * @repo/database
 * Centralized MongoDB client and collections for the trading monorepo
 */

export { DatabaseClient, db } from "./client";
export { collections } from "./collections";
export type { DatabaseConfig } from "./client";

// Export all models for type inference
export {
  TradingSignalModel,
  OrderModel,
  PositionModel,
  StrategyModel,
  PerformanceMetricsModel,
  RLAgentStateModel,
  FeatureSnapshotModel,
} from "./collections";
