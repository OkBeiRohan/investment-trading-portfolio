/**
 * Instrument Master Service v3.1
 * Phase 1: Populate instrument_master table with all instruments
 *
 * Flow:
 * 1a. Active Instruments - NIFTY 50, VIX, constituents, current futures (with depth-5)
 * 1b. Option Chain - Get option contracts with Greeks + depth-5
 * 1c. Expired Instruments - All expired futures and options from all expiry dates
 *
 * Data Storage:
 * - QuestDB: instrument_master, orderbook_l2_snapshots, option_chain_snapshot
 * - MongoDB: Instrument, DataInventory, IngestionLog, ProcessingLog
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  InstrumentMasterRepository,
  OrderbookRepository,
  OptionChainRepository,
  IngestionLogRepository,
  DataInventoryRepository,
} from '@repo/database';
import { InstrumentRepository, ProcessingLogRepository } from '@repo/database';
import { InstrumentMaster, OptionChainSnapshot } from '@repo/schema';
import {
  INDIA_VIX,
  NIFTY50_CONSTITUENTS,
  NIFTY50_FUTURES,
  NIFTY50_INDEX,
  REMOVED_NIFTY50_CONSTITUENTS,
} from './nifty50-instruments';
import { UpstoxClient, ActiveOptionContract } from './upstox-client';

export interface PopulationProgress {
  phase: string;
  current: number;
  total: number;
  message: string;
}

export interface PopulationResult {
  phase: string;
  instrumentsAdded: number;
  instrumentsSkipped: number;
  depthSnapshotsStored: number;
  optionChainsStored: number;
  errors: string[];
  durationMs: number;
}

@Injectable()
export class InstrumentMasterService {
  private readonly logger = new Logger(InstrumentMasterService.name);
  private readonly SERVICE_NAME = 'InstrumentMasterService';

  constructor(
    private readonly upstoxClient: UpstoxClient,
    // QuestDB repositories
    private readonly instrumentMasterRepository: InstrumentMasterRepository,
    private readonly orderbookRepository: OrderbookRepository,
    private readonly optionChainRepository: OptionChainRepository,
    // MongoDB repositories
    private readonly ingestionLogRepository: IngestionLogRepository,
    private readonly dataInventoryRepository: DataInventoryRepository,
    private readonly instrumentRepository: InstrumentRepository,
    private readonly processingLogRepository: ProcessingLogRepository,
  ) {}

  /**
   * Run full instrument population pipeline
   */
  async populateAll(): Promise<Map<string, PopulationResult>> {
    const results = new Map<string, PopulationResult>();
    const startTime = Date.now();

    // Create IngestionLog entry
    const logEntry = await this.ingestionLogRepository.create({
      instrumentKey: 'NSE_INDEX|Nifty 50',
      operation: 'FETCH_DAILY',
      requestedRange: { start: new Date(), end: new Date() },
    });

    // Log start to ProcessingLog
    await this.processingLogRepository.logInfo(
      'FETCH',
      'POPULATE_INSTRUMENTS',
      'Starting instrument master population',
      {
        service: this.SERVICE_NAME,
      },
    );

    this.logger.log('='.repeat(60));
    this.logger.log('INSTRUMENT MASTER POPULATION - Starting');
    this.logger.log(`Log ID: ${logEntry._id}`);
    this.logger.log('='.repeat(60));

    try {
      // Phase 1a: Active instruments
      this.logger.log('\n--- Phase 1a: Active Instruments ---');
      results.set('active', await this.populateActiveInstruments());

      // Phase 1b: Option chain
      this.logger.log('\n--- Phase 1b: Option Chain ---');
      results.set('options', await this.populateOptionChain());

      // Phase 1c: Expired instruments
      this.logger.log('\n--- Phase 1c: Expired Instruments ---');
      results.set('expired', await this.populateExpiredInstruments());

      // Calculate totals
      let totalAdded = 0;
      let totalSkipped = 0;
      let totalDepth = 0;
      let totalChains = 0;
      const allErrors: string[] = [];

      for (const result of results.values()) {
        totalAdded += result.instrumentsAdded;
        totalSkipped += result.instrumentsSkipped;
        totalDepth += result.depthSnapshotsStored;
        totalChains += result.optionChainsStored;
        allErrors.push(...result.errors);
      }

      const durationMs = Date.now() - startTime;

      // Mark success in IngestionLog
      await this.ingestionLogRepository.markSuccess(logEntry._id.toString(), {
        candlesFetched: totalAdded,
        candlesStored: totalAdded,
        duplicatesSkipped: totalSkipped,
      });

      // Log completion to ProcessingLog
      await this.processingLogRepository.logInfo(
        'FETCH',
        'POPULATE_INSTRUMENTS',
        `Completed: ${totalAdded} added, ${totalSkipped} skipped, ${totalDepth} depth, ${totalChains} chains`,
        {
          service: this.SERVICE_NAME,
          recordsProcessed: totalAdded,
          durationMs,
        },
      );

      this.logger.log('='.repeat(60));
      this.logger.log('INSTRUMENT MASTER POPULATION - Complete');
      this.logger.log(
        `Total: ${totalAdded} added, ${totalSkipped} skipped, ${totalDepth} depth, ${totalChains} chains`,
      );
      this.logger.log('='.repeat(60));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      // Mark failure in IngestionLog
      await this.ingestionLogRepository.markFailed(logEntry._id.toString(), {
        code: 'POPULATION_FAILED',
        message: msg,
      });

      // Log error to ProcessingLog
      await this.processingLogRepository.logError(
        'FETCH',
        'POPULATE_INSTRUMENTS',
        msg,
        {
          service: this.SERVICE_NAME,
          errorCode: 'POPULATION_FAILED',
          stackTrace: error instanceof Error ? error.stack : undefined,
        },
      );

      throw error;
    }

    return results;
  }

  /**
   * Phase 1a: Populate active instruments
   */
  private async populateActiveInstruments(): Promise<PopulationResult> {
    const start = Date.now();
    let added = 0;
    let skipped = 0;
    let depthStored = 0;
    const errors: string[] = [];

    try {
      // 1. Indices - NIFTY 50 and VIX
      const indices = [NIFTY50_INDEX, INDIA_VIX];
      for (const key of indices) {
        const exists = await this.instrumentMasterRepository.getByKey(key);
        if (!exists) {
          await this.instrumentMasterRepository.bulkInsert([
            {
              instrumentKey: key,
              exchange: 'NSE',
              segment: 'INDEX',
              instrumentType: 'SPOT',
              tradingsymbol: key.split('|')[1],
              name: key.split('|')[1],
              expiry: null,
              strike: null,
              optionType: null,
              lotSize: 1,
              tickSize: 0.05,
              underlyingKey: null,
              isExpired: false,
              lastUpdated: new Date(),
            },
          ]);

          // Store to MongoDB Instrument collection
          await this.instrumentRepository.upsert({
            instrumentKey: key,
            instrumentType: 'INDEX',
            exchange: 'NSE',
            segment: 'INDEX',
            tradingSymbol: key.split('|')[1],
            name: key.split('|')[1],
            isActive: true,
            fetchStatus: {
              status: 'COMPLETE',
              lastSuccessAt: new Date(),
              successfulFetches: 1,
              fetchAttempts: 0,
              failedFetches: 0,
            },
          });

          // Initialize DataInventory
          await this.dataInventoryRepository.upsert(key, {
            instrumentKey: key,
            instrumentType: 'INDEX',
            source: 'UPSTOX_V3',
            status: 'ACTIVE',
          });

          added++;
          this.logger.log(`✓ Added index: ${key}`);
        } else {
          skipped++;
        }
      }

      // 2. All constituents (current + removed)
      const allConstituents = [
        ...NIFTY50_CONSTITUENTS,
        ...REMOVED_NIFTY50_CONSTITUENTS.map((r) => r.instrumentKey),
      ];
      const uniqueConstituents = [...new Set(allConstituents)];
      this.logger.log(
        `Processing ${uniqueConstituents.length} constituents...`,
      );

      for (const key of uniqueConstituents) {
        const exists = await this.instrumentMasterRepository.getByKey(key);
        if (!exists) {
          await this.instrumentMasterRepository.bulkInsert([
            {
              instrumentKey: key,
              exchange: 'NSE',
              segment: 'EQ',
              instrumentType: 'STOCK',
              tradingsymbol: key.split('|')[1],
              name: key.split('|')[1],
              expiry: null,
              strike: null,
              optionType: null,
              lotSize: 1,
              tickSize: 0.05,
              underlyingKey: null,
              isExpired: false,
              lastUpdated: new Date(),
            },
          ]);

          // Store to MongoDB
          const isCurrentNifty50 = NIFTY50_CONSTITUENTS.includes(key);
          await this.instrumentRepository.upsert({
            instrumentKey: key,
            instrumentType: 'EQUITY',
            exchange: 'NSE',
            segment: 'EQ',
            tradingSymbol: key.split('|')[1],
            name: key.split('|')[1],
            isActive: true,
            isNifty50: isCurrentNifty50,
            fetchStatus: {
              status: 'PENDING',
              fetchAttempts: 0,
              successfulFetches: 0,
              failedFetches: 0,
            },
          });

          await this.dataInventoryRepository.upsert(key, {
            instrumentKey: key,
            instrumentType: 'STOCK',
            source: 'UPSTOX_V3',
            status: 'ACTIVE',
          });

          added++;
        } else {
          skipped++;
        }
      }
      this.logger.log(`✓ Processed ${uniqueConstituents.length} constituents`);

      // 3. Current futures with depth-5
      this.logger.log(
        `Fetching depth-5 for ${NIFTY50_FUTURES.length} futures...`,
      );
      const quoteData =
        await this.upstoxClient.getMarketQuoteWithDepth(NIFTY50_FUTURES);
      const now = new Date();

      for (const key of NIFTY50_FUTURES) {
        const quote = Object.values(quoteData).find(
          (q) => q?.instrument_token === key,
        );
        const exists = await this.instrumentMasterRepository.getByKey(key);

        if (!exists) {
          let expiry: Date | null = null;
          if (quote?.symbol) {
            const match = quote.symbol.match(/(\d{2})([A-Z]{3})(\d{2})?FUT$/);
            if (match) {
              const [, day, month, year] = match;
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
              const fullYear = year
                ? 2000 + parseInt(year)
                : new Date().getFullYear();
              expiry = new Date(fullYear, monthMap[month], parseInt(day));
            }
          }

          await this.instrumentMasterRepository.bulkInsert([
            {
              instrumentKey: key,
              exchange: 'NSE',
              segment: 'FO',
              instrumentType: 'FUTURE',
              tradingsymbol: quote?.symbol || key.split('|')[1],
              name: 'NIFTY FUT',
              expiry,
              strike: null,
              optionType: null,
              lotSize: 25,
              tickSize: 0.05,
              underlyingKey: NIFTY50_INDEX,
              isExpired: false,
              lastUpdated: new Date(),
            },
          ]);

          // Store to MongoDB
          await this.instrumentRepository.upsert({
            instrumentKey: key,
            instrumentType: 'FUTURE',
            exchange: 'NSE',
            segment: 'FO',
            tradingSymbol: quote?.symbol || key.split('|')[1],
            name: 'NIFTY FUT',
            underlyingKey: NIFTY50_INDEX,
            underlyingSymbol: 'NIFTY 50',
            expiry: expiry || undefined,
            lotSize: 25,
            tickSize: 0.05,
            isActive: true,
            fetchStatus: {
              status: 'PENDING',
              fetchAttempts: 0,
              successfulFetches: 0,
              failedFetches: 0,
            },
          });

          await this.dataInventoryRepository.upsert(key, {
            instrumentKey: key,
            instrumentType: 'FUTURE',
            underlying: NIFTY50_INDEX,
            source: 'UPSTOX_V3',
            status: 'ACTIVE',
          });

          added++;
        } else {
          skipped++;
        }

        // Store depth-5 in orderbook_l2_snapshots
        if (quote?.depth) {
          await this.orderbookRepository.insertDepth5(now, key, quote.depth);
          depthStored += 10;
        }
      }
      this.logger.log(
        `✓ Processed ${NIFTY50_FUTURES.length} futures, ${depthStored} depth snapshots`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      this.logger.error(`Error in Phase 1a: ${msg}`);

      // Log error to ProcessingLog
      await this.processingLogRepository.logError(
        'FETCH',
        'POPULATE_ACTIVE',
        msg,
        {
          service: this.SERVICE_NAME,
          errorCode: 'ACTIVE_INSTRUMENTS_FAILED',
        },
      );
    }

    return {
      phase: 'active',
      instrumentsAdded: added,
      instrumentsSkipped: skipped,
      depthSnapshotsStored: depthStored,
      optionChainsStored: 0,
      errors,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Phase 1b: Populate option chain
   */
  private async populateOptionChain(): Promise<PopulationResult> {
    const start = Date.now();
    let added = 0;
    let skipped = 0;
    let depthStored = 0;
    let chainsStored = 0;
    const errors: string[] = [];

    try {
      // Get active option contracts
      const contracts =
        await this.upstoxClient.getActiveOptionContracts(NIFTY50_INDEX);
      this.logger.log(`Found ${contracts.length} active option contracts`);

      // Check which ones need to be added
      const toInsert: ActiveOptionContract[] = [];
      for (const contract of contracts) {
        const exists = await this.instrumentMasterRepository.getByKey(
          contract.instrument_key,
        );
        if (!exists) {
          toInsert.push(contract);
        } else {
          skipped++;
        }
      }

      if (toInsert.length > 0) {
        this.logger.log(`Inserting ${toInsert.length} option contracts...`);

        const BATCH_SIZE = 500;
        for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
          const batch = toInsert.slice(i, i + BATCH_SIZE);
          const instruments: InstrumentMaster[] = batch.map((c) => ({
            instrumentKey: c.instrument_key,
            exchange: c.exchange,
            segment: 'FO',
            instrumentType: 'OPTION',
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

          await this.instrumentMasterRepository.bulkInsert(instruments);

          // Batch insert to MongoDB Instrument
          const mongoInstruments = batch.map((c) => ({
            instrumentKey: c.instrument_key,
            instrumentType: 'OPTION' as const,
            exchange: c.exchange,
            segment: 'FO',
            tradingSymbol: c.trading_symbol,
            name: c.name,
            underlyingKey: c.underlying_key,
            underlyingSymbol: c.underlying_symbol,
            expiry: new Date(c.expiry),
            strikePrice: c.strike_price,
            optionType: c.instrument_type as 'CE' | 'PE',
            lotSize: c.lot_size,
            tickSize: c.tick_size,
            isActive: true,
            fetchStatus: {
              status: 'PENDING' as const,
              fetchAttempts: 0,
              successfulFetches: 0,
              failedFetches: 0,
            },
          }));

          await this.instrumentRepository.upsertMany(mongoInstruments);

          added += batch.length;
        }
        this.logger.log(`✓ Added ${added} option contracts`);
      }

      // Fetch option chain with Greeks for current expiries
      const expiries = await this.upstoxClient.getActiveExpiries(NIFTY50_INDEX);
      this.logger.log(
        `Fetching Greeks for ${Math.min(expiries.length, 3)} nearest expiries...`,
      );
      const now = new Date();

      for (const expiryDate of expiries.slice(0, 3)) {
        try {
          const chain = await this.upstoxClient.getOptionChain(
            NIFTY50_INDEX,
            expiryDate,
          );
          this.logger.log(
            `✓ Fetched option chain for ${expiryDate}: ${chain.length} strikes`,
          );

          // Store option chain snapshots
          for (const item of chain) {
            // Store call option
            if (item.call_options?.instrument_key) {
              const callSnapshot: OptionChainSnapshot = {
                timestamp: now,
                instrumentKey: item.call_options.instrument_key,
                underlyingKey: item.underlying_key,
                expiry: new Date(expiryDate),
                strike: item.strike_price,
                optionType: 'CE',
                lastPrice: item.call_options.market_data.ltp,
                bidPrice: item.call_options.market_data.bid_price,
                askPrice: item.call_options.market_data.ask_price,
                bidQty: item.call_options.market_data.bid_qty,
                askQty: item.call_options.market_data.ask_qty,
                iv: item.call_options.option_greeks.iv,
                delta: item.call_options.option_greeks.delta,
                gamma: item.call_options.option_greeks.gamma,
                theta: item.call_options.option_greeks.theta,
                vega: item.call_options.option_greeks.vega,
                pop: item.call_options.option_greeks.pop,
                openInterest: item.call_options.market_data.oi,
                volume: item.call_options.market_data.volume,
              };
              await this.optionChainRepository.insertBatch([callSnapshot]);
              chainsStored++;
            }

            // Store put option
            if (item.put_options?.instrument_key) {
              const putSnapshot: OptionChainSnapshot = {
                timestamp: now,
                instrumentKey: item.put_options.instrument_key,
                underlyingKey: item.underlying_key,
                expiry: new Date(expiryDate),
                strike: item.strike_price,
                optionType: 'PE',
                lastPrice: item.put_options.market_data.ltp,
                bidPrice: item.put_options.market_data.bid_price,
                askPrice: item.put_options.market_data.ask_price,
                bidQty: item.put_options.market_data.bid_qty,
                askQty: item.put_options.market_data.ask_qty,
                iv: item.put_options.option_greeks.iv,
                delta: item.put_options.option_greeks.delta,
                gamma: item.put_options.option_greeks.gamma,
                theta: item.put_options.option_greeks.theta,
                vega: item.put_options.option_greeks.vega,
                pop: item.put_options.option_greeks.pop,
                openInterest: item.put_options.market_data.oi,
                volume: item.put_options.market_data.volume,
              };
              await this.optionChainRepository.insertBatch([putSnapshot]);
              chainsStored++;
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (err) {
          const errMsg = `Option chain ${expiryDate}: ${err instanceof Error ? err.message : String(err)}`;
          errors.push(errMsg);

          await this.processingLogRepository.logError(
            'FETCH',
            'POPULATE_OPTION_CHAIN',
            errMsg,
            {
              service: this.SERVICE_NAME,
              errorCode: 'OPTION_CHAIN_FAILED',
            },
          );
        }
      }

      this.logger.log(`✓ Stored ${chainsStored} option chain snapshots`);

      // Fetch depth-5 for ATM options
      const optionKeys = contracts.slice(0, 50).map((c) => c.instrument_key);
      if (optionKeys.length > 0) {
        try {
          const optionQuotes =
            await this.upstoxClient.getMarketQuoteWithDepth(optionKeys);
          for (const key of optionKeys) {
            const quote = Object.values(optionQuotes).find(
              (q) => q?.instrument_token === key,
            );
            if (quote?.depth) {
              await this.orderbookRepository.insertDepth5(
                now,
                key,
                quote.depth,
              );
              depthStored += 10;
            }
          }
          this.logger.log(`✓ Stored ${depthStored} option depth snapshots`);
        } catch (err) {
          errors.push(
            `Option depth: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      this.logger.error(`Error in Phase 1b: ${msg}`);

      await this.processingLogRepository.logError(
        'FETCH',
        'POPULATE_OPTION_CHAIN',
        msg,
        {
          service: this.SERVICE_NAME,
          errorCode: 'OPTIONS_FAILED',
        },
      );
    }

    return {
      phase: 'options',
      instrumentsAdded: added,
      instrumentsSkipped: skipped,
      depthSnapshotsStored: depthStored,
      optionChainsStored: chainsStored,
      errors,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Phase 1c: Populate expired instruments
   */
  private async populateExpiredInstruments(): Promise<PopulationResult> {
    const start = Date.now();
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      const expiries = await this.upstoxClient.getExpiries(NIFTY50_INDEX);
      this.logger.log(`Found ${expiries.length} historical expiry dates`);

      const maxExpiries = Math.min(expiries.length, 52);

      for (let i = 0; i < maxExpiries; i++) {
        const expiryDate = expiries[i];

        try {
          // Get expired futures
          const futures = await this.upstoxClient.getExpiredFutures(
            NIFTY50_INDEX,
            expiryDate,
          );
          for (const fut of futures) {
            const exists = await this.instrumentMasterRepository.getByKey(
              fut.instrument_key,
            );
            if (!exists) {
              await this.instrumentMasterRepository.bulkInsert([
                {
                  instrumentKey: fut.instrument_key,
                  exchange: fut.exchange,
                  segment: 'FO',
                  instrumentType: 'FUTURE',
                  tradingsymbol: fut.trading_symbol,
                  name: fut.name,
                  expiry: new Date(fut.expiry),
                  strike: null,
                  optionType: null,
                  lotSize: fut.lot_size,
                  tickSize: fut.tick_size,
                  underlyingKey: fut.underlying_key,
                  isExpired: true,
                  lastUpdated: new Date(),
                  exchangeToken: fut.exchange_token,
                  underlyingSymbol: fut.underlying_symbol,
                  underlyingType: fut.underlying_type as
                    | 'INDEX'
                    | 'EQUITY'
                    | 'COMMODITY'
                    | 'CUR'
                    | 'IRD'
                    | 'COM'
                    | null,
                  freezeQuantity: fut.freeze_quantity,
                  minimumLot: fut.minimum_lot,
                },
              ]);

              // Store to MongoDB
              await this.instrumentRepository.upsert({
                instrumentKey: fut.instrument_key,
                instrumentType: 'FUTURE',
                exchange: fut.exchange,
                segment: 'FO',
                tradingSymbol: fut.trading_symbol,
                name: fut.name,
                underlyingKey: fut.underlying_key,
                underlyingSymbol: fut.underlying_symbol,
                expiry: new Date(fut.expiry),
                lotSize: fut.lot_size,
                tickSize: fut.tick_size,
                isActive: false,
                fetchStatus: {
                  status: 'PENDING',
                  fetchAttempts: 0,
                  successfulFetches: 0,
                  failedFetches: 0,
                },
              });

              await this.dataInventoryRepository.upsert(fut.instrument_key, {
                instrumentKey: fut.instrument_key,
                instrumentType: 'FUTURE',
                underlying: fut.underlying_key,
                source: 'UPSTOX_EXPIRED',
                status: 'EXPIRED',
              });

              added++;
            } else {
              skipped++;
            }
          }

          // Get expired options
          const options = await this.upstoxClient.getExpiredOptionContract(
            NIFTY50_INDEX,
            expiryDate,
          );
          for (const opt of options) {
            const exists = await this.instrumentMasterRepository.getByKey(
              opt.instrument_key,
            );
            if (!exists) {
              await this.instrumentMasterRepository.bulkInsert([
                {
                  instrumentKey: opt.instrument_key,
                  exchange: opt.exchange,
                  segment: 'FO',
                  instrumentType: 'OPTION',
                  tradingsymbol: opt.trading_symbol,
                  name: opt.name,
                  expiry: new Date(opt.expiry),
                  strike: opt.strike_price,
                  optionType: opt.instrument_type,
                  lotSize: opt.lot_size,
                  tickSize: opt.tick_size,
                  underlyingKey: opt.underlying_key,
                  isExpired: true,
                  lastUpdated: new Date(),
                  exchangeToken: opt.exchange_token,
                  underlyingSymbol: opt.underlying_symbol,
                  underlyingType: opt.underlying_type as
                    | 'INDEX'
                    | 'EQUITY'
                    | 'COMMODITY'
                    | 'CUR'
                    | 'IRD'
                    | 'COM'
                    | null,
                  freezeQuantity: opt.freeze_quantity,
                  minimumLot: opt.minimum_lot,
                  weekly: opt.weekly,
                },
              ]);

              // Store to MongoDB
              await this.instrumentRepository.upsert({
                instrumentKey: opt.instrument_key,
                instrumentType: 'OPTION',
                exchange: opt.exchange,
                segment: 'FO',
                tradingSymbol: opt.trading_symbol,
                name: opt.name,
                underlyingKey: opt.underlying_key,
                underlyingSymbol: opt.underlying_symbol,
                expiry: new Date(opt.expiry),
                strikePrice: opt.strike_price,
                optionType: opt.instrument_type as 'CE' | 'PE',
                lotSize: opt.lot_size,
                tickSize: opt.tick_size,
                isActive: false,
                fetchStatus: {
                  status: 'PENDING',
                  fetchAttempts: 0,
                  successfulFetches: 0,
                  failedFetches: 0,
                },
              });

              await this.dataInventoryRepository.upsert(opt.instrument_key, {
                instrumentKey: opt.instrument_key,
                instrumentType: 'OPTION',
                underlying: opt.underlying_key,
                source: 'UPSTOX_EXPIRED',
                status: 'EXPIRED',
              });

              added++;
            } else {
              skipped++;
            }
          }

          if ((i + 1) % 10 === 0) {
            this.logger.log(
              `Progress: ${i + 1}/${maxExpiries} expiries, ${added} added`,
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (err) {
          const errMsg = `Expiry ${expiryDate}: ${err instanceof Error ? err.message : String(err)}`;
          errors.push(errMsg);

          await this.processingLogRepository.logError(
            'FETCH',
            'POPULATE_EXPIRED',
            errMsg,
            {
              service: this.SERVICE_NAME,
              errorCode: 'EXPIRED_FETCH_FAILED',
            },
          );
        }
      }

      this.logger.log(
        `✓ Processed ${maxExpiries} expiries, added ${added} expired instruments`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      this.logger.error(`Error in Phase 1c: ${msg}`);

      await this.processingLogRepository.logError(
        'FETCH',
        'POPULATE_EXPIRED',
        msg,
        {
          service: this.SERVICE_NAME,
          errorCode: 'EXPIRED_FAILED',
        },
      );
    }

    return {
      phase: 'expired',
      instrumentsAdded: added,
      instrumentsSkipped: skipped,
      depthSnapshotsStored: 0,
      optionChainsStored: 0,
      errors,
      durationMs: Date.now() - start,
    };
  }
}
