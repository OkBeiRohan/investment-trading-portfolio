/**
 * Historical Data Controller
 * REST API for manual backfill operations
 */

import { Controller, Post, Body, Logger } from '@nestjs/common';
import { HistoricalDataService } from './historical-data.service';
import type { BackfillRequest } from './historical-data.service';

@Controller('historical-data')
export class HistoricalDataController {
  private readonly logger = new Logger(HistoricalDataController.name);

  constructor(private readonly historicalDataService: HistoricalDataService) {}

  /**
   * Manual backfill endpoint
   * POST /historical-data/backfill
   *
   * Body:
   * {
   *   "instrumentKeys": ["NSE_FO|67890", "NSE_FO|67891"],
   *   "intervals": ["1m", "5m", "15m"],
   *   "fromDate": "2024-01-01",  // optional
   *   "toDate": "2024-12-14"      // optional
   * }
   */
  @Post('backfill')
  async backfill(@Body() request: BackfillRequest) {
    this.logger.log(
      `Manual backfill requested: ${request.instrumentKeys.length} instruments, ${request.intervals?.length} intervals`,
    );

    const totalCandles =
      await this.historicalDataService.backfillHistoricalData(request);

    return {
      success: true,
      totalCandles,
      message: `Backfill completed: ${totalCandles} candles inserted`,
    };
  }
}
