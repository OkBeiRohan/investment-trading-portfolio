/**
 * PolicyEngine Module
 * Responsible for:
 * - Strategy selection based on signals
 * - Risk management and position sizing
 * - Portfolio risk controls
 * - RL-based delta hedging
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StrategySelectionService } from './strategy-selection.service';
import { RiskManagementService } from './risk-management.service';
import { PositionSizingService } from './position-sizing.service';

@Module({
  imports: [ConfigModule],
  providers: [
    StrategySelectionService,
    RiskManagementService,
    PositionSizingService,
  ],
  exports: [
    StrategySelectionService,
    RiskManagementService,
    PositionSizingService,
  ],
})
export class PolicyEngineModule {}
