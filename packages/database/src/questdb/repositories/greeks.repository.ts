/**
 * Option Greeks Repository
 * Repository for accessing option greeks snapshots from QuestDB
 */

import { Injectable, Logger } from "@nestjs/common";
import { QuestDBService } from "../questdb.service";
import { loadSqlQueryCached } from "../utils/sql-loader";
import type { IOptionGreeks, IGreeksQuery, IGreeksInsert } from "@repo/schema";

@Injectable()
export class GreeksRepository {
  private readonly logger = new Logger(GreeksRepository.name);

  constructor(private readonly questdb: QuestDBService) {}

  /**
   * Insert greeks batch
   */
  async insertBatch(greeks: IGreeksInsert[]): Promise<void> {
    await this.questdb.insertGreeks(greeks);
  }

  /**
   * Query greeks for a time range
   */
  async findByTimeRange(query: IGreeksQuery): Promise<IOptionGreeks[]> {
    // Load SQL from @repo/schema (shared with Python training pipeline)
    const sql = loadSqlQueryCached("greeks/select-by-time-range-with-limit");

    const result = await this.questdb.query<IOptionGreeks>(sql, [
      query.instrument_key,
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
   * Get latest greeks for instrument
   */
  async findLatest(instrumentKey: string): Promise<IOptionGreeks | null> {
    // Load SQL from @repo/schema (shared with Python training pipeline)
    const sql = loadSqlQueryCached("greeks/select-latest");

    const result = await this.questdb.query<IOptionGreeks>(sql, [
      instrumentKey,
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
   * Check if greeks exist for date range
   */
  async existsForRange(
    instrumentKey: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    // Load SQL from @repo/schema (shared with Python training pipeline)
    const sql = loadSqlQueryCached("greeks/check-data-exists");

    const result = await this.questdb.query<{ count: number }>(sql, [
      instrumentKey,
      startTime.toISOString(),
      endTime.toISOString(),
    ]);

    return (result.rows[0]?.count || 0) > 0;
  }
}
