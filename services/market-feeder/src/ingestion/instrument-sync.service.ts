/**
 * Instrument Sync Service
 * Populates and maintains instrument_master table in QuestDB + MongoDB
 *
 * Uses UpstoxHistoricalAPIService from @repo/market-sdk for all API calls
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InstrumentMasterRepository,
  OrderbookRepository,
  OptionChainRepository,
  IngestionLogRepository,
  DataInventoryRepository,
  InstrumentRepository,
  ProcessingLogRepository,
} from '@repo/database';
import { OptionChainSnapshot } from '@repo/schema';
import {
  UpstoxHistoricalAPIService,
  type ActiveOptionContract,
} from '@repo/market-sdk';
import { AuthManagerService } from '@repo/authentication';
import {
  NIFTY50_CONSTITUENTS,
  NIFTY50_CONSTITUENTS_DATA,
  NIFTY50_FUTURES,
  NIFTY50_INDEX,
  INDIA_VIX,
  REMOVED_NIFTY50_CONSTITUENTS,
} from '../historical-data/nifty50-instruments';

export interface SyncResult {
  phase: string;
  instrumentsAdded: number;
  instrumentsSkipped: number;
  depthSnapshotsStored: number;
  optionChainsStored: number;
  errors: string[];
  durationMs: number;
}

@Injectable()
export class InstrumentSyncService {
  private readonly logger = new Logger(InstrumentSyncService.name);

  constructor(
    private readonly upstoxApi: UpstoxHistoricalAPIService,
    private readonly authManager: AuthManagerService,
    private readonly configService: ConfigService,
    // QuestDB
    private readonly instrumentMasterRepo: InstrumentMasterRepository,
    private readonly orderbookRepo: OrderbookRepository,
    private readonly optionChainRepo: OptionChainRepository,
    // MongoDB
    private readonly ingestionLogRepo: IngestionLogRepository,
    private readonly dataInventoryRepo: DataInventoryRepository,
    private readonly instrumentRepo: InstrumentRepository,
    private readonly processingLogRepo: ProcessingLogRepository,
  ) {}

  /**
   * Run full instrument sync pipeline
   */
  async syncAll(): Promise<Map<string, SyncResult>> {
    const results = new Map<string, SyncResult>();

    const logEntry = await this.ingestionLogRepo.create({
      instrumentKey: NIFTY50_INDEX,
      operation: 'INSTRUMENT_SYNC',
      requestedRange: { start: new Date(), end: new Date() },
    });

    await this.processingLogRepo.logInfo('FETCH', 'INSTRUMENT_SYNC', 'Starting instrument sync', {
      service: 'InstrumentSyncService',
    });

    this.logger.log('═'.repeat(60));
    this.logger.log('INSTRUMENT SYNC — Starting');
    this.logger.log('═'.repeat(60));

    try {
      await this.ensureApiToken();

      // Phase 1a: Active instruments
      this.logger.log('\n--- Phase 1a: Active Instruments ---');
      results.set('active', await this.syncActiveInstruments());

      // Phase 1b: Option chain
      this.logger.log('\n--- Phase 1b: Option Chain ---');
      results.set('options', await this.syncOptionChain());

      // Phase 1c: Expired instruments
      this.logger.log('\n--- Phase 1c: Expired Instruments ---');
      results.set('expired', await this.syncExpiredInstruments());

      let totalAdded = 0;
      let totalSkipped = 0;
      const allErrors: string[] = [];

      for (const result of results.values()) {
        totalAdded += result.instrumentsAdded;
        totalSkipped += result.instrumentsSkipped;
        allErrors.push(...result.errors);
      }

      await this.ingestionLogRepo.markSuccess(logEntry._id.toString(), {
        candlesFetched: totalAdded,
        candlesStored: totalAdded,
        duplicatesSkipped: totalSkipped,
      });

      this.logger.log('═'.repeat(60));
      this.logger.log(`INSTRUMENT SYNC — Complete: ${totalAdded} added, ${totalSkipped} skipped`);
      this.logger.log('═'.repeat(60));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.ingestionLogRepo.markFailed(logEntry._id.toString(), {
        code: 'SYNC_FAILED',
        message: msg,
      });
      throw error;
    }

    return results;
  }

  /**
   * Phase 1a: Sync active instruments (indices, stocks, futures)
   */
  private async syncActiveInstruments(): Promise<SyncResult> {
    const start = Date.now();
    let added = 0;
    let skipped = 0;
    let depthStored = 0;
    const errors: string[] = [];

    try {
      // 1. Indices
      for (const key of [NIFTY50_INDEX, INDIA_VIX]) {
        const exists = await this.instrumentMasterRepo.getByKey(key);
        if (!exists) {
          await this.instrumentMasterRepo.bulkInsert([{
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
          }]);

          await this.instrumentRepo.upsert({
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

          await this.dataInventoryRepo.upsert(key, {
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

      // 2. Constituents (current + removed)
      const allConstituents = [
        ...NIFTY50_CONSTITUENTS,
        ...REMOVED_NIFTY50_CONSTITUENTS.map((r) => r.instrumentKey),
      ];
      const uniqueConstituents = [...new Set(allConstituents)];
      this.logger.log(`Processing ${uniqueConstituents.length} constituents...`);

      for (const key of uniqueConstituents) {
        const exists = await this.instrumentMasterRepo.getByKey(key);
        if (!exists) {
          await this.instrumentMasterRepo.bulkInsert([{
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
          }]);

          const isCurrentNifty50 = NIFTY50_CONSTITUENTS.includes(key);
          await this.instrumentRepo.upsert({
            instrumentKey: key,
            instrumentType: 'EQUITY',
            exchange: 'NSE',
            segment: 'EQ',
            tradingSymbol: key.split('|')[1],
            name: key.split('|')[1],
            isActive: true,
            isNifty50: isCurrentNifty50,
            fetchStatus: { status: 'PENDING', fetchAttempts: 0, successfulFetches: 0, failedFetches: 0 },
          });

          await this.dataInventoryRepo.upsert(key, {
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

      // 3. Current futures with depth
      this.logger.log(`Fetching quotes for ${NIFTY50_FUTURES.length} futures...`);
      const quoteData = await this.upstoxApi.getMarketQuotes(NIFTY50_FUTURES);
      const now = new Date();

      for (const key of NIFTY50_FUTURES) {
        const quote = Object.values(quoteData).find((q: any) => q?.instrument_token === key) as any;
        const exists = await this.instrumentMasterRepo.getByKey(key);

        if (!exists) {
          await this.instrumentMasterRepo.bulkInsert([{
            instrumentKey: key,
            exchange: 'NSE',
            segment: 'FO',
            instrumentType: 'FUTURE',
            tradingsymbol: quote?.symbol || key.split('|')[1],
            name: 'NIFTY FUT',
            expiry: null,
            strike: null,
            optionType: null,
            lotSize: 25,
            tickSize: 0.05,
            underlyingKey: NIFTY50_INDEX,
            isExpired: false,
            lastUpdated: new Date(),
          }]);

          await this.instrumentRepo.upsert({
            instrumentKey: key,
            instrumentType: 'FUTURE',
            exchange: 'NSE',
            segment: 'FO',
            tradingSymbol: quote?.symbol || key.split('|')[1],
            name: 'NIFTY FUT',
            underlyingKey: NIFTY50_INDEX,
            underlyingSymbol: 'NIFTY 50',
            lotSize: 25,
            tickSize: 0.05,
            isActive: true,
            fetchStatus: { status: 'PENDING', fetchAttempts: 0, successfulFetches: 0, failedFetches: 0 },
          });

          added++;
        } else {
          skipped++;
        }

        // Store depth snapshot
        if (quote?.depth) {
          await this.orderbookRepo.insertDepth5(now, key, quote.depth);
          depthStored += 10;
        }
      }
      this.logger.log(`✓ Processed ${NIFTY50_FUTURES.length} futures, ${depthStored} depth snapshots`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      this.logger.error(`Error in Phase 1a: ${msg}`);
    }

    return { phase: 'active', instrumentsAdded: added, instrumentsSkipped: skipped, depthSnapshotsStored: depthStored, optionChainsStored: 0, errors, durationMs: Date.now() - start };
  }

  /**
   * Phase 1b: Sync option chain with Greeks
   */
  private async syncOptionChain(): Promise<SyncResult> {
    const start = Date.now();
    let added = 0;
    let skipped = 0;
    let chainsStored = 0;
    const errors: string[] = [];

    try {
      const contracts = await this.upstoxApi.getActiveOptionContracts(NIFTY50_INDEX);
      this.logger.log(`Found ${contracts.length} active option contracts`);

      // Insert missing contracts
      const toInsert: ActiveOptionContract[] = [];
      for (const contract of contracts) {
        const exists = await this.instrumentMasterRepo.getByKey(contract.instrument_key);
        if (!exists) {
          toInsert.push(contract);
        } else {
          skipped++;
        }
      }

      if (toInsert.length > 0) {
        const BATCH_SIZE = 500;
        for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
          const batch = toInsert.slice(i, i + BATCH_SIZE);
          const instruments = batch.map((c) => ({
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
          await this.instrumentMasterRepo.bulkInsert(instruments);

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
            fetchStatus: { status: 'PENDING' as const, fetchAttempts: 0, successfulFetches: 0, failedFetches: 0 },
          }));
          await this.instrumentRepo.upsertMany(mongoInstruments);
          added += batch.length;
        }
        this.logger.log(`✓ Added ${added} option contracts`);
      }

      // Fetch option chain with Greeks for nearest 3 expiries
      const expiries = await this.upstoxApi.getExpiryDates(NIFTY50_INDEX);
      const now = new Date();

      for (const expiryDate of expiries.slice(0, 3)) {
        try {
          const chain = await this.upstoxApi.getOptionChainV3(NIFTY50_INDEX, expiryDate);
          this.logger.log(`✓ Fetched option chain for ${expiryDate}: ${chain.length} strikes`);

          for (const item of chain) {
            if (item.call_options?.instrument_key) {
              const snapshot: OptionChainSnapshot = {
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
              await this.optionChainRepo.insertBatch([snapshot]);
              chainsStored++;
            }
            if (item.put_options?.instrument_key) {
              const snapshot: OptionChainSnapshot = {
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
              await this.optionChainRepo.insertBatch([snapshot]);
              chainsStored++;
            }
          }
          await this.sleep(200);
        } catch (err) {
          errors.push(`Option chain ${expiryDate}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      this.logger.log(`✓ Stored ${chainsStored} option chain snapshots`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      this.logger.error(`Error in Phase 1b: ${msg}`);
    }

    return { phase: 'options', instrumentsAdded: added, instrumentsSkipped: skipped, depthSnapshotsStored: 0, optionChainsStored: chainsStored, errors, durationMs: Date.now() - start };
  }

  /**
   * Phase 1c: Sync expired instruments
   */
  private async syncExpiredInstruments(): Promise<SyncResult> {
    const start = Date.now();
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];
    const maxExpiries = this.configService.get<number>('ingestion.maxExpiries', 52);

    try {
      const expiries = await this.upstoxApi.getExpiryDates(NIFTY50_INDEX);
      this.logger.log(`Found ${expiries.length} historical expiry dates (processing up to ${maxExpiries})`);

      for (let i = 0; i < Math.min(expiries.length, maxExpiries); i++) {
        const expiryDate = expiries[i];

        try {
          // Expired futures
          const futures = await this.upstoxApi.getExpiredFutures(NIFTY50_INDEX, expiryDate);
          for (const fut of futures) {
            const exists = await this.instrumentMasterRepo.getByKey(fut.instrument_key);
            if (!exists) {
              await this.instrumentMasterRepo.bulkInsert([{
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
                underlyingType: fut.underlying_type as any,
                freezeQuantity: fut.freeze_quantity,
                minimumLot: fut.minimum_lot,
              }]);

              await this.instrumentRepo.upsert({
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
                fetchStatus: { status: 'PENDING', fetchAttempts: 0, successfulFetches: 0, failedFetches: 0 },
              });

              added++;
            } else {
              skipped++;
            }
          }

          // Expired options
          const options = await this.upstoxApi.getExpiredOptions(NIFTY50_INDEX, expiryDate);
          for (const opt of options) {
            const exists = await this.instrumentMasterRepo.getByKey(opt.instrument_key);
            if (!exists) {
              await this.instrumentMasterRepo.bulkInsert([{
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
                underlyingType: opt.underlying_type as any,
                freezeQuantity: opt.freeze_quantity,
                minimumLot: opt.minimum_lot,
                weekly: opt.weekly,
              }]);
              added++;
            } else {
              skipped++;
            }
          }

          if ((i + 1) % 10 === 0) {
            this.logger.log(`Progress: ${i + 1}/${Math.min(expiries.length, maxExpiries)} expiries, ${added} added`);
          }

          await this.sleep(50);
        } catch (err) {
          errors.push(`Expiry ${expiryDate}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      this.logger.log(`✓ Processed expired instruments: ${added} added, ${skipped} skipped`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      this.logger.error(`Error in Phase 1c: ${msg}`);
    }

    return { phase: 'expired', instrumentsAdded: added, instrumentsSkipped: skipped, depthSnapshotsStored: 0, optionChainsStored: 0, errors, durationMs: Date.now() - start };
  }

  private async ensureApiToken(): Promise<void> {
    const token = await this.authManager.getAccessToken('system', 'upstox', 'LIVE');
    this.upstoxApi.setAccessToken(token);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
