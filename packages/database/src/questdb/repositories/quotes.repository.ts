/**
 * Market Quotes Repository
 * Repository for accessing real-time market quotes from QuestDB
 */

import { Injectable, Logger } from "@nestjs/common";
import { QuestDBService } from "../questdb.service";
import { loadSqlQueryCached } from "../utils/sql-loader";
import type { IMarketQuote, IQuoteQuery, IQuoteInsert } from "@repo/schema";

@Injectable()
export class QuotesRepository {
  private readonly logger = new Logger(QuotesRepository.name);

  constructor(private readonly questdb: QuestDBService) {}

  /**
   * Insert quotes batch
   */
  async insertBatch(quotes: IQuoteInsert[]): Promise<void> {
    await this.questdb.insertQuotes(quotes);
  }

  /**
   * Query quotes for a time range
   */
  async findByTimeRange(query: IQuoteQuery): Promise<IMarketQuote[]> {
    // Load SQL from @repo/schema (shared with Python training pipeline)
    const sql = loadSqlQueryCached("quotes/select-by-time-range-with-limit");

    const result = await this.questdb.query<IMarketQuote>(sql, [
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
   * Get latest quote for instrument
   */
  async findLatest(instrumentKey: string): Promise<IMarketQuote | null> {
    // Load SQL from @repo/schema (shared with Python training pipeline)
    const sql = loadSqlQueryCached("quotes/select-latest");

    const result = await this.questdb.query<IMarketQuote>(sql, [instrumentKey]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      ...result.rows[0],
      timestamp: new Date(result.rows[0].timestamp),
    };
  }

  /**
   * Check if quotes exist for date range
   */
  async existsForRange(
    instrumentKey: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    // Load SQL from @repo/schema (shared with Python training pipeline)
    const sql = loadSqlQueryCached("quotes/check-data-exists");

    const result = await this.questdb.query<{ count: number }>(sql, [
      instrumentKey,
      startTime.toISOString(),
      endTime.toISOString(),
    ]);

    return (result.rows[0]?.count || 0) > 0;
  }
}
