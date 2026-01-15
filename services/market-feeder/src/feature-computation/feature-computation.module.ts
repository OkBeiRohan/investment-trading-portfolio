import { Module } from '@nestjs/common';
import { QuestDBModule } from '@repo/database';
import { FeatureComputationService } from './feature-computation.service';
import { FeatureComputationScheduler } from './feature-computation.scheduler';
import { ComputeEngineService } from './compute-engine.service';
import { ComputeEngineAdapter } from './compute-engine.adapter';

/**
 * Feature Computation Module
 *
 * Reads raw market data from QuestDB, computes features using compute-engine,
 * and stores them in training_features_* tables for ML training pipeline.
 *
 * Separation of Concerns:
 * - market-feeder: Raw data collection → QuestDB
 * - feature-computation: Batch feature generation → training_features tables
 * - algo-worker: Live trading → ephemeral features (no storage)
 */
@Module({
  imports: [QuestDBModule],
  providers: [
    FeatureComputationService,
    FeatureComputationScheduler,
    ComputeEngineService,
    ComputeEngineAdapter,
  ],
  exports: [FeatureComputationService],
})
export class FeatureComputationModule {}
