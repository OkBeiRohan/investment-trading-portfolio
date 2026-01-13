/**
 * Historical Data Service
 * Orchestrates historical data fetching with gap detection
 * Uses multi-timeframe strategy for optimal data granularity
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QuestDBService } from '@repo/database';
import { UpstoxHistoricalService } from '@repo/market-sdk';
import { generateFetchPlan, summarizePlan } from './timeframe-strategy';

export interface BackfillRequest {
  instrumentKeys: string[];
  intervals?: string[]; // Optional, uses multi-timeframe strategy if omitted
  fromDate?: string; // YYYY-MM-DD (optional, defaults to 2000-01-01)
  toDate?: string; // YYYY-MM-DD (optional, defaults to today)
  useMultiTimeframe?: boolean; // Use automatic timeframe strategy (default: true)
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
   * Uses multi-timeframe strategy for optimal data granularity
   * Or uses specified intervals if provided
   *
   * @param request Backfill request
   * @returns Total candles inserted
   */
  async backfillHistoricalData(request: BackfillRequest): Promise<number> {
    const startTime = Date.now();
    let totalCandles = 0;
    let completedInstruments = 0;

    // Determine if we should use multi-timeframe strategy
    const useMultiTimeframe = request.useMultiTimeframe ?? !request.intervals;

    if (useMultiTimeframe) {
      return this.backfillWithStrategy(request);
    }

    this.logger.log(
      `Starting backfill for ${request.instrumentKeys.length} instruments, intervals: ${request.intervals?.join(', ')}`,
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
      for (const interval of request.intervals || []) {
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
   * Backfill using multi-timeframe strategy
   * Automatically determines optimal intervals based on date ranges
   */
  private async backfillWithStrategy(
    request: BackfillRequest,
  ): Promise<number> {
    const startTime = Date.now();
    let totalCandles = 0;

    // Generate fetch plan
    const toDate = request.toDate ? new Date(request.toDate) : new Date();
    const fromDate = request.fromDate
      ? new Date(request.fromDate)
      : new Date('2000-01-01');

    const plan = generateFetchPlan(toDate, fromDate);

    this.logger.log(
      `Generated multi-timeframe plan for ${request.instrumentKeys.length} instruments:`,
    );
    this.logger.log(summarizePlan(plan));

    const totalPhases = plan.length * request.instrumentKeys.length;
    let completedPhases = 0;

    // Execute plan for each instrument
    for (const instrumentKey of request.instrumentKeys) {
      this.logger.log(`Fetching data for ${instrumentKey}...`);

      for (const phase of plan) {
        try {
          // Check if data already exists
          const exists = await this.questdbService.checkDataExists(
            'market_candles',
            instrumentKey,
            phase.startDate,
            phase.endDate,
          );

          if (exists) {
            this.logger.debug(
              `Skipping ${phase.label} for ${instrumentKey} (already exists)`,
            );
            completedPhases++;
            continue;
          }

          // Fetch candles
          const candles =
            await this.upstoxHistoricalService.fetchHistoricalCandles(
              {
                instrument_key: instrumentKey,
                interval: phase.interval.toString(),
                unit: phase.unit,
                from_date: phase.startDate.toISOString().split('T')[0],
                to_date: phase.endDate.toISOString().split('T')[0],
              },
              (table, key) =>
                this.questdbService.getLastTimestamp(
                  table as 'market_candles' | 'market_quotes' | 'option_greeks',
                  key,
                ),
            );

          if (candles.length > 0) {
            await this.questdbService.insertCandles(candles);
            totalCandles += candles.length;

            this.logger.log(
              `✓ ${phase.label}: ${candles.length} candles for ${instrumentKey}`,
            );
          } else {
            this.logger.debug(`No data for ${phase.label} - ${instrumentKey}`);
          }
        } catch (error) {
          this.logger.error(
            `Failed to fetch ${phase.label} for ${instrumentKey}`,
            error,
          );
        }

        completedPhases++;

        // Emit progress
        this.emitProgress({
          totalInstruments: request.instrumentKeys.length,
          completedInstruments: Math.floor(completedPhases / plan.length),
          currentInstrument: instrumentKey,
          totalCandles,
          elapsedMs: Date.now() - startTime,
        });
      }
    }

    const duration = Date.now() - startTime;
    this.logger.log(
      `Multi-timeframe backfill completed: ${totalCandles} candles in ${duration}ms`,
    );

    this.eventEmitter.emit('backfill.completed', {
      totalInstruments: request.instrumentKeys.length,
      totalCandles,
      durationMs: duration,
    });

    return totalCandles;
  }

  /**
   * Emit backfill progress event
   */
  private emitProgress(progress: BackfillProgress): void {
    this.eventEmitter.emit('backfill.progress', progress);
  }
}
