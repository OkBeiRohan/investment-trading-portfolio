/**
 * Historical Backfill Service
 * Fetches and stores historical candle data from Upstox
 * Uses GapDetector to only fetch missing ranges
 * Uses UpstoxHistoricalAPIService from @repo/market-sdk
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  CandlesRepository,
  InstrumentMasterRepository,
  IngestionLogRepository,
  DataInventoryRepository,
  InstrumentRepository,
  ProcessingLogRepository,
  DbConfigService,
} from '@repo/database';
import {
  UpstoxHistoricalAPIService,
  UPSTOX_DATA_AVAILABILITY,
  type UpstoxCandleDataTyped,
} from '@repo/market-sdk';
import { AuthManagerService } from '@repo/authentication';
import { GapDetectorService } from './gap-detector.service';

export interface BackfillResult {
  phase: string;
  instrumentsProcessed: number;
  totalCandlesFetched: number;
  errors: string[];
  durationMs: number;
}

@Injectable()
export class HistoricalBackfillService {
  private readonly logger = new Logger(HistoricalBackfillService.name);

  private readonly DAILY_START = UPSTOX_DATA_AVAILABILITY.DAILY_START;
  private readonly MINUTE_START = UPSTOX_DATA_AVAILABILITY.MINUTE_START;

  constructor(
    private readonly upstoxApi: UpstoxHistoricalAPIService,
    private readonly authManager: AuthManagerService,
    private readonly gapDetector: GapDetectorService,
    private readonly dbConfig: DbConfigService,
    private readonly candlesRepo: CandlesRepository,
    private readonly instrumentMasterRepo: InstrumentMasterRepository,
    private readonly ingestionLogRepo: IngestionLogRepository,
    private readonly dataInventoryRepo: DataInventoryRepository,
    private readonly instrumentRepo: InstrumentRepository,
    private readonly processingLogRepo: ProcessingLogRepository,
  ) {}

  /**
   * Run full backfill pipeline
   */
  async backfillAll(): Promise<Map<string, BackfillResult>> {
    const results = new Map<string, BackfillResult>();
    const now = new Date();

    const logEntry = await this.ingestionLogRepo.create({
      instrumentKey: 'ALL',
      operation: 'BACKFILL_ALL',
      requestedRange: { start: this.DAILY_START, end: now },
    });

    this.logger.log('═'.repeat(60));
    this.logger.log('HISTORICAL BACKFILL — Starting');
    this.logger.log('═'.repeat(60));

    try {
      await this.ensureApiToken();

      // Phase 2a
      this.logger.log('\n--- Phase 2a: Expired Futures Candles ---');
      results.set('expired-futures', await this.backfillExpiredFutures());

      // Phase 2b: Daily
      this.logger.log('\n--- Phase 2b: Active Instruments (Daily) ---');
      results.set('active-daily', await this.backfillActiveInstruments('day', this.DAILY_START, now));

      // Phase 2b: Minute
      this.logger.log('\n--- Phase 2b: Active Instruments (Minute) ---');
      results.set('active-minute', await this.backfillActiveInstruments('minute', this.MINUTE_START, now));

      // Phase 2c
      this.logger.log('\n--- Phase 2c: Options Candles ---');
      results.set('options', await this.backfillOptions());

      let totalCandles = 0;
      for (const result of results.values()) {
        totalCandles += result.totalCandlesFetched;
      }

      await this.ingestionLogRepo.markSuccess(logEntry._id.toString(), {
        candlesFetched: totalCandles,
        candlesStored: totalCandles,
        duplicatesSkipped: 0,
      });

      this.logger.log('═'.repeat(60));
      this.logger.log(`HISTORICAL BACKFILL — Complete: ${totalCandles} total candles`);
      this.logger.log('═'.repeat(60));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.ingestionLogRepo.markFailed(logEntry._id.toString(), { code: 'BACKFILL_FAILED', message: msg });
      throw error;
    }

    return results;
  }

  /**
   * Incremental backfill: fetch only data since last known candle
   * Used by nightly cron job
   */
  async backfillIncremental(lookbackDays = 7): Promise<BackfillResult> {
    const start = Date.now();
    let processed = 0;
    let totalCandles = 0;
    const errors: string[] = [];

    await this.ensureApiToken();

    const activeKeys = await this.getAllActiveKeys();
    const now = new Date();

    this.logger.log(`Incremental backfill: ${activeKeys.length} instruments, ${lookbackDays} day lookback`);

    for (const key of activeKeys) {
      try {
        const latestDaily = await this.gapDetector.getLatestTimestamp(key, 'day');
        const latestMinute = await this.gapDetector.getLatestTimestamp(key, 'minute');

        // Backfill daily from last known or lookback
        const dailyFrom = latestDaily
          ? new Date(latestDaily.getTime() + 86400000)
          : new Date(now.getTime() - lookbackDays * 86400000);

        if (dailyFrom < now) {
          const candles = await this.upstoxApi.fetchHistoricalCandlesTyped(key, 'days', '1', dailyFrom, now);
          if (candles.length > 0) {
            await this.storeCandles(key, candles, 1, 'day');
            totalCandles += candles.length;
          }
        }

        // Backfill minute from last known or lookback
        const minuteFrom = latestMinute
          ? new Date(latestMinute.getTime() + 60000)
          : new Date(now.getTime() - lookbackDays * 86400000);

        const clampedMinuteFrom = minuteFrom < this.MINUTE_START ? this.MINUTE_START : minuteFrom;

        if (clampedMinuteFrom < now) {
          const candles = await this.upstoxApi.fetchHistoricalCandlesTyped(key, 'minutes', '1', clampedMinuteFrom, now);
          if (candles.length > 0) {
            await this.storeCandles(key, candles, 1, 'minute');
            totalCandles += candles.length;
          }
        }

        processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Invalid instrument key') || msg.includes('UDAPI100011')) {
          this.logger.warn(`Skipping invalid/delisted instrument: ${key}`);
          await this.instrumentRepo.updateFetchStatus(key, 'ERROR', 'Invalid instrument key - possibly delisted');
        } else {
          errors.push(`${key}: ${msg}`);
        }
      }
    }

    this.logger.log(`✓ Incremental backfill: ${processed} instruments, ${totalCandles} candles, ${errors.length} errors`);
    return { phase: 'incremental', instrumentsProcessed: processed, totalCandlesFetched: totalCandles, errors, durationMs: Date.now() - start };
  }

  /**
   * Backfill a single instrument's data with gap detection
   */
  async backfillInstrument(
    instrumentKey: string,
    interval: 'day' | 'minute',
    startDate: Date,
    endDate: Date,
  ): Promise<{ candlesFetched: number; error?: string }> {
    try {
      await this.ensureApiToken();

      const gaps = interval === 'day'
        ? await this.gapDetector.findMissingDailyRanges(instrumentKey, startDate, endDate)
        : await this.gapDetector.findMissingMinuteRanges(instrumentKey, startDate, endDate);

      if (gaps.length === 0) {
        this.logger.log(`No gaps for ${instrumentKey} (${interval})`);
        return { candlesFetched: 0 };
      }

      let totalCandles = 0;

      for (const gap of gaps) {
        const unit = interval === 'day' ? 'days' : 'minutes';
        const candles = await this.upstoxApi.fetchHistoricalCandlesTyped(instrumentKey, unit, '1', gap.from, gap.to);

        if (candles.length > 0) {
          await this.storeCandles(instrumentKey, candles, 1, interval);
          totalCandles += candles.length;
        }
      }

      await this.instrumentRepo.updateFetchStatus(instrumentKey, 'COMPLETE');
      return { candlesFetched: totalCandles };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.instrumentRepo.updateFetchStatus(instrumentKey, 'ERROR', msg);
      return { candlesFetched: 0, error: msg };
    }
  }

  // ═══════════════════════════════════════════════════════
  // Phase implementations
  // ═══════════════════════════════════════════════════════

  private async backfillExpiredFutures(): Promise<BackfillResult> {
    const start = Date.now();
    let processed = 0;
    let totalCandles = 0;
    const errors: string[] = [];
    const ingestionConfig = await this.dbConfig.getIngestionConfig();
    const maxInstruments = ingestionConfig.maxExpiredFutures;

    try {
      const allInstruments = await this.instrumentMasterRepo.getAllInstruments();
      const expiredFutures = allInstruments.filter((i: any) => i.isExpired && i.expiry && i.instrumentType === 'FUTURE');

      this.logger.log(`Found ${expiredFutures.length} expired futures (processing up to ${maxInstruments})`);

      for (let i = 0; i < Math.min(expiredFutures.length, maxInstruments); i++) {
        const instrument = expiredFutures[i];
        if (!instrument.expiry) continue;

        try {
          const expiryDate = new Date(instrument.expiry);
          const startDate = new Date(expiryDate);
          startDate.setFullYear(startDate.getFullYear() - 1);
          const minuteStart = startDate < this.MINUTE_START ? this.MINUTE_START : startDate;

          await this.instrumentRepo.updateFetchStatus(instrument.instrumentKey, 'FETCHING');

          // Daily candles
          const hasDaily = await this.gapDetector.hasAnyData(instrument.instrumentKey, 'day');
          if (!hasDaily) {
            const dailyCandles = await this.upstoxApi.fetchExpiredCandles(instrument.instrumentKey, 'day', startDate, expiryDate);
            if (dailyCandles.length > 0) {
              await this.storeCandles(instrument.instrumentKey, dailyCandles, 1, 'day');
              totalCandles += dailyCandles.length;
            }
          }

          // Minute candles
          const hasMinute = await this.gapDetector.hasAnyData(instrument.instrumentKey, 'minute');
          if (!hasMinute && minuteStart < expiryDate) {
            const minuteCandles = await this.upstoxApi.fetchExpiredCandles(instrument.instrumentKey, '1minute', minuteStart, expiryDate);
            if (minuteCandles.length > 0) {
              await this.storeCandles(instrument.instrumentKey, minuteCandles, 1, 'minute');
              totalCandles += minuteCandles.length;
            }
          }

          await this.instrumentRepo.updateFetchStatus(instrument.instrumentKey, 'COMPLETE');
          processed++;

          if ((i + 1) % 10 === 0) {
            this.logger.log(`Progress: ${i + 1}/${Math.min(expiredFutures.length, maxInstruments)}, ${totalCandles} candles`);
          }
        } catch (err) {
          const msg = `${instrument.instrumentKey}: ${err instanceof Error ? err.message : String(err)}`;
          errors.push(msg);
          await this.instrumentRepo.updateFetchStatus(instrument.instrumentKey, 'ERROR', msg);
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    return { phase: 'expired-futures', instrumentsProcessed: processed, totalCandlesFetched: totalCandles, errors, durationMs: Date.now() - start };
  }

  private async backfillActiveInstruments(
    interval: 'day' | 'minute',
    startDate: Date,
    endDate: Date,
  ): Promise<BackfillResult> {
    const start = Date.now();
    let processed = 0;
    let totalCandles = 0;
    const errors: string[] = [];

    const activeKeys = await this.getAllActiveKeys();
    this.logger.log(`Backfilling ${interval} candles for ${activeKeys.length} instruments`);

    for (let i = 0; i < activeKeys.length; i++) {
      const key = activeKeys[i];

      try {
        const gaps = interval === 'day'
          ? await this.gapDetector.findMissingDailyRanges(key, startDate, endDate)
          : await this.gapDetector.findMissingMinuteRanges(key, startDate, endDate);

        if (gaps.length === 0) { processed++; continue; }

        await this.instrumentRepo.updateFetchStatus(key, 'FETCHING');

        for (const gap of gaps) {
          const unit = interval === 'day' ? 'days' : 'minutes';
          const candles = await this.upstoxApi.fetchHistoricalCandlesTyped(key, unit, '1', gap.from, gap.to);

          if (candles.length > 0) {
            await this.storeCandles(key, candles, 1, interval);
            totalCandles += candles.length;
          }
        }

        await this.instrumentRepo.updateFetchStatus(key, 'COMPLETE');
        processed++;

        if ((i + 1) % 10 === 0) {
          this.logger.log(`Progress: ${i + 1}/${activeKeys.length}, ${totalCandles} ${interval} candles`);
        }
      } catch (err) {
        errors.push(`${key}: ${err instanceof Error ? err.message : String(err)}`);
        await this.instrumentRepo.updateFetchStatus(key, 'ERROR', String(err));
      }
    }

    return { phase: `active-${interval}`, instrumentsProcessed: processed, totalCandlesFetched: totalCandles, errors, durationMs: Date.now() - start };
  }

  private async backfillOptions(): Promise<BackfillResult> {
    const start = Date.now();
    let processed = 0;
    let totalCandles = 0;
    const errors: string[] = [];
    const ingestionConfig = await this.dbConfig.getIngestionConfig();
    const maxOptions = ingestionConfig.maxOptions;

    try {
      const allInstruments = await this.instrumentMasterRepo.getAllInstruments();
      const options = allInstruments.filter((i: any) => i.instrumentType === 'OPTION');

      this.logger.log(`Found ${options.length} options (processing up to ${maxOptions})`);
      const now = new Date();

      for (let i = 0; i < Math.min(options.length, maxOptions); i++) {
        const option = options[i];
        if (!option.expiry) continue;

        try {
          const expiryDate = new Date(option.expiry);
          const isExpired = expiryDate < now;
          const optionStart = new Date(expiryDate);
          optionStart.setMonth(optionStart.getMonth() - 1);
          const clampedStart = optionStart < this.MINUTE_START ? this.MINUTE_START : optionStart;
          const endDate = isExpired ? expiryDate : now;

          if (clampedStart >= endDate) { processed++; continue; }

          const hasData = await this.gapDetector.hasAnyData(option.instrumentKey, 'minute');
          if (hasData) { processed++; continue; }

          const candles = isExpired
            ? await this.upstoxApi.fetchExpiredCandles(option.instrumentKey, '1minute', clampedStart, endDate)
            : await this.upstoxApi.fetchHistoricalCandlesTyped(option.instrumentKey, 'minutes', '1', clampedStart, endDate);

          if (candles.length > 0) {
            await this.storeCandles(option.instrumentKey, candles, 1, 'minute');
            totalCandles += candles.length;
          }

          processed++;

          if ((i + 1) % 20 === 0) {
            this.logger.log(`Progress: ${i + 1}/${Math.min(options.length, maxOptions)}, ${totalCandles} candles`);
          }
        } catch (err) {
          errors.push(`${option.instrumentKey}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    return { phase: 'options', instrumentsProcessed: processed, totalCandlesFetched: totalCandles, errors, durationMs: Date.now() - start };
  }

  // ═══════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════

  private async ensureApiToken(): Promise<void> {
    const token = await this.authManager.getAccessToken('system', 'upstox', 'LIVE');
    this.upstoxApi.setAccessToken(token);
  }

  private async getAllActiveKeys(): Promise<string[]> {
    const keys = new Set<string>();

    const dataEnabled = await this.instrumentRepo.findDataCollectionEnabled();
    for (const inst of dataEnabled) {
      keys.add(inst.instrumentKey);
    }

    const nifty50 = await this.instrumentRepo.findNifty50();
    for (const inst of nifty50) {
      keys.add(inst.instrumentKey);
    }

    const indices = await this.instrumentRepo.findByType('INDEX');
    for (const inst of indices) {
      keys.add(inst.instrumentKey);
    }

    return Array.from(keys);
  }

  private async storeCandles(
    instrumentKey: string,
    candles: UpstoxCandleDataTyped[],
    intervalValue: number,
    intervalUnit: 'day' | 'minute',
  ): Promise<void> {
    const marketCandles = candles.map((c) => ({
      timestamp: new Date(c.timestamp),
      instrumentKey,
      intervalValue,
      intervalUnit,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume || 0,
      openInterest: c.openInterest || 0,
    }));

    const CHUNK_SIZE = 5000;
    for (let i = 0; i < marketCandles.length; i += CHUNK_SIZE) {
      const chunk = marketCandles.slice(i, i + CHUNK_SIZE);
      await this.candlesRepo.insertBatch(chunk);
    }
  }
}
