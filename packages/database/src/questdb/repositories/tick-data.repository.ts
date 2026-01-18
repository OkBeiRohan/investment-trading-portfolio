/**
 * Tick Data Repository
 * Repository for depth-30 live tick data storage
 * Stores full order book with 30 levels bid/ask + Greeks
 */

import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";

export interface TickData {
    timestamp: Date;
    instrumentKey: string;
    ltp: number;
    ltq: number;
    cp: number;
    atp: number;
    vtt: number;
    oi: number;
    tbq: number;
    tsq: number;
    // Depth (flattened arrays)
    bidPrices: number[];
    bidQtys: number[];
    askPrices: number[];
    askQtys: number[];
    // Greeks (options only)
    delta?: number;
    theta?: number;
    gamma?: number;
    vega?: number;
    rho?: number;
    iv?: number;
}

@Injectable()
export class TickDataRepository {
    private readonly logger = new Logger(TickDataRepository.name);

    constructor(private readonly pool: Pool) { }

    /**
     * Insert batch of tick data
     */
    async insertBatch(ticks: TickData[]): Promise<void> {
        if (ticks.length === 0) return;

        const columns = this.buildColumns();
        const values = ticks.map((t) => this.buildValues(t)).join(",");

        const query = `INSERT INTO tick_data (${columns}) VALUES ${values}`;
        await this.pool.query(query);
        this.logger.debug(`Inserted ${ticks.length} ticks`);
    }

    /**
     * Get latest tick for instrument
     */
    async findLatest(instrumentKey: string): Promise<TickData | null> {
        const result = await this.pool.query(
            `SELECT * FROM tick_data 
       WHERE instrument_key = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
            [instrumentKey]
        );

        if (result.rows.length === 0) return null;
        return this.mapRow(result.rows[0]);
    }

    /**
     * Get ticks for time range
     */
    async findByTimeRange(
        instrumentKey: string,
        startTime: Date,
        endTime: Date,
        limit = 10000
    ): Promise<TickData[]> {
        const result = await this.pool.query(
            `SELECT * FROM tick_data 
       WHERE instrument_key = $1 
       AND timestamp >= $2 
       AND timestamp <= $3 
       ORDER BY timestamp ASC 
       LIMIT $4`,
            [instrumentKey, startTime.toISOString(), endTime.toISOString(), limit]
        );

        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * Get aggregated depth imbalance for time range
     */
    async getDepthImbalance(
        instrumentKey: string,
        startTime: Date,
        endTime: Date
    ): Promise<{ avgImbalance: number; count: number }> {
        const result = await this.pool.query(
            `SELECT 
         AVG((tbq - tsq) / NULLIF(tbq + tsq, 0)) as avg_imbalance,
         COUNT(*) as count
       FROM tick_data 
       WHERE instrument_key = $1 
       AND timestamp >= $2 
       AND timestamp <= $3`,
            [instrumentKey, startTime.toISOString(), endTime.toISOString()]
        );

        return {
            avgImbalance: parseFloat(result.rows[0]?.avg_imbalance || 0),
            count: parseInt(result.rows[0]?.count || 0),
        };
    }

    private buildColumns(): string {
        const columns = [
            "timestamp", "instrument_key",
            "ltp", "ltq", "cp", "atp", "vtt", "oi", "tbq", "tsq",
        ];

        // Add depth columns (30 levels)
        for (let i = 1; i <= 30; i++) {
            columns.push(`bid_price_${i}`, `bid_qty_${i}`);
            columns.push(`ask_price_${i}`, `ask_qty_${i}`);
        }

        columns.push("delta", "theta", "gamma", "vega", "rho", "iv");
        return columns.join(", ");
    }

    private buildValues(t: TickData): string {
        const vals: (string | number)[] = [
            `'${t.timestamp.toISOString()}'`,
            `'${t.instrumentKey}'`,
            t.ltp, t.ltq, t.cp, t.atp, t.vtt, t.oi, t.tbq, t.tsq,
        ];

        // Add depth values (30 levels, padded with NULL)
        for (let i = 0; i < 30; i++) {
            vals.push(t.bidPrices[i] ?? "NULL");
            vals.push(t.bidQtys[i] ?? "NULL");
            vals.push(t.askPrices[i] ?? "NULL");
            vals.push(t.askQtys[i] ?? "NULL");
        }

        vals.push(t.delta ?? "NULL");
        vals.push(t.theta ?? "NULL");
        vals.push(t.gamma ?? "NULL");
        vals.push(t.vega ?? "NULL");
        vals.push(t.rho ?? "NULL");
        vals.push(t.iv ?? "NULL");

        return `(${vals.join(", ")})`;
    }

    private mapRow(row: any): TickData {
        const bidPrices: number[] = [];
        const bidQtys: number[] = [];
        const askPrices: number[] = [];
        const askQtys: number[] = [];

        for (let i = 1; i <= 30; i++) {
            bidPrices.push(parseFloat(row[`bid_price_${i}`]) || 0);
            bidQtys.push(parseInt(row[`bid_qty_${i}`]) || 0);
            askPrices.push(parseFloat(row[`ask_price_${i}`]) || 0);
            askQtys.push(parseInt(row[`ask_qty_${i}`]) || 0);
        }

        return {
            timestamp: new Date(row.timestamp),
            instrumentKey: row.instrument_key,
            ltp: parseFloat(row.ltp),
            ltq: parseInt(row.ltq),
            cp: parseFloat(row.cp),
            atp: parseFloat(row.atp),
            vtt: parseInt(row.vtt),
            oi: parseInt(row.oi),
            tbq: parseInt(row.tbq),
            tsq: parseInt(row.tsq),
            bidPrices,
            bidQtys,
            askPrices,
            askQtys,
            delta: row.delta ? parseFloat(row.delta) : undefined,
            theta: row.theta ? parseFloat(row.theta) : undefined,
            gamma: row.gamma ? parseFloat(row.gamma) : undefined,
            vega: row.vega ? parseFloat(row.vega) : undefined,
            rho: row.rho ? parseFloat(row.rho) : undefined,
            iv: row.iv ? parseFloat(row.iv) : undefined,
        };
    }
}
