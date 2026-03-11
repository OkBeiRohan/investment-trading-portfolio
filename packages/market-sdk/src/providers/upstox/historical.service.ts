/**
 * Upstox Historical Data Service
 * High-level service for fetching historical and intraday candles
 * Integrates with QuestDB for smart gap detection
 *
 * Features:
 * - Automatic gap detection (queries QuestDB for last timestamp)
 * - Intelligent chunking (respects Upstox API limits)
 * - Rate limiting (50 req/sec)
 * - Progress tracking (emits events for UI updates)
 * - Retry logic with exponential backoff
 *
 * Architecture:
 * - Uses UpstoxHistoricalAPI for raw API calls
 * - Integrates with QuestDBService for gap detection
 * - Emits events via EventEmitter2 for progress tracking
 */

import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { UpstoxHistoricalAPIService } from "./api/historical/historical.service";

/** Normalized candle for QuestDB insertion */
export interface ICandleInsert {
  timestamp: Date;
  instrument_key: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  open_interest: number;
}

export interface HistoricalDataRequest {
  instrument_key: string;
  interval: string;
  unit: "minutes" | "hours" | "days" | "weeks" | "months";
  from_date?: string; // Optional: defaults to last timestamp in QuestDB
  to_date?: string; // Optional: defaults to today
}

export interface HistoricalDataProgress {
  instrument_key: string;
  current_chunk: number;
  total_chunks: number;
  candles_fetched: number;
  percentage: number;
}

export interface HistoricalDataResult {
  instrument_key: string;
  interval: string;
  total_candles: number;
  from_date: string;
  to_date: string;
  duration_ms: number;
}

@Injectable()
export class UpstoxHistoricalService {
  private readonly logger = new Logger(UpstoxHistoricalService.name);

  constructor(
    private readonly historicalAPI: UpstoxHistoricalAPIService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Fetch historical candles with smart gap detection
   * Automatically determines start date from QuestDB if not provided
   *
   * @param request Historical data request
   * @param questdbGetLastTimestamp Callback to get last timestamp from QuestDB
   * @returns Normalized candles ready for QuestDB insertion
   */
  async fetchHistoricalCandles(
    request: HistoricalDataRequest,
    questdbGetLastTimestamp?: (
      table: string,
      instrumentKey: string
    ) => Promise<Date | null>
  ): Promise<ICandleInsert[]> {
    const startTime = Date.now();

    // Smart gap detection: Query QuestDB for last timestamp
    let fromDate: Date;
    if (request.from_date) {
      fromDate = new Date(request.from_date);
    } else if (questdbGetLastTimestamp) {
      const lastTimestamp = await questdbGetLastTimestamp(
        "market_candles",
        request.instrument_key
      );

      if (lastTimestamp) {
        // Start from day after last timestamp
        fromDate = new Date(lastTimestamp);
        fromDate.setDate(fromDate.getDate() + 1);
        this.logger.log(
          `Gap detection: Starting from ${fromDate.toISOString()} for ${request.instrument_key}`
        );
      } else {
        // No data found, fetch last 90 days by default
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 90);
        this.logger.log(
          `No existing data found, fetching last 90 days for ${request.instrument_key}`
        );
      }
    } else {
      // No gap detection, use default 90 days
      fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 90);
    }

    const toDate = request.to_date ? new Date(request.to_date) : new Date();

    // Estimate total API calls for progress tracking
    const totalChunks = this.historicalAPI.estimateApiCalls(
      fromDate,
      toDate,
      request.unit,
      parseInt(request.interval, 10)
    );

    this.logger.log(
      `Fetching ${totalChunks} chunks for ${request.instrument_key} (${fromDate.toISOString()} - ${toDate.toISOString()})`
    );

    // Emit initial progress
    this.emitProgress({
      instrument_key: request.instrument_key,
      current_chunk: 0,
      total_chunks: totalChunks,
      candles_fetched: 0,
      percentage: 0,
    });

    // Fetch raw candles
    const rawCandles = await this.historicalAPI.fetchHistoricalCandles({
      instrument_key: request.instrument_key,
      interval: request.interval,
      unit: request.unit,
      from_date: fromDate.toISOString().split("T")[0],
      to_date: toDate.toISOString().split("T")[0],
    });

    // Normalize to QuestDB schema
    const normalizedCandles: ICandleInsert[] = rawCandles.map((candle: any[]) => ({
      timestamp: new Date(candle[0]),
      instrument_key: request.instrument_key,
      interval: `${request.interval}${request.unit.charAt(0)}`, // e.g., '5m', '1h', '1d'
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
      open_interest: candle[6],
    }));

    // Emit completion
    const duration = Date.now() - startTime;
    this.eventEmitter.emit("historical-data.completed", {
      instrument_key: request.instrument_key,
      interval: `${request.interval}${request.unit.charAt(0)}`,
      total_candles: normalizedCandles.length,
      from_date: fromDate.toISOString(),
      to_date: toDate.toISOString(),
      duration_ms: duration,
    } as HistoricalDataResult);

    this.logger.log(
      `Fetched ${normalizedCandles.length} candles for ${request.instrument_key} in ${duration}ms`
    );

    return normalizedCandles;
  }

  /**
   * Fetch intraday candles (today only)
   * Used for real-time dashboard updates
   *
   * @param instrument_key Instrument key
   * @param interval Interval (e.g., '1', '5', '15')
   * @param unit Unit ('minutes' or 'hours')
   * @returns Normalized candles
   */
  async fetchIntradayCandles(
    instrument_key: string,
    interval: string,
    unit: "minutes" | "hours" | "days"
  ): Promise<ICandleInsert[]> {
    const rawCandles = await this.historicalAPI.fetchIntradayCandles({
      instrument_key,
      interval,
      unit,
    });

    return rawCandles.map((candle: any[]) => ({
      timestamp: new Date(candle[0]),
      instrument_key,
      interval: `${interval}${unit.charAt(0)}`,
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
      open_interest: candle[6],
    }));
  }

  /**
   * Bulk fetch for multiple instruments
   * Useful for nightly backfill jobs
   *
   * @param requests Array of historical data requests
   * @param questdbGetLastTimestamp Callback to get last timestamp
   * @param concurrency Max parallel requests (default: 5)
   * @returns Map of instrument_key to candles
   */
  async bulkFetchHistoricalCandles(
    requests: HistoricalDataRequest[],
    questdbGetLastTimestamp?: (
      table: string,
      instrumentKey: string
    ) => Promise<Date | null>,
    concurrency: number = 5
  ): Promise<Map<string, ICandleInsert[]>> {
    const results = new Map<string, ICandleInsert[]>();

    // Process in batches to respect rate limits
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);

      const batchResults = await Promise.all(
        batch.map(async (request) => {
          try {
            const candles = await this.fetchHistoricalCandles(
              request,
              questdbGetLastTimestamp
            );
            return { key: request.instrument_key, candles };
          } catch (error) {
            this.logger.error(
              `Failed to fetch ${request.instrument_key}`,
              error
            );
            return { key: request.instrument_key, candles: [] };
          }
        })
      );

      batchResults.forEach(({ key, candles }) => {
        results.set(key, candles);
      });

      // Log progress
      this.logger.log(
        `Bulk fetch progress: ${Math.min(i + concurrency, requests.length)}/${requests.length} instruments`
      );
    }

    return results;
  }

  /**
   * Fetch expired option contracts for training data
   * Critical for backtesting options strategies
   *
   * @param symbol Index symbol (e.g., 'NIFTY', 'BANKNIFTY')
   * @param expiryDate Expiry date (YYYY-MM-DD)
   * @returns List of expired instrument keys
   */
  async getExpiredContracts(
    symbol: string,
    expiryDate: string
  ): Promise<string[]> {
    return this.historicalAPI.getExpiredContracts({
      symbol,
      expiry_date: expiryDate,
    });
  }

  /**
   * Emit progress event for UI updates
   */
  private emitProgress(progress: HistoricalDataProgress): void {
    this.eventEmitter.emit("historical-data.progress", progress);
  }
}
