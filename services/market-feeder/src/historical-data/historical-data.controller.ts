/**
 * Historical Data Controller v3.0
 *
 * REST API endpoints for:
 * - Phase 1: Instrument Master Population
 * - Phase 2: Candle Data Fetching
 */

import {
  Controller,
  Post,
  Get,
  Query,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InstrumentMasterService } from './instrument-master.service';
import { CandleFetcherService } from './candle-fetcher.service';
import { ConfigService } from '@nestjs/config';

@Controller('historical-data')
export class HistoricalDataController implements OnModuleInit {
  private readonly logger = new Logger(HistoricalDataController.name);

  constructor(
    private readonly instrumentMasterService: InstrumentMasterService,
    private readonly candleFetcherService: CandleFetcherService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    if (
      !this.configService.get<string>('AUTO_BOOTSTRAP_HISTORICAL_DATA', 'false')
    )
      return;

    this.logger.log('Auto-bootstrap enabled. Starting full bootstrap...');
    void this.bootstrap();
  }

  /**
   * Run full bootstrap: Phase 1 + Phase 2
   */
  @Post('bootstrap')
  async bootstrap() {
    this.logger.log('Starting full bootstrap...');

    // Phase 1: Populate instrument master
    const phase1Results = await this.instrumentMasterService.populateAll();

    // Phase 2: Fetch candle data
    const phase2Results = await this.candleFetcherService.fetchAll();

    return {
      success: true,
      phase1: Object.fromEntries(phase1Results),
      phase2: Object.fromEntries(phase2Results),
    };
  }

  /**
   * Phase 1 only: Populate instrument master
   */
  @Post('populate-instruments')
  async populateInstruments() {
    this.logger.log('Starting Phase 1: Instrument Master Population...');
    const results = await this.instrumentMasterService.populateAll();
    return {
      success: true,
      results: Object.fromEntries(results),
    };
  }

  /**
   * Phase 2 only: Fetch candle data
   */
  @Post('fetch-candles')
  async fetchCandles() {
    this.logger.log('Starting Phase 2: Candle Data Fetching...');
    const results = await this.candleFetcherService.fetchAll();
    return {
      success: true,
      results: Object.fromEntries(results),
    };
  }

  /**
   * Fetch candles for a specific instrument
   */
  @Post('fetch-instrument-candles')
  async fetchInstrumentCandles(
    @Query('instrumentKey') instrumentKey: string,
    @Query('interval') interval: 'day' | 'minute' = 'day',
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date('2000-01-01');
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    this.logger.log(
      `Fetching ${interval} candles for ${instrumentKey} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    );

    const result = await this.candleFetcherService.fetchInstrumentCandles(
      instrumentKey,
      interval,
      startDate,
      endDate,
    );

    return {
      success: !result.error,
      ...result,
    };
  }

  /**
   * Health check
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      module: 'historical-data',
      version: '3.0',
      phases: {
        phase1: 'Instrument Master Population',
        phase2: 'Candle Data Fetching',
      },
    };
  }
}
