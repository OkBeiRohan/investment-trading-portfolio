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
} from '@repo/market-sdk';

// Services
import { GapDetectorService } from './gap-detector.service';
import { InstrumentSyncService } from './instrument-sync.service';
import { HistoricalBackfillService } from './historical-backfill.service';
import { GlobalDataService } from './global-data.service';
import { SchedulerService } from './scheduler.service';

// Controller
import { IngestionController } from './ingestion.controller';

@Module({
  imports: [
    HttpModule,
    DatabaseModule.forMarketFeeder(),
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
    HistoricalBackfillService,
    GlobalDataService,
    SchedulerService,
  ],
  exports: [
    InstrumentSyncService,
    HistoricalBackfillService,
    GlobalDataService,
    GapDetectorService,
  ],
})
export class IngestionModule {}
