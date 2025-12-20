/**
 * Market Depth Repository
 * Repository for accessing order book depth data from QuestDB
 */

import { Injectable, Logger } from "@nestjs/common";
import { QuestDBProductionService } from "../questdb-production.service";
import type {
  IMarketDepth,
  IDepthQuery,
  IDepthInsert,
  IDepthSnapshot,
} from "@repo/schema";

@Injectable()
export class DepthRepository {
  private readonly logger = new Logger(DepthRepository.name);

  constructor(private readonly questdb: QuestDBProductionService) {}

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
    const sql = `
      SELECT 
        timestamp,
        instrument_key,
        side,
        level,
        price,
        quantity,
        orders
      FROM market_depth
      WHERE instrument_key = $1
        ${query.side ? `AND side = '${query.side}'` : ""}
        AND timestamp >= $2
        AND timestamp <= $3
      ORDER BY timestamp ASC, side ASC, level ASC
      ${query.limit ? `LIMIT ${query.limit}` : ""}
    `;

    const result = await this.questdb.query<IMarketDepth>(sql, [
      query.instrument_key,
      query.start_time.toISOString(),
      query.end_time.toISOString(),
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
    const sql = `
      WITH latest_timestamp AS (
        SELECT MAX(timestamp) as ts
        FROM market_depth
        WHERE instrument_key = $1
      )
      SELECT 
        d.timestamp,
        d.instrument_key,
        d.side,
        d.level,
        d.price,
        d.quantity,
        d.orders
      FROM market_depth d
      CROSS JOIN latest_timestamp lt
      WHERE d.instrument_key = $1
        AND d.timestamp = lt.ts
      ORDER BY d.side ASC, d.level ASC
    `;

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
    return this.questdb.checkDataExists(
      "market_depth",
      instrumentKey,
      startTime,
      endTime
    );
  }
}
