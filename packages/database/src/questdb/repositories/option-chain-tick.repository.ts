/**
 * Option Chain Repository (QuestDB)
 * Stores option chain ticks with Greeks for Black-Scholes validation
 * 
 * Source: Upstox Option Chain API + Option Greeks API
 * Fields: delta, gamma, theta, vega, IV
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Pool } from "pg";

export interface OptionChainTick {
    timestamp: Date;
    instrumentKey: string;
    tradingSymbol: string;
    underlyingKey: string;
    expiry: Date;
    strikePrice: number;
    optionType: "CE" | "PE";

    // Market Data
    ltp: number;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
    openInterest: number | null;
    bidPrice: number | null;
    bidQty: number | null;
    askPrice: number | null;
    askQty: number | null;

    // Greeks (from Upstox)
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    iv: number;

    // Underlying
    underlyingPrice: number;

    // Computed
    timeToExpiry: number | null;
    moneyness: number | null;
    intrinsicValue: number | null;
    timeValue: number | null;
}

@Injectable()
export class OptionChainTickRepository implements OnModuleInit {
    private readonly logger = new Logger(OptionChainTickRepository.name);

    constructor(private readonly pool: Pool) { }

    async onModuleInit(): Promise<void> {
        await this.createTableIfNotExists();
    }

    private async createTableIfNotExists(): Promise<void> {
        const sql = `
      CREATE TABLE IF NOT EXISTS option_chain_ticks (
        timestamp TIMESTAMP,
        instrument_key SYMBOL,
        trading_symbol SYMBOL,
        underlying_key SYMBOL,
        expiry TIMESTAMP,
        strike_price DOUBLE,
        option_type SYMBOL,
        
        -- Market Data
        ltp DOUBLE,
        open DOUBLE,
        high DOUBLE,
        low DOUBLE,
        close DOUBLE,
        volume LONG,
        open_interest LONG,
        bid_price DOUBLE,
        bid_qty LONG,
        ask_price DOUBLE,
        ask_qty LONG,
        
        -- Greeks
        delta DOUBLE,
        gamma DOUBLE,
        theta DOUBLE,
        vega DOUBLE,
        iv DOUBLE,
        
        -- Underlying
        underlying_price DOUBLE,
        
        -- Computed
        time_to_expiry DOUBLE,
        moneyness DOUBLE,
        intrinsic_value DOUBLE,
        time_value DOUBLE
      ) TIMESTAMP(timestamp) PARTITION BY DAY WAL
      DEDUP UPSERT KEYS(timestamp, instrument_key);
    `;

        try {
            await this.pool.query(sql);
            this.logger.log("option_chain_ticks table ready");
        } catch (error) {
            this.logger.error("Failed to create option_chain_ticks table", error);
        }
    }

    async insert(tick: OptionChainTick): Promise<void> {
        const sql = `
      INSERT INTO option_chain_ticks (
        timestamp, instrument_key, trading_symbol, underlying_key, expiry,
        strike_price, option_type, ltp, open, high, low, close, volume,
        open_interest, bid_price, bid_qty, ask_price, ask_qty,
        delta, gamma, theta, vega, iv, underlying_price,
        time_to_expiry, moneyness, intrinsic_value, time_value
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28
      )
    `;

        await this.pool.query(sql, [
            tick.timestamp,
            tick.instrumentKey,
            tick.tradingSymbol,
            tick.underlyingKey,
            tick.expiry,
            tick.strikePrice,
            tick.optionType,
            tick.ltp,
            tick.open,
            tick.high,
            tick.low,
            tick.close,
            tick.volume,
            tick.openInterest,
            tick.bidPrice,
            tick.bidQty,
            tick.askPrice,
            tick.askQty,
            tick.delta,
            tick.gamma,
            tick.theta,
            tick.vega,
            tick.iv,
            tick.underlyingPrice,
            tick.timeToExpiry,
            tick.moneyness,
            tick.intrinsicValue,
            tick.timeValue,
        ]);
    }

    async insertBatch(ticks: OptionChainTick[]): Promise<void> {
        if (ticks.length === 0) return;

        const values = ticks.map(tick => `(
      '${tick.timestamp.toISOString()}',
      '${tick.instrumentKey}',
      '${tick.tradingSymbol}',
      '${tick.underlyingKey}',
      '${tick.expiry.toISOString()}',
      ${tick.strikePrice},
      '${tick.optionType}',
      ${tick.ltp},
      ${tick.open ?? "NULL"},
      ${tick.high ?? "NULL"},
      ${tick.low ?? "NULL"},
      ${tick.close ?? "NULL"},
      ${tick.volume ?? "NULL"},
      ${tick.openInterest ?? "NULL"},
      ${tick.bidPrice ?? "NULL"},
      ${tick.bidQty ?? "NULL"},
      ${tick.askPrice ?? "NULL"},
      ${tick.askQty ?? "NULL"},
      ${tick.delta},
      ${tick.gamma},
      ${tick.theta},
      ${tick.vega},
      ${tick.iv},
      ${tick.underlyingPrice},
      ${tick.timeToExpiry ?? "NULL"},
      ${tick.moneyness ?? "NULL"},
      ${tick.intrinsicValue ?? "NULL"},
      ${tick.timeValue ?? "NULL"}
    )`).join(",\n");

        const sql = `
      INSERT INTO option_chain_ticks (
        timestamp, instrument_key, trading_symbol, underlying_key, expiry,
        strike_price, option_type, ltp, open, high, low, close, volume,
        open_interest, bid_price, bid_qty, ask_price, ask_qty,
        delta, gamma, theta, vega, iv, underlying_price,
        time_to_expiry, moneyness, intrinsic_value, time_value
      ) VALUES ${values}
    `;

        await this.pool.query(sql);
        this.logger.debug(`Inserted ${ticks.length} option chain ticks`);
    }

    /**
     * Get option chain for an expiry at a specific time
     */
    async getOptionChain(
        underlyingKey: string,
        expiry: Date,
        timestamp: Date
    ): Promise<OptionChainTick[]> {
        const sql = `
      SELECT * FROM option_chain_ticks
      WHERE underlying_key = $1
        AND expiry = $2
        AND timestamp <= $3
      ORDER BY strike_price, option_type
      LIMIT 1000
    `;

        const result = await this.pool.query(sql, [underlyingKey, expiry, timestamp]);
        return result.rows.map(this.mapRow);
    }

    /**
     * Get IV surface for Black-Scholes analysis
     */
    async getIVSurface(
        underlyingKey: string,
        startTime: Date,
        endTime: Date
    ): Promise<Array<{
        timestamp: Date;
        expiry: Date;
        strikePrice: number;
        optionType: string;
        iv: number;
        delta: number;
    }>> {
        const sql = `
      SELECT timestamp, expiry, strike_price, option_type, iv, delta
      FROM option_chain_ticks
      WHERE underlying_key = $1
        AND timestamp BETWEEN $2 AND $3
      ORDER BY timestamp, expiry, strike_price
    `;

        const result = await this.pool.query(sql, [underlyingKey, startTime, endTime]);
        return result.rows.map(row => ({
            timestamp: new Date(row.timestamp),
            expiry: new Date(row.expiry),
            strikePrice: parseFloat(row.strike_price),
            optionType: row.option_type,
            iv: parseFloat(row.iv),
            delta: parseFloat(row.delta),
        }));
    }

    private mapRow(row: Record<string, unknown>): OptionChainTick {
        return {
            timestamp: new Date(row.timestamp as string),
            instrumentKey: row.instrument_key as string,
            tradingSymbol: row.trading_symbol as string,
            underlyingKey: row.underlying_key as string,
            expiry: new Date(row.expiry as string),
            strikePrice: parseFloat(row.strike_price as string),
            optionType: row.option_type as "CE" | "PE",
            ltp: parseFloat(row.ltp as string),
            open: row.open ? parseFloat(row.open as string) : null,
            high: row.high ? parseFloat(row.high as string) : null,
            low: row.low ? parseFloat(row.low as string) : null,
            close: row.close ? parseFloat(row.close as string) : null,
            volume: row.volume ? parseInt(row.volume as string) : null,
            openInterest: row.open_interest ? parseInt(row.open_interest as string) : null,
            bidPrice: row.bid_price ? parseFloat(row.bid_price as string) : null,
            bidQty: row.bid_qty ? parseInt(row.bid_qty as string) : null,
            askPrice: row.ask_price ? parseFloat(row.ask_price as string) : null,
            askQty: row.ask_qty ? parseInt(row.ask_qty as string) : null,
            delta: parseFloat(row.delta as string),
            gamma: parseFloat(row.gamma as string),
            theta: parseFloat(row.theta as string),
            vega: parseFloat(row.vega as string),
            iv: parseFloat(row.iv as string),
            underlyingPrice: parseFloat(row.underlying_price as string),
            timeToExpiry: row.time_to_expiry ? parseFloat(row.time_to_expiry as string) : null,
            moneyness: row.moneyness ? parseFloat(row.moneyness as string) : null,
            intrinsicValue: row.intrinsic_value ? parseFloat(row.intrinsic_value as string) : null,
            timeValue: row.time_value ? parseFloat(row.time_value as string) : null,
        };
    }
}
