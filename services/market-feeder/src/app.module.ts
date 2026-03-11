import { Module } from '@nestjs/common';
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QuestDBModule } from '@repo/database';
import { HistoricalDataModule } from './historical-data/historical-data.module';
import { IngestionModule } from './ingestion/ingestion.module';
import configuration from './config/configuration';
import { FeatureComputationModule } from './feature-computation/feature-computation.module';
import { StrikeSelectorModule } from './strike-selector/strike-selector.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Scheduling for cron jobs
    ConditionalModule.registerWhen(
      ScheduleModule.forRoot(),
      'HISTORY_SAVER_ENABLED',
    ),

    // Event emitter for progress tracking
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),

    // Database
    ConditionalModule.registerWhen(QuestDBModule, 'HISTORY_SAVER_ENABLED'),

    // NEW: Production ingestion module (providers + gap detection + scheduling)
    ConditionalModule.registerWhen(
      IngestionModule,
      'HISTORY_SAVER_ENABLED',
    ),

    // LEGACY: Kept for backward compatibility during migration
    ConditionalModule.registerWhen(
      HistoricalDataModule,
      'HISTORY_SAVER_ENABLED',
    ),

    // Feature computation (batch processing raw data → training features)
    ConditionalModule.registerWhen(
      FeatureComputationModule,
      'FEATURE_COMPUTATION_ENABLED',
    ),

    // Strike Selector (institutional-grade option strike selection)
    ConditionalModule.registerWhen(
      StrikeSelectorModule,
      'STRIKE_SELECTOR_ENABLED',
    ),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
