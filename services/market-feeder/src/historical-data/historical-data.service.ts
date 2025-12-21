/**
 * Historical Data Service
 * Orchestrates historical data fetching with gap detection
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QuestDBService } from '@repo/database';
import { UpstoxHistoricalService } from '@repo/market-sdk';

export interface BackfillRequest {
  instrumentKeys: string[];
  intervals: string[];
  fromDate?: string; // YYYY-MM-DD (optional, uses gap detection)
  toDate?: string; // YYYY-MM-DD (optional, defaults to today)
}

export interface BackfillProgress {
  totalInstruments: number;
  completedInstruments: number;
  currentInstrument: string;
  totalCandles: number;
  elapsedMs: number;
}

@Injectable()
export class HistoricalDataService {
  private readonly logger = new Logger(HistoricalDataService.name);

  constructor(
    private readonly questdbService: QuestDBService,
    private readonly upstoxHistoricalService: UpstoxHistoricalService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Backfill historical data for multiple instruments
   * Uses gap detection to fetch only missing data
   *
   * @param request Backfill request
   * @returns Total candles inserted
   */
  async backfillHistoricalData(request: BackfillRequest): Promise<number> {
    const startTime = Date.now();
    let totalCandles = 0;
    let completedInstruments = 0;

    this.logger.log(
      `Starting backfill for ${request.instrumentKeys.length} instruments, intervals: ${request.intervals.join(', ')}`,
    );

    // Emit initial progress
    this.emitProgress({
      totalInstruments: request.instrumentKeys.length,
      completedInstruments: 0,
      currentInstrument: '',
      totalCandles: 0,
      elapsedMs: 0,
    });

    for (const instrumentKey of request.instrumentKeys) {
      for (const interval of request.intervals) {
        try {
          // Parse interval (e.g., '5m' -> interval: '5', unit: 'minutes')
          const { intervalValue, unit } = this.parseInterval(interval);

          // Fetch with gap detection
          const candles =
            await this.upstoxHistoricalService.fetchHistoricalCandles(
              {
                instrument_key: instrumentKey,
                interval: intervalValue,
                unit,
                from_date: request.fromDate,
                to_date: request.toDate,
              },
              (
                table: 'market_candles' | 'market_quotes' | 'option_greeks',
                instrumentKey: string,
              ) => this.questdbService.getLastTimestamp(table, instrumentKey),
            );

          if (candles.length > 0) {
            // Insert into QuestDB
            await this.questdbService.insertCandles(candles);
            totalCandles += candles.length;

            this.logger.log(
              `Inserted ${candles.length} candles for ${instrumentKey} (${interval})`,
            );
          } else {
            this.logger.debug(`No new data for ${instrumentKey} (${interval})`);
          }
        } catch (error) {
          this.logger.error(
            `Failed to backfill ${instrumentKey} (${interval})`,
            error,
          );
        }
      }

      completedInstruments++;

      // Emit progress
      this.emitProgress({
        totalInstruments: request.instrumentKeys.length,
        completedInstruments,
        currentInstrument: instrumentKey,
        totalCandles,
        elapsedMs: Date.now() - startTime,
      });
    }

    const duration = Date.now() - startTime;
    this.logger.log(
      `Backfill completed: ${totalCandles} candles in ${duration}ms`,
    );

    // Emit completion
    this.eventEmitter.emit('backfill.completed', {
      totalInstruments: request.instrumentKeys.length,
      totalCandles,
      durationMs: duration,
    });

    return totalCandles;
  }

  /**
   * Parse interval string to Upstox API format
   * Examples: '1m' -> {intervalValue: '1', unit: 'minutes'}
   *          '1h' -> {intervalValue: '1', unit: 'hours'}
   *          '1d' -> {intervalValue: '1', unit: 'days'}
   */
  private parseInterval(interval: string): {
    intervalValue: string;
    unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  } {
    const match = interval.match(/^(\d+)([mhdwM])$/);
    if (!match) {
      throw new Error(`Invalid interval format: ${interval}`);
    }

    const [, value, unitChar] = match;
    const unitMap: Record<
      string,
      'minutes' | 'hours' | 'days' | 'weeks' | 'months'
    > = {
      m: 'minutes',
      h: 'hours',
      d: 'days',
      w: 'weeks',
      M: 'months',
    };

    return {
      intervalValue: value,
      unit: unitMap[unitChar],
    };
  }

  /**
   * Emit backfill progress event
   */
  private emitProgress(progress: BackfillProgress): void {
    this.eventEmitter.emit('backfill.progress', progress);
  }
}
