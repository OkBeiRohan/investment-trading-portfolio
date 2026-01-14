import { Module } from "@nestjs/common";
import { HistoricalApiRepository } from "./historical.repository";

@Module({
  imports: [],
  providers: [HistoricalApiRepository],
  exports: [],
})
export class UpstoxHistoricalModule {}
