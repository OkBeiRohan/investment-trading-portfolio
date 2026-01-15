import { Injectable, Logger } from '@nestjs/common';
import {
  CandlesRepository,
  InstrumentFeaturesRepository,
  MarketStateRepository,
  InstrumentMasterRepository,
} from '@repo/database';
import { ComputeEngineService } from './compute-engine.service';
import { MarketCandle, InstrumentFeatures1m } from '@repo/schema';
import { ContinuousContractBuilder } from './continuous-contract.builder';
import { ConstituentManagerService } from './constituent-manager.service';
import type { FeatureInput, FeatureOutput } from '@repo/compute-engine';

/**
 * Feature Computation Service v2.0
 *
 * Orchestrates batch feature generation with support for:
 * 1. Historical Nifty50 constituent changes (removed stocks)
 * 2. Continuous futures contracts (1! notation)
 * 3. Market depth placeholders (30 levels of zeros)
 * 4. Storage back to QuestDB (instrument_features_1m table)
 *
 * Design:
 * - Processes data in configurable batches (default: 1 day)
 * - Idempotent: Can reprocess same time ranges safely
 * - Handles missing data gracefully with backfills
 */
@Injectable()
export class FeatureComputationService {
  private readonly logger = new Logger(FeatureComputationService.name);

  constructor(
    private readonly computeEngine: ComputeEngineService,
    private readonly candleRepository: CandlesRepository,
    private readonly featuresRepository: InstrumentFeaturesRepository,
    private readonly marketStateRepository: MarketStateRepository,
    private readonly instrumentMasterRepository: InstrumentMasterRepository,
    private readonly continuousContractBuilder: ContinuousContractBuilder,
    private readonly constituentManager: ConstituentManagerService,
  ) {}

  /**
   * Compute and store features for Nifty 50 spot index
   *
   * This is the main entry point for feature calculation.
   * Uses constituent data and continuous futures to compute index-level features.
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

    // Process timestamp by timestamp (1-minute intervals)
    let totalRowsStored = 0;
    let currentTime = new Date(start);

    while (currentTime <= end) {
      try {
        const stored = await this.computeFeaturesForTimestamp(currentTime);
        totalRowsStored += stored;
      } catch (error) {
        this.logger.error(
          `Failed to compute features for ${currentTime.toISOString()}`,
          error,
        );
      }

      // Move to next minute
      currentTime = new Date(currentTime.getTime() + 60 * 1000);
    }

    this.logger.log(
      `Feature computation complete: ${totalRowsStored} rows stored`,
    );

    return totalRowsStored;
  }

  /**
   * Compute features for a single timestamp
   */
  private async computeFeaturesForTimestamp(timestamp: Date): Promise<number> {
    this.logger.debug(`Computing features for ${timestamp.toISOString()}`);

    // 1. Get active constituents for this timestamp
    const constituents =
      this.constituentManager.getConstituentsAtTimestamp(timestamp);

    // 2. Fetch constituent candles
    const constituentCandles = await this.fetchConstituentCandles(
      constituents,
      timestamp,
    );

    // 3. Fetch continuous futures data (Nifty 1!)
    const futuresCandles = await this.fetchContinuousFutures(
      'NIFTY',
      timestamp,
    );

    // 4. Build feature input
    const featureInput = this.buildFeatureInput(
      timestamp,
      constituentCandles,
      futuresCandles,
    );

    // 5. Compute features using compute-engine
    const computeResult = this.computeEngine.computeFeatures(featureInput);

    // 6. Map to InstrumentFeatures1m schema
    const features: InstrumentFeatures1m = {
      timestamp,
      instrumentKey: 'NSE_INDEX|Nifty 50',
      ...this.mapComputeResultToFeatures(computeResult.features),
    };

    // 7. Store to QuestDB
    await this.featuresRepository.insertBatch([features]);

    this.logger.debug(
      `Stored features for ${timestamp.toISOString()} (computed in ${computeResult.totalDurationMicros}µs)`,
    );

    return 1;
  }

  /**
   * Fetch constituent candles for a specific timestamp
   */
  private async fetchConstituentCandles(
    constituents: string[],
    timestamp: Date,
  ): Promise<MarketCandle[]> {
    const candles: MarketCandle[] = [];

    for (const instrumentKey of constituents) {
      const data = await this.candleRepository.findByTimeRange(
        instrumentKey,
        1,
        'minute',
        timestamp,
        timestamp,
        1,
      );

      if (data.length > 0) {
        candles.push(data[0]);
      } else {
        this.logger.debug(
          `No candle data for ${instrumentKey} at ${timestamp.toISOString()}`,
        );
      }
    }

    return candles;
  }

  /**
   * Fetch continuous futures candle for timestamp
   */
  private async fetchContinuousFutures(
    underlyingSymbol: string,
    timestamp: Date,
  ): Promise<MarketCandle | null> {
    const endTime = new Date(timestamp.getTime() + 60 * 1000); // 1 minute window

    const continuousData =
      await this.continuousContractBuilder.buildContinuousContract(
        underlyingSymbol,
        timestamp,
        endTime,
        1,
        'minute',
      );

    return continuousData.length > 0 ? continuousData[0] : null;
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
   * Map compute-engine result to InstrumentFeatures1m schema
   */
  private mapComputeResultToFeatures(
    features: FeatureOutput,
  ): Omit<InstrumentFeatures1m, 'timestamp' | 'instrumentKey'> {
    return {
      lastPrice: 0, // Not directly available
      vwap: 0, // Not directly available
      priceVsVwap: features.futPriceVsVwap,
      dayHigh: 0,
      dayLow: 0,
      priceVsDayHigh: 0,
      priceVsDayLow: 0,
      rangePosition: features.futRangePosition,
      prevDayHighDist: 0,
      prevDayLowDist: 0,
      weeklyHighDist: 0,
      weeklyLowDist: 0,
      rsi5: 0,
      rsi14: features.futRsi14,
      rsi21: 0,
      macdHist: features.futMacd,
      ema9: 0,
      ema21: 0,
      ema9Slope: 0,
      ema21Slope: 0,
      adx: 0,
      roc5: 0,
      atr: features.futAtrPercent,
      atrPercent: features.futAtrPercent,
      realizedVol5m: features.realizedVol5M,
      realizedVol15m: features.realizedVol15M,
      volExpansionRatio: features.volExpansionRatio,
      minutesFromOpen: features.minutesFromOpen,
      minutesToClose: features.minutesToClose,
      dayOfWeek: features.dayOfWeek,
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
}
