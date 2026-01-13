import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { OptionChainSnapshot, OptionChainSnapshotSchema } from "@repo/schema";

@Injectable()
export class OptionChainRepository {
  private readonly logger = new Logger(OptionChainRepository.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Insert option chain snapshot (batch)
   */
  async insertBatch(snapshots: OptionChainSnapshot[]): Promise<void> {
    if (snapshots.length === 0) return;

    const values = snapshots
      .map((s) => {
        const v = OptionChainSnapshotSchema.parse(s);
        return `('${v.timestamp.toISOString()}', '${v.underlyingKey}', '${v.instrumentKey}', '${v.expiry.toISOString()}', ${v.strike}, '${v.optionType}', ${v.lastPrice}, ${v.bidPrice}, ${v.askPrice}, ${v.volume}, ${v.openInterest}, ${v.iv}, ${v.delta}, ${v.gamma}, ${v.vega}, ${v.theta})`;
      })
      .join(",");

    const query = `
      INSERT INTO option_chain_snapshot (
        timestamp, underlying_key, instrument_key, expiry, strike, option_type,
        last_price, bid_price, ask_price, volume, open_interest,
        iv, delta, gamma, vega, theta
      ) VALUES ${values}
    `;

    await this.pool.query(query);
    this.logger.log(`Inserted ${snapshots.length} option chain snapshots`);
  }

  /**
   * Get latest option chain for underlying
   */
  async getLatestChain(
    underlyingKey: string,
    expiry?: Date
  ): Promise<OptionChainSnapshot[]> {
    let query = `
      SELECT * FROM option_chain_snapshot 
      WHERE underlying_key = $1
      AND timestamp >= dateadd('m', -5, now())
    `;

    const params: any[] = [underlyingKey];

    if (expiry) {
      query += " AND expiry = $2";
      params.push(expiry.toISOString());
    }

    query += " ORDER BY strike, option_type";

    const result = await this.pool.query(query, params);
    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Get ATM options (closest to spot price)
   */
  async getATMOptions(
    underlyingKey: string,
    spotPrice: number
  ): Promise<OptionChainSnapshot[]> {
    const result = await this.pool.query(
      `SELECT * FROM option_chain_snapshot 
       WHERE underlying_key = $1
       AND timestamp >= dateadd('m', -5, now())
       ORDER BY abs(strike - $2), option_type
       LIMIT 2`,
      [underlyingKey, spotPrice]
    );

    return result.rows.map((row) => this.mapRow(row));
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
