/**
 * Option Greeks Repository
 * Repository for accessing option greeks snapshots from QuestDB
 */

import { Injectable, Logger } from "@nestjs/common";
import { QuestDBService } from "../questdb.service";
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
    const sql = `
      SELECT 
        timestamp,
        instrument_key,
        delta,
        gamma,
        theta,
        vega,
        iv,
        underlying_price
      FROM option_greeks
      WHERE instrument_key = $1
        AND timestamp >= $2
        AND timestamp <= $3
      ORDER BY timestamp ASC
      ${query.limit ? `LIMIT ${query.limit}` : ""}
    `;

    const result = await this.questdb.query<IOptionGreeks>(sql, [
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
   * Get latest greeks for instrument
   */
  async findLatest(instrumentKey: string): Promise<IOptionGreeks | null> {
    const sql = `
      SELECT 
        timestamp,
        instrument_key,
        delta,
        gamma,
        theta,
        vega,
        iv,
        underlying_price
      FROM option_greeks
      WHERE instrument_key = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `;

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
    return this.questdb.checkDataExists(
      "option_greeks",
      instrumentKey,
      startTime,
      endTime
    );
  }
}
