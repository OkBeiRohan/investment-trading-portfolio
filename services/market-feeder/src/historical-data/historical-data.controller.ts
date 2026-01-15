/**
 * Historical Data Controller
 * REST API for manual backfill operations
 */

import { Controller, Body, Logger, Get, Query } from '@nestjs/common';
import { HistoricalDataBootstrapService } from './historical-data.service';
import { SimpleUpstoxClient } from './simple-client';

@Controller('historical-data')
export class HistoricalDataController {
  private readonly logger = new Logger(HistoricalDataController.name);

  constructor(
    private readonly historicalDataService: HistoricalDataBootstrapService,
    private readonly upstoxClient: SimpleUpstoxClient,
  ) {}

  /**
   * Bootstrap NIFTY50 historical data
   * GET /historical-data/bootstrap
   */
  @Get('bootstrap')
  async bootstrap() {
    this.logger.log('Bootstrap endpoint called');
    return this.historicalDataService.triggerBootstrap();
  }

  /**
   * Test single instrument fetch
   * GET /historical-data/test?instrument=NSE_EQ|INE002A01018&days=7
   */
  @Get('test')
  async testInstrument(
    @Query('instrument') instrument?: string,
    @Query('days') days?: string,
  ) {
    const instrumentKey = instrument || 'NSE_EQ|INE002A01018'; // Default to RELIANCE
    const daysBack = days ? parseInt(days) : 7;

    this.logger.log(
      `Testing fetch for ${instrumentKey}, ${daysBack} days back`,
    );

    const result = await this.upstoxClient.testFetch(instrumentKey, daysBack);

    return result;
  }
}
