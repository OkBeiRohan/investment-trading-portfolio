/**
 * Historical Data Bootstrap Service
 * Checks for missing data and fetches from Upstox V3 API
 * Fetches 1-minute candles for past 1 year for NIFTY50 ecosystem
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CandlesRepository, InstrumentMasterRepository } from '@repo/database';
import { InstrumentMaster } from '@repo/schema';
import {
  INDIA_VIX,
  NIFTY50_CONSTITUENTS,
  NIFTY50_FUTURES,
  NIFTY50_INDEX,
} from './nifty50-instruments';
import { SimpleUpstoxClient } from './simple-client';
import { isAxiosError } from 'axios';

@Injectable()
export class HistoricalDataBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(HistoricalDataBootstrapService.name);

  constructor(
    private readonly candlesRepository: CandlesRepository,
    private readonly instrumentMasterRepository: InstrumentMasterRepository,
    private readonly configService: ConfigService,
    private readonly upstoxClient: SimpleUpstoxClient,
  ) {}

  onModuleInit() {
    // Auto-bootstrap on startup (can be disabled via env var)
    const autoBootstrap = this.configService.get<string>(
      'AUTO_BOOTSTRAP_HISTORICAL_DATA',
      'false',
    );
    if (autoBootstrap === 'true') {
      this.logger.log('Auto-bootstrap enabled, checking for missing data...');
      void this.bootstrapHistoricalData();
    }
  }

  /**
   * Bootstrap historical data for NIFTY50 ecosystem
   * Checks for missing data and fetches from Upstox
   */
  async bootstrapHistoricalData(): Promise<void> {
    const twoYearsAgo = new Date();
    twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 24);

    const today = new Date();

    // Instruments to fetch
    const instruments = [
      NIFTY50_INDEX,
      INDIA_VIX,
      ...NIFTY50_CONSTITUENTS,
      ...NIFTY50_FUTURES,
    ];

    this.logger.log(
      `Bootstrapping historical data for ${instruments.length} instruments`,
    );
    this.logger.log(
      `Date range: ${twoYearsAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`,
    );

    // Step 1: Populate instrument_master table
    await this.populateInstrumentMaster([NIFTY50_INDEX, INDIA_VIX], 'SPOT');
    await this.populateInstrumentMaster(NIFTY50_FUTURES, 'FUTURE');
    await this.populateInstrumentMaster(NIFTY50_CONSTITUENTS, 'STOCK');

    // Step 2: Fetch and insert historical candles

    let totalFetched = 0;
    let skipped = 0;

    for (const instrumentKey of instruments) {
      try {
        this.logger.log(`Checking for missing data for ${instrumentKey}...`);

        // Find gaps in existing data
        const gaps = await this.findMissingDataGaps(
          instrumentKey,
          twoYearsAgo,
          today,
        );

        if (gaps.length === 0) {
          this.logger.log(
            `✓ Complete data already exists for ${instrumentKey}, skipping`,
          );
          skipped++;
          continue;
        }

        this.logger.log(
          `Found ${gaps.length} gap(s) in data for ${instrumentKey}`,
        );

        // Fetch each gap
        for (const gap of gaps) {
          this.logger.log(
            `Fetching 1-minute candles for ${instrumentKey} from ${gap.start.toISOString().split('T')[0]} to ${gap.end.toISOString().split('T')[0]}...`,
          );

          // DEMO VERSION: Fetch and insert directly in client (see SimpleUpstoxClient.getHistoricalCandlesBatched)
          const upstoxCandles =
            await this.upstoxClient.getHistoricalCandlesBatched(
              instrumentKey,
              'minutes',
              1,
              gap.start,
              gap.end,
            );

          if (!upstoxCandles || upstoxCandles.length === 0) {
            this.logger.warn(
              `No data returned for ${instrumentKey} gap ${gap.start.toISOString().split('T')[0]} to ${gap.end.toISOString().split('T')[0]}`,
            );
            continue;
          }

          totalFetched += upstoxCandles.length;

          this.logger.log(
            `✓ Fetched and inserted ${upstoxCandles.length} candles for gap`,
          );

          // Rate limiting: wait 500ms between gaps
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        this.logger.log(`✓ Completed filling gaps for ${instrumentKey}`);

        // Rate limiting: wait 500ms between instruments
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to fetch data for ${instrumentKey}: ${errorMessage}`,
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
   * Check for missing candle data and return gaps that need to be filled
   * @returns Array of date ranges [startDate, endDate] that have missing data
   */
  private async findMissingDataGaps(
    instrumentKey: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ start: Date; end: Date }>> {
    // Fetch all existing candles for this range
    const existingCandles = await this.candlesRepository.findByTimeRange(
      instrumentKey,
      1, // interval_value
      'minute', // interval_unit
      startDate,
      endDate,
      1000000, // Large limit to get all candles
    );

    if (existingCandles.length === 0) {
      // No data at all, return entire range
      return [{ start: startDate, end: endDate }];
    }

    // Create a set of existing timestamps for fast lookup
    const existingTimestamps = new Set(
      existingCandles.map((c) => c.timestamp.getTime()),
    );

    // Find gaps in the data
    const gaps: Array<{ start: Date; end: Date }> = [];
    let gapStart: Date | null = null;

    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    while (current <= endDate) {
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (current.getDay() === 0 || current.getDay() === 6) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      // Check market hours (NSE: 9:15 AM to 3:30 PM)
      const marketOpen = new Date(current);
      marketOpen.setHours(9, 15, 0, 0);
      const marketClose = new Date(current);
      marketClose.setHours(15, 30, 0, 0);

      const checkTime = new Date(marketOpen);
      let dayHasMissingData = false;

      // Check each minute in market hours
      while (checkTime <= marketClose) {
        if (!existingTimestamps.has(checkTime.getTime())) {
          dayHasMissingData = true;
          break;
        }
        checkTime.setMinutes(checkTime.getMinutes() + 1);
      }

      if (dayHasMissingData) {
        if (!gapStart) {
          gapStart = new Date(current);
          gapStart.setHours(0, 0, 0, 0);
        }
      } else {
        if (gapStart) {
          // End of gap
          const gapEnd = new Date(current);
          gapEnd.setDate(gapEnd.getDate() - 1);
          gapEnd.setHours(23, 59, 59, 999);
          gaps.push({ start: gapStart, end: gapEnd });
          gapStart = null;
        }
      }

      current.setDate(current.getDate() + 1);
    }

    // Handle case where gap extends to the end
    if (gapStart) {
      gaps.push({ start: gapStart, end: new Date(endDate) });
    }

    return gaps;
  }

  /**
   * Populate instrument_master table with instrument metadata
   */
  private async populateInstrumentMaster(
    instrumentKeys: string[],
    type: 'STOCK' | 'SPOT' | 'FUTURE' | 'OPTION',
  ): Promise<void> {
    try {
      this.logger.log(
        `Populating instrument_master for ${instrumentKeys.length} instruments...`,
      );

      // Fetch market quotes in batches
      const instrumentData =
        await this.upstoxClient.getFullMarketQuoteBatched(instrumentKeys);

      // Transform to InstrumentMaster format
      const instruments: InstrumentMaster[] = instrumentData.map((inst) => ({
        instrumentKey: inst.instrumentKey,
        exchange: (inst.exchange as 'NSE' | 'BSE' | 'MCX') || 'NSE',
        segment: inst.segment as 'INDEX' | 'EQ' | 'FO' | 'COMMODITY',
        instrumentType: type,
        tradingsymbol: inst.tradingSymbol,
        name: inst.name,
        expiry: null, // Stocks don't expire
        strike: null, // Stocks don't have strike
        optionType: null, // Not an option
        lotSize: 1, // Equity default
        tickSize: 0.05, // NSE equity default
        underlyingKey: null, // Stocks are underlyings themselves
        isExpired: false,
        lastUpdated: inst.lastUpdated,
      }));

      // Use repository bulk insert instead of raw SQL
      const success =
        await this.instrumentMasterRepository.bulkInsert(instruments);

      if (success)
        this.logger.log(
          `✓ Populated ${instruments.length} instruments in instrument_master`,
        );
      else
        this.logger.warn(
          `✗ Failed to populate some instruments in instrument_master`,
        );
    } catch (error) {
      const errorMessage = isAxiosError(error)
        ? `Axios error: ${error.message}, Response data: ${JSON.stringify(
            error.response?.data,
          )}. Status: ${error.response?.status}`
        : error instanceof Error
          ? error.message
          : String(error);
      this.logger.error(
        `Failed to populate instrument_master: ${errorMessage}`,
      );

      throw error;
    }
  }

  /**
   * Manually trigger bootstrap (for HTTP endpoint)
   */
  triggerBootstrap(): { message: string } {
    // Run async without blocking response
    void this.bootstrapHistoricalData().catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Bootstrap failed: ${errorMessage}`);
    });

    return {
      message: 'Historical data bootstrap started. Check logs for progress.',
    };
  }
}
