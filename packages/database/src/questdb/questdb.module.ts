/**
 * QuestDB Module
 * NestJS module for QuestDB time-series database integration
 * Provides production service and repositories for market data
 */

import { Global, Module } from "@nestjs/common";
import { QuestDBService } from "./questdb.service";
import {
  CandlesRepository,
  QuotesRepository,
  GreeksRepository,
  DepthRepository,
} from "./repositories";

@Global()
@Module({
  providers: [
    QuestDBService,
    CandlesRepository,
    QuotesRepository,
    GreeksRepository,
    DepthRepository,
  ],
  exports: [
    QuestDBService,
    CandlesRepository,
    QuotesRepository,
    GreeksRepository,
    DepthRepository,
  ],
})
export class QuestDBModule {}
