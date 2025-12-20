/**
 * Historical Data Scheduler
 * Nightly backfill and intraday data fetching
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { HistoricalDataService } from './historical-data.service';

@Injectable()
export class HistoricalDataScheduler {
  private readonly logger = new Logger(HistoricalDataScheduler.name);

  constructor(
    private readonly historicalDataService: HistoricalDataService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Nightly backfill job (12 AM IST = 6:30 PM UTC previous day)
   * Fetches missing historical data for the past 7 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleNightlyBackfill() {
    const enabled = this.configService.get<boolean>(
      'scheduler.nightlyBackfill.enabled',
    );

    if (!enabled) {
      this.logger.debug('Nightly backfill disabled');
      return;
    }

    this.logger.log('Starting nightly backfill...');

    const instruments = this.configService.get<string[]>(
      'dataFetching.instruments',
    );
    const intervals = this.configService.get<string[]>(
      'dataFetching.intervals',
    );
    const lookbackDays = this.configService.get<number>(
      'scheduler.nightlyBackfill.lookbackDays',
      7,
    );

    if (!instruments || instruments.length === 0) {
      this.logger.warn('No instruments configured for backfill');
      return;
    }

    // Calculate from date (lookback days ago)
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - lookbackDays);

    try {
      const totalCandles =
        await this.historicalDataService.backfillHistoricalData({
          instrumentKeys: instruments,
          intervals: intervals || ['1m', '5m', '15m', '1h', '1d'],
          fromDate: fromDate.toISOString().split('T')[0],
        });

      this.logger.log(`Nightly backfill completed: ${totalCandles} candles`);
    } catch (error) {
      this.logger.error('Nightly backfill failed', error);
    }
  }

  /**
   * Intraday data fetching (every 5 minutes during market hours)
   * 9:15 AM - 3:30 PM IST (Mon-Fri)
   */
  @Cron('*/5 9-15 * * 1-5') // Every 5 minutes, 9 AM - 3 PM IST, Mon-Fri
  async handleIntradayFetch() {
    const enabled = this.configService.get<boolean>(
      'scheduler.intradayFetch.enabled',
    );

    if (!enabled) {
      return;
    }

    this.logger.debug('Fetching intraday data...');

    const instruments = this.configService.get<string[]>(
      'dataFetching.instruments',
    );

    if (!instruments || instruments.length === 0) {
      return;
    }

    // Fetch last hour of data
    const fromDate = new Date();
    fromDate.setHours(fromDate.getHours() - 1);

    try {
      await this.historicalDataService.backfillHistoricalData({
        instrumentKeys: instruments,
        intervals: ['1m'], // Only 1-minute candles for intraday
        fromDate: fromDate.toISOString().split('T')[0],
      });
    } catch (error) {
      this.logger.error('Intraday fetch failed', error);
    }
  }
}
