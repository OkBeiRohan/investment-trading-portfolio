/**
 * Historical Data Bootstrap Service
 * Checks for missing data and fetches from Upstox V3 API
 * Fetches 1-minute candles for past 1 year for NIFTY50 ecosystem
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CandlesRepository } from '@repo/database';
import { SimpleUpstoxClient } from '@repo/market-sdk';
import {
  NIFTY50_CONSTITUENTS,
  NIFTY50_INDEX,
  INDIA_VIX,
} from './nifty50-instruments';

@Injectable()
export class HistoricalDataBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(HistoricalDataBootstrapService.name);
  private upstoxClient: SimpleUpstoxClient | null = null;

  constructor(
    private readonly candlesRepository: CandlesRepository,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const accessToken = this.configService.get<string>('UPSTOX_ACCESS_TOKEN');

    if (!accessToken) {
      this.logger.warn(
        'UPSTOX_ACCESS_TOKEN not configured, skipping historical data bootstrap',
      );
      return;
    }

    this.upstoxClient = new SimpleUpstoxClient(accessToken);

    // Auto-bootstrap on startup (can be disabled via env var)
    const autoBootstrap = this.configService.get<string>(
      'AUTO_BOOTSTRAP_HISTORICAL_DATA',
      'false',
    );
    if (autoBootstrap === 'true') {
      this.logger.log('Auto-bootstrap enabled, checking for missing data...');
      await this.bootstrapHistoricalData();
    }
  }

  /**
   * Bootstrap historical data for NIFTY50 ecosystem
   * Checks for missing data and fetches from Upstox
   */
  async bootstrapHistoricalData(): Promise<void> {
    if (!this.upstoxClient) {
      throw new Error(
        'Upstox client not initialized. Set UPSTOX_ACCESS_TOKEN in .env',
      );
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const today = new Date();

    // Instruments to fetch
    const instruments = [NIFTY50_INDEX, INDIA_VIX, ...NIFTY50_CONSTITUENTS];

    this.logger.log(
      `Bootstrapping historical data for ${instruments.length} instruments`,
    );
    this.logger.log(
      `Date range: ${oneYearAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`,
    );

    let totalFetched = 0;
    let skipped = 0;

    for (const instrumentKey of instruments) {
      try {
        // Check if data exists for this instrument
        const hasData = await this.checkDataExists(
          instrumentKey,
          oneYearAgo,
          today,
        );

        if (hasData) {
          this.logger.debug(
            `Data already exists for ${instrumentKey}, skipping`,
          );
          skipped++;
          continue;
        }

        this.logger.log(`Fetching 1-minute candles for ${instrumentKey}...`);

        // Fetch candles from Upstox
        const upstoxCandles =
          await this.upstoxClient.getHistoricalCandlesBatched(
            instrumentKey,
            '1minute',
            oneYearAgo,
            today,
          );

        if (upstoxCandles.length === 0) {
          this.logger.warn(`No data returned for ${instrumentKey}`);
          continue;
        }

        // Transform to MarketCandle format
        const candles = upstoxCandles.map((c) => ({
          timestamp: new Date(c.timestamp),
          instrumentKey,
          intervalValue: 1,
          intervalUnit: 'minute' as const,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
          openInterest: c.open_interest || null,
        }));

        // Insert into QuestDB
        await this.candlesRepository.insertBatch(candles);
        totalFetched += candles.length;

        this.logger.log(
          `✓ Inserted ${candles.length} candles for ${instrumentKey}`,
        );

        // Rate limiting: wait 500ms between instruments
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        this.logger.error(
          `Failed to fetch data for ${instrumentKey}`,
          error.message,
        );
      }
    }

    this.logger.log('='.repeat(60));
    this.logger.log(`Bootstrap complete:`);
    this.logger.log(`  - Total instruments: ${instruments.length}`);
    this.logger.log(`  - Skipped (existing): ${skipped}`);
    this.logger.log(`  - Fetched: ${instruments.length - skipped}`);
    this.logger.log(`  - Total candles inserted: ${totalFetched}`);
    this.logger.log('='.repeat(60));
  }

  /**
   * Check if data exists for instrument in QuestDB
   */
  private async checkDataExists(
    instrumentKey: string,
    startDate: Date,
    endDate: Date,
  ): Promise<boolean> {
    return this.candlesRepository.existsForRange(
      instrumentKey,
      1, // interval_value
      'minute', // interval_unit
      startDate,
      endDate,
    );
  }

  /**
   * Manually trigger bootstrap (for HTTP endpoint)
   */
  async triggerBootstrap(): Promise<{ message: string }> {
    if (!this.upstoxClient) {
      throw new Error(
        'Upstox client not initialized. Set UPSTOX_ACCESS_TOKEN in .env',
      );
    }

    // Run async without blocking response
    this.bootstrapHistoricalData().catch((error) => {
      this.logger.error('Bootstrap failed', error);
    });

    return {
      message: 'Historical data bootstrap started. Check logs for progress.',
    };
  }
}
