/**
 * Historical Data Bootstrap Service
 * Checks for missing data and fetches from Upstox V3 API
 * Fetches 1-minute candles for past 1 year for NIFTY50 ecosystem
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CandlesRepository, InstrumentMasterRepository } from '@repo/database';
import { InstrumentMaster, OptionChainSnapshot } from '@repo/schema';
import {
  INDIA_VIX,
  NIFTY50_CONSTITUENTS,
  NIFTY50_FUTURES,
  NIFTY50_INDEX,
  REMOVED_NIFTY50_CONSTITUENTS,
} from './nifty50-instruments';
import {
  ActiveOptionContract,
  ExpiredFutureContract,
  ExpiredOptionContract,
  SimpleUpstoxClient,
} from './simple-client';
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

    // ==========================================
    // PHASE 1: Populate instrument_master table
    // ==========================================
    this.logger.log('\n--- Phase 1: Instrument Master Data ---');

    // 1a. Index and stock instruments
    await this.populateInstrumentMaster([NIFTY50_INDEX], 'SPOT');
    await this.populateInstrumentMaster([INDIA_VIX], 'SPOT');
    await this.populateInstrumentMaster(stockInstruments, 'STOCK');

    // 1b. Active futures with full data (including expiry)
    const { activeFutures, expiredContracts: expiredFutures } =
      await this.getFuturesForDateRange(NIFTY50_INDEX, MINUTE_START, today);
    this.logger.log(
      `Found ${activeFutures.length} active futures + ${expiredFutures.length} expired futures`,
    );
    await this.populateActiveFutures(activeFutures);
    await this.populateExpiredFutures(expiredFutures);

    // 1c. Active options - fetch all current option contracts
    const activeOptions = await this.populateActiveOptions(NIFTY50_INDEX);

    // 1d. Expired options - fetch from expired-instruments API (past 6 months)
    const expiredOptions = await this.populateExpiredOptions(NIFTY50_INDEX);

    const allFutureKeys = [
      ...activeFutures,
      ...expiredFutures.map((c) => c.instrument_key),
    ];
    const allOptionKeys = [
      ...activeOptions.map((c) => c.instrument_key),
      ...expiredOptions.map((c) => c.instrument_key),
    ];

    this.logger.log(
      `Total instruments: ${allFutureKeys.length} futures, ${allOptionKeys.length} options`,
    );

    // ==========================================
    // PHASE 2: Fetch option chain with greeks (current snapshot)
    // ==========================================
    this.logger.log('\n--- Phase 2: Option Chain Snapshot (Greeks) ---');
    await this.fetchOptionChainSnapshot(NIFTY50_INDEX);

    // ==========================================
    // PHASE 3: Fetch DAILY candles (2000-2026)
    // ==========================================
    this.logger.log('\n--- Phase 3: Daily Candles (2000-2026) ---');
    await this.fetchDailyCandles([NIFTY50_INDEX], DAILY_START, today);
    await this.fetchDailyCandles([INDIA_VIX], VIX_START, today);
    await this.fetchDailyCandles(stockInstruments, DAILY_START, today);
    await this.fetchDailyCandles(allFutureKeys, MINUTE_START, today);

    // ==========================================
    // PHASE 4: Fetch MINUTE candles (2022-2026)
    // ==========================================
    this.logger.log('\n--- Phase 4: Minute Candles (2022-2026) ---');
    await this.fetchMinuteCandles(
      [NIFTY50_INDEX, INDIA_VIX],
      MINUTE_START,
      today,
    );
    await this.fetchMinuteCandles(stockInstruments, MINUTE_START, today);
    await this.fetchMinuteCandles(allFutureKeys, MINUTE_START, today);

    // ==========================================
    // PHASE 5: Fetch expired candle data
    // ==========================================
    this.logger.log('\n--- Phase 5: Expired Options Candle Data ---');
    await this.fetchExpiredCandleData(expiredOptions, 'OPTION');
    await this.fetchExpiredCandleData(expiredFutures, 'FUTURE');

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
   * Populate active futures with full data including expiry
   */
  private async populateActiveFutures(futureKeys: string[]): Promise<void> {
    if (futureKeys.length === 0) return;

    try {
      const existingInstruments = await Promise.all(
        futureKeys.map(async (key) => {
          const exists = await this.instrumentMasterRepository.getByKey(key);
          return exists ? key : null;
        }),
      );

      const toInsert = futureKeys.filter(
        (_, idx) => existingInstruments[idx] === null,
      );

      if (toInsert.length === 0) {
        this.logger.log(
          `✓ All ${futureKeys.length} active futures already exist`,
        );
        return;
      }

      this.logger.log(`Populating ${toInsert.length} active futures...`);

      const quoteData =
        await this.upstoxClient.getMarketQuoteWithDepth(toInsert);

      const instruments: InstrumentMaster[] = toInsert.map((key) => {
        const id = Object.keys(quoteData).find(
          (k) =>
            quoteData[k as keyof typeof quoteData]?.instrument_token === key,
        );
        const quote = id ? quoteData[id as keyof typeof quoteData] : null;

        let expiry: Date | null = null;
        if (quote?.symbol) {
          const match = quote.symbol.match(/(\d{2})([A-Z]{3})FUT$/);
          if (match) {
            const [, day, month] = match;
            const monthMap: Record<string, number> = {
              JAN: 0,
              FEB: 1,
              MAR: 2,
              APR: 3,
              MAY: 4,
              JUN: 5,
              JUL: 6,
              AUG: 7,
              SEP: 8,
              OCT: 9,
              NOV: 10,
              DEC: 11,
            };
            expiry = new Date(
              new Date().getFullYear(),
              monthMap[month],
              parseInt(day),
            );
          }
        }

        return {
          instrumentKey: key,
          exchange: 'NSE' as const,
          segment: 'FO' as const,
          instrumentType: 'FUTURE' as const,
          tradingsymbol: quote?.symbol || key,
          name: quote?.symbol || 'NIFTY FUT',
          expiry,
          strike: null,
          optionType: null,
          lotSize: 25,
          tickSize: 0.05,
          underlyingKey: NIFTY50_INDEX,
          isExpired: false,
          lastUpdated: new Date(),
        };
      });

      await this.instrumentMasterRepository.bulkInsert(instruments);
      this.logger.log(`✓ Populated ${instruments.length} active futures`);
    } catch (error) {
      this.logger.error(
        `Failed to populate active futures: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Populate active option contracts from /v2/option/contract API
   */
  private async populateActiveOptions(
    underlyingKey: string,
  ): Promise<ActiveOptionContract[]> {
    try {
      this.logger.log(`Fetching active options for ${underlyingKey}...`);
      const contracts =
        await this.upstoxClient.getActiveOptionContracts(underlyingKey);

      if (contracts.length === 0) {
        this.logger.warn(`No active options found for ${underlyingKey}`);
        return [];
      }

      this.logger.log(`Found ${contracts.length} active option contracts`);

      const existingSet = new Set<string>();
      for (const contract of contracts) {
        const exists = await this.instrumentMasterRepository.getByKey(
          contract.instrument_key,
        );
        if (exists) existingSet.add(contract.instrument_key);
      }

      const toInsert = contracts.filter(
        (c) => !existingSet.has(c.instrument_key),
      );

      if (toInsert.length === 0) {
        this.logger.log(
          `✓ All ${contracts.length} active options already exist`,
        );
        return contracts;
      }

      this.logger.log(`Populating ${toInsert.length} new option contracts...`);

      const instruments: InstrumentMaster[] = toInsert.map((c) => ({
        instrumentKey: c.instrument_key,
        exchange: c.exchange,
        segment: 'FO' as const,
        instrumentType: 'OPTION' as const,
        tradingsymbol: c.trading_symbol,
        name: c.name,
        expiry: new Date(c.expiry),
        strike: c.strike_price,
        optionType: c.instrument_type,
        lotSize: c.lot_size,
        tickSize: c.tick_size,
        underlyingKey: c.underlying_key,
        isExpired: false,
        lastUpdated: new Date(),
        exchangeToken: c.exchange_token,
        underlyingSymbol: c.underlying_symbol,
        underlyingType: c.underlying_type,
        freezeQuantity: c.freeze_quantity,
        minimumLot: c.minimum_lot,
        weekly: c.weekly,
        isActive: true,
      }));

      const BATCH_SIZE = 500;
      for (let i = 0; i < instruments.length; i += BATCH_SIZE) {
        const batch = instruments.slice(i, i + BATCH_SIZE);
        await this.instrumentMasterRepository.bulkInsert(batch);
      }

      this.logger.log(
        `✓ Populated ${instruments.length} active option contracts`,
      );
      return contracts;
    } catch (error) {
      this.logger.error(
        `Failed to populate active options: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Populate expired option contracts from expired-instruments API
   */
  private async populateExpiredOptions(
    underlyingKey: string,
  ): Promise<ExpiredOptionContract[]> {
    try {
      this.logger.log(`Fetching expired options for ${underlyingKey}...`);
      const expiries = await this.upstoxClient.getExpiries(underlyingKey);
      this.logger.log(`Found ${expiries.length} historic expiries`);

      const allContracts: ExpiredOptionContract[] = [];

      for (const expiryDate of expiries) {
        const contracts = await this.upstoxClient.getExpiredOptionContract(
          underlyingKey,
          expiryDate,
        );
        if (contracts.length > 0) {
          allContracts.push(...contracts);
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (allContracts.length === 0) {
        this.logger.warn(`No expired options found for ${underlyingKey}`);
        return [];
      }

      this.logger.log(
        `Found ${allContracts.length} total expired option contracts`,
      );

      const existingSet = new Set<string>();
      for (const contract of allContracts) {
        const exists = await this.instrumentMasterRepository.getByKey(
          contract.instrument_key,
        );
        if (exists) existingSet.add(contract.instrument_key);
      }

      const toInsert = allContracts.filter(
        (c) => !existingSet.has(c.instrument_key),
      );

      if (toInsert.length === 0) {
        this.logger.log(
          `✓ All ${allContracts.length} expired options already exist`,
        );
        return allContracts;
      }

      this.logger.log(
        `Populating ${toInsert.length} expired option contracts...`,
      );

      const instruments: InstrumentMaster[] = toInsert.map((c) => ({
        instrumentKey: c.instrument_key,
        exchange: c.exchange,
        segment: 'FO' as const,
        instrumentType: 'OPTION' as const,
        tradingsymbol: c.trading_symbol,
        name: c.name,
        expiry: new Date(c.expiry),
        strike: c.strike_price,
        optionType: c.instrument_type,
        lotSize: c.lot_size,
        tickSize: c.tick_size,
        underlyingKey: c.underlying_key,
        isExpired: true,
        lastUpdated: new Date(),
        exchangeToken: c.exchange_token,
        underlyingSymbol: c.underlying_symbol,
        underlyingType: c.underlying_type,
        freezeQuantity: c.freeze_quantity,
        minimumLot: c.minimum_lot,
        weekly: c.weekly,
        isActive: false,
      }));

      const BATCH_SIZE = 500;
      for (let i = 0; i < instruments.length; i += BATCH_SIZE) {
        const batch = instruments.slice(i, i + BATCH_SIZE);
        await this.instrumentMasterRepository.bulkInsert(batch);
      }

      this.logger.log(
        `✓ Populated ${instruments.length} expired option contracts`,
      );
      return allContracts;
    } catch (error) {
      this.logger.error(
        `Failed to populate expired options: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Fetch option chain snapshot with Greeks for current expiries
   */
  private async fetchOptionChainSnapshot(underlyingKey: string): Promise<void> {
    try {
      const expiries = await this.upstoxClient.getActiveExpiries(underlyingKey);
      if (expiries.length === 0) {
        this.logger.warn(`No active expiries found for ${underlyingKey}`);
        return;
      }

      this.logger.log(
        `Fetching option chain for ${expiries.length} expiries...`,
      );
      let totalSnapshots = 0;

      for (const expiryDate of expiries.slice(0, 3)) {
        try {
          const chain = await this.upstoxClient.getOptionChain(
            underlyingKey,
            expiryDate,
          );
          const snapshots: OptionChainSnapshot[] = [];

          for (const item of chain) {
            if (item.call_options) {
              snapshots.push({
                timestamp: new Date(),
                underlyingKey,
                instrumentKey: item.call_options.instrument_key,
                expiry: new Date(item.expiry),
                strike: item.strike_price,
                optionType: 'CE',
                lastPrice: item.call_options.market_data.ltp,
                bidPrice: item.call_options.market_data.bid_price,
                askPrice: item.call_options.market_data.ask_price,
                bidQty: item.call_options.market_data.bid_qty,
                askQty: item.call_options.market_data.ask_qty,
                volume: item.call_options.market_data.volume,
                openInterest: item.call_options.market_data.oi,
                prevOi: item.call_options.market_data.prev_oi,
                closePrice: item.call_options.market_data.close_price,
                iv: item.call_options.option_greeks.iv,
                delta: item.call_options.option_greeks.delta,
                gamma: item.call_options.option_greeks.gamma,
                vega: item.call_options.option_greeks.vega,
                theta: item.call_options.option_greeks.theta,
                pop: item.call_options.option_greeks.pop,
              });
            }
            if (item.put_options) {
              snapshots.push({
                timestamp: new Date(),
                underlyingKey,
                instrumentKey: item.put_options.instrument_key,
                expiry: new Date(item.expiry),
                strike: item.strike_price,
                optionType: 'PE',
                lastPrice: item.put_options.market_data.ltp,
                bidPrice: item.put_options.market_data.bid_price,
                askPrice: item.put_options.market_data.ask_price,
                bidQty: item.put_options.market_data.bid_qty,
                askQty: item.put_options.market_data.ask_qty,
                volume: item.put_options.market_data.volume,
                openInterest: item.put_options.market_data.oi,
                prevOi: item.put_options.market_data.prev_oi,
                closePrice: item.put_options.market_data.close_price,
                iv: item.put_options.option_greeks.iv,
                delta: item.put_options.option_greeks.delta,
                gamma: item.put_options.option_greeks.gamma,
                vega: item.put_options.option_greeks.vega,
                theta: item.put_options.option_greeks.theta,
                pop: item.put_options.option_greeks.pop,
              });
            }
          }
          totalSnapshots += snapshots.length;
          this.logger.log(
            `✓ Fetched ${snapshots.length} option chain entries for expiry ${expiryDate}`,
          );
        } catch (err) {
          this.logger.warn(
            `Failed to fetch option chain for ${expiryDate}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      this.logger.log(`✓ Total option chain snapshots: ${totalSnapshots}`);
    } catch (error) {
      this.logger.error(
        `Failed to fetch option chain snapshot: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Fetch candle data for expired instruments
   */
  private async fetchExpiredCandleData(
    contracts: (ExpiredOptionContract | ExpiredFutureContract)[],
    type: 'OPTION' | 'FUTURE',
  ): Promise<void> {
    if (contracts.length === 0) {
      this.logger.log(
        `No expired ${type.toLowerCase()}s to fetch candle data for`,
      );
      return;
    }

    this.logger.log(
      `Fetching candle data for ${contracts.length} expired ${type.toLowerCase()}s...`,
    );
    let processed = 0;
    let errors = 0;

    for (const contract of contracts) {
      try {
        const expiryDate = new Date(contract.expiry);
        const lookbackMonths = type === 'OPTION' ? 3 : 6;
        const startDate = new Date(expiryDate);
        startDate.setMonth(startDate.getMonth() - lookbackMonths);

        const minDate = new Date('2022-01-01');
        if (startDate < minDate) startDate.setTime(minDate.getTime());

        const hasData = await this.hasDataInRange(
          contract.instrument_key,
          startDate,
          expiryDate,
          'minutes',
        );
        if (hasData) {
          processed++;
          continue;
        }

        await this.upstoxClient.getHistoricalCandlesBatched(
          contract.instrument_key,
          'minutes',
          1,
          startDate,
          expiryDate,
        );
        await this.upstoxClient.getHistoricalCandlesBatched(
          contract.instrument_key,
          'days',
          1,
          startDate,
          expiryDate,
        );

        processed++;
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        errors++;
        this.logger.warn(
          `Failed to fetch candles for ${contract.instrument_key}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      if (processed % 100 === 0) {
        this.logger.log(
          `Progress: ${processed}/${contracts.length} expired ${type.toLowerCase()}s processed`,
        );
      }
    }

    this.logger.log(
      `✓ Expired ${type.toLowerCase()} candle data: ${processed} processed, ${errors} errors`,
    );
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
