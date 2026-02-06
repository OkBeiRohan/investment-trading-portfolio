/**
 * Historical Data Module v3.0
 *
 * Institution-grade data fetching with 2-phase architecture:
 * - Phase 1: Instrument Master Population
 * - Phase 2: Candle Data Fetching
 *
 * Data Sources:
 * - Upstox V3 API for historical candles
 * - QuestDB for storage
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@repo/database';

// Core Services
import { UpstoxClient } from './upstox-client';
import { InstrumentMasterService } from './instrument-master.service';
import { CandleFetcherService } from './candle-fetcher.service';

// Controller
import { HistoricalDataController } from './historical-data.controller';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        timeout: 30000,
        maxRedirects: 5,
        baseURL: 'https://api.upstox.com',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${configService.get<string>('UPSTOX_ACCESS_TOKEN', '')}`,
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule.forMarketFeeder(),
  ],
  controllers: [HistoricalDataController],
  providers: [
    // Upstox API Client
    UpstoxClient,

    // Phase 1: Instrument Master Population
    InstrumentMasterService,

    // Phase 2: Candle Data Fetching
    CandleFetcherService,
  ],
  exports: [InstrumentMasterService, CandleFetcherService],
})
export class HistoricalDataModule {}
