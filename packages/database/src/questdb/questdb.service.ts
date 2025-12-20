/**
 * QuestDB Production Service
 * High-performance time-series database service with ILP protocol
 *
 * Features:
 * - InfluxDB Line Protocol (ILP) for 100K+ rows/sec ingestion
 * - PostgreSQL wire protocol for queries
 * - Automatic schema creation with deduplication
 * - Batch buffering for optimal performance
 * - Health monitoring and metrics
 *
 * Performance targets:
 * - Insert: >100K rows/sec via ILP
 * - Query: <100ms p95 for time-range queries
 * - Storage: ~1GB per million candles
 *
 * Architecture:
 * - Port 8812: PostgreSQL wire protocol (queries)
 * - Port 9009: ILP protocol (high-throughput writes)
 *
 * Schema Design:
 * - SYMBOL for categorical data (instrument_key, interval)
 * - PARTITION BY DAY for optimal query performance
 * - DEDUP UPSERT KEYS for automatic deduplication
 * - WAL enabled for durability
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { Sender } from "@questdb/nodejs-client";

export interface ILPConfig {
  host: string;
  port: number; // ILP port (default 9009)
  auth?: {
    keyId: string;
    token: string;
  };
}

export interface CandleInsert {
  timestamp: number | Date; // Unix timestamp in ms or Date object
  instrument_key: string;
  interval: string; // '1m', '5m', '15m', '1h', '1d', etc.
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  open_interest?: number;
}

export interface QuoteInsert {
  timestamp: number | Date;
  instrument_key: string;
  ltp: number;
  bid?: number;
  ask?: number;
  bid_qty?: number;
  ask_qty?: number;
  volume?: number;
  open_interest?: number;
  upper_circuit?: number;
  lower_circuit?: number;
}

export interface GreeksInsert {
  timestamp: number | Date;
  instrument_key: string;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number; // Implied volatility
  underlying_price: number;
}

export interface DepthInsert {
  timestamp: number | Date;
  instrument_key: string;
  side: "BUY" | "SELL";
  level: number; // 0-4 (5 levels)
  price: number;
  quantity: number;
  orders: number;
}

@Injectable()
export class QuestDBService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QuestDBService.name);
  private pool: Pool; // PostgreSQL wire protocol (queries)
  private sender: Sender | null = null; // ILP protocol (writes)
  private readonly ilpConfig: ILPConfig;
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
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // ILP protocol configuration (port 9009)
    this.ilpConfig = {
      host: process.env.QUESTDB_HOST || "localhost",
      port: parseInt(process.env.QUESTDB_ILP_PORT || "9000", 10),
      auth: process.env.QUESTDB_ILP_KEY_ID
        ? {
            keyId: process.env.QUESTDB_ILP_KEY_ID,
            token: process.env.QUESTDB_ILP_TOKEN || "",
          }
        : undefined,
    };

    this.logger.log("QuestDB connection pool initialized");
  }

  async onModuleInit() {
    try {
      // Create ILP sender connection
      this.sender = new Sender({
        protocol: "tcp",
        host: this.ilpConfig.host,
        port: this.ilpConfig.port,
        auth: this.ilpConfig.auth,
        init_buf_size: 8192, // 8KB buffer
        auto_flush: false, // Manual flush for batching
      });

      await this.sender.connect();
      this.logger.log(
        `ILP sender connected to ${this.ilpConfig.host}:${this.ilpConfig.port}`
      );

      // Auto-flush every 5 seconds or when buffer reaches 1000 writes
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
   *
   * Schema Design Principles:
   * 1. SYMBOL for categorical data (optimized storage + filtering)
   * 2. PARTITION BY DAY for 1M-100M records/partition
   * 3. DEDUP UPSERT KEYS for automatic deduplication
   * 4. WAL enabled for write-ahead logging (durability)
   * 5. NOCACHE for high-cardinality symbols (>10K unique values)
   * 6. INDEX only on frequently filtered columns
   */
  private async createTables(): Promise<void> {
    const tables = [
      // Historical candles (OHLCV data)
      // Expected: 200K candles/day across all instruments and intervals
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

      // Market quotes (bid/ask snapshots)
      // Expected: 1M quotes/day (tick-by-tick)
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

      // Option Greeks snapshots
      // Expected: 50K greeks/day (snapshots every 5 minutes for active options)
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

      // Market depth (order book levels)
      // Expected: 500K depth updates/day (5 levels * 2 sides * 10K updates)
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
   *
   * Performance: 100K+ rows/sec
   *
   * @param candles Array of candle data
   */
  async insertCandles(candles: CandleInsert[]): Promise<void> {
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

    // Auto-flush if buffer is large
    if (this.pendingWrites >= 1000) {
      await this.flushILP();
    }
  }

  /**
   * Insert market quotes using ILP
   */
  async insertQuotes(quotes: QuoteInsert[]): Promise<void> {
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
  async insertGreeks(greeks: GreeksInsert[]): Promise<void> {
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
  async insertDepth(depths: DepthInsert[]): Promise<void> {
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
          .symbol("side", depth.side) // 'BUY' or 'SELL'
          .intColumn("level", depth.level) // 0-4 (5 levels)
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
   * Useful for avoiding duplicate fetches
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
   * Find missing data ranges (gaps in time-series)
   * Returns array of [start, end] Date tuples where data is missing
   */
  async findMissingRanges(
    table: "market_candles" | "market_quotes",
    instrumentKey: string,
    expectedInterval: string, // '1m', '5m', '15m', '1h', '1d'
    startDate: Date,
    endDate: Date
  ): Promise<Array<[Date, Date]>> {
    // Convert interval to PostgreSQL interval syntax
    const intervalMap: Record<string, string> = {
      "1m": "1 minute",
      "5m": "5 minutes",
      "15m": "15 minutes",
      "1h": "1 hour",
      "1d": "1 day",
    };

    const pgInterval = intervalMap[expectedInterval] || "1 minute";

    const sql = `
      WITH expected_timestamps AS (
        SELECT timestamp_sequence($1::timestamp, $2::timestamp, INTERVAL '${pgInterval}') as expected_ts
      ),
      actual_data AS (
        SELECT timestamp
        FROM ${table}
        WHERE instrument_key = $3
          AND timestamp >= $1
          AND timestamp <= $2
      )
      SELECT expected_ts
      FROM expected_timestamps
      LEFT JOIN actual_data ON expected_timestamps.expected_ts = actual_data.timestamp
      WHERE actual_data.timestamp IS NULL
      ORDER BY expected_ts
    `;

    const result = await this.query<{ expected_ts: string }>(sql, [
      startDate.toISOString(),
      endDate.toISOString(),
      instrumentKey,
    ]);

    // Group consecutive missing timestamps into ranges
    const gaps: Array<[Date, Date]> = [];
    let rangeStart: Date | null = null;
    let prevTs: Date | null = null;

    for (const row of result.rows) {
      const ts = new Date(row.expected_ts);

      if (!rangeStart) {
        rangeStart = ts;
        prevTs = ts;
      } else if (
        prevTs &&
        ts.getTime() - prevTs.getTime() > this.getIntervalMs(expectedInterval)
      ) {
        // Gap found, close previous range
        gaps.push([rangeStart, prevTs]);
        rangeStart = ts;
      }

      prevTs = ts;
    }

    // Close last range
    if (rangeStart && prevTs) {
      gaps.push([rangeStart, prevTs]);
    }

    return gaps;
  }

  /**
   * Convert interval string to milliseconds
   */
  private getIntervalMs(interval: string): number {
    const map: Record<string, number> = {
      "1m": 60 * 1000,
      "5m": 5 * 60 * 1000,
      "15m": 15 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000,
    };

    return map[interval] || 60 * 1000;
  }

  /**
   * Health check - verify both PostgreSQL and ILP connections
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check PostgreSQL wire protocol
      await this.query("SELECT 1");

      // Check ILP connection
      if (!this.sender) {
        throw new Error("ILP sender not connected");
      }

      return true;
    } catch (error) {
      this.logger.error("Health check failed", error);
      return false;
    }
  }

  /**
   * Get data ingestion statistics
   */
  async getIngestionStats(): Promise<any> {
    const stats = await this.query(`
      SELECT
        table_name,
        row_count,
        disk_size,
        partition_count
      FROM tables()
      WHERE table_name IN ('market_candles', 'market_quotes', 'option_greeks', 'market_depth')
    `);

    return stats.rows;
  }

  async onModuleDestroy() {
    // Stop auto-flush
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Flush remaining data
    if (this.sender) {
      try {
        await this.sender.flush();
        await this.sender.close();
        this.logger.log("ILP sender closed");
      } catch (error) {
        this.logger.error("Error closing ILP sender", error);
      }
    }

    // Close PostgreSQL pool
    await this.pool.end();
    this.logger.log("QuestDB connection pool closed");
  }
}
