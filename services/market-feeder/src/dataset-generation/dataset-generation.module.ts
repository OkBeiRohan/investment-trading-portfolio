import { Module } from '@nestjs/common';
import { DatabaseModule } from '@repo/database';
import { ConfigModule } from '@nestjs/config';

import { DataQualityService } from './data-quality.service';
import { CpcvSplitter } from './cpcv-splitter.service';
import { DatasetGenerationService } from './dataset-generation.service';
import { DatasetController } from './dataset.controller';

/**
 * Dataset Generation Module
 *
 * Extracts historical engineered features from QuestDB, performs Combinatorial 
 * Purged Cross-Validation (CPCV), and streams dataset splits into Parquet format
 * tailored for Python ML model consumers.
 */
@Module({
  imports: [
    DatabaseModule.forMarketFeeder(),
    ConfigModule,
  ],
  controllers: [DatasetController],
  providers: [
    DataQualityService,
    CpcvSplitter,
    DatasetGenerationService,
  ],
  exports: [DatasetGenerationService],
})
export class DatasetGenerationModule {}
