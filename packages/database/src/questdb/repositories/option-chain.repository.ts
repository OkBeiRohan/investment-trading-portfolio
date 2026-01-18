import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { OptionChainSnapshot, OptionChainSnapshotSchema } from "@repo/schema";
import { loadSqlQueryCached } from "../utils/sql-loader";

@Injectable()
export class OptionChainRepository {
  private readonly logger = new Logger(OptionChainRepository.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Insert option chain snapshot (batch)
   */
  async insertBatch(snapshots: OptionChainSnapshot[]): Promise<void> {
    if (snapshots.length === 0) return;

    const sqlPrefix = loadSqlQueryCached("option-chain/insert-batch-prefix");
    const values = snapshots
      .map((s) => {
        const v = OptionChainSnapshotSchema.parse(s);
        return `('${v.timestamp.toISOString()}', '${v.underlyingKey}', '${v.instrumentKey}', '${v.expiry.toISOString()}', ${v.strike}, '${v.optionType}', ${v.lastPrice}, ${v.bidPrice}, ${v.askPrice}, ${v.volume}, ${v.openInterest}, ${v.iv}, ${v.delta}, ${v.gamma}, ${v.vega}, ${v.theta})`;
      })
      .join(",");

    const query = `${sqlPrefix} ${values}`;
    await this.pool.query(query);
  }

  /**
   * Get latest option chain for underlying
   */
  async getLatestChain(
    underlyingKey: string,
    expiry?: Date,
  ): Promise<OptionChainSnapshot[]> {
    const sql = expiry
      ? loadSqlQueryCached("option-chain/get-latest-chain-by-expiry")
      : loadSqlQueryCached("option-chain/get-latest-chain");

    const params = expiry
      ? [underlyingKey, expiry.toISOString()]
      : [underlyingKey];
    const result = await this.pool.query(sql, params);
    return result.rows.map((row: any) => this.mapRow(row));
  }

  /**
   * Get ATM options (closest to spot price)
   */
  async getATMOptions(
    underlyingKey: string,
    spotPrice: number,
  ): Promise<OptionChainSnapshot[]> {
    const sql = loadSqlQueryCached("option-chain/get-atm-options");
    const result = await this.pool.query(sql, [underlyingKey, spotPrice]);
    return result.rows.map((row: any) => this.mapRow(row));
  }

  private mapRow(row: any): OptionChainSnapshot {
    return {
      timestamp: new Date(row.timestamp),
      underlyingKey: row.underlying_key,
      instrumentKey: row.instrument_key,
      expiry: new Date(row.expiry),
      strike: parseFloat(row.strike),
      optionType: row.option_type,
      lastPrice: parseFloat(row.last_price),
      bidPrice: parseFloat(row.bid_price),
      askPrice: parseFloat(row.ask_price),
      volume: parseFloat(row.volume),
      openInterest: parseFloat(row.open_interest),
      iv: parseFloat(row.iv),
      delta: parseFloat(row.delta),
      gamma: parseFloat(row.gamma),
      vega: parseFloat(row.vega),
      theta: parseFloat(row.theta),
    };
  }
}
