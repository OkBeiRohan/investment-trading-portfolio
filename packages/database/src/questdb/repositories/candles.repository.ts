/**
 * Market Candles Repository v2.0
 * Repository for unified OHLCV data with interval_value + interval_unit columns
 * Aligned with Upstox V3 /get-historical-candle-data API
 */

import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { MarketCandle, MarketCandleSchema } from "@repo/schema";

@Injectable()
export class CandlesRepository {
  private readonly logger = new Logger(CandlesRepository.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Insert candles batch
   */
  async insertBatch(candles: MarketCandle[]): Promise<void> {
    if (candles.length === 0) return;

    const values = candles.map(c => {
      const v = MarketCandleSchema.parse(c);
      return `('${v.timestamp.toISOString()}', '${v.instrumentKey}', ${v.intervalValue}, '${v.intervalUnit}', ${v.open}, ${v.high}, ${v.low}, ${v.close}, ${v.volume}, ${v.openInterest ?? 'NULL'})`;
    }).join(',');

    const query = `
      INSERT INTO market_candles (
        timestamp, instrument_key, interval_value, interval_unit,
        open, high, low, close, volume, open_interest
      ) VALUES ${values}
    `;

    await this.pool.query(query);
    this.logger.log(`Inserted ${candles.length} candles`);
  }

  /**
   * Query candles for time range
   */
  async findByTimeRange(
    instrumentKey: string,
    intervalValue: number,
    intervalUnit: 'minute' | 'day',
    startTime: Date,
    endTime: Date,
    limit = 10000
  ): Promise<MarketCandle[]> {
    const result = await this.pool.query(
      `SELECT * FROM market_candles 
       WHERE instrument_key = $1 
       AND interval_value = $2 
       AND interval_unit = $3
       AND timestamp >= $4 
       AND timestamp < $5
       ORDER BY timestamp ASC
       LIMIT $6`,
      [instrumentKey, intervalValue, intervalUnit, startTime.toISOString(), endTime.toISOString(), limit]
    );

    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Get latest candle for instrument + interval
   */
  async findLatest(
    instrumentKey: string,
    intervalValue: number,
    intervalUnit: 'minute' | 'day'
  ): Promise<MarketCandle | null> {
    const result = await this.pool.query(
      `SELECT * FROM market_candles 
       WHERE instrument_key = $1 
       AND interval_value = $2
       AND interval_unit = $3
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [instrumentKey, intervalValue, intervalUnit]
    );

    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  /**
   * Check if candles exist for date range
   */
  async existsForRange(
    instrumentKey: string,
    intervalValue: number,
    intervalUnit: 'minute' | 'day',
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT count(*) as count FROM market_candles 
       WHERE instrument_key = $1 
       AND interval_value = $2
       AND interval_unit = $3
       AND timestamp >= $4 
       AND timestamp < $5`,
      [instrumentKey, intervalValue, intervalUnit, startTime.toISOString(), endTime.toISOString()]
    );

    return (result.rows[0]?.count || 0) > 0;
  }

  private mapRow(row: any): MarketCandle {
    return {
      timestamp: new Date(row.timestamp),
      instrumentKey: row.instrument_key,
      intervalValue: parseInt(row.interval_value),
      intervalUnit: row.interval_unit,
      open: parseFloat(row.open),
      high: parseFloat(row.high),
      low: parseFloat(row.low),
      close: parseFloat(row.close),
      volume: parseFloat(row.volume),
      openInterest: row.open_interest ? parseFloat(row.open_interest) : null,
    };
  }
}
      interval,
    ]);

    return result.rows[0]?.count || 0;
  }
}
