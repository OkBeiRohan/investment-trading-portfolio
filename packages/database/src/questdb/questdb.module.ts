/**
 * QuestDB Module
 * NestJS module for QuestDB time-series database integration
 * Provides production service and repositories for market data
 */

import { Global, Module } from "@nestjs/common";
import { QuestDBProductionService } from "./questdb-production.service";
import {
  CandlesRepository,
  QuotesRepository,
  GreeksRepository,
  DepthRepository,
} from "./repositories";

@Global()
@Module({
  providers: [
    QuestDBProductionService,
    CandlesRepository,
    QuotesRepository,
    GreeksRepository,
    DepthRepository,
  ],
  exports: [
    QuestDBProductionService,
    CandlesRepository,
    QuotesRepository,
    GreeksRepository,
    DepthRepository,
  ],
})
export class QuestDBModule {}
