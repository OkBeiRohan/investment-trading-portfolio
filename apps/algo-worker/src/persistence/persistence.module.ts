/**
 * Persistence Module
 * Provides database repositories for all entities
 */

import { Module } from '@nestjs/common';
import { TradingDatabaseModule } from '@repo/database';

// Import repositories
import { SignalRepository } from './repositories/signal.repository';
import { OrderRepository } from './repositories/order.repository';

@Module({
  imports: [TradingDatabaseModule],
  providers: [SignalRepository, OrderRepository],
  exports: [SignalRepository, OrderRepository],
})
export class PersistenceModule {}
