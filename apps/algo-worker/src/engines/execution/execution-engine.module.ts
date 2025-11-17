/**
 * ExecutionEngine Module
 * Responsible for:
 * - Order placement via Upstox API
 * - Order fill monitoring
 * - Position management and tracking
 * - P&L calculation
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrderPlacementService } from './order-placement.service';
import { ExecutionMonitorService } from './execution-monitor.service';
import { PositionManagerService } from './position-manager.service';

@Module({
  imports: [ConfigModule],
  providers: [
    OrderPlacementService,
    ExecutionMonitorService,
    PositionManagerService,
  ],
  exports: [
    OrderPlacementService,
    ExecutionMonitorService,
    PositionManagerService,
  ],
})
export class ExecutionEngineModule {}
