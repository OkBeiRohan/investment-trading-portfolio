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
      const row = sender
        .table("market_ticks")
        .timestampColumn(
          "timestamp",
          typeof tick.timestamp === "number"
            ? tick.timestamp
            : tick.timestamp.getTime() * 1000
        )
        .symbol("instrument_key", tick.instrument_key)
        .symbol("instrument_type", tick.instrument_type);

      // Nullable symbol columns
      if (tick.index_name !== null && tick.index_name !== undefined) {
        row.symbol("index_name", tick.index_name);
      }

      if (tick.strike_price !== null && tick.strike_price !== undefined) {
        row.floatColumn("strike_price", tick.strike_price);
      }

      if (tick.option_type !== null && tick.option_type !== undefined) {
        row.symbol("option_type", tick.option_type);
      }

      if (tick.expiry_date !== null && tick.expiry_date !== undefined) {
        row.timestampColumn(
          "expiry_date",
          typeof tick.expiry_date === "number"
            ? tick.expiry_date
            : tick.expiry_date.getTime() * 1000
        );
      }

      if (tick.stock_symbol !== null && tick.stock_symbol !== undefined) {
        row.symbol("stock_symbol", tick.stock_symbol);
      }

      row
        .booleanColumn(
          "is_nifty50_constituent",
          tick.is_nifty50_constituent ?? false
        )
        .floatColumn("ltp", tick.ltp)
        .floatColumn("open", tick.open)
        .floatColumn("high", tick.high)
        .floatColumn("low", tick.low)
        .floatColumn("close", tick.close)
        .floatColumn("prev_close", tick.prev_close)
        .intColumn("volume", tick.volume);

      // Nullable numeric column
      if (tick.open_interest !== null && tick.open_interest !== undefined) {
        row.intColumn("open_interest", tick.open_interest);
      }

      row
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
    // Load base SQL from schema
    let sql = loadSqlQueryCached("market-ticks/select-by-time-range-base");

    const params: any[] = [
      query.start_time.toISOString(),
      query.end_time.toISOString(),
    ];

    // Build dynamic filters
    const filters: string[] = [];

    if (query.instrument_key) {
      filters.push(`instrument_key = $${params.length + 1}`);
      params.push(query.instrument_key);
    }

    if (query.instrument_type) {
      filters.push(`instrument_type = $${params.length + 1}`);
      params.push(query.instrument_type);
    }

    if (query.index_name) {
      filters.push(`index_name = $${params.length + 1}`);
      params.push(query.index_name);
    }

    // Apply filters if any
    if (filters.length > 0) {
      sql = sql.replace(
        "ORDER BY timestamp DESC;",
        `AND ${filters.join(" AND ")}\nORDER BY timestamp DESC;`
      );
    }

    // Apply limit if specified
    if (query.limit) {
      sql = sql.replace(";", ` LIMIT $${params.length + 1};`);
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
    // Load SQL from schema
    const sql = loadSqlQueryCached("market-ticks/select-latest");

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
    // Load SQL from schema
    const sql = loadSqlQueryCached("market-ticks/count-by-instrument");

    const result = await this.questdb.query<{ count: number }>(sql, [
      instrumentKey,
      startTime.toISOString(),
      endTime.toISOString(),
    ]);

    return (result.rows[0]?.count || 0) > 0;
  }
}
