import { Module } from '@nestjs/common';
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QuestDBModule } from '@repo/database';
import { UpstoxModule } from '@repo/market-sdk';
import { HistoricalDataModule } from './historical-data/historical-data.module';
import configuration from './config/configuration';
import { TraceContextInterceptor } from './common/interceptors/trace-context.interceptor';

@Module({
  imports: [
    // Sentry integration (must be first)
    SentryModule.forRoot(),

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
    UpstoxModule,

    // Feature modules

    ConditionalModule.registerWhen(
      HistoricalDataModule,
      'HISTORY_SAVER_ENABLED',
    ),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceContextInterceptor,
    },
  ],
})
export class AppModule {}
