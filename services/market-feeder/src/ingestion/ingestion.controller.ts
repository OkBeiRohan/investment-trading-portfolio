/**
 * Ingestion Controller
 * REST API endpoints for data ingestion operations
 */

import { Controller, Post, Get, Query, Logger } from '@nestjs/common';
import { InstrumentSyncService } from './instrument-sync.service';
import { HistoricalBackfillService } from './historical-backfill.service';
import { GlobalDataService } from './global-data.service';
import { LiveDataService } from './live-data.service';

@Controller('ingestion')
export class IngestionController {
  private readonly logger = new Logger(IngestionController.name);

  constructor(
    private readonly instrumentSync: InstrumentSyncService,
    private readonly historicalBackfill: HistoricalBackfillService,
    private readonly globalData: GlobalDataService,
    private readonly liveData: LiveDataService,
  ) {}

  /**
   * Full bootstrap: instrument sync + historical backfill + global data
   */
  @Post('bootstrap')
  async bootstrap() {
    this.logger.log('Starting full bootstrap...');

    const syncResults = await this.instrumentSync.syncAll();
    const backfillResults = await this.historicalBackfill.backfillAll();
    const globalResult = await this.globalData.fetchOvernightData();

    return {
      success: true,
      instrumentSync: Object.fromEntries(syncResults),
      backfill: Object.fromEntries(backfillResults),
      globalData: globalResult,
    };
  }

  /**
   * Instrument sync only
   */
  @Post('sync-instruments')
  async syncInstruments() {
    const results = await this.instrumentSync.syncAll();
    return { success: true, results: Object.fromEntries(results) };
  }

  /**
   * Full historical backfill
   */
  @Post('backfill')
  async backfill() {
    const results = await this.historicalBackfill.backfillAll();
    return { success: true, results: Object.fromEntries(results) };
  }

  /**
   * Incremental backfill (like nightly cron)
   */
  @Post('backfill-incremental')
  async backfillIncremental(
    @Query('lookbackDays') lookbackDays?: string,
  ) {
    const days = lookbackDays ? parseInt(lookbackDays) : 7;
    const result = await this.historicalBackfill.backfillIncremental(days);
    return { success: true, ...result };
  }

  /**
   * Backfill a single instrument
   */
  @Post('backfill-instrument')
  async backfillInstrument(
    @Query('instrumentKey') instrumentKey: string,
    @Query('interval') interval: 'day' | 'minute' = 'day',
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const startDate = startDateStr ? new Date(startDateStr) : new Date('2000-01-01');
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    const result = await this.historicalBackfill.backfillInstrument(
      instrumentKey, interval, startDate, endDate,
    );
    return { success: !result.error, ...result };
  }

  /**
   * Fetch global market data
   */
  @Post('global-data')
  async fetchGlobalData(
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const startDate = startDateStr ? new Date(startDateStr) : (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; })();
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    const result = await this.globalData.fetchAllGlobalData(startDate, endDate);
    return { success: true, ...result };
  }

  /**
   * Pre-market overnight data (quick)
   */
  @Post('overnight-data')
  async fetchOvernightData() {
    const result = await this.globalData.fetchOvernightData();
    return { success: true, ...result };
  }

  /**
   * Start Live Tick Data Ingestion
   */
  @Post('live/start')
  async startLive() {
    await this.liveData.startLiveIngestion();
    return { success: true, message: 'Live data ingestion started' };
  }

  /**
   * Stop Live Tick Data Ingestion
   */
  @Post('live/stop')
  async stopLive() {
    await this.liveData.stopLiveIngestion();
    return { success: true, message: 'Live data ingestion stopped' };
  }

  /**
   * Health check
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      module: 'ingestion',
      version: '4.0',
      endpoints: {
        bootstrap: 'POST /ingestion/bootstrap',
        syncInstruments: 'POST /ingestion/sync-instruments',
        backfill: 'POST /ingestion/backfill',
        backfillIncremental: 'POST /ingestion/backfill-incremental',
        backfillInstrument: 'POST /ingestion/backfill-instrument',
        globalData: 'POST /ingestion/global-data',
        overnightData: 'POST /ingestion/overnight-data',
        startLive: 'POST /ingestion/live/start',
        stopLive: 'POST /ingestion/live/stop',
      },
      cronJobs: {
        nightlyBackfill: '12:00 AM IST (Mon-Fri)',
        preMarketGlobal: '9:08 AM IST (Mon-Fri)',
        eodReconciliation: '4:00 PM IST (Mon-Fri)',
        weeklyInstrumentSync: '6:00 AM IST (Saturday)',
      },
    };
  }
}
