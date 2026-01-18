/**
 * Candle Fetcher Service v3.0
 * Phase 2: Fetch all candle data for all instruments
 *
 * Flow:
 * 2a. Expired Instruments - 1 year before expiry → expiry date (futures + options)
 * 2b. Active Instruments - Batched fetching with rate limiting
 *     - Daily: Jan 2000 → Present (indices, stocks)
 *     - Minute: Jan 2022 → Present (all)
 * 2c. Options Candles - Both active and expired options
 *
 * Data Storage:
 * - market_candles: All OHLCV data
 *
 * Logging:
 * - MongoDB IngestionLog for operation tracking
 *
 * Upstox API Limits:
 * - 60-day chunks per request for historical data
 * - Rate limit: 40 req/sec
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  CandlesRepository,
  InstrumentMasterRepository,
  IngestionLogRepository,
} from '@repo/database';
import { MarketCandle } from '@repo/schema';
import { UpstoxClient, UpstoxCandleData } from './upstox-client';
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
    private readonly ingestionLogRepository: IngestionLogRepository,
  ) {}

  /**
   * Run full candle fetch pipeline
   */
  async fetchAll(): Promise<Map<string, FetchResult>> {
    const results = new Map<string, FetchResult>();
    const now = new Date();

    // Create MongoDB log entry
    const logEntry = await this.ingestionLogRepository.create({
      instrumentKey: 'NSE_INDEX|Nifty 50',
      operation: 'FETCH_DAILY',
      requestedRange: { start: new Date('2000-01-01'), end: now },
    });

    this.logger.log('='.repeat(60));
    this.logger.log('CANDLE DATA FETCHING - Starting');
    this.logger.log(`Log ID: ${logEntry._id}`);
    this.logger.log('='.repeat(60));

    try {
      // Phase 2a: Expired instruments (futures)
      this.logger.log('\n--- Phase 2a: Expired Futures Candles ---');
      results.set('expired-futures', await this.fetchExpiredFuturesCandles());

      // Phase 2b: Active instruments
      this.logger.log('\n--- Phase 2b: Active Instruments (Daily) ---');
      results.set(
        'active-daily',
        await this.fetchActiveInstrumentCandles('day', this.DAILY_START, now),
      );

      this.logger.log('\n--- Phase 2b: Active Instruments (Minute) ---');
      results.set(
        'active-minute',
        await this.fetchActiveInstrumentCandles(
          'minute',
          this.MINUTE_START,
          now,
        ),
      );

      // Phase 2c: Options candles (active + expired)
      this.logger.log('\n--- Phase 2c: Options Candles ---');
      results.set('options', await this.fetchOptionsCandles());

      // Calculate totals
      let totalProcessed = 0;
      let totalCandles = 0;
      const allErrors: string[] = [];

      for (const result of results.values()) {
        totalProcessed += result.instrumentsProcessed;
        totalCandles += result.totalCandlesFetched;
        allErrors.push(...result.errors);
      }

      // Mark success in MongoDB
      await this.ingestionLogRepository.markSuccess(logEntry._id.toString(), {
        candlesFetched: totalCandles,
        candlesStored: totalCandles,
        duplicatesSkipped: 0,
      });

      this.logger.log('='.repeat(60));
      this.logger.log('CANDLE DATA FETCHING - Complete');
      this.logger.log(
        `Total: ${totalProcessed} instruments, ${totalCandles} candles`,
      );
      this.logger.log('='.repeat(60));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.ingestionLogRepository.markFailed(logEntry._id.toString(), {
        code: 'FETCH_FAILED',
        message: msg,
      });
      throw error;
    }

    return results;
  }

  /**
   * Phase 2a: Fetch candles for expired futures
   * For each expired instrument: 1 year before expiry → expiry date
   */
  private async fetchExpiredFuturesCandles(): Promise<FetchResult> {
    const start = Date.now();
    let processed = 0;
    let totalCandles = 0;
    const errors: string[] = [];

    try {
      // Get expired futures from database
      const allInstruments =
        await this.instrumentMasterRepository.getAllInstruments();
      const expiredFutures = allInstruments.filter(
        (i) => i.isExpired && i.expiry && i.instrumentType === 'FUTURE',
      );

      this.logger.log(`Found ${expiredFutures.length} expired futures`);
      const maxInstruments = Math.min(expiredFutures.length, 100);

      for (let i = 0; i < maxInstruments; i++) {
        const instrument = expiredFutures[i];
        if (!instrument.expiry) continue;

        try {
          const expiryDate = new Date(instrument.expiry);
          const startDate = new Date(expiryDate);
          startDate.setFullYear(startDate.getFullYear() - 1);

          const minuteStart =
            startDate < this.MINUTE_START ? this.MINUTE_START : startDate;

          // Check existing data
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
            const toDateStr = expiryDate.toISOString().split('T')[0];
            const fromDateStr = startDate.toISOString().split('T')[0];
            const dailyCandles =
              await this.upstoxClient.getExpiredHistoricalCandles(
                instrument.instrumentKey,
                'day',
                fromDateStr,
                toDateStr,
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
            const toDateStr = expiryDate.toISOString().split('T')[0];
            const fromDateStr = minuteStart.toISOString().split('T')[0];
            const minuteCandles =
              await this.upstoxClient.getExpiredHistoricalCandles(
                instrument.instrumentKey,
                '1minute',
                fromDateStr,
                toDateStr,
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
              `Progress: ${i + 1}/${maxInstruments} expired futures, ${totalCandles} candles`,
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (err) {
          errors.push(
            `${instrument.instrumentKey}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      this.logger.log(
        `✓ Processed ${processed} expired futures, ${totalCandles} candles`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      this.logger.error(`Error in Phase 2a: ${msg}`);
    }

    return {
      phase: 'expired-futures',
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

          await new Promise((resolve) => setTimeout(resolve, 25));
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
   * Phase 2c: Fetch candles for options (active + expired)
   */
  private async fetchOptionsCandles(): Promise<FetchResult> {
    const start = Date.now();
    let processed = 0;
    let totalCandles = 0;
    const errors: string[] = [];

    try {
      // Get all options from database
      const allInstruments =
        await this.instrumentMasterRepository.getAllInstruments();
      const options = allInstruments.filter(
        (i) => i.instrumentType === 'OPTION',
      );

      this.logger.log(`Found ${options.length} option contracts`);

      // Limit for initial run
      const maxOptions = Math.min(options.length, 200);
      const now = new Date();

      for (let i = 0; i < maxOptions; i++) {
        const option = options[i];
        if (!option.expiry) continue;

        try {
          const expiryDate = new Date(option.expiry);
          const isExpired = expiryDate < now;

          // Calculate date range: 1 month before expiry or from listing
          const startDate = new Date(expiryDate);
          startDate.setMonth(startDate.getMonth() - 1);
          const clampedStart =
            startDate < this.MINUTE_START ? this.MINUTE_START : startDate;
          const endDate = isExpired ? expiryDate : now;

          // Skip if too old
          if (clampedStart >= endDate) {
            processed++;
            continue;
          }

          // Check existing data
          const hasData = await this.hasDataInRange(
            option.instrumentKey,
            clampedStart,
            endDate,
            'minute',
          );
          if (hasData) {
            processed++;
            continue;
          }

          // Fetch candles
          if (isExpired) {
            // Use expired API
            const fromDateStr = clampedStart.toISOString().split('T')[0];
            const toDateStr = endDate.toISOString().split('T')[0];
            const candles = await this.upstoxClient.getExpiredHistoricalCandles(
              option.instrumentKey,
              '1minute',
              fromDateStr,
              toDateStr,
            );
            if (candles.length > 0) {
              await this.storeCandles(
                option.instrumentKey,
                candles,
                1,
                'minute',
              );
              totalCandles += candles.length;
            }

            // Also fetch daily for expired options
            const dailyCandles =
              await this.upstoxClient.getExpiredHistoricalCandles(
                option.instrumentKey,
                'day',
                fromDateStr,
                toDateStr,
              );
            if (dailyCandles.length > 0) {
              await this.storeCandles(
                option.instrumentKey,
                dailyCandles,
                1,
                'day',
              );
              totalCandles += dailyCandles.length;
            }
          } else {
            // Use regular API for active options
            const candles = await this.upstoxClient.getHistoricalCandlesBatched(
              option.instrumentKey,
              'minutes',
              1,
              clampedStart,
              endDate,
            );
            if (candles.length > 0) {
              await this.storeCandles(
                option.instrumentKey,
                candles,
                1,
                'minute',
              );
              totalCandles += candles.length;
            }
          }

          processed++;

          if ((i + 1) % 20 === 0) {
            this.logger.log(
              `Progress: ${i + 1}/${maxOptions} options, ${totalCandles} candles`,
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (err) {
          errors.push(
            `${option.instrumentKey}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      this.logger.log(
        `✓ Processed ${processed} options, ${totalCandles} candles`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      this.logger.error(`Error in Phase 2c: ${msg}`);
    }

    return {
      phase: 'options',
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
      return await this.candlesRepository.existsForRange(
        instrumentKey,
        1,
        interval,
        startDate,
        endDate,
      );
    } catch {
      return false;
    }
  }

  /**
   * Store candles in database
   */
  private async storeCandles(
    instrumentKey: string,
    candles: UpstoxCandleData[],
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
      volume: c.volume || 0,
      openInterest: c.open_interest || null,
    }));

    await this.candlesRepository.insertBatch(marketCandles);
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
    // Log to MongoDB
    const logEntry = await this.ingestionLogRepository.create({
      instrumentKey,
      operation: interval === 'day' ? 'FETCH_DAILY' : 'FETCH_MINUTE',
      requestedRange: { start: startDate, end: endDate },
    });

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

      await this.ingestionLogRepository.markSuccess(logEntry._id.toString(), {
        candlesFetched: candles.length,
        candlesStored: candles.length,
        duplicatesSkipped: 0,
      });

      return { candlesFetched: candles.length };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.ingestionLogRepository.markFailed(logEntry._id.toString(), {
        code: 'FETCH_FAILED',
        message: msg,
      });
      return { candlesFetched: 0, error: msg };
    }
  }
}
