/**
 * QuestDB Production Service
 * High-performance time-series database with ILP protocol
 *
 * Features:
 * - InfluxDB Line Protocol (ILP) for 100K+ rows/sec ingestion
 * - PostgreSQL wire protocol for queries
 * - Automatic schema creation with deduplication
 * - Batch buffering for optimal performance
 *
 * Performance targets:
 * - Insert: >100K rows/sec via ILP
 * - Query: <100ms p95 for time-range queries
 * - Storage: ~1GB per million candles
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { Sender } from "@questdb/nodejs-client";
import type {
  ICandleInsert,
  IQuoteInsert,
  IGreeksInsert,
  IDepthInsert,
} from "@repo/schema";

@Injectable()
export class QuestDBProductionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QuestDBProductionService.name);
  private pool: Pool; // PostgreSQL wire protocol (queries)
  private sender: Sender | null = null; // ILP protocol (writes)
  private flushInterval: NodeJS.Timeout | null = null;
  private pendingWrites = 0;

  constructor() {
    // PostgreSQL wire protocol configuration (port 8812)
    this.pool = new Pool({
      host: process.env.QUESTDB_HOST || "localhost",
      port: parseInt(process.env.QUESTDB_PG_PORT || "8812", 10),
      user: process.env.QUESTDB_USER || "admin",
      password: process.env.QUESTDB_PASSWORD || "quest",
      database: "qdb",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.logger.log("QuestDB connection pool initialized");
  }

  async onModuleInit() {
    try {
      // Build ILP connection string
      const host = process.env.QUESTDB_HOST || "localhost";
      const port = process.env.QUESTDB_ILP_PORT || "9009";

      // Create sender with configuration string
      // Format: protocol::addr=host:port;option=value;...
      this.sender = await Sender.fromConfig(
        `tcp::addr=${host}:${port};auto_flush=off;init_buf_size=8192;max_buf_size=104857600;`
      );

      await this.sender.connect();
      this.logger.log(`ILP sender connected to ${host}:${port}`);

      // Auto-flush every 5 seconds
      this.flushInterval = setInterval(() => {
        this.autoFlush().catch((err) =>
          this.logger.error("Auto-flush failed", err)
        );
      }, 5000);

      // Create tables on startup
      await this.createTables();
    } catch (error) {
      this.logger.error("Failed to initialize QuestDB ILP sender", error);
      throw error;
    }
  }

  /**
   * Create tables with optimal schema for market data
   */
  private async createTables(): Promise<void> {
    const tables = [
      `CREATE TABLE IF NOT EXISTS market_candles (
        timestamp TIMESTAMP,
        instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
        interval SYMBOL CAPACITY 20,
        open DOUBLE,
        high DOUBLE,
        low DOUBLE,
        close DOUBLE,
        volume LONG,
        open_interest LONG
      ) TIMESTAMP(timestamp) PARTITION BY DAY WAL
      DEDUP UPSERT KEYS(timestamp, instrument_key, interval);`,

      `CREATE TABLE IF NOT EXISTS market_quotes (
        timestamp TIMESTAMP,
        instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
        ltp DOUBLE,
        bid DOUBLE,
        ask DOUBLE,
        bid_qty INT,
        ask_qty INT,
        volume LONG,
        open_interest LONG,
        upper_circuit DOUBLE,
        lower_circuit DOUBLE
      ) TIMESTAMP(timestamp) PARTITION BY DAY WAL
      DEDUP UPSERT KEYS(timestamp, instrument_key);`,

      `CREATE TABLE IF NOT EXISTS option_greeks (
        timestamp TIMESTAMP,
        instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
        delta DOUBLE,
        gamma DOUBLE,
        theta DOUBLE,
        vega DOUBLE,
        iv DOUBLE,
        underlying_price DOUBLE
      ) TIMESTAMP(timestamp) PARTITION BY DAY WAL
      DEDUP UPSERT KEYS(timestamp, instrument_key);`,

      `CREATE TABLE IF NOT EXISTS market_depth (
        timestamp TIMESTAMP,
        instrument_key SYMBOL CAPACITY 10000 NOCACHE INDEX,
        side SYMBOL CAPACITY 2,
        level BYTE,
        price DOUBLE,
        quantity INT,
        orders INT
      ) TIMESTAMP(timestamp) PARTITION BY DAY WAL
      DEDUP UPSERT KEYS(timestamp, instrument_key, side, level);`,
    ];

    for (const sql of tables) {
      try {
        await this.query(sql);
        const tableName = sql.match(/TABLE IF NOT EXISTS (\w+)/)?.[1];
        this.logger.log(`Table created/verified: ${tableName}`);
      } catch (error) {
        this.logger.error(`Failed to create table: ${sql}`, error);
      }
    }
  }

  /**
   * Execute a raw SQL query (PostgreSQL wire protocol)
   */
  async query<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Execute query within a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Insert candle data using ILP (high-performance)
   */
  async insertCandles(candles: ICandleInsert[]): Promise<void> {
    if (!this.sender) {
      throw new Error("ILP sender not initialized");
    }

    for (const candle of candles) {
      try {
        const timestampMs =
          candle.timestamp instanceof Date
            ? candle.timestamp.getTime()
            : candle.timestamp;

        this.sender
          .table("market_candles")
          .symbol("instrument_key", candle.instrument_key)
          .symbol("interval", candle.interval)
          .floatColumn("open", candle.open)
          .floatColumn("high", candle.high)
          .floatColumn("low", candle.low)
          .floatColumn("close", candle.close)
          .intColumn("volume", candle.volume)
          .intColumn("open_interest", candle.open_interest || 0)
          .at(timestampMs, "ms");

        this.pendingWrites++;
      } catch (error) {
        this.logger.error(
          `Failed to buffer candle: ${candle.instrument_key}`,
          error
        );
      }
    }

    if (this.pendingWrites >= 1000) {
      await this.flushILP();
    }
  }

  /**
   * Insert market quotes using ILP
   */
  async insertQuotes(quotes: IQuoteInsert[]): Promise<void> {
    if (!this.sender) {
      throw new Error("ILP sender not initialized");
    }

    for (const quote of quotes) {
      try {
        const timestampMs =
          quote.timestamp instanceof Date
            ? quote.timestamp.getTime()
            : quote.timestamp;

        this.sender
          .table("market_quotes")
          .symbol("instrument_key", quote.instrument_key)
          .floatColumn("ltp", quote.ltp)
          .floatColumn("bid", quote.bid || 0)
          .floatColumn("ask", quote.ask || 0)
          .intColumn("bid_qty", quote.bid_qty || 0)
          .intColumn("ask_qty", quote.ask_qty || 0)
          .intColumn("volume", quote.volume || 0)
          .intColumn("open_interest", quote.open_interest || 0)
          .floatColumn("upper_circuit", quote.upper_circuit || 0)
          .floatColumn("lower_circuit", quote.lower_circuit || 0)
          .at(timestampMs, "ms");

        this.pendingWrites++;
      } catch (error) {
        this.logger.error(
          `Failed to buffer quote: ${quote.instrument_key}`,
          error
        );
      }
    }

    if (this.pendingWrites >= 1000) {
      await this.flushILP();
    }
  }

  /**
   * Insert option greeks using ILP
   */
  async insertGreeks(greeks: IGreeksInsert[]): Promise<void> {
    if (!this.sender) {
      throw new Error("ILP sender not initialized");
    }

    for (const greek of greeks) {
      try {
        const timestampMs =
          greek.timestamp instanceof Date
            ? greek.timestamp.getTime()
            : greek.timestamp;

        this.sender
          .table("option_greeks")
          .symbol("instrument_key", greek.instrument_key)
          .floatColumn("delta", greek.delta)
          .floatColumn("gamma", greek.gamma)
          .floatColumn("theta", greek.theta)
          .floatColumn("vega", greek.vega)
          .floatColumn("iv", greek.iv)
          .floatColumn("underlying_price", greek.underlying_price)
          .at(timestampMs, "ms");

        this.pendingWrites++;
      } catch (error) {
        this.logger.error(
          `Failed to buffer greeks: ${greek.instrument_key}`,
          error
        );
      }
    }

    if (this.pendingWrites >= 1000) {
      await this.flushILP();
    }
  }

  /**
   * Insert market depth (order book) using ILP
   */
  async insertDepth(depths: IDepthInsert[]): Promise<void> {
    if (!this.sender) {
      throw new Error("ILP sender not initialized");
    }

    for (const depth of depths) {
      try {
        const timestampMs =
          depth.timestamp instanceof Date
            ? depth.timestamp.getTime()
            : depth.timestamp;

        this.sender
          .table("market_depth")
          .symbol("instrument_key", depth.instrument_key)
          .symbol("side", depth.side)
          .intColumn("level", depth.level)
          .floatColumn("price", depth.price)
          .intColumn("quantity", depth.quantity)
          .intColumn("orders", depth.orders)
          .at(timestampMs, "ms");

        this.pendingWrites++;
      } catch (error) {
        this.logger.error(
          `Failed to buffer depth: ${depth.instrument_key}`,
          error
        );
      }
    }

    if (this.pendingWrites >= 1000) {
      await this.flushILP();
    }
  }

  /**
   * Manually flush ILP buffer to QuestDB
   */
  async flushILP(): Promise<void> {
    if (!this.sender || this.pendingWrites === 0) {
      return;
    }

    try {
      await this.sender.flush();
      this.logger.debug(`Flushed ${this.pendingWrites} writes to QuestDB`);
      this.pendingWrites = 0;
    } catch (error) {
      this.logger.error("Failed to flush ILP buffer", error);
      throw error;
    }
  }

  /**
   * Auto-flush with size check
   */
  private async autoFlush(): Promise<void> {
    if (this.pendingWrites > 0) {
      await this.flushILP();
    }
  }

  /**
   * Check if data exists for a specific time range
   */
  async checkDataExists(
    table:
      | "market_candles"
      | "market_quotes"
      | "option_greeks"
      | "market_depth",
    instrumentKey: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${table}
      WHERE instrument_key = $1
        AND timestamp >= $2
        AND timestamp < $3
      LIMIT 1
    `;

    const result = await this.query<{ count: number }>(sql, [
      instrumentKey,
      startTime.toISOString(),
      endTime.toISOString(),
    ]);

    return result.rows[0]?.count > 0;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query("SELECT 1");
      if (!this.sender) {
        throw new Error("ILP sender not connected");
      }
      return true;
    } catch (error) {
      this.logger.error("Health check failed", error);
      return false;
    }
  }

  async onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    if (this.sender) {
      try {
        await this.sender.flush();
        await this.sender.close();
        this.logger.log("ILP sender closed");
      } catch (error) {
        this.logger.error("Error closing ILP sender", error);
      }
    }

    await this.pool.end();
    this.logger.log("QuestDB connection pool closed");
  }
}
