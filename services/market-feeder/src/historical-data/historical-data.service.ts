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
    const instruments = [NIFTY50_INDEX, INDIA_VIX, ...NIFTY50_CONSTITUENTS];

    this.logger.log(
      `Bootstrapping historical data for ${instruments.length} instruments + futures`,
    );
    this.logger.log(
      `Date range: ${twoYearsAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`,
    );

    // Step 1: Populate instrument_master table
    await this.populateInstrumentMaster([NIFTY50_INDEX, INDIA_VIX], 'SPOT');
    await this.populateInstrumentMaster(NIFTY50_CONSTITUENTS, 'STOCK');

    // Step 2: Fetch NIFTY50 futures dynamically based on expiries in the date range
    const futureInstruments = await this.getFuturesForDateRange(
      NIFTY50_INDEX,
      twoYearsAgo,
      today,
    );
    this.logger.log(
      `Found ${futureInstruments.length} NIFTY50 futures contracts for the date range`,
    );

    instruments.push(...futureInstruments);

    // Step 3: Fetch and insert historical candles

    let totalFetched = 0;
    let skipped = 0;

    for (const instrumentKey of instruments) {
      try {
        this.logger.log(`Checking if data exists for ${instrumentKey}...`);

        // Simple check: if any data exists, skip
        const hasData = await this.hasDataInRange(
          instrumentKey,
          twoYearsAgo,
          today,
        );

        if (hasData) {
          this.logger.log(
            `✓ Data already exists for ${instrumentKey}, skipping`,
          );
          skipped++;
          continue;
        }

        this.logger.log(
          `No data found for ${instrumentKey}, fetching from ${twoYearsAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}...`,
        );

        // DEMO VERSION: Fetch and insert directly in client (see SimpleUpstoxClient.getHistoricalCandlesBatched)
        const upstoxCandles =
          await this.upstoxClient.getHistoricalCandlesBatched(
            instrumentKey,
            'minutes',
            1,
            twoYearsAgo,
            today,
          );

        if (!upstoxCandles || upstoxCandles.length === 0) {
          this.logger.warn(`No data returned for ${instrumentKey}`);
          continue;
        }

        totalFetched += upstoxCandles.length;

        this.logger.log(
          `✓ Fetched and inserted ${upstoxCandles.length} candles for ${instrumentKey}`,
        );

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
   * Simple check if candle data already exists for the instrument in the given time range
   * @returns true if data exists, false otherwise
   */
  private async hasDataInRange(
    instrumentKey: string,
    startDate: Date,
    endDate: Date,
  ): Promise<boolean> {
    const existingCandles = await this.candlesRepository.findByTimeRange(
      instrumentKey,
      1, // interval_value
      'minute', // interval_unit
      startDate,
      endDate,
      1, // Just check if ANY candle exists
    );

    return existingCandles.length > 0;
  }

  /**
   * Get all NIFTY50 futures (active and expired) for a date range
   * @returns Array of instrument keys for all futures that were active during the period
   */
  private async getFuturesForDateRange(
    underlyingKey: string,
    startDate: Date,
    endDate: Date,
  ): Promise<string[]> {
    try {
      // Fetch all expiries (last 6 months available from API)
      const allExpiries = await this.upstoxClient.getExpiries(underlyingKey);

      this.logger.log(
        `Found ${allExpiries.length} total expiries for ${underlyingKey}`,
      );

      // Filter expiries that fall within our date range
      const relevantExpiries = allExpiries.filter((expiryStr) => {
        const expiryDate = new Date(expiryStr);
        // Include if expiry is within range OR if expiry is after startDate (was active during period)
        return expiryDate >= startDate && expiryDate <= endDate;
      });

      this.logger.log(
        `${relevantExpiries.length} expiries fall within the target date range`,
      );

      const futureKeys: string[] = [];

      // For each expiry, fetch the contract details
      for (const expiry of relevantExpiries) {
        const contract = await this.upstoxClient.getExpiredFutureContract(
          underlyingKey,
          expiry,
        );

        if (contract) {
          futureKeys.push(contract.instrument_key);
          this.logger.debug(
            `Added future: ${contract.trading_symbol} (${contract.instrument_key})`,
          );
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Also include currently active futures from NIFTY50_FUTURES
      futureKeys.push(...NIFTY50_FUTURES);
      this.logger.log(`Added ${NIFTY50_FUTURES.length} active futures`);

      return futureKeys;
    } catch (error) {
      this.logger.error(
        `Error fetching futures for date range: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // Fallback to hardcoded futures if API fails
      return NIFTY50_FUTURES;
    }
  }

  /**
   * Populate instrument_master table with instrument metadata
   */
  private async populateInstrumentMaster(
    instrumentKeys: string[],
    type: 'STOCK' | 'SPOT' | 'FUTURE' | 'OPTION',
  ): Promise<void> {
    try {
      // Check which instruments already exist
      const existingInstruments = await Promise.all(
        instrumentKeys.map(async (key) => {
          const exists = await this.instrumentMasterRepository.getByKey(key);
          return exists ? key : null;
        }),
      );

      const toFetch = instrumentKeys.filter(
        (key, idx) => existingInstruments[idx] === null,
      );

      if (toFetch.length === 0) {
        this.logger.log(
          `✓ All ${instrumentKeys.length} instruments already exist in instrument_master, skipping`,
        );
        return;
      }

      this.logger.log(
        `Populating instrument_master for ${toFetch.length} new instruments (${instrumentKeys.length - toFetch.length} already exist)...`,
      );

      // Fetch market quotes in batches
      const instrumentData =
        await this.upstoxClient.getFullMarketQuoteBatched(toFetch);

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
