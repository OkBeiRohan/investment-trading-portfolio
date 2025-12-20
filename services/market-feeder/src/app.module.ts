import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QuestDBModule } from '@repo/database';
import { UpstoxModule } from '@repo/market-sdk';
import { HistoricalDataModule } from './historical-data/historical-data.module';
import configuration from './config/configuration';
import { TraceContextInterceptor } from './common/interceptors/trace-context.interceptor';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Scheduling for nightly backfill
    ScheduleModule.forRoot(),

    // Event emitter for progress tracking
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),

    // Database
    QuestDBModule,

    // Market SDK (Upstox)
    UpstoxModule,

    // Feature modules
    HistoricalDataModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceContextInterceptor,
    },
  ],
})
export class AppModule {}
