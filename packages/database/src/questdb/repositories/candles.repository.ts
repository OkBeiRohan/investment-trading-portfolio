/**
 * Market Candles Repository
 * Repository for accessing historical candlestick data from QuestDB
 */

import { Injectable, Logger } from "@nestjs/common";
import { QuestDBProductionService } from "../questdb-production.service";
import type { IMarketCandle, ICandleQuery, ICandleInsert } from "@repo/schema";

@Injectable()
export class CandlesRepository {
  private readonly logger = new Logger(CandlesRepository.name);

  constructor(private readonly questdb: QuestDBProductionService) {}

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
    const sql = `
      SELECT 
        timestamp,
        instrument_key,
        interval,
        open,
        high,
        low,
        close,
        volume,
        open_interest
      FROM market_candles
      WHERE instrument_key = $1
        AND interval = $2
        AND timestamp >= $3
        AND timestamp <= $4
      ORDER BY timestamp ASC
      ${query.limit ? `LIMIT ${query.limit}` : ""}
    `;

    const result = await this.questdb.query<IMarketCandle>(sql, [
      query.instrument_key,
      query.interval,
      query.start_time.toISOString(),
      query.end_time.toISOString(),
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
    const sql = `
      SELECT 
        timestamp,
        instrument_key,
        interval,
        open,
        high,
        low,
        close,
        volume,
        open_interest
      FROM market_candles
      WHERE instrument_key = $1
        AND interval = $2
      ORDER BY timestamp DESC
      LIMIT 1
    `;

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
    return this.questdb.checkDataExists(
      "market_candles",
      instrumentKey,
      startTime,
      endTime
    );
  }

  /**
   * Count candles for instrument + interval
   */
  async count(instrumentKey: string, interval: string): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count
      FROM market_candles
      WHERE instrument_key = $1
        AND interval = $2
    `;

    const result = await this.questdb.query<{ count: number }>(sql, [
      instrumentKey,
      interval,
    ]);

    return result.rows[0]?.count || 0;
  }
}
