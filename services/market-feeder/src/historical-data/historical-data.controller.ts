/**
 * Historical Data Controller
 * REST API for manual backfill operations
 */

import { Controller, Body, Logger, Get } from '@nestjs/common';
import { HistoricalDataService } from './historical-data.service';

@Controller('historical-data')
export class HistoricalDataController {
  private readonly logger = new Logger(HistoricalDataController.name);

  constructor(private readonly historicalDataService: HistoricalDataService) {}

  /**
   * Bootstrap NIFTY50 historical data
   * GET /historical-data/bootstrap
   */
  @Get('bootstrap')
  async bootstrap() {
    this.logger.log('Bootstrap endpoint called');
    return this.historicalDataService.triggerBootstrap();
  }
}
