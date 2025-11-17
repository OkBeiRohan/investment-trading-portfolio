/**
 * Persistence Module
 * Provides database repositories for all entities
 */

import { Module } from '@nestjs/common';
import { TradingDatabaseModule } from '@repo/database';

// Import repositories
import { SignalRepository } from './repositories/signal.repository';
import { OrderRepository } from './repositories/order.repository';
import { PositionRepository } from './repositories/position.repository';
import { PerformanceMetricsRepository } from './repositories/performance-metrics.repository';
import { FeatureSnapshotRepository } from './repositories/feature-snapshot.repository';
import { RLAgentStateRepository } from './repositories/rl-agent-state.repository';

@Module({
  imports: [TradingDatabaseModule],
  providers: [
    SignalRepository,
    OrderRepository,
    PositionRepository,
    PerformanceMetricsRepository,
    FeatureSnapshotRepository,
    RLAgentStateRepository,
  ],
  exports: [
    SignalRepository,
    OrderRepository,
    PositionRepository,
    PerformanceMetricsRepository,
    FeatureSnapshotRepository,
    RLAgentStateRepository,
  ],
})
export class PersistenceModule {}
