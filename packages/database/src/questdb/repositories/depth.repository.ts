/**
 * Market Depth Repository
 * Repository for accessing order book depth data from QuestDB
 */

import { Injectable, Logger } from "@nestjs/common";
import { QuestDBService } from "../questdb.service";
import { loadSqlQueryCached } from "../utils/sql-loader";
import type {
  IMarketDepth,
  IDepthQuery,
  IDepthInsert,
  IDepthSnapshot,
} from "@repo/schema";

@Injectable()
export class DepthRepository {
  private readonly logger = new Logger(DepthRepository.name);

  constructor(private readonly questdb: QuestDBService) {}

  /**
   * Insert depth batch
   */
  async insertBatch(depths: IDepthInsert[]): Promise<void> {
    await this.questdb.insertDepth(depths);
  }

  /**
   * Query depth for a time range
   */
  async findByTimeRange(query: IDepthQuery): Promise<IMarketDepth[]> {
    // Load SQL from @repo/schema (shared with Python training pipeline)
    const sql = loadSqlQueryCached("depth/select-by-time-range-filtered");

    const result = await this.questdb.query<IMarketDepth>(sql, [
      query.instrument_key,
      query.start_time.toISOString(),
      query.end_time.toISOString(),
      query.side || null, // NULL means no filter (all sides)
      query.limit || 999999999, // Use high number if no limit specified
    ]);

    return result.rows.map((row) => ({
      ...row,
      timestamp: new Date(row.timestamp),
    }));
  }

  /**
   * Get latest depth snapshot (all levels, both sides)
   */
  async findLatestSnapshot(
    instrumentKey: string
  ): Promise<IDepthSnapshot | null> {
    // Load SQL from @repo/schema (shared with Python training pipeline)
    const sql = loadSqlQueryCached("depth/select-latest-snapshot");

    const result = await this.questdb.query<IMarketDepth>(sql, [instrumentKey]);

    if (result.rows.length === 0) {
      return null;
    }

    const timestamp = new Date(result.rows[0].timestamp);
    const buy = result.rows
      .filter((r) => r.side === "BUY")
      .map((r) => ({ price: r.price, quantity: r.quantity, orders: r.orders }));

    const sell = result.rows
      .filter((r) => r.side === "SELL")
      .map((r) => ({ price: r.price, quantity: r.quantity, orders: r.orders }));

    return {
      timestamp,
      instrument_key: instrumentKey,
      buy,
      sell,
    };
  }

  /**
   * Check if depth exists for date range
   */
  async existsForRange(
    instrumentKey: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    // Load SQL from @repo/schema (shared with Python training pipeline)
    const sql = loadSqlQueryCached("depth/check-data-exists");

    const result = await this.questdb.query<{ count: number }>(sql, [
      instrumentKey,
      startTime.toISOString(),
      endTime.toISOString(),
    ]);

    return (result.rows[0]?.count || 0) > 0;
  }
}
