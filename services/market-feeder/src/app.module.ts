import { Module } from '@nestjs/common';
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QuestDBModule } from '@repo/database';
// import { UpstoxModule } from '@repo/market-sdk';
import { HistoricalDataModule } from './historical-data/historical-data.module';
import configuration from './config/configuration';
// import { ObservabilityModule } from '@repo/observability';
import { FeatureComputationModule } from './feature-computation/feature-computation.module';

@Module({
  imports: [
    // ObservabilityModule,

    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Scheduling for nightly backfill
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

    // Market SDK (Upstox)
    // UpstoxModule,

    // Feature modules
    ConditionalModule.registerWhen(
      HistoricalDataModule,
      'HISTORY_SAVER_ENABLED',
    ),

    // Feature computation (batch processing raw data → training features)
    ConditionalModule.registerWhen(
      FeatureComputationModule,
      'FEATURE_COMPUTATION_ENABLED',
    ),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
