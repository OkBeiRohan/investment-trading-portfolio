import { Module } from "@nestjs/common";
import { HistoricalApiRepository } from "./historical.repository";
import { UpstoxHistoricalAPIService } from "./historical.service";

/**
 * Historical Module
 *
 * Provides:
 * - Historical candles (1min, 5min, 1day, etc.)
 * - Intraday candles
 * - Historical option chain
 */
@Module({
  imports: [],
  providers: [HistoricalApiRepository, UpstoxHistoricalAPIService],
  exports: [UpstoxHistoricalAPIService],
})
export class HistoricalModule {}
