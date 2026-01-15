import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { InstrumentMaster, InstrumentMasterSchema } from "@repo/schema";
import { loadSqlQueryCached } from "../utils/sql-loader";

@Injectable()
export class InstrumentMasterRepository {
  private readonly logger = new Logger(InstrumentMasterRepository.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Insert or update instrument master record
   */
  async upsert(instrument: InstrumentMaster): Promise<void> {
    const validated = InstrumentMasterSchema.parse(instrument);
    const sql = loadSqlQueryCached("instrument-master/insert");

    await this.pool.query(sql, [
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
  async bulkInsert(instruments: InstrumentMaster[]): Promise<boolean> {
    try {
      if (instruments.length === 0) return true;

      const sqlPrefix = loadSqlQueryCached(
        "instrument-master/insert-batch-prefix"
      );
      const values = instruments
        .map((inst) => {
          const v = InstrumentMasterSchema.parse(inst);
          return `('${v.instrumentKey}', '${v.exchange}', '${v.segment}', '${v.instrumentType}', '${v.tradingsymbol}', '${v.name}', ${v.expiry ? `'${v.expiry.toISOString()}'` : "NULL"}, ${v.strike ?? "NULL"}, ${v.optionType ? `'${v.optionType}'` : "NULL"}, ${v.lotSize}, ${v.tickSize}, ${v.underlyingKey ? `'${v.underlyingKey}'` : "NULL"}, ${v.isExpired}, '${v.lastUpdated.toISOString()}')`;
        })
        .join(",");

      const query = `${sqlPrefix} ${values}`;
      await this.pool.query(query);
      this.logger.log(`Inserted ${instruments.length} instruments`);

      return true;
    } catch (error) {
      this.logger.error("Error during bulk insert of instruments", error);
      return false;
    }
  }

  /**
   * Get instrument by key
   */
  async getByKey(instrumentKey: string): Promise<InstrumentMaster | null> {
    const sql = loadSqlQueryCached("instrument-master/get-by-key");
    const result = await this.pool.query(sql, [instrumentKey]);

    if (result.rows.length === 0) return null;

    return this.mapRow(result.rows[0]);
  }

  /**
   * Get all active instruments
   */
  async getActiveInstruments(): Promise<InstrumentMaster[]> {
    const sql = loadSqlQueryCached("instrument-master/get-active");
    const result = await this.pool.query(sql);

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Get options for underlying
   */
  async getOptions(
    underlyingKey: string,
    expiryDate?: Date
  ): Promise<InstrumentMaster[]> {
    const sql = expiryDate
      ? loadSqlQueryCached("instrument-master/get-options-by-expiry")
      : loadSqlQueryCached("instrument-master/get-options");

    const params = expiryDate ? [underlyingKey, expiryDate] : [underlyingKey];
    const result = await this.pool.query(sql, params);
    return result.rows.map((row: any) => this.mapRow(row));
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
