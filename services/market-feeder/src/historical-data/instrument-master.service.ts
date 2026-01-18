/**
 * Instrument Master Service
 * Phase 1: Populate instrument_master table with all instruments
 *
 * Flow:
 * 1a. Active Instruments - NIFTY 50, VIX, constituents, current futures (with depth-5)
 * 1b. Option Chain - Get option contracts with Greeks + depth-5
 * 1c. Expired Instruments - All expired futures and options from all expiry dates
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  InstrumentMasterRepository,
  TickDataRepository,
  OptionChainRepository,
  OptionChainTickRepository,
} from '@repo/database';
import { InstrumentMaster, OptionChainSnapshot } from '@repo/schema';
import {
  INDIA_VIX,
  NIFTY50_CONSTITUENTS,
  NIFTY50_FUTURES,
  NIFTY50_INDEX,
  REMOVED_NIFTY50_CONSTITUENTS,
} from './nifty50-instruments';
import {
  UpstoxClient,
  ActiveOptionContract,
  ExpiredFutureContract,
  ExpiredOptionContract,
} from './upstox-client';

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
  errors: string[];
  durationMs: number;
}

@Injectable()
export class InstrumentMasterService {
  private readonly logger = new Logger(InstrumentMasterService.name);

  constructor(
    private readonly upstoxClient: UpstoxClient,
    private readonly instrumentMasterRepository: InstrumentMasterRepository,
  ) {}

  /**
   * Run full instrument population pipeline
   */
  async populateAll(): Promise<Map<string, PopulationResult>> {
    const results = new Map<string, PopulationResult>();

    this.logger.log('='.repeat(60));
    this.logger.log('INSTRUMENT MASTER POPULATION - Starting');
    this.logger.log('='.repeat(60));

    // Phase 1a: Active instruments
    this.logger.log('\n--- Phase 1a: Active Instruments ---');
    results.set('active', await this.populateActiveInstruments());

    // Phase 1b: Option chain
    this.logger.log('\n--- Phase 1b: Option Chain ---');
    results.set('options', await this.populateOptionChain());

    // Phase 1c: Expired instruments
    this.logger.log('\n--- Phase 1c: Expired Instruments ---');
    results.set('expired', await this.populateExpiredInstruments());

    this.logger.log('='.repeat(60));
    this.logger.log('INSTRUMENT MASTER POPULATION - Complete');
    this.logger.log('='.repeat(60));

    return results;
  }

  /**
   * Phase 1a: Populate active instruments
   * - NIFTY 50 Index
   * - India VIX
   * - All constituents (current + past)
   * - Current future contracts with depth-5
   */
  private async populateActiveInstruments(): Promise<PopulationResult> {
    const start = Date.now();
    let added = 0;
    let skipped = 0;
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

      for (const key of NIFTY50_FUTURES) {
        const exists = await this.instrumentMasterRepository.getByKey(key);
        if (!exists) {
          // Parse expiry from trading symbol (e.g., NIFTY24JANFUT)
          const quote = Object.values(quoteData).find(
            (q) => q?.instrument_token === key,
          );
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
          added++;
        } else {
          skipped++;
        }
      }
      this.logger.log(
        `✓ Processed ${NIFTY50_FUTURES.length} futures with depth-5`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      this.logger.error(`Error in Phase 1a: ${msg}`);
    }

    return {
      phase: 'active',
      instrumentsAdded: added,
      instrumentsSkipped: skipped,
      errors,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Phase 1b: Populate option chain
   * - Get option chain with Greeks
   * - Get depth-5 for options via market quote
   * - Store in instrument_master
   */
  private async populateOptionChain(): Promise<PopulationResult> {
    const start = Date.now();
    let added = 0;
    let skipped = 0;
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

      if (toInsert.length === 0) {
        this.logger.log(
          `✓ All ${contracts.length} option contracts already exist`,
        );
        return {
          phase: 'options',
          instrumentsAdded: 0,
          instrumentsSkipped: skipped,
          errors,
          durationMs: Date.now() - start,
        };
      }

      this.logger.log(`Inserting ${toInsert.length} option contracts...`);

      // Insert in batches
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
        added += batch.length;
      }

      this.logger.log(`✓ Added ${added} option contracts`);

      // Fetch option chain with Greeks for current expiries
      const expiries = await this.upstoxClient.getActiveExpiries(NIFTY50_INDEX);
      this.logger.log(
        `Fetching Greeks for ${Math.min(expiries.length, 3)} nearest expiries...`,
      );

      for (const expiryDate of expiries.slice(0, 3)) {
        try {
          const chain = await this.upstoxClient.getOptionChain(
            NIFTY50_INDEX,
            expiryDate,
          );
          this.logger.log(
            `✓ Fetched option chain for ${expiryDate}: ${chain.length} strikes`,
          );
          // TODO: Store option_chain_snapshot data
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (err) {
          errors.push(
            `Option chain ${expiryDate}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      this.logger.error(`Error in Phase 1b: ${msg}`);
    }

    return {
      phase: 'options',
      instrumentsAdded: added,
      instrumentsSkipped: skipped,
      errors,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Phase 1c: Populate expired instruments
   * - Get all expiry dates
   * - Get expired futures for each expiry
   * - Get expired options for each expiry
   */
  private async populateExpiredInstruments(): Promise<PopulationResult> {
    const start = Date.now();
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      // Get all expiry dates
      const expiries = await this.upstoxClient.getExpiries(NIFTY50_INDEX);
      this.logger.log(`Found ${expiries.length} historical expiry dates`);

      // Process each expiry (limit to avoid API overload)
      const maxExpiries = Math.min(expiries.length, 52); // ~1 year of weekly expiries

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
                  underlyingType: fut.underlying_type,
                  freezeQuantity: fut.freeze_quantity,
                  minimumLot: fut.minimum_lot,
                },
              ]);
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
                  underlyingType: opt.underlying_type,
                  freezeQuantity: opt.freeze_quantity,
                  minimumLot: opt.minimum_lot,
                  weekly: opt.weekly,
                },
              ]);
              added++;
            } else {
              skipped++;
            }
          }

          if ((i + 1) % 10 === 0) {
            this.logger.log(
              `Progress: ${i + 1}/${maxExpiries} expiries processed, ${added} added`,
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 100)); // Rate limiting
        } catch (err) {
          errors.push(
            `Expiry ${expiryDate}: ${err instanceof Error ? err.message : String(err)}`,
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
    }

    return {
      phase: 'expired',
      instrumentsAdded: added,
      instrumentsSkipped: skipped,
      errors,
      durationMs: Date.now() - start,
    };
  }
}
