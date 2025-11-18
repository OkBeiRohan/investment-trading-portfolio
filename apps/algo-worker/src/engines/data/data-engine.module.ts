/**
 * DataEngine Module
 * Responsible for:
 * - Real-time market data ingestion via @repo/market-sdk
 * - Feature engineering (TypeScript calculations)
 * - Feature store management (MongoDB time-series)
 * - CSV export for Python training
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PersistenceModule } from '../../persistence/persistence.module';
import { DataCollectionService } from './data-collection.service';
import { FeatureEngineeringService } from './feature-engineering.service';
import { FeatureStoreService } from './feature-store.service';
import { TrainingDataService } from './training-data.service';

@Module({
  imports: [ConfigModule, PersistenceModule],
  providers: [
    DataCollectionService,
    FeatureEngineeringService,
    FeatureStoreService,
    TrainingDataService,
  ],
  exports: [
    DataCollectionService,
    FeatureEngineeringService,
    FeatureStoreService,
    TrainingDataService,
  ],
})
export class DataEngineModule {}
