/**
 * Scheduler Service
 * Cron jobs for automated data ingestion using @nestjs/schedule
 *
 * Schedules:
 * - Nightly backfill: 12:00 AM IST (Mon-Fri) — incremental candle backfill
 * - Pre-market global: 9:08 AM IST (Mon-Fri) — overnight global data for Tier 0
 * - EOD reconciliation: 4:00 PM IST (Mon-Fri) — verify day's data completeness
 * - Weekly instrument sync: 6:00 AM IST (Saturday) — refresh instrument master
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ProcessingLogRepository } from '@repo/database';
import { InstrumentSyncService } from './instrument-sync.service';
import { HistoricalBackfillService } from './historical-backfill.service';
import { GlobalDataService } from './global-data.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly instrumentSync: InstrumentSyncService,
    private readonly historicalBackfill: HistoricalBackfillService,
    private readonly globalData: GlobalDataService,
    private readonly processingLogRepo: ProcessingLogRepository,
  ) {}

  onModuleInit() {
    this.logger.log('Scheduler initialized with cron jobs:');
    this.logger.log('  • Nightly backfill:     12:00 AM IST (Mon-Fri)');
    this.logger.log('  • Pre-market global:    9:08 AM IST (Mon-Fri)');
    this.logger.log('  • EOD reconciliation:   4:00 PM IST (Mon-Fri)');
    this.logger.log('  • Weekly instrument:    6:00 AM IST (Saturday)');
  }

  /**
   * Nightly Backfill — 12:00 AM IST (6:30 PM UTC previous day), Mon-Fri
   * Fetches missing candle data for last N days
   */
  @Cron('0 30 18 * * 1-5', { name: 'nightly-backfill', timeZone: 'UTC' })
  async nightlyBackfill(): Promise<void> {
    if (!this.isSchedulerEnabled('nightlyBackfill')) return;

    const lookbackDays = this.configService.get<number>(
      'scheduler.nightlyBackfill.lookbackDays',
      7,
    );

    this.logger.log(`[CRON] Nightly backfill starting (lookback: ${lookbackDays} days)`);

    try {
      await this.processingLogRepo.logInfo('CRON', 'NIGHTLY_BACKFILL', 'Started', {
        service: 'SchedulerService',
      });

      const result = await this.historicalBackfill.backfillIncremental(lookbackDays);

      this.logger.log(
        `[CRON] Nightly backfill complete: ${result.instrumentsProcessed} instruments, ${result.totalCandlesFetched} candles`,
      );

      await this.processingLogRepo.logInfo('CRON', 'NIGHTLY_BACKFILL', 'Completed', {
        service: 'SchedulerService',
        recordsProcessed: result.totalCandlesFetched,
        durationMs: result.durationMs,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CRON] Nightly backfill failed: ${msg}`);
      await this.processingLogRepo.logError('CRON', 'NIGHTLY_BACKFILL', msg, {
        service: 'SchedulerService',
        errorCode: 'CRON_BACKFILL_FAILED',
      });
    }
  }

  /**
   * Pre-Market Global Data — 9:08 AM IST (3:38 AM UTC), Mon-Fri
   * Fetches overnight global market data for Tier 0 pre-market features
   */
  @Cron('0 38 3 * * 1-5', { name: 'pre-market-global', timeZone: 'UTC' })
  async preMarketGlobal(): Promise<void> {
    if (!this.isSchedulerEnabled('intradayFetch')) return;

    this.logger.log('[CRON] Pre-market global data sync starting');

    try {
      await this.processingLogRepo.logInfo('CRON', 'PRE_MARKET_GLOBAL', 'Started', {
        service: 'SchedulerService',
      });

      const result = await this.globalData.fetchOvernightData();

      this.logger.log(
        `[CRON] Pre-market global complete: ${result.symbolsFetched} symbols, ${result.totalCandles} candles, ${result.newsArticles} articles`,
      );

      await this.processingLogRepo.logInfo('CRON', 'PRE_MARKET_GLOBAL', 'Completed', {
        service: 'SchedulerService',
        recordsProcessed: result.totalCandles,
        durationMs: result.durationMs,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CRON] Pre-market global failed: ${msg}`);
      await this.processingLogRepo.logError('CRON', 'PRE_MARKET_GLOBAL', msg, {
        service: 'SchedulerService',
        errorCode: 'CRON_GLOBAL_FAILED',
      });
    }
  }

  /**
   * EOD Reconciliation — 4:00 PM IST (10:30 AM UTC), Mon-Fri
   * Verifies today's data completeness and fetches any missing data
   */
  @Cron('0 30 10 * * 1-5', { name: 'eod-reconciliation', timeZone: 'UTC' })
  async eodReconciliation(): Promise<void> {
    if (!this.isSchedulerEnabled('intradayFetch')) return;

    this.logger.log('[CRON] EOD reconciliation starting');

    try {
      await this.processingLogRepo.logInfo('CRON', 'EOD_RECONCILIATION', 'Started', {
        service: 'SchedulerService',
      });

      // Backfill just today
      const result = await this.historicalBackfill.backfillIncremental(1);

      this.logger.log(
        `[CRON] EOD reconciliation complete: ${result.totalCandlesFetched} candles backfilled`,
      );

      await this.processingLogRepo.logInfo('CRON', 'EOD_RECONCILIATION', 'Completed', {
        service: 'SchedulerService',
        recordsProcessed: result.totalCandlesFetched,
        durationMs: result.durationMs,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CRON] EOD reconciliation failed: ${msg}`);
      await this.processingLogRepo.logError('CRON', 'EOD_RECONCILIATION', msg, {
        service: 'SchedulerService',
        errorCode: 'CRON_EOD_FAILED',
      });
    }
  }

  /**
   * Weekly Instrument Sync — 6:00 AM IST (12:30 AM UTC), Saturday
   * Refreshes instrument master data (new expiries, contracts)
   */
  @Cron('0 30 0 * * 6', { name: 'weekly-instrument-sync', timeZone: 'UTC' })
  async weeklyInstrumentSync(): Promise<void> {
    if (!this.isSchedulerEnabled('nightlyBackfill')) return;

    this.logger.log('[CRON] Weekly instrument sync starting');

    try {
      await this.processingLogRepo.logInfo('CRON', 'WEEKLY_INSTRUMENT_SYNC', 'Started', {
        service: 'SchedulerService',
      });

      const results = await this.instrumentSync.syncAll();

      let totalAdded = 0;
      for (const result of results.values()) {
        totalAdded += result.instrumentsAdded;
      }

      this.logger.log(`[CRON] Weekly instrument sync complete: ${totalAdded} instruments added`);

      await this.processingLogRepo.logInfo('CRON', 'WEEKLY_INSTRUMENT_SYNC', 'Completed', {
        service: 'SchedulerService',
        recordsProcessed: totalAdded,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CRON] Weekly instrument sync failed: ${msg}`);
      await this.processingLogRepo.logError('CRON', 'WEEKLY_INSTRUMENT_SYNC', msg, {
        service: 'SchedulerService',
        errorCode: 'CRON_SYNC_FAILED',
      });
    }
  }

  private isSchedulerEnabled(schedule: string): boolean {
    const enabled = this.configService.get<boolean>(`scheduler.${schedule}.enabled`, false);
    if (!enabled) {
      this.logger.debug(`[CRON] ${schedule} is disabled`);
    }
    return enabled;
  }
}
