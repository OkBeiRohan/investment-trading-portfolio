/**
 * Candle Fetcher Service
 * Phase 2: Fetch all candle data for all instruments
 *
 * Flow:
 * 2a. Expired Instruments - 1 year before expiry → expiry date
 * 2b. Active Instruments - Batched fetching with rate limiting
 *     - Daily: Jan 2000 → Present
 *     - Minute: Jan 2022 → Present
 *
 * Upstox API Limits:
 * - 60-day chunks per request for historical data
 * - Rate limit: 40 req/sec
 */

import { Injectable, Logger } from '@nestjs/common';
import { CandlesRepository, InstrumentMasterRepository } from '@repo/database';
import { MarketCandle, InstrumentMaster } from '@repo/schema';
import { UpstoxClient } from './upstox-client';
import {
  INDIA_VIX,
  NIFTY50_CONSTITUENTS,
  NIFTY50_FUTURES,
  NIFTY50_INDEX,
  REMOVED_NIFTY50_CONSTITUENTS,
} from './nifty50-instruments';

export interface FetchProgress {
  phase: string;
  instrumentKey: string;
  current: number;
  total: number;
  candlesFetched: number;
}

export interface FetchResult {
  phase: string;
  instrumentsProcessed: number;
  totalCandlesFetched: number;
  errors: string[];
  durationMs: number;
}

@Injectable()
export class CandleFetcherService {
  private readonly logger = new Logger(CandleFetcherService.name);

  // Date ranges
  private readonly DAILY_START = new Date('2000-01-01');
  private readonly MINUTE_START = new Date('2022-01-01');

  constructor(
    private readonly upstoxClient: UpstoxClient,
    private readonly candlesRepository: CandlesRepository,
    private readonly instrumentMasterRepository: InstrumentMasterRepository,
  ) {}

  /**
   * Run full candle fetch pipeline
   */
  async fetchAll(): Promise<Map<string, FetchResult>> {
    const results = new Map<string, FetchResult>();
    const now = new Date();

    this.logger.log('='.repeat(60));
    this.logger.log('CANDLE DATA FETCHING - Starting');
    this.logger.log('='.repeat(60));

    // Phase 2a: Expired instruments
    this.logger.log('\n--- Phase 2a: Expired Instruments Candles ---');
    results.set('expired', await this.fetchExpiredInstrumentCandles());

    // Phase 2b: Active instruments
    this.logger.log('\n--- Phase 2b: Active Instruments Candles ---');
    results.set(
      'active-daily',
      await this.fetchActiveInstrumentCandles('day', this.DAILY_START, now),
    );
    results.set(
      'active-minute',
      await this.fetchActiveInstrumentCandles('minute', this.MINUTE_START, now),
    );

    this.logger.log('='.repeat(60));
    this.logger.log('CANDLE DATA FETCHING - Complete');
    this.logger.log('='.repeat(60));

    return results;
  }

  /**
   * Phase 2a: Fetch candles for expired instruments
   * For each expired instrument: 1 year before expiry → expiry date
   */
  private async fetchExpiredInstrumentCandles(): Promise<FetchResult> {
    const start = Date.now();
    let processed = 0;
    let totalCandles = 0;
    const errors: string[] = [];

    try {
      // Get all expired instruments from database
      const allInstruments =
        await this.instrumentMasterRepository.getAllInstruments();
      const expiredInstruments = allInstruments.filter(
        (i) => i.isExpired && i.expiry,
      );

      this.logger.log(`Found ${expiredInstruments.length} expired instruments`);

      // Limit for initial run
      const maxInstruments = Math.min(expiredInstruments.length, 100);

      for (let i = 0; i < maxInstruments; i++) {
        const instrument = expiredInstruments[i];
        if (!instrument.expiry) continue;

        try {
          const expiryDate = new Date(instrument.expiry);
          const startDate = new Date(expiryDate);
          startDate.setFullYear(startDate.getFullYear() - 1);

          // Clamp minute data start to Jan 2022
          const minuteStart =
            startDate < this.MINUTE_START ? this.MINUTE_START : startDate;

          // Check if we already have data
          const hasDaily = await this.hasDataInRange(
            instrument.instrumentKey,
            startDate,
            expiryDate,
            'day',
          );
          const hasMinute = await this.hasDataInRange(
            instrument.instrumentKey,
            minuteStart,
            expiryDate,
            'minute',
          );

          if (!hasDaily) {
            // Fetch daily candles
            const dailyCandles =
              await this.upstoxClient.getExpiredHistoricalCandles(
                instrument.instrumentKey,
                'day',
                1,
                expiryDate,
                startDate,
              );
            if (dailyCandles.length > 0) {
              await this.storeCandles(
                instrument.instrumentKey,
                dailyCandles,
                1,
                'day',
              );
              totalCandles += dailyCandles.length;
            }
          }

          if (!hasMinute && minuteStart < expiryDate) {
            // Fetch minute candles
            const minuteCandles =
              await this.upstoxClient.getExpiredHistoricalCandles(
                instrument.instrumentKey,
                'minute',
                1,
                expiryDate,
                minuteStart,
              );
            if (minuteCandles.length > 0) {
              await this.storeCandles(
                instrument.instrumentKey,
                minuteCandles,
                1,
                'minute',
              );
              totalCandles += minuteCandles.length;
            }
          }

          processed++;

          if ((i + 1) % 10 === 0) {
            this.logger.log(
              `Progress: ${i + 1}/${maxInstruments} expired instruments, ${totalCandles} candles`,
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 50)); // Rate limiting
        } catch (err) {
          errors.push(
            `${instrument.instrumentKey}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      this.logger.log(
        `✓ Processed ${processed} expired instruments, ${totalCandles} candles`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      this.logger.error(`Error in Phase 2a: ${msg}`);
    }

    return {
      phase: 'expired',
      instrumentsProcessed: processed,
      totalCandlesFetched: totalCandles,
      errors,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Phase 2b: Fetch candles for active instruments
   */
  private async fetchActiveInstrumentCandles(
    interval: 'day' | 'minute',
    startDate: Date,
    endDate: Date,
  ): Promise<FetchResult> {
    const start = Date.now();
    let processed = 0;
    let totalCandles = 0;
    const errors: string[] = [];

    try {
      // Build list of active instruments
      const activeKeys = [
        NIFTY50_INDEX,
        INDIA_VIX,
        ...NIFTY50_CONSTITUENTS,
        ...REMOVED_NIFTY50_CONSTITUENTS.map((r) => r.instrumentKey),
        ...NIFTY50_FUTURES,
      ];
      const uniqueKeys = [...new Set(activeKeys)];

      this.logger.log(
        `Fetching ${interval} candles for ${uniqueKeys.length} instruments`,
      );
      this.logger.log(
        `Date range: ${startDate.toISOString().split('T')[0]} → ${endDate.toISOString().split('T')[0]}`,
      );

      for (let i = 0; i < uniqueKeys.length; i++) {
        const key = uniqueKeys[i];

        try {
          // Check if we already have data
          const hasData = await this.hasDataInRange(
            key,
            startDate,
            endDate,
            interval,
          );
          if (hasData) {
            processed++;
            continue;
          }

          // Fetch candles in batched mode (handles chunking internally)
          const unit = interval === 'day' ? 'days' : 'minutes';
          const candles = await this.upstoxClient.getHistoricalCandlesBatched(
            key,
            unit,
            1,
            startDate,
            endDate,
          );

          if (candles.length > 0) {
            await this.storeCandles(key, candles, 1, interval);
            totalCandles += candles.length;
          }

          processed++;

          if ((i + 1) % 10 === 0) {
            this.logger.log(
              `Progress: ${i + 1}/${uniqueKeys.length} instruments, ${totalCandles} ${interval} candles`,
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 25)); // Rate limiting
        } catch (err) {
          errors.push(
            `${key}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      this.logger.log(
        `✓ Processed ${processed} instruments, ${totalCandles} ${interval} candles`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      this.logger.error(`Error in Phase 2b (${interval}): ${msg}`);
    }

    return {
      phase: `active-${interval}`,
      instrumentsProcessed: processed,
      totalCandlesFetched: totalCandles,
      errors,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Check if data exists in date range
   */
  private async hasDataInRange(
    instrumentKey: string,
    startDate: Date,
    endDate: Date,
    interval: 'day' | 'minute',
  ): Promise<boolean> {
    try {
      const intervalValue = 1;
      const intervalUnit = interval;
      const count = await this.candlesRepository.getCountInRange(
        instrumentKey,
        intervalValue,
        intervalUnit,
        startDate,
        endDate,
      );
      return count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Store candles in database
   */
  private async storeCandles(
    instrumentKey: string,
    candles: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
      oi: number;
    }>,
    intervalValue: number,
    intervalUnit: 'day' | 'minute',
  ): Promise<void> {
    const marketCandles: MarketCandle[] = candles.map((c) => ({
      timestamp: new Date(c.timestamp),
      instrumentKey,
      intervalValue,
      intervalUnit,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      openInterest: c.oi || null,
    }));

    await this.candlesRepository.bulkInsert(marketCandles);
  }

  /**
   * Fetch candles for a specific instrument (public method for controller)
   */
  async fetchInstrumentCandles(
    instrumentKey: string,
    interval: 'day' | 'minute',
    startDate: Date,
    endDate: Date,
  ): Promise<{ candlesFetched: number; error?: string }> {
    try {
      const unit = interval === 'day' ? 'days' : 'minutes';
      const candles = await this.upstoxClient.getHistoricalCandlesBatched(
        instrumentKey,
        unit,
        1,
        startDate,
        endDate,
      );

      if (candles.length > 0) {
        await this.storeCandles(instrumentKey, candles, 1, interval);
      }

      return { candlesFetched: candles.length };
    } catch (error) {
      return {
        candlesFetched: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
