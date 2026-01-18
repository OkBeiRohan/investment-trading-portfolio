/**
 * Historical Data Pipeline Module v2.0
 *
 * Production-grade data fetching with:
 * - Smart date discovery (binary search)
 * - Rate limiting (40 req/sec)
 * - Retry with exponential backoff
 * - ALL options/futures fetching
 *
 * Data Sources:
 * - Upstox V3 API for historical candles
 * - QuestDB for storage
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '@repo/database';

// Production Upstox Client
import { ProductionUpstoxClient } from './production-upstox-client';

// Bootstrap Services
import { ComprehensiveBootstrapService } from './comprehensive-bootstrap.service';

// Data Processing
import { DailyCandleProcessor } from './processors/daily-candle.processor';
import { MinuteCandleProcessor } from './processors/minute-candle.processor';

// Feature & Label Generation
import { DailyFeatureService } from './features/daily-feature.service';
import { DailyLabelService } from './labels/daily-label.service';

// Orchestration
import { PipelineOrchestratorService } from './pipeline-orchestrator.service';

// Legacy support
import { SimpleUpstoxClient } from './simple-client';
import { HistoricalDataBootstrapService } from './historical-data.service';
import { DataFetcherService } from './data-fetcher.service';
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
    EventEmitterModule.forRoot(),
    DatabaseModule.forMarketFeeder(),
  ],
  controllers: [HistoricalDataController],
  providers: [
    // Production Client (NEW)
    ProductionUpstoxClient,

    // Comprehensive Bootstrap (NEW)
    ComprehensiveBootstrapService,

    // Processors
    DailyCandleProcessor,
    MinuteCandleProcessor,

    // Feature & Label Services
    DailyFeatureService,
    DailyLabelService,

    // Orchestration
    PipelineOrchestratorService,

    // Legacy (for backward compatibility)
    SimpleUpstoxClient,
    DataFetcherService,
    HistoricalDataBootstrapService,
  ],
  exports: [
    ProductionUpstoxClient,
    ComprehensiveBootstrapService,
    DailyFeatureService,
    DailyLabelService,
    PipelineOrchestratorService,
    SimpleUpstoxClient,
    HistoricalDataBootstrapService,
  ],
})
export class HistoricalDataModule {}
