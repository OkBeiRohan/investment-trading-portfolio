import { Injectable, Logger } from '@nestjs/common';
import {
  CandlesRepository,
  InstrumentFeaturesRepository,
  MarketStateRepository,
} from '@repo/database';
import { ComputeEngineService } from './compute-engine.service';
import { Candle } from '@repo/schema';

/**
 * Feature Computation Service
 *
 * Orchestrates batch feature generation:
 * 1. Reads raw market data from QuestDB
 * 2. Calls compute-engine to calculate features
 * 3. Stores features in training_features_* tables
 *
 * Design:
 * - Processes data in configurable batches (default: 1 day)
 * - Idempotent: Can reprocess same time ranges safely
 * - Supports multiple feature sets (LightGBM, TFT, etc.)
 */
@Injectable()
export class FeatureComputationService {
  private readonly logger = new Logger(FeatureComputationService.name);

  constructor(
    private readonly computeEngine: ComputeEngineService,
    private readonly candleRepository: CandlesRepository,
    private readonly featuresRepository: InstrumentFeaturesRepository,
    private readonly marketStateRepository: MarketStateRepository,
  ) {}

  /**
   * Compute and store features for a specific time range
   *
   * @param startTime - Start timestamp (ISO string or Date)
   * @param endTime - End timestamp (ISO string or Date)
   * @param instruments - Array of instrument keys to process
   * @returns Number of feature rows stored
   */
  async computeFeaturesForTimeRange(
    startTime: string | Date,
    endTime: string | Date,
    instruments: string[],
  ): Promise<number> {
    try {
      const start =
        typeof startTime === 'string' ? new Date(startTime) : startTime;
      const end = typeof endTime === 'string' ? new Date(endTime) : endTime;

      this.logger.log(
        `Computing features for ${instruments.length} instruments from ${start.toISOString()} to ${end.toISOString()}`,
      );

      let totalRowsStored = 0;

      for (const instrumentKey of instruments) {
        const rowsStored = await this.processInstrument(
          instrumentKey,
          start,
          end,
        );
        totalRowsStored += rowsStored;
      }

      this.logger.log(
        `Feature computation complete: ${totalRowsStored} rows stored`,
      );

      return totalRowsStored;
    } catch (error) {
      this.logger.error('Feature computation failed', error);
      throw error;
    }
  }

  /**
   * Process a single instrument
   */
  private async processInstrument(
    instrumentKey: string,
    startTime: Date,
    endTime: Date,
  ): Promise<number> {
    this.logger.debug(`Processing instrument: ${instrumentKey}`);

    // 1. Fetch raw market data from QuestDB
    const rawData = await this.fetchRawMarketData(
      instrumentKey,
      startTime,
      endTime,
    );

    if (rawData.length === 0) {
      this.logger.warn(`No raw data found for ${instrumentKey}`);
      return 0;
    }

    this.logger.debug(`Fetched ${rawData.length} raw data points`);

    // 2. Call compute-engine to calculate features
    // const features = await this.computeEngine.computeFeatures();

    // this.logger.debug(`Computed ${features.length} feature rows`);

    // 3. Store features in training_features_lightgbm table
    // await this.storeFeatures(instrumentKey, features);

    return 0; // Placeholder until compute-engine integration is done
  }

  /**
   * Fetch raw market data from QuestDB
   *
   * Combines ticks, candles, quotes, and Greeks into a unified dataset
   */
  private async fetchRawMarketData(
    instrumentKey: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Candle[]> {
    const candles = await this.candleRepository.findByTimeRange(
      instrumentKey,
      1,
      'minute',
      startTime,
      endTime,
    );

    return candles;
  }

  /**
   * Store computed features to training_features_lightgbm table
   *
   * Schema matches training-pipeline expectations:
   * - timestamp, instrument_key
   * - 33 features (feature_0 to feature_32)
   */
  private storeFeatures(
    instrumentKey: string,
    features: Array<{ timestamp: string; [key: string]: number | string }>,
  ): void {
    if (features.length === 0) {
      return;
    }
  }

  /**
   * Compute features for the last N hours (useful for incremental updates)
   */
  async computeFeaturesForLastHours(
    hours: number,
    instruments: string[],
  ): Promise<number> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    return this.computeFeaturesForTimeRange(startTime, endTime, instruments);
  }

  /**
   * Compute features for today's market session
   */
  async computeFeaturesForToday(instruments: string[]): Promise<number> {
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

    return this.computeFeaturesForTimeRange(startTime, endTime, instruments);
  }
}
