/**
 * Market Candles Repository
 * Repository for accessing historical candlestick data from QuestDB
 */

import { Injectable, Logger } from "@nestjs/common";
import { QuestDBService } from "../questdb.service";
import { loadSqlQueryCached } from "../utils/sql-loader";
import type { IMarketCandle, ICandleQuery, ICandleInsert } from "@repo/schema";

@Injectable()
export class CandlesRepository {
  private readonly logger = new Logger(CandlesRepository.name);

  constructor(private readonly questdb: QuestDBService) {}

  /**
   * Insert candles batch
   */
  async insertBatch(candles: ICandleInsert[]): Promise<void> {
    await this.questdb.insertCandles(candles);
  }

  /**
   * Query candles for a time range
   */
  async findByTimeRange(query: ICandleQuery): Promise<IMarketCandle[]> {
    // Load SQL from @repo/schema (shared with Python training pipeline)
    const sql = loadSqlQueryCached("candles/select-by-time-range-with-limit");

    const result = await this.questdb.query<IMarketCandle>(sql, [
      query.instrument_key,
      query.interval,
      query.start_time.toISOString(),
      query.end_time.toISOString(),
      query.limit || 999999999, // Use high number if no limit specified
    ]);

    return result.rows.map((row) => ({
      ...row,
      timestamp: new Date(row.timestamp),
    }));
  }

  /**
   * Get latest candle for instrument + interval
   */
  async findLatest(
    instrumentKey: string,
    interval: string
  ): Promise<IMarketCandle | null> {
    // Load SQL from @repo/schema (shared with Python training pipeline)
    const sql = loadSqlQueryCached("candles/select-latest");

    const result = await this.questdb.query<IMarketCandle>(sql, [
      instrumentKey,
      interval,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      ...result.rows[0],
      timestamp: new Date(result.rows[0].timestamp),
    };
  }

  /**
   * Check if candles exist for date range
   */
  async existsForRange(
    instrumentKey: string,
    interval: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    // Load SQL from @repo/schema (shared with Python training pipeline)
    const sql = loadSqlQueryCached("candles/check-data-exists");

    const result = await this.questdb.query<{ count: number }>(sql, [
      instrumentKey,
      interval,
      startTime.toISOString(),
      endTime.toISOString(),
    ]);

    return (result.rows[0]?.count || 0) > 0;
  }

  /**
   * Count candles for instrument + interval
   */
  async count(instrumentKey: string, interval: string): Promise<number> {
    // Load SQL from @repo/schema (shared with Python training pipeline)
    const sql = loadSqlQueryCached("candles/count-by-instrument");

    const result = await this.questdb.query<{ count: number }>(sql, [
      instrumentKey,
      interval,
    ]);

    return result.rows[0]?.count || 0;
  }
}
