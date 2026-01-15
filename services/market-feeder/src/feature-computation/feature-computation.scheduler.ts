import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { FeatureComputationService } from './feature-computation.service';

/**
 * Feature Computation Scheduler v2.0
 *
 * Triggers batch feature computation at regular intervals for Nifty 50:
 * - Every hour: Incremental update for last 2 hours
 * - End of day: Full day computation (3:45 PM IST)
 * - Weekly: Recompute entire week (Sunday 2:00 AM)
 *
 * Configuration:
 * - FEATURE_COMPUTATION_ENABLED: Enable/disable scheduler (env flag)
 *
 * Note: Always computes for Nifty 50 index (uses constituent data internally)
 */
@Injectable()
export class FeatureComputationScheduler implements OnModuleInit {
  private readonly logger = new Logger(FeatureComputationScheduler.name);
  private readonly enabled: boolean;

  constructor(
    private readonly featureComputation: FeatureComputationService,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.configService.get<boolean>(
      'FEATURE_COMPUTATION_ENABLED',
      false,
    );

    if (this.enabled) {
      this.logger.log('Feature computation scheduler enabled for Nifty 50');
    } else {
      this.logger.log('Feature computation scheduler disabled');
    }
  }

  onModuleInit() {
    if (
      this.configService.get<string>(
        'AUTO_BOOTSTRAP_FEATURE_COMPUTATION',
        'false',
      ) === 'false'
    )
      return;

    this.logger.log('Starting Feature Computation Scheduler...');

    void this.triggerManualComputation(
      new Date('2024-01-01T00:00:00Z'),
      new Date(),
    );
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
        await this.featureComputation.computeFeaturesForLastHours(2);

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

      const rowsStored =
        await this.featureComputation.computeFeaturesForToday();

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
        await this.featureComputation.computeFeaturesForNifty50(
          startTime,
          endTime,
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
  ): Promise<number> {
    this.logger.log('Manual feature computation triggered for Nifty 50');

    return this.featureComputation.computeFeaturesForNifty50(
      startTime,
      endTime,
    );
  }
}
