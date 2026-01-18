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
  REMOVED_NIFTY50_CONSTITUENTS,
} from './nifty50-instruments';
import { ExpiredFutureContract, SimpleUpstoxClient } from './simple-client';
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
   * Full 26-year range: 2000-2026
   *
   * Upstox API Availability:
   * - Daily candles: Available for all history (2000+)
   * - Minute candles: Only from Jan 2022 (Upstox V3 API limit)
   *
   * Rate Limits:
   * - 50 requests/second
   * - 500 requests/minute
   * - Delay: 25ms between requests (safe buffer)
   */
  async bootstrapHistoricalData(): Promise<void> {
    // Date ranges based on Upstox API availability
    const DAILY_START = new Date('2000-01-01');
    const MINUTE_START = new Date('2022-01-01');
    const VIX_START = new Date('2014-02-26'); // India VIX launched Feb 26, 2014
    const today = new Date();

    // Core instruments
    const indexInstruments = [NIFTY50_INDEX, INDIA_VIX];
    const stockInstruments = [
      ...NIFTY50_CONSTITUENTS,
      ...REMOVED_NIFTY50_CONSTITUENTS.map((c) => c.instrumentKey),
    ];

    this.logger.log('='.repeat(60));
    this.logger.log('HISTORICAL DATA BOOTSTRAP - 2000-2026');
    this.logger.log('='.repeat(60));
    this.logger.log(
      `Daily candles: ${DAILY_START.toISOString().split('T')[0]} to today`,
    );
    this.logger.log(
      `Minute candles: ${MINUTE_START.toISOString().split('T')[0]} to today`,
    );
    this.logger.log(
      `Instruments: ${indexInstruments.length} indices, ${stockInstruments.length} stocks`,
    );

    // Step 1: Populate instrument_master table
    await this.populateInstrumentMaster([NIFTY50_INDEX], 'SPOT');
    await this.populateInstrumentMaster([INDIA_VIX], 'SPOT');
    await this.populateInstrumentMaster(stockInstruments, 'STOCK');

    // Step 2: Fetch NIFTY50 futures dynamically
    const { activeFutures, expiredContracts } =
      await this.getFuturesForDateRange(NIFTY50_INDEX, MINUTE_START, today);

    this.logger.log(
      `Found ${activeFutures.length} active futures + ${expiredContracts.length} expired futures`,
    );

    await this.populateInstrumentMaster(activeFutures, 'FUTURE');
    await this.populateExpiredFutures(expiredContracts);

    const allFutureKeys = [
      ...activeFutures,
      ...expiredContracts.map((c) => c.instrument_key),
    ];

    // Step 3: Fetch DAILY candles first (2000-2026 for indices/stocks, based on available history)
    this.logger.log('\n--- Phase 1: Daily Candles (2000-2026) ---');
    await this.fetchDailyCandles([NIFTY50_INDEX], DAILY_START, today);
    await this.fetchDailyCandles([INDIA_VIX], VIX_START, today); // VIX only from 2014
    await this.fetchDailyCandles(stockInstruments, DAILY_START, today);
    await this.fetchDailyCandles(allFutureKeys, MINUTE_START, today); // Futures only recent

    // Step 4: Fetch MINUTE candles (2022-2026)
    this.logger.log('\n--- Phase 2: Minute Candles (2022-2026) ---');
    await this.fetchMinuteCandles(
      [NIFTY50_INDEX, INDIA_VIX],
      MINUTE_START,
      today,
    );
    await this.fetchMinuteCandles(stockInstruments, MINUTE_START, today);
    await this.fetchMinuteCandles(allFutureKeys, MINUTE_START, today);

    this.logger.log('='.repeat(60));
    this.logger.log('Bootstrap complete!');
    this.logger.log('='.repeat(60));
  }

  /**
   * Fetch daily candles for a list of instruments
   */
  private async fetchDailyCandles(
    instrumentKeys: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    let fetched = 0;
    let skipped = 0;

    for (const instrumentKey of instrumentKeys) {
      try {
        const hasData = await this.hasDataInRange(
          instrumentKey,
          startDate,
          endDate,
          'days',
        );
        if (hasData) {
          this.logger.debug(
            `✓ Daily data exists for ${instrumentKey}, skipping`,
          );
          skipped++;
          continue;
        }

        this.logger.log(`Fetching daily candles for ${instrumentKey}...`);
        const candles = await this.upstoxClient.getHistoricalCandlesBatched(
          instrumentKey,
          'days',
          1,
          startDate,
          endDate,
        );

        if (candles && candles.length > 0) {
          fetched += candles.length;
          this.logger.log(
            `✓ Fetched ${candles.length} daily candles for ${instrumentKey}`,
          );
        } else {
          this.logger.warn(`No daily data for ${instrumentKey}`);
        }

        // Rate limit: 25ms between requests (safe for 50 req/sec)
        await new Promise((resolve) => setTimeout(resolve, 25));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Daily fetch failed for ${instrumentKey}: ${msg}`);
      }
    }

    this.logger.log(
      `Daily phase: ${fetched} candles fetched, ${skipped} skipped`,
    );
  }

  /**
   * Fetch minute candles for a list of instruments (2022+)
   */
  private async fetchMinuteCandles(
    instrumentKeys: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    let fetched = 0;
    let skipped = 0;

    for (const instrumentKey of instrumentKeys) {
      try {
        const hasData = await this.hasDataInRange(
          instrumentKey,
          startDate,
          endDate,
          'minutes',
        );
        if (hasData) {
          this.logger.debug(
            `✓ Minute data exists for ${instrumentKey}, skipping`,
          );
          skipped++;
          continue;
        }

        this.logger.log(`Fetching minute candles for ${instrumentKey}...`);
        const candles = await this.upstoxClient.getHistoricalCandlesBatched(
          instrumentKey,
          'minutes',
          1,
          startDate,
          endDate,
        );

        if (candles && candles.length > 0) {
          fetched += candles.length;
          this.logger.log(
            `✓ Fetched ${candles.length} minute candles for ${instrumentKey}`,
          );
        } else {
          // Try 5-minute if 1-minute fails
          const candles5m = await this.upstoxClient.getHistoricalCandlesBatched(
            instrumentKey,
            'minutes',
            5,
            startDate,
            endDate,
          );
          if (candles5m && candles5m.length > 0) {
            fetched += candles5m.length;
            this.logger.log(
              `✓ Fetched ${candles5m.length} x 5-min candles for ${instrumentKey}`,
            );
          } else {
            this.logger.warn(`No minute data for ${instrumentKey}`);
          }
        }

        // Rate limit: 25ms between requests
        await new Promise((resolve) => setTimeout(resolve, 25));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Minute fetch failed for ${instrumentKey}: ${msg}`);
      }
    }

    this.logger.log(
      `Minute phase: ${fetched} candles fetched, ${skipped} skipped`,
    );
  }

  /**
   * Simple check if candle data already exists for the instrument in the given time range
   * @param instrumentKey - Instrument to check
   * @param startDate - Start of range
   * @param endDate - End of range
   * @param intervalUnit - 'days' or 'minutes'
   * @returns true if data exists, false otherwise
   */
  private async hasDataInRange(
    instrumentKey: string,
    startDate: Date,
    endDate: Date,
    intervalUnit: 'days' | 'minutes' = 'minutes',
  ): Promise<boolean> {
    const existingCandles = await this.candlesRepository.findByTimeRange(
      instrumentKey,
      1, // interval_value
      intervalUnit === 'days' ? 'day' : 'minute', // interval_unit
      startDate,
      endDate,
      1, // Just check if ANY candle exists
    );

    return existingCandles.length > 0;
  }

  /**
   * Get all NIFTY50 futures (active and expired) for a date range
   * @returns Object with active futures keys and expired contract details
   */
  private async getFuturesForDateRange(
    underlyingKey: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    activeFutures: string[];
    expiredContracts: ExpiredFutureContract[];
  }> {
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

      const expiredContracts: ExpiredFutureContract[] = [];

      // For each expiry, fetch the contract details
      for (const expiry of relevantExpiries) {
        const contract = await this.upstoxClient.getExpiredFutureContract(
          underlyingKey,
          expiry,
        );

        if (contract) {
          expiredContracts.push(...contract);
          this.logger.debug(
            `Added future: ${contract.map((c) => c.trading_symbol).join(', ')}`,
          );
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.logger.log(`Added ${NIFTY50_FUTURES.length} active futures`);

      return {
        activeFutures: NIFTY50_FUTURES,
        expiredContracts,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching futures for date range: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // Fallback to hardcoded futures if API fails
      return {
        activeFutures: NIFTY50_FUTURES,
        expiredContracts: [],
      };
    }
  }

  /**
   * Populate instrument_master for expired futures from already-fetched contract data
   */
  private async populateExpiredFutures(
    contracts: ExpiredFutureContract[],
  ): Promise<void> {
    if (contracts.length === 0) {
      return;
    }

    try {
      // Check which instruments already exist
      const existingInstruments = await Promise.all(
        contracts.map(async (contract) => {
          const exists = await this.instrumentMasterRepository.getByKey(
            contract.instrument_key,
          );
          return exists ? contract.instrument_key : null;
        }),
      );

      const toInsert = contracts.filter(
        (contract, idx) => existingInstruments[idx] === null,
      );

      if (toInsert.length === 0) {
        this.logger.log(
          `✓ All ${contracts.length} expired futures already exist in instrument_master, skipping`,
        );
        return;
      }

      this.logger.log(
        `Populating instrument_master for ${toInsert.length} expired futures (${contracts.length - toInsert.length} already exist)...`,
      );

      // Transform expired contract data to InstrumentMaster format
      const instruments: InstrumentMaster[] = toInsert.map((contract) => ({
        instrumentKey: contract.instrument_key,
        exchange: 'NSE',
        segment: 'FO',
        instrumentType: 'FUTURE',
        tradingsymbol: contract.trading_symbol,
        name: contract.name || contract.trading_symbol,
        expiry: contract.expiry ? new Date(contract.expiry) : null,
        strike: null,
        optionType: null,
        lotSize: contract.lot_size || 25, // NIFTY default
        tickSize: contract.tick_size || 0.05,
        underlyingKey: contract.underlying_key || NIFTY50_INDEX,
        isExpired: true,
        lastUpdated: new Date(),
      }));

      const success =
        await this.instrumentMasterRepository.bulkInsert(instruments);

      if (success)
        this.logger.log(
          `✓ Populated ${instruments.length} expired futures in instrument_master`,
        );
      else
        this.logger.warn(
          `✗ Failed to populate some expired futures in instrument_master`,
        );
    } catch (error) {
      this.logger.error(
        `Failed to populate expired futures: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
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
        exchange: inst.exchange || 'NSE',
        segment: inst.segment,
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
