/**
 * India VIX Repository
 * Repository for India VIX index data (volatility index)
 * Launched Feb 26, 2014
 */

import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";

export interface IndiaVixData {
    timestamp: Date;
    intervalValue: number;
    intervalUnit: "minutes" | "days";
    open: number;
    high: number;
    low: number;
    close: number;
    percentile30d?: number;
    percentile1yr?: number;
    sma10?: number;
    sma20?: number;
}

@Injectable()
export class IndiaVixRepository {
    private readonly logger = new Logger(IndiaVixRepository.name);

    constructor(private readonly pool: Pool) { }

    /**
     * Insert VIX data batch
     */
    async insertBatch(data: IndiaVixData[]): Promise<void> {
        if (data.length === 0) return;

        const values = data
            .map(
                (v) =>
                    `('${v.timestamp.toISOString()}', ${v.intervalValue}, '${v.intervalUnit}', ` +
                    `${v.open}, ${v.high}, ${v.low}, ${v.close}, ` +
                    `${v.percentile30d ?? "NULL"}, ${v.percentile1yr ?? "NULL"}, ` +
                    `${v.sma10 ?? "NULL"}, ${v.sma20 ?? "NULL"})`
            )
            .join(",");

        const query = `INSERT INTO india_vix 
      (timestamp, interval_value, interval_unit, open, high, low, close, 
       percentile_30d, percentile_1yr, sma_10, sma_20) 
      VALUES ${values}`;

        await this.pool.query(query);
        this.logger.log(`Inserted ${data.length} VIX records`);
    }

    /**
     * Get latest VIX value
     */
    async findLatest(
        intervalUnit: "minutes" | "days" = "days"
    ): Promise<IndiaVixData | null> {
        const result = await this.pool.query(
            `SELECT * FROM india_vix 
       WHERE interval_unit = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
            [intervalUnit]
        );

        if (result.rows.length === 0) return null;
        return this.mapRow(result.rows[0]);
    }

    /**
     * Get VIX for time range
     */
    async findByTimeRange(
        startTime: Date,
        endTime: Date,
        intervalUnit: "minutes" | "days" = "days",
        limit = 10000
    ): Promise<IndiaVixData[]> {
        const result = await this.pool.query(
            `SELECT * FROM india_vix 
       WHERE timestamp >= $1 
       AND timestamp <= $2 
       AND interval_unit = $3
       ORDER BY timestamp ASC 
       LIMIT $4`,
            [startTime.toISOString(), endTime.toISOString(), intervalUnit, limit]
        );

        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * Get current VIX percentile (where does current value rank in last N days)
     */
    async getCurrentPercentile(days: number = 30): Promise<number> {
        const result = await this.pool.query(
            `WITH recent_vix AS (
         SELECT close FROM india_vix 
         WHERE interval_unit = 'days' 
         ORDER BY timestamp DESC 
         LIMIT $1
       ),
       current_vix AS (
         SELECT close FROM india_vix 
         WHERE interval_unit = 'days' 
         ORDER BY timestamp DESC 
         LIMIT 1
       )
       SELECT 
         (SELECT COUNT(*) FROM recent_vix WHERE close < (SELECT close FROM current_vix)) * 100.0 / 
         (SELECT COUNT(*) FROM recent_vix) as percentile`,
            [days]
        );

        return parseFloat(result.rows[0]?.percentile || 50);
    }

    /**
     * Update computed metrics (percentiles, SMAs)
     */
    async updateComputedMetrics(timestamp: Date): Promise<void> {
        // This would typically be called by a scheduled job
        // to update percentile_30d, percentile_1yr, sma_10, sma_20
        await this.pool.query(
            `UPDATE india_vix 
       SET sma_10 = (
         SELECT AVG(close) FROM (
           SELECT close FROM india_vix 
           WHERE interval_unit = 'days' 
           AND timestamp <= $1 
           ORDER BY timestamp DESC 
           LIMIT 10
         )
       ),
       sma_20 = (
         SELECT AVG(close) FROM (
           SELECT close FROM india_vix 
           WHERE interval_unit = 'days' 
           AND timestamp <= $1 
           ORDER BY timestamp DESC 
           LIMIT 20
         )
       )
       WHERE timestamp = $1 AND interval_unit = 'days'`,
            [timestamp.toISOString()]
        );
    }

    private mapRow(row: any): IndiaVixData {
        return {
            timestamp: new Date(row.timestamp),
            intervalValue: parseInt(row.interval_value),
            intervalUnit: row.interval_unit,
            open: parseFloat(row.open),
            high: parseFloat(row.high),
            low: parseFloat(row.low),
            close: parseFloat(row.close),
            percentile30d: row.percentile_30d
                ? parseFloat(row.percentile_30d)
                : undefined,
            percentile1yr: row.percentile_1yr
                ? parseFloat(row.percentile_1yr)
                : undefined,
            sma10: row.sma_10 ? parseFloat(row.sma_10) : undefined,
            sma20: row.sma_20 ? parseFloat(row.sma_20) : undefined,
        };
    }
}
