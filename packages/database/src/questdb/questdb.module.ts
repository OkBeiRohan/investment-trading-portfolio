/**
 * QuestDB Module
 * NestJS module for QuestDB time-series database integration
 */

import { Global, Module } from "@nestjs/common";
import { QuestDBService } from "./questdb.service";

@Global()
@Module({
  providers: [QuestDBService],
  exports: [QuestDBService],
})
export class QuestDBModule {}
