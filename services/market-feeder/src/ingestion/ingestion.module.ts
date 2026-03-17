/**
 * Ingestion Module
 * Orchestrates data ingestion: instrument sync, historical backfill,
 * global data, gap detection, and cron scheduling
 *
 * Uses @repo/market-sdk for all data provider access (Upstox, Yahoo, etc.)
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '@repo/database';
import {
  YahooProvider,
  AlphaVantageProvider,
  FinnhubProvider,
  UpstoxHistoricalAPIService,
  HistoricalApiRepository,
  WebSocketModule,
  UpstoxModule,
  UpstoxWebSocketModule,
  MarketCalendarModule,
} from '@repo/market-sdk';

// Services
import { GapDetectorService } from './gap-detector.service';
import { InstrumentSyncService } from './instrument-sync.service';
import { InstrumentListSyncService } from './instrument-list-sync.service';
import { HistoricalBackfillService } from './historical-backfill.service';
import { GlobalDataService } from './global-data.service';
import { SchedulerService } from './scheduler.service';
import { LiveDataService } from './live-data.service';
import { McxHandlerService } from './mcx-handler.service';
import { TokenRefreshCronService } from './token-refresh-cron.service';

// Controller
import { IngestionController } from './ingestion.controller';

@Module({
  imports: [
    HttpModule,
    DatabaseModule.forMarketFeeder(),
    WebSocketModule,
    UpstoxModule,
    UpstoxWebSocketModule,
    MarketCalendarModule,
  ],
  controllers: [IngestionController],
  providers: [
    // SDK provider dependencies
    HistoricalApiRepository,
    UpstoxHistoricalAPIService,

    // Global data providers
    YahooProvider,
    AlphaVantageProvider,
    FinnhubProvider,

    // Ingestion services
    GapDetectorService,
    InstrumentSyncService,
    InstrumentListSyncService,
    HistoricalBackfillService,
    GlobalDataService,
    SchedulerService,
    LiveDataService,

    // MCX commodity tick handler
    McxHandlerService,

    // Cron: daily token refresh before market open
    TokenRefreshCronService,
  ],
  exports: [
    InstrumentSyncService,
    InstrumentListSyncService,
    HistoricalBackfillService,
    GlobalDataService,
    GapDetectorService,
    LiveDataService,
    McxHandlerService,
  ],
})
export class IngestionModule {}

