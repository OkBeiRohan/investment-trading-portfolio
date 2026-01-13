/**
 * Market Ticks Repository
 * Repository for accessing unified tick data from QuestDB
 */

import { Injectable, Logger } from "@nestjs/common";
import { QuestDBService } from "../questdb.service";
import { loadSqlQueryCached } from "../utils/sql-loader";
import type {
  IMarketTick,
  IMarketTickInsert,
  IMarketTickQuery,
} from "@repo/schema";

@Injectable()
export class MarketTicksRepository {
  private readonly logger = new Logger(MarketTicksRepository.name);

  constructor(private readonly questdb: QuestDBService) {}

  /**
   * Insert ticks batch
   */
  async insertBatch(ticks: IMarketTickInsert[]): Promise<void> {
    if (ticks.length === 0) return;

    const sender = this.questdb.getSender();
    if (!sender) {
      throw new Error("QuestDB ILP sender not initialized");
    }

    for (const tick of ticks) {
      sender
        .table("market_ticks")
        .timestampColumn(
          "timestamp",
          typeof tick.timestamp === "number"
            ? tick.timestamp
            : tick.timestamp.getTime() * 1000
        )
        .symbol("instrument_key", tick.instrument_key)
        .symbol("instrument_type", tick.instrument_type)
        .symbol("index_name", tick.index_name ?? null)
        .floatColumn("strike_price", tick.strike_price ?? null)
        .symbol("option_type", tick.option_type ?? null)
        .timestampColumn(
          "expiry_date",
          tick.expiry_date
            ? typeof tick.expiry_date === "number"
              ? tick.expiry_date
              : tick.expiry_date.getTime() * 1000
            : null
        )
        .symbol("stock_symbol", tick.stock_symbol ?? null)
        .boolColumn(
          "is_nifty50_constituent",
          tick.is_nifty50_constituent ?? false
        )
        .floatColumn("ltp", tick.ltp)
        .floatColumn("open", tick.open)
        .floatColumn("high", tick.high)
        .floatColumn("low", tick.low)
        .floatColumn("close", tick.close)
        .floatColumn("prev_close", tick.prev_close)
        .intColumn("volume", tick.volume)
        .intColumn("open_interest", tick.open_interest ?? null)
        .floatColumn("bid", tick.bid)
        .floatColumn("ask", tick.ask)
        .intColumn("bid_qty", tick.bid_qty)
        .intColumn("ask_qty", tick.ask_qty)
        .floatColumn("upper_circuit", tick.upper_circuit)
        .floatColumn("lower_circuit", tick.lower_circuit)
        .symbol("exchange", tick.exchange)
        .timestampColumn(
          "trade_time",
          typeof tick.trade_time === "number"
            ? tick.trade_time
            : tick.trade_time.getTime() * 1000
        )
        .at(
          typeof tick.timestamp === "number"
            ? tick.timestamp * 1000
            : tick.timestamp.getTime() * 1000,
          "us"
        );
    }

    await sender.flush();
    this.logger.debug(`Inserted ${ticks.length} ticks`);
  }

  /**
   * Query ticks for a time range
   */
  async findByTimeRange(query: IMarketTickQuery): Promise<IMarketTick[]> {
    let sql = `
      SELECT * FROM market_ticks
      WHERE timestamp BETWEEN $1 AND $2
    `;

    const params: any[] = [
      query.start_time.toISOString(),
      query.end_time.toISOString(),
    ];

    if (query.instrument_key) {
      sql += ` AND instrument_key = $${params.length + 1}`;
      params.push(query.instrument_key);
    }

    if (query.instrument_type) {
      sql += ` AND instrument_type = $${params.length + 1}`;
      params.push(query.instrument_type);
    }

    if (query.index_name) {
      sql += ` AND index_name = $${params.length + 1}`;
      params.push(query.index_name);
    }

    sql += ` ORDER BY timestamp DESC`;

    if (query.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(query.limit);
    }

    const result = await this.questdb.query<IMarketTick>(sql, params);

    return result.rows.map((row) => ({
      ...row,
      timestamp: new Date(row.timestamp),
      expiry_date: row.expiry_date ? new Date(row.expiry_date) : null,
      trade_time: new Date(row.trade_time),
    }));
  }

  /**
   * Get latest tick for instrument
   */
  async findLatest(instrumentKey: string): Promise<IMarketTick | null> {
    const sql = `
      SELECT * FROM market_ticks
      WHERE instrument_key = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const result = await this.questdb.query<IMarketTick>(sql, [instrumentKey]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      timestamp: new Date(row.timestamp),
      expiry_date: row.expiry_date ? new Date(row.expiry_date) : null,
      trade_time: new Date(row.trade_time),
    };
  }

  /**
   * Get all NIFTY50 constituents ticks
   */
  async findNifty50Constituents(
    startTime: Date,
    endTime: Date,
    limit?: number
  ): Promise<IMarketTick[]> {
    return this.findByTimeRange({
      start_time: startTime,
      end_time: endTime,
      limit,
    }).then((ticks) => ticks.filter((t) => t.is_nifty50_constituent === true));
  }

  /**
   * Check if ticks exist for date range
   */
  async existsForRange(
    instrumentKey: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count FROM market_ticks
      WHERE instrument_key = $1
        AND timestamp BETWEEN $2 AND $3
    `;

    const result = await this.questdb.query<{ count: number }>(sql, [
      instrumentKey,
      startTime.toISOString(),
      endTime.toISOString(),
    ]);

    return (result.rows[0]?.count || 0) > 0;
  }
}
