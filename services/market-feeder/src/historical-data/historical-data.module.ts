/**
 * Historical Data Pipeline Module
 * 
 * Architecture:
 * - DataFetcherService: Fetches data from Upstox via @repo/market-sdk
 * - DataProcessorService: Transforms raw data for compute-engine
 * - FeatureComputeService: Computes features using Rust compute-engine
 * - LabelGeneratorService: Generates training labels
 * - PipelineOrchestratorService: Coordinates the full pipeline
 * 
 * Data Sources:
 * - market-sdk → UpstoxHistoricalService for API calls
 * - QuestDB → market_candles for storage
 * - compute-engine → Rust FFI for feature computation
 */

import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { DatabaseModule } from "@repo/database";

// Data Fetching
import { DataFetcherService } from "./data-fetcher.service";
import { SimpleUpstoxClient } from "./simple-client";

// Data Processing
import { DailyCandleProcessor } from "./processors/daily-candle.processor";
import { MinuteCandleProcessor } from "./processors/minute-candle.processor";

// Feature & Label Generation
import { DailyFeatureService } from "./features/daily-feature.service";
import { DailyLabelService } from "./labels/daily-label.service";

// Orchestration
import { PipelineOrchestratorService } from "./pipeline-orchestrator.service";

// Legacy (for backward compatibility)
import { HistoricalDataBootstrapService } from "./historical-data.service";
import { TimeframeStrategy } from "./timeframe-strategy";

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    DatabaseModule,
  ],
  providers: [
    // Data Fetching
    SimpleUpstoxClient,
    DataFetcherService,

    // Processors
    DailyCandleProcessor,
    MinuteCandleProcessor,

    // Feature & Label Services
    DailyFeatureService,
    DailyLabelService,

    // Orchestration
    PipelineOrchestratorService,

    // Legacy
    HistoricalDataBootstrapService,
    TimeframeStrategy,
  ],
  exports: [
    DataFetcherService,
    DailyFeatureService,
    DailyLabelService,
    PipelineOrchestratorService,
    HistoricalDataBootstrapService,
    SimpleUpstoxClient,
  ],
})
export class HistoricalDataModule { }
