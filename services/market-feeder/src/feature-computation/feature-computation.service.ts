import { Injectable, Logger } from '@nestjs/common';
import { QuestDBService } from '@repo/database';
import { ComputeEngineService } from './compute-engine.service';

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
    private readonly questdb: QuestDBService,
    private readonly computeEngine: ComputeEngineService,
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
    const features = await this.computeEngine.computeFeatures(rawData);

    this.logger.debug(`Computed ${features.length} feature rows`);

    // 3. Store features in training_features_lightgbm table
    await this.storeFeatures(instrumentKey, features);

    return features.length;
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
  ): Promise<Array<Record<string, unknown>>> {
    // Query combines multiple tables for complete market view
    const query = `
      SELECT
        t.timestamp,
        t.last_price,
        t.volume,
        t.open_interest,
        c.open,
        c.high,
        c.low,
        c.close,
        q.bid_price,
        q.ask_price,
        q.bid_quantity,
        q.ask_quantity,
        g.delta,
        g.gamma,
        g.vega,
        g.theta,
        g.implied_volatility
      FROM market_ticks t
      LEFT JOIN market_candles c
        ON t.instrument_key = c.instrument_key
        AND c.interval = '5m'
        AND t.timestamp >= c.timestamp
        AND t.timestamp < c.timestamp + INTERVAL '5' MINUTE
      LEFT JOIN market_quotes q
        ON t.instrument_key = q.instrument_key
        AND t.timestamp = q.timestamp
      LEFT JOIN option_greeks g
        ON t.instrument_key = g.instrument_key
        AND t.timestamp = g.timestamp
      WHERE t.instrument_key = '${instrumentKey}'
        AND t.timestamp >= '${startTime.toISOString()}'
        AND t.timestamp < '${endTime.toISOString()}'
      ORDER BY t.timestamp ASC
    `;

    const result = await this.questdb.query(query);
    return result.rows;
  }

  /**
   * Store computed features to training_features_lightgbm table
   *
   * Schema matches training-pipeline expectations:
   * - timestamp, instrument_key
   * - 33 features (feature_0 to feature_32)
   */
  private async storeFeatures(
    instrumentKey: string,
    features: Array<{ timestamp: string; [key: string]: number | string }>,
  ): Promise<void> {
    if (features.length === 0) {
      return;
    }

    // Build batch insert query
    const values = features
      .map((row) => {
        const featureCols = Array.from(
          { length: 33 },
          (_, i) => row[`feature_${i}`] || 0,
        ).join(',');
        return `('${row.timestamp}', '${instrumentKey}', ${featureCols})`;
      })
      .join(',\n  ');

    const featureColumns = Array.from(
      { length: 33 },
      (_, i) => `feature_${i}`,
    ).join(', ');

    const query = `
      INSERT INTO training_features_lightgbm (
        timestamp,
        instrument_key,
        ${featureColumns}
      ) VALUES
      ${values}
    `;

    await this.questdb.query(query);

    this.logger.debug(
      `Stored ${features.length} feature rows for ${instrumentKey}`,
    );
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
