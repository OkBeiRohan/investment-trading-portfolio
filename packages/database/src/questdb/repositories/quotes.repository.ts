/**
 * Market Quotes Repository
 * Repository for accessing real-time market quotes from QuestDB
 */

import { Injectable, Logger } from "@nestjs/common";
import { QuestDBService } from "../questdb.service";
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
    const sql = `
      SELECT 
        timestamp,
        instrument_key,
        ltp,
        bid,
        ask,
        bid_qty,
        ask_qty,
        volume,
        open_interest,
        upper_circuit,
        lower_circuit
      FROM market_quotes
      WHERE instrument_key = $1
        AND timestamp >= $2
        AND timestamp <= $3
      ORDER BY timestamp ASC
      ${query.limit ? `LIMIT ${query.limit}` : ""}
    `;

    const result = await this.questdb.query<IMarketQuote>(sql, [
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
   * Get latest quote for instrument
   */
  async findLatest(instrumentKey: string): Promise<IMarketQuote | null> {
    const sql = `
      SELECT 
        timestamp,
        instrument_key,
        ltp,
        bid,
        ask,
        bid_qty,
        ask_qty,
        volume,
        open_interest,
        upper_circuit,
        lower_circuit
      FROM market_quotes
      WHERE instrument_key = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `;

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
    return this.questdb.checkDataExists(
      "market_quotes",
      instrumentKey,
      startTime,
      endTime
    );
  }
}
