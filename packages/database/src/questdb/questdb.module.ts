/**
 * QuestDB Module v2.0
 * NestJS module for QuestDB time-series database integration
 * Production schema aligned with Upstox V3 APIs
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
    CandlesRepository,
    InstrumentMasterRepository,
    InstrumentFeaturesRepository,
    MarketStateRepository,
    OptionChainRepository,
    TrainingLabelsRepository,
  ],
  exports: [
    QuestDBService,
    Pool,
    CandlesRepository,
    InstrumentMasterRepository,
    InstrumentFeaturesRepository,
    MarketStateRepository,
    OptionChainRepository,
    TrainingLabelsRepository,
  ],
})
export class QuestDBModule {}
