import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { FeatureComputationService } from './feature-computation.service';

/**
 * Feature Computation Scheduler
 *
 * Triggers batch feature computation at regular intervals:
 * - Every hour: Incremental update for last 2 hours
 * - End of day: Full day computation (3:45 PM IST)
 * - Weekly: Recompute entire week (Sunday 2:00 AM)
 *
 * Configuration:
 * - FEATURE_COMPUTATION_ENABLED: Enable/disable scheduler
 * - FEATURE_COMPUTATION_INSTRUMENTS: Comma-separated instrument keys
 */
@Injectable()
export class FeatureComputationScheduler {
  private readonly logger = new Logger(FeatureComputationScheduler.name);
  private readonly enabled: boolean;
  private readonly instruments: string[];

  constructor(
    private readonly featureComputation: FeatureComputationService,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.configService.get<boolean>(
      'FEATURE_COMPUTATION_ENABLED',
      false,
    );
    this.instruments = this.configService
      .get<string>('FEATURE_COMPUTATION_INSTRUMENTS', 'NSE_INDEX|Nifty 50')
      .split(',')
      .map((s) => s.trim());

    if (this.enabled) {
      this.logger.log(
        `Feature computation scheduler enabled for ${this.instruments.length} instruments`,
      );
    } else {
      this.logger.log('Feature computation scheduler disabled');
    }
  }

  /**
   * Incremental update: Every hour during market hours (9:15 AM - 3:30 PM IST)
   * Computes features for last 2 hours to handle late-arriving data
   */
  @Cron('0 * 9-15 * * 1-5', {
    name: 'hourly-feature-computation',
    timeZone: 'Asia/Kolkata',
  })
  async handleHourlyComputation() {
    if (!this.enabled) return;

    try {
      this.logger.log('Starting hourly feature computation...');

      const rowsStored =
        await this.featureComputation.computeFeaturesForLastHours(
          2,
          this.instruments,
        );

      this.logger.log(`Hourly computation complete: ${rowsStored} rows stored`);
    } catch (error) {
      this.logger.error('Hourly feature computation failed', error);
    }
  }

  /**
   * End-of-day computation: 3:45 PM IST (after market close)
   * Computes features for entire trading session
   */
  @Cron('45 15 * * 1-5', {
    name: 'eod-feature-computation',
    timeZone: 'Asia/Kolkata',
  })
  async handleEndOfDayComputation() {
    if (!this.enabled) return;

    try {
      this.logger.log('Starting end-of-day feature computation...');

      const rowsStored = await this.featureComputation.computeFeaturesForToday(
        this.instruments,
      );

      this.logger.log(`EOD computation complete: ${rowsStored} rows stored`);
    } catch (error) {
      this.logger.error('EOD feature computation failed', error);
    }
  }

  /**
   * Weekly full recomputation: Sunday 2:00 AM IST
   * Recomputes features for entire week (handles corrections, corporate actions)
   */
  @Cron('0 2 * * 0', {
    name: 'weekly-feature-recomputation',
    timeZone: 'Asia/Kolkata',
  })
  async handleWeeklyRecomputation() {
    if (!this.enabled) return;

    try {
      this.logger.log('Starting weekly feature recomputation...');

      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      const rowsStored =
        await this.featureComputation.computeFeaturesForTimeRange(
          startTime,
          endTime,
          this.instruments,
        );

      this.logger.log(
        `Weekly recomputation complete: ${rowsStored} rows stored`,
      );
    } catch (error) {
      this.logger.error('Weekly feature recomputation failed', error);
    }
  }

  /**
   * Manual trigger endpoint (for on-demand computation)
   */
  async triggerManualComputation(
    startTime: Date,
    endTime: Date,
    instruments?: string[],
  ): Promise<number> {
    const targetInstruments = instruments || this.instruments;

    this.logger.log(
      `Manual feature computation triggered for ${targetInstruments.length} instruments`,
    );

    return this.featureComputation.computeFeaturesForTimeRange(
      startTime,
      endTime,
      targetInstruments,
    );
  }
}
