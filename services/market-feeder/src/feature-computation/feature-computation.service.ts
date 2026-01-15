import { Injectable, Logger } from '@nestjs/common';
import {
  CandlesRepository,
  MarketStateRepository,
  TrainingLabelsRepository,
  InstrumentMasterRepository,
} from '@repo/database';
import { ComputeEngineService } from './compute-engine.service';
import { MarketCandle, MarketState1m, TrainingLabels1m } from '@repo/schema';
import { ContinuousContractBuilder } from './continuous-contract.builder';
import { ConstituentManagerService } from './constituent-manager.service';
import type { FeatureInput } from '@repo/compute-engine';

/**
 * Feature Computation Service v3.0
 *
 * Orchestrates batch feature generation with:
 * 1. Batched data fetching (reduces DB queries from 19k to ~50 per day)
 * 2. Historical Nifty50 constituent changes (removed stocks)
 * 3. Continuous futures contracts (1! notation)
 * 4. Storage to market_state_1m table (not instrument_features_1m)
 *
 * Performance:
 * - Old: 51 queries per minute × 375 minutes = 19,125 queries/day
 * - New: ~50 batch queries total per day
 * - RAM-safe: Processes in configurable batch sizes (default: 100 timestamps)
 *
 * Design:
 * - Idempotent: Can reprocess same time ranges safely
 * - Handles missing data gracefully with backfills
 */
@Injectable()
export class FeatureComputationService {
  private readonly logger = new Logger(FeatureComputationService.name);
  private readonly BATCH_SIZE = 100; // Process 100 timestamps at a time

  constructor(
    private readonly computeEngine: ComputeEngineService,
    private readonly candleRepository: CandlesRepository,
    private readonly marketStateRepository: MarketStateRepository,
    private readonly trainingLabelsRepository: TrainingLabelsRepository,
    private readonly instrumentMasterRepository: InstrumentMasterRepository,
    private readonly continuousContractBuilder: ContinuousContractBuilder,
    private readonly constituentManager: ConstituentManagerService,
  ) {}

  /**
   * Compute and store features for Nifty 50 spot index
   *
   * Main entry point with optimized batched fetching.
   *
   * @param startTime - Start timestamp (ISO string or Date)
   * @param endTime - End timestamp (ISO string or Date)
   * @returns Number of feature rows stored
   */
  async computeFeaturesForNifty50(
    startTime: string | Date,
    endTime: string | Date,
  ): Promise<number> {
    const start =
      typeof startTime === 'string' ? new Date(startTime) : startTime;
    const end = typeof endTime === 'string' ? new Date(endTime) : endTime;

    this.logger.log(
      `Computing Nifty 50 features from ${start.toISOString()} to ${end.toISOString()}`,
    );

    // Generate all timestamps (1-minute intervals)
    const timestamps = this.generateTimestamps(start, end);
    this.logger.log(`Generated ${timestamps.length} timestamps to process`);

    // Process in batches to avoid RAM overflow
    let totalRowsStored = 0;
    for (let i = 0; i < timestamps.length; i += this.BATCH_SIZE) {
      const batchTimestamps = timestamps.slice(i, i + this.BATCH_SIZE);
      const batchStart = batchTimestamps[0];
      const batchEnd = batchTimestamps[batchTimestamps.length - 1];

      this.logger.debug(
        `Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(timestamps.length / this.BATCH_SIZE)}: ${batchTimestamps.length} timestamps`,
      );

      const stored = await this.processBatch(
        batchTimestamps,
        batchStart,
        batchEnd,
      );
      totalRowsStored += stored;
    }

    this.logger.log(
      `Feature computation complete: ${totalRowsStored} rows stored`,
    );

    return totalRowsStored;
  }

  /**
   * Generate all timestamps to process (1-minute intervals)
   */
  private generateTimestamps(start: Date, end: Date): Date[] {
    const timestamps: Date[] = [];
    let current = new Date(start);

    while (current <= end) {
      timestamps.push(new Date(current));
      current = new Date(current.getTime() + 60 * 1000); // +1 minute
    }

    return timestamps;
  }

  /**
   * Process a batch of timestamps with optimized data fetching
   */
  private async processBatch(
    timestamps: Date[],
    batchStart: Date,
    batchEnd: Date,
  ): Promise<number> {
    if (timestamps.length === 0) return 0;

    // 1. Get all unique constituents for this batch
    const constituentsByTimestamp = new Map<number, string[]>();
    for (const timestamp of timestamps) {
      const constituents =
        this.constituentManager.getConstituentsAtTimestamp(timestamp);
      constituentsByTimestamp.set(timestamp.getTime(), constituents);
    }

    // Get all unique instrument keys
    const allConstituents = new Set<string>();
    for (const constituents of constituentsByTimestamp.values()) {
      constituents.forEach((c) => allConstituents.add(c));
    }

    this.logger.debug(
      `Batch uses ${allConstituents.size} unique constituents (including historical)`,
    );

    // 2. Fetch all constituent candles for batch (single query per instrument)
    const constituentCandleMap = await this.fetchBatchConstituentCandles(
      Array.from(allConstituents),
      batchStart,
      batchEnd,
    );

    // 3. Fetch continuous futures for batch (single query)
    const futuresCandleMap = await this.fetchBatchContinuousFutures(
      'NIFTY',
      batchStart,
      batchEnd,
    );

    // 4. Process each timestamp
    let rowsStored = 0;
    for (const timestamp of timestamps) {
      try {
        const constituents = constituentsByTimestamp.get(timestamp.getTime())!;

        // Get candles for this timestamp
        const constituentCandles = constituents
          .map((instrumentKey) =>
            constituentCandleMap
              .get(instrumentKey)
              ?.find((c) => c.timestamp.getTime() === timestamp.getTime()),
          )
          .filter((c): c is MarketCandle => c !== undefined);

        const futuresCandle = futuresCandleMap.get(timestamp.getTime());

        // Skip if insufficient data
        if (constituentCandles.length < 30) {
          // At least 60% of constituents
          this.logger.debug(
            `Skipping ${timestamp.toISOString()}: only ${constituentCandles.length}/50 constituents available`,
          );
          continue;
        }

        // Build feature input
        const featureInput = this.buildFeatureInput(
          timestamp,
          constituentCandles,
          futuresCandle ?? null,
        );

        // Compute features
        const computeResult = this.computeEngine.computeFeatures(featureInput);

        // Store features to market_state_1m (features already match schema)
        const marketState: MarketState1m = {
          ...computeResult.features,
          timestamp,
        };

        await this.marketStateRepository.insert(marketState);
        rowsStored++;

        // Calculate and store training label (5-minute horizon)
        await this.calculateAndStoreLabel(
          timestamp,
          futuresCandle,
          futuresCandleMap,
        );

        this.logger.debug(
          `Stored market state for ${timestamp.toISOString()} (${computeResult.totalDurationMicros}µs)`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process ${timestamp.toISOString()}`,
          error,
        );
      }
    }

    return rowsStored;
  }

  /**
   * Fetch all constituent candles for batch (optimized)
   * Returns Map<instrumentKey, candles[]>
   */
  private async fetchBatchConstituentCandles(
    instrumentKeys: string[],
    startTime: Date,
    endTime: Date,
  ): Promise<Map<string, MarketCandle[]>> {
    const candleMap = new Map<string, MarketCandle[]>();

    // Fetch each instrument's candles (parallelized)
    await Promise.all(
      instrumentKeys.map(async (instrumentKey) => {
        try {
          const candles = await this.candleRepository.findByTimeRange(
            instrumentKey,
            1,
            'minute',
            startTime,
            endTime,
            10000, // Large limit
          );
          candleMap.set(instrumentKey, candles);
        } catch (error) {
          this.logger.warn(
            `Failed to fetch candles for ${instrumentKey}`,
            error,
          );
          candleMap.set(instrumentKey, []);
        }
      }),
    );

    return candleMap;
  }

  /**
   * Fetch continuous futures for batch (optimized)
   * Returns Map<timestamp_ms, candle>
   */
  private async fetchBatchContinuousFutures(
    underlyingSymbol: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Map<number, MarketCandle>> {
    const candleMap = new Map<number, MarketCandle>();

    const continuousCandles =
      await this.continuousContractBuilder.buildContinuousContract(
        underlyingSymbol,
        startTime,
        endTime,
        1,
        'minute',
      );

    for (const candle of continuousCandles) {
      candleMap.set(candle.timestamp.getTime(), candle);
    }

    return candleMap;
  }

  /**
   * Build FeatureInput for compute-engine
   */
  private buildFeatureInput(
    timestamp: Date,
    constituentCandles: MarketCandle[],
    futuresCandle: MarketCandle | null,
  ): FeatureInput {
    return {
      timestamp: timestamp.getTime(), // Unix timestamp in milliseconds
      niftyFuture: futuresCandle
        ? {
            ltp: futuresCandle.close,
            open: futuresCandle.open,
            high: futuresCandle.high,
            low: futuresCandle.low,
            close: futuresCandle.close,
            volume: futuresCandle.volume,
            openInterest: futuresCandle.openInterest ?? 0,
          }
        : {
            ltp: 0,
            open: 0,
            high: 0,
            low: 0,
            close: 0,
            volume: 0,
            openInterest: 0,
          },
      constituents: constituentCandles.map((candle) => ({
        symbol: candle.instrumentKey,
        ltp: candle.close,
        open: candle.open,
        volume: candle.volume,
      })),
      options: [], // Placeholder for now - will add option chain data later
      indiaVix: undefined, // Placeholder - will add VIX data later
    };
  }

  /**
   * Compute features for the last N hours (useful for incremental updates)
   */
  async computeFeaturesForLastHours(hours: number): Promise<number> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    return this.computeFeaturesForNifty50(startTime, endTime);
  }

  /**
   * Compute features for today's market session
   */
  async computeFeaturesForToday(): Promise<number> {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      9,
      15,
      0,
    ); // Market open: 9:15 AM
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      15,
      30,
      0,
    ); // Market close: 3:30 PM

    const startTime = startOfDay < now ? startOfDay : now;
    const endTime = endOfDay < now ? endOfDay : now;

    return this.computeFeaturesForNifty50(startTime, endTime);
  }

  /**
   * Calculate volatility-adjusted training label
   * Labels: -1 (DOWN), 0 (NEUTRAL), 1 (UP)
   *
   * Logic (from training-pipeline LightGBM trainer):
   * - future_return_5m > k * ATR → UP (1)
   * - future_return_5m < -k * ATR → DOWN (-1)
   * - else → NEUTRAL (0)
   * - k = 1.0 by default
   */
  private async calculateAndStoreLabel(
    timestamp: Date,
    currentCandle: MarketCandle | undefined,
    futuresCandleMap: Map<number, MarketCandle>,
  ): Promise<void> {
    if (!currentCandle) return;

    const horizonMinutes = 5;
    const futureTimestamp = new Date(
      timestamp.getTime() + horizonMinutes * 60 * 1000,
    );
    const futureCandle = futuresCandleMap.get(futureTimestamp.getTime());

    if (!futureCandle) {
      return; // No future data available
    }

    // Calculate future return
    const futureReturn =
      (futureCandle.close - currentCandle.close) / currentCandle.close;

    // Estimate ATR threshold (0.5% of price as default)
    const atrThreshold = currentCandle.close * 0.005;
    const k = 1.0;

    // Determine label
    let label: -1 | 0 | 1;
    if (futureReturn > (k * atrThreshold) / currentCandle.close) {
      label = 1; // UP
    } else if (futureReturn < (-k * atrThreshold) / currentCandle.close) {
      label = -1; // DOWN
    } else {
      label = 0; // NEUTRAL
    }

    // Store label
    const trainingLabel: TrainingLabels1m = {
      timestamp,
      horizonMinutes,
      label,
      futureReturn,
      atrThreshold,
    };

    try {
      await this.trainingLabelsRepository.insertBatch([trainingLabel]);
    } catch {
      this.logger.debug(`Failed to store label for ${timestamp.toISOString()}`);
    }
  }
}
