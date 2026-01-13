import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { InstrumentMaster, InstrumentMasterSchema } from "@repo/schema";
import { readFileSync } from "fs";
import { join } from "path";

@Injectable()
export class InstrumentMasterRepository {
  private readonly logger = new Logger(InstrumentMasterRepository.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Insert or update instrument master record
   */
  async upsert(instrument: InstrumentMaster): Promise<void> {
    const validated = InstrumentMasterSchema.parse(instrument);

    const query = `
      INSERT INTO instrument_master (
        instrument_key, exchange, segment, instrument_type, tradingsymbol,
        name, expiry, strike, option_type, lot_size, tick_size,
        underlying_key, is_expired, last_updated
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
    `;

    await this.pool.query(query, [
      validated.instrumentKey,
      validated.exchange,
      validated.segment,
      validated.instrumentType,
      validated.tradingsymbol,
      validated.name,
      validated.expiry,
      validated.strike,
      validated.optionType,
      validated.lotSize,
      validated.tickSize,
      validated.underlyingKey,
      validated.isExpired,
      validated.lastUpdated,
    ]);
  }

  /**
   * Bulk insert instruments (for initial load from Upstox)
   */
  async bulkInsert(instruments: InstrumentMaster[]): Promise<void> {
    if (instruments.length === 0) return;

    const values = instruments
      .map((inst) => {
        const v = InstrumentMasterSchema.parse(inst);
        return `('${v.instrumentKey}', '${v.exchange}', '${v.segment}', '${v.instrumentType}', '${v.tradingsymbol}', '${v.name}', ${v.expiry ? `'${v.expiry.toISOString()}'` : "NULL"}, ${v.strike ?? "NULL"}, ${v.optionType ? `'${v.optionType}'` : "NULL"}, ${v.lotSize}, ${v.tickSize}, ${v.underlyingKey ? `'${v.underlyingKey}'` : "NULL"}, ${v.isExpired}, '${v.lastUpdated.toISOString()}')`;
      })
      .join(",");

    const query = `
      INSERT INTO instrument_master (
        instrument_key, exchange, segment, instrument_type, tradingsymbol,
        name, expiry, strike, option_type, lot_size, tick_size,
        underlying_key, is_expired, last_updated
      ) VALUES ${values}
    `;

    await this.pool.query(query);
    this.logger.log(`Inserted ${instruments.length} instruments`);
  }

  /**
   * Get instrument by key
   */
  async getByKey(instrumentKey: string): Promise<InstrumentMaster | null> {
    const result = await this.pool.query(
      "SELECT * FROM instrument_master WHERE instrument_key = $1",
      [instrumentKey]
    );

    if (result.rows.length === 0) return null;

    return this.mapRow(result.rows[0]);
  }

  /**
   * Get all active instruments
   */
  async getActiveInstruments(): Promise<InstrumentMaster[]> {
    const result = await this.pool.query(
      "SELECT * FROM instrument_master WHERE is_expired = false"
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Get options for underlying
   */
  async getOptions(
    underlyingKey: string,
    expiryDate?: Date
  ): Promise<InstrumentMaster[]> {
    let query = `
      SELECT * FROM instrument_master 
      WHERE underlying_key = $1 
      AND instrument_type = 'OPTION'
      AND is_expired = false
    `;

    const params: any[] = [underlyingKey];

    if (expiryDate) {
      query += " AND expiry = $2";
      params.push(expiryDate);
    }

    query += " ORDER BY strike, option_type";

    const result = await this.pool.query(query, params);
    return result.rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: any): InstrumentMaster {
    return {
      instrumentKey: row.instrument_key,
      exchange: row.exchange,
      segment: row.segment,
      instrumentType: row.instrument_type,
      tradingsymbol: row.tradingsymbol,
      name: row.name,
      expiry: row.expiry ? new Date(row.expiry) : null,
      strike: row.strike,
      optionType: row.option_type,
      lotSize: row.lot_size,
      tickSize: row.tick_size,
      underlyingKey: row.underlying_key,
      isExpired: row.is_expired,
      lastUpdated: new Date(row.last_updated),
    };
  }
}
