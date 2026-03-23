import { Injectable, Logger } from '@nestjs/common';
import {
  CandlesRepository,
  FeaturesRepository,
  LabelsRepository,
  InstrumentMasterRepository,
} from '@repo/database';
import { ComputeEngineService } from './compute-engine.service';
import { MarketCandle, InstrumentFeatures, TrainingLabels } from '@repo/schema';
import { ContinuousContractBuilder } from './continuous-contract.builder';
import { ConstituentManagerService } from './constituent-manager.service';
import type { FeatureInput, FeatureOutput } from '@repo/compute-engine';

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
  private readonly BATCH_SIZE = 5000; // Process 5000 timestamps at a time for batch insert

  constructor(
    private readonly computeEngine: ComputeEngineService,
    private readonly candleRepository: CandlesRepository,
    private readonly marketStateRepository: FeaturesRepository,
    private readonly trainingLabelsRepository: LabelsRepository,
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

    // 4. Fetch India VIX data for batch (single query)
    const indiaVixCandleMap = await this.fetchBatchIndexCandles(
      'NSE_INDEX|India VIX',
      batchStart,
      batchEnd,
    );

    // 5. Fetch NIFTY SPOT for label calculation (NOT futures!)
    const niftySpotCandleMap = await this.fetchBatchIndexCandles(
      'NSE_INDEX|Nifty 50',
      batchStart,
      batchEnd,
    );

    // 5b. Fetch point-in-time weight snapshot for this batch.
    //     Monthly granularity → one lookup per batch is sufficient.
    let weightMap: Map<string, number> | undefined;
    try {
      const weights = await this.constituentManager.getWeightsAtDate(batchStart);
      if (weights.length > 0) {
        weightMap = new Map(weights.map((w) => [w.symbol, w.weightPct]));
      }
    } catch {
      // Non-fatal: features will fall back to current/equal weights
    }

    // 6. Process each timestamp and accumulate results for batch insert
    const marketStatesToInsert: InstrumentFeatures[] = [];
    const trainingLabelsToInsert: TrainingLabels[] = [];
    let batchTimeTaken = 0;

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
        const indiaVixCandle = indiaVixCandleMap.get(timestamp.getTime());

        // Skip if insufficient data
        if (constituentCandles.length < 30) {
          continue;
        }

        // Build feature input (with point-in-time weights from HF dataset)
        const featureInput = this.buildFeatureInput(
          timestamp,
          constituentCandles,
          futuresCandle ?? null,
          indiaVixCandle ?? null,
          weightMap,
        );

        // Compute features
        const computeResult = this.computeEngine.computeFeatures(featureInput);
        batchTimeTaken += computeResult.totalDurationMicros;

        // Sanitize features: replace NaN with 0.0 (happens when cache is empty)
        const sanitizedFeatures = this.sanitizeFeatures(computeResult.features);

        // Accumulate market state for batch insert
        const marketState: InstrumentFeatures = {
          ...sanitizedFeatures,
          timestamp,
          instrumentKey: 'NSE_INDEX|Nifty 50',
          intervalValue: 1,
          intervalUnit: 'minute',
        };
        marketStatesToInsert.push(marketState);

        // Calculate training labels for multiple horizons
        // Use NIFTY SPOT (not futures!) and computed ATR from features
        // Multiple horizons enable multi-task learning and different prediction timeframes
        const niftySpotCandle = niftySpotCandleMap.get(timestamp.getTime());
        const horizons = [1, 5, 15, 30]; // 1m, 5m, 15m, 30m horizons
        for (const horizon of horizons) {
          const trainingLabel = this.calculateLabel(
            timestamp,
            niftySpotCandle,
            niftySpotCandleMap,
            sanitizedFeatures.futAtrPercent, // Use computed ATR from features
            horizon,
          );
          if (trainingLabel) {
            trainingLabelsToInsert.push(trainingLabel);
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to process ${timestamp.toISOString()}`,
          error,
        );
      }
    }

    this.logger.debug(
      `Computed features for ${marketStatesToInsert.length} timestamps in batch (total ${batchTimeTaken}µs)`,
    );

    // 6. Batch insert market states to QuestDB
    if (marketStatesToInsert.length > 0) {
      try {
        await this.marketStateRepository.bulkInsert(marketStatesToInsert);
        this.logger.log(
          `Batch inserted ${marketStatesToInsert.length} market states`,
        );
      } catch (error) {
        this.logger.error('Failed to batch insert market states', error);
      }
    }

    // 7. Batch insert training labels to QuestDB
    if (trainingLabelsToInsert.length > 0) {
      try {
        await this.trainingLabelsRepository.bulkInsert(trainingLabelsToInsert);
        this.logger.log(
          `Batch inserted ${trainingLabelsToInsert.length} training labels`,
        );
      } catch (error) {
        this.logger.error('Failed to batch insert training labels', error);
      }
    }

    return marketStatesToInsert.length;
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
   * Fetch index candles for batch (India VIX, NIFTY 50, etc.)
   * Returns Map<timestamp_ms, candle>
   */
  private async fetchBatchIndexCandles(
    instrumentKey: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Map<number, MarketCandle>> {
    const candleMap = new Map<number, MarketCandle>();

    try {
      const candles = await this.candleRepository.findByTimeRange(
        instrumentKey,
        1,
        'minute',
        startTime,
        endTime,
        10000, // Large limit
      );

      for (const candle of candles) {
        candleMap.set(candle.timestamp.getTime(), candle);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch index candles for ${instrumentKey}`,
        error,
      );
    }

    return candleMap;
  }

  /**
   * Build FeatureInput for compute-engine.
   *
   * @param weightMap - Optional symbol→weightPct map from the HuggingFace weight
   *                    snapshot closest to this timestamp. When absent, falls back
   *                    to the in-memory current weights.
   */
  private buildFeatureInput(
    timestamp: Date,
    constituentCandles: MarketCandle[],
    futuresCandle: MarketCandle | null,
    indiaVixCandle: MarketCandle | null,
    weightMap?: Map<string, number>,
  ): FeatureInput {
    return {
      timestamp: timestamp.getTime(),
      niftyFuture: futuresCandle
        ? {
            ltp: futuresCandle.close,
            open: futuresCandle.open,
            high: futuresCandle.high,
            low: futuresCandle.low,
            close: futuresCandle.close,
            volume: futuresCandle.volume ?? 0,
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
      constituents: constituentCandles.map((candle) => {
        const symbol = candle.instrumentKey;
        const weight = weightMap?.get(symbol) ?? this.constituentManager.getWeight(symbol);
        return {
          symbol,
          ltp: candle.close,
          open: candle.open,
          volume: candle.volume ?? 0,
          weightPct: weight > 0 ? weight : undefined,
        };
      }),
      options: [],
      indiaVix: indiaVixCandle?.close,
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
   * Sanitize feature values by replacing NaN with 0.0
   * This happens when cache is empty and certain features can't be computed
   */
  private sanitizeFeatures(features: FeatureOutput): FeatureOutput {
    const sanitized = { ...features };

    // Replace all NaN values with 0.0
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'number' && Number.isNaN(sanitized[key])) {
        sanitized[key] = 0.0;
      }
    }

    return sanitized;
  }

  /**
   * Calculate volatility-adjusted training label for multiple horizons
   * Labels: -1 (DOWN), 0 (NEUTRAL), 1 (UP)
   *
   * Logic (from training-pipeline LightGBM trainer):
   * - future_return > k * ATR_PERCENT → UP (1)
   * - future_return < -k * ATR_PERCENT → DOWN (-1)
   * - else → NEUTRAL (0)
   * - k = 1.0 by default
   *
   * CRITICAL: Uses NIFTY SPOT (not futures!) and computed ATR from features
   *
   * @param timestamp - Current timestamp
   * @param currentCandle - Current NIFTY SPOT candle
   * @param spotCandleMap - Map of NIFTY SPOT candles by timestamp
   * @param futAtrPercent - Computed ATR percentage from features (e.g., 0.015 = 1.5%)
   * @param horizonMinutes - Forward-looking horizon in minutes (1, 5, 15, 30)
   * @returns TrainingLabels1m or null if insufficient data
   */
  private calculateLabel(
    timestamp: Date,
    currentCandle: MarketCandle | undefined,
    spotCandleMap: Map<number, MarketCandle>,
    futAtrPercent: number,
    horizonMinutes: number,
  ): TrainingLabels | null {
    if (!currentCandle) return null;

    // Skip if ATR is invalid (NaN, 0, or unreasonably high)
    if (
      !futAtrPercent ||
      Number.isNaN(futAtrPercent) ||
      futAtrPercent <= 0 ||
      futAtrPercent > 0.1 // Sanity check: >10% is unreasonable
    ) {
      return null;
    }

    const futureTimestamp = new Date(
      timestamp.getTime() + horizonMinutes * 60 * 1000,
    );
    const futureCandle = spotCandleMap.get(futureTimestamp.getTime());

    if (!futureCandle) {
      return null; // No future data available
    }

    // Calculate future return (percentage, dimensionless)
    const futureReturn =
      (futureCandle.close - currentCandle.close) / currentCandle.close;

    // ATR threshold (k * ATR_PERCENT)
    // futAtrPercent is already normalized (0.015 = 1.5%)
    // Scale threshold by sqrt(horizon) for multi-horizon consistency
    const k = 1.0;
    const horizonScalingFactor = Math.sqrt(horizonMinutes / 5); // Normalize to 5min baseline
    const atrThreshold = k * futAtrPercent * horizonScalingFactor;

    // Determine label
    // Compare dimensionless returns with dimensionless threshold
    let label: -1 | 0 | 1;
    if (futureReturn > atrThreshold) {
      label = 1; // UP
    } else if (futureReturn < -atrThreshold) {
      label = -1; // DOWN
    } else {
      label = 0; // NEUTRAL
    }

    // Return label for batch insertion
    return {
      timestamp,
      instrumentKey: '',
      intervalValue: 0,
      intervalUnit: 'day',
    };
  }
}
