/**
 * QuestDB Module v2.2
 * NestJS module for QuestDB time-series database integration
 * Production schema aligned with Upstox V3 APIs
 * Updated: January 18, 2026 - Added daily features/labels + tick data
 */

import { Global, Module } from "@nestjs/common";
import { Pool } from "pg";
import { QuestDBService } from "./questdb.service";
import {
  CandlesRepository,
  InstrumentMasterRepository,
  InstrumentFeaturesRepository,
  MarketStateRepository,
  OptionChainRepository,
  TrainingLabelsRepository,
  TickDataRepository,
  DailyFeaturesRepository,
  DailyLabelsRepository,
} from "./repositories";

@Global()
@Module({
  providers: [
    QuestDBService,
    {
      provide: Pool,
      useFactory: (questdb: QuestDBService) => questdb.getPool(),
      inject: [QuestDBService],
    },
    // Candle & Tick Data
    CandlesRepository,
    TickDataRepository,

    // Instrument
    InstrumentMasterRepository,

    // Features (minute + daily)
    InstrumentFeaturesRepository,
    MarketStateRepository,
    DailyFeaturesRepository,

    // Labels (minute + daily)
    TrainingLabelsRepository,
    DailyLabelsRepository,

    // Options
    OptionChainRepository,
  ],
  exports: [
    QuestDBService,
    Pool,
    // Candle & Tick Data
    CandlesRepository,
    TickDataRepository,

    // Instrument
    InstrumentMasterRepository,

    // Features (minute + daily)
    InstrumentFeaturesRepository,
    MarketStateRepository,
    DailyFeaturesRepository,

    // Labels (minute + daily)
    TrainingLabelsRepository,
    DailyLabelsRepository,

    // Options
    OptionChainRepository,
  ],
})
export class QuestDBModule { }
