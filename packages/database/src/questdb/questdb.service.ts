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
 * - Port 9000: ILP protocol (high-throughput writes)
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
import { Sender, SenderOptions } from "@questdb/nodejs-client";
import type {
  ICandleInsert,
  IQuoteInsert,
  IGreeksInsert,
  IDepthInsert,
} from "@repo/schema";
import { loadSqlQueryCached } from "./utils/sql-loader";

export interface QuestDBConfig {
  host: string;
  pgPort: number;
  ilpPort: number;
  user: string;
  password: string;
  database: string;
  poolSize?: number;
}

export interface DataGap {
  start: Date;
  end: Date;
  missingCount: number;
}

@Injectable()
export class QuestDBService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QuestDBService.name);
  private pool: Pool; // PostgreSQL wire protocol (queries)
  private sender: Sender | null = null; // ILP protocol (writes)
  private flushInterval: NodeJS.Timeout | null = null;
  private pendingWrites = 0;
  private readonly config: QuestDBConfig;

  constructor() {
    this.config = {
      host: process.env.QUESTDB_HOST || "localhost",
      pgPort: parseInt(process.env.QUESTDB_PG_PORT || "8812", 10),
      ilpPort: parseInt(process.env.QUESTDB_ILP_PORT || "9000", 10),
      user: process.env.QUESTDB_USER || "admin",
      password: process.env.QUESTDB_PASSWORD || "quest",
      database: "qdb",
      poolSize: parseInt(process.env.QUESTDB_POOL_SIZE || "20", 10),
    };

    // PostgreSQL wire protocol configuration (port 8812)
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.pgPort,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      max: this.config.poolSize,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.logger.log("QuestDB connection pool initialized");
  }

  async onModuleInit() {
    try {
      // Create sender options with configuration string
      // Format: protocol::addr=host:port;param1=value1;param2=value2
      let senderOptions = await SenderOptions.fromConfig(
        `tcp::addr=${this.config.host}:${this.config.ilpPort};auto_flush_rows=1000;auto_flush_interval=5000;init_buf_size=8192;max_buf_size=104857600;`
      );

      // Resolve protocol version automatically
      senderOptions = await SenderOptions.resolveAuto(senderOptions);

      // Create sender with resolved options
      this.sender = new Sender(senderOptions);

      await this.sender.connect();

      this.logger.log(
        `ILP sender connected to ${this.config.host}:${this.config.ilpPort}`
      );

      // Auto-flush interval (backup to auto_flush_interval config)
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
   * 7. Materialized views for auto-aggregation (reduce query-time computation)
   */
  private async createTables(): Promise<void> {
    const tables = [
      // Historical candles (OHLCV data) - Raw tick-level data
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

      // Market quotes (bid/ask snapshots) - High-frequency tick data
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

      // System audit log for distributed tracing
      // Expected: 100K events/day (all system actions with trace_id)
      `CREATE TABLE IF NOT EXISTS system_audit (
        timestamp TIMESTAMP,
        trace_id SYMBOL CAPACITY 100000 INDEX,
        service SYMBOL CAPACITY 20,
        level SYMBOL CAPACITY 10,
        action SYMBOL CAPACITY 100,
        user_id SYMBOL CAPACITY 1000,
        metadata STRING
      ) TIMESTAMP(timestamp) PARTITION BY DAY WAL;`,

      // ========== TRAINING DATA TABLES (For ML Pipeline) ==========

      // Unified tick data for ALL instruments (spot, futures, options, stocks)
      // Expected: ~10M ticks/day (50 stocks × 1 future × 50 options × ~4K ticks)
      `CREATE TABLE IF NOT EXISTS market_ticks (
        timestamp TIMESTAMP,
        instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
        instrument_type SYMBOL CAPACITY 10,
        index_name SYMBOL CAPACITY 20,
        strike_price DOUBLE,
        option_type SYMBOL CAPACITY 2,
        expiry_date TIMESTAMP,
        stock_symbol SYMBOL CAPACITY 1000,
        is_nifty50_constituent BOOLEAN,
        ltp DOUBLE,
        open DOUBLE,
        high DOUBLE,
        low DOUBLE,
        close DOUBLE,
        prev_close DOUBLE,
        volume LONG,
        open_interest LONG,
        bid DOUBLE,
        ask DOUBLE,
        bid_qty INT,
        ask_qty INT,
        upper_circuit DOUBLE,
        lower_circuit DOUBLE,
        exchange SYMBOL CAPACITY 5,
        trade_time TIMESTAMP
      ) TIMESTAMP(timestamp) PARTITION BY DAY WAL
      DEDUP UPSERT KEYS(timestamp, instrument_key);`,

      // 20-level order book depth for all instruments
      // Expected: ~50M rows/day (10K instruments × 40 levels × 120 updates/instrument)
      `CREATE TABLE IF NOT EXISTS market_depth_20 (
        timestamp TIMESTAMP,
        instrument_key SYMBOL CAPACITY 50000 NOCACHE INDEX,
        instrument_type SYMBOL CAPACITY 10,
        index_name SYMBOL CAPACITY 20,
        side SYMBOL CAPACITY 2,
        level BYTE,
        price DOUBLE,
        quantity INT,
        orders INT,
        exchange SYMBOL CAPACITY 5
      ) TIMESTAMP(timestamp) PARTITION BY DAY WAL
      DEDUP UPSERT KEYS(timestamp, instrument_key, side, level);`,

      // LightGBM training features (43 features)
      // Expected: ~375 rows/day (6.5 hours × 60 minutes)
      `CREATE TABLE IF NOT EXISTS training_features_lightgbm (
        timestamp TIMESTAMP,
        reference_instrument SYMBOL CAPACITY 100,
        index_name SYMBOL CAPACITY 20,
        nifty_spot_price DOUBLE,
        nifty_future_price DOUBLE,
        spot_future_basis DOUBLE,
        basis_pct DOUBLE,
        nifty_future_volume LONG,
        nifty_spot_volume LONG,
        nifty_spot_volatility_5m DOUBLE,
        nifty_spot_volatility_15m DOUBLE,
        nifty_spot_roc_5m DOUBLE,
        nifty_spot_momentum_15m DOUBLE,
        future_sma_9 DOUBLE,
        future_sma_21 DOUBLE,
        future_ema_9 DOUBLE,
        future_rsi_14 DOUBLE,
        future_atr_14 DOUBLE,
        future_macd DOUBLE,
        future_macd_signal DOUBLE,
        future_macd_histogram DOUBLE,
        atm_strike DOUBLE,
        atm_call_iv DOUBLE,
        atm_put_iv DOUBLE,
        atm_iv_skew DOUBLE,
        pcr_oi DOUBLE,
        pcr_volume DOUBLE,
        total_call_oi LONG,
        total_put_oi LONG,
        max_pain_strike DOUBLE,
        iv_rank DOUBLE,
        nifty50_advance_count INT,
        nifty50_decline_count INT,
        nifty50_unchanged_count INT,
        nifty50_advance_decline_ratio DOUBLE,
        nifty50_avg_return_1m DOUBLE,
        ofi_1s DOUBLE,
        ofi_5s DOUBLE,
        ofi_30s DOUBLE,
        bid_ask_spread_bps DOUBLE,
        depth_imbalance_top5 DOUBLE,
        hour INT,
        minute INT,
        seconds_since_market_open INT,
        seconds_to_market_close INT,
        is_first_hour BOOLEAN,
        feature_version STRING,
        computation_latency_ms INT
      ) TIMESTAMP(timestamp) PARTITION BY DAY WAL
      DEDUP UPSERT KEYS(timestamp, reference_instrument);`,

      // TFT time-series features (for regime detection)
      // Expected: ~75 rows/day (5-min snapshots)
      `CREATE TABLE IF NOT EXISTS training_features_tft (
        timestamp TIMESTAMP,
        reference_instrument SYMBOL CAPACITY 100,
        index_name SYMBOL CAPACITY 20,
        returns_5m STRING,
        returns_15m STRING,
        returns_1h STRING,
        volatility_5m STRING,
        volatility_15m STRING,
        volatility_1h STRING,
        volume_normalized STRING,
        advance_decline_ratio STRING,
        nifty50_momentum_distribution STRING,
        pcr_oi STRING,
        atm_iv STRING,
        iv_term_structure STRING,
        bid_ask_spread STRING,
        order_flow_imbalance STRING,
        current_regime STRING,
        vix_level DOUBLE,
        market_phase STRING,
        feature_version STRING,
        lookback_window INT
      ) TIMESTAMP(timestamp) PARTITION BY DAY WAL
      DEDUP UPSERT KEYS(timestamp, reference_instrument);`,

      // Training labels (supervised learning targets)
      // Expected: ~375 rows/day (matches feature frequency)
      `CREATE TABLE IF NOT EXISTS training_labels (
        timestamp TIMESTAMP,
        reference_instrument SYMBOL CAPACITY 100,
        index_name SYMBOL CAPACITY 20,
        target_return_1m DOUBLE,
        target_return_5m DOUBLE,
        target_return_15m DOUBLE,
        target_return_eod DOUBLE,
        target_volatility_5m DOUBLE,
        target_volatility_15m DOUBLE,
        target_direction_5m STRING,
        target_volatility_regime_5m STRING,
        regime_label STRING,
        regime_confidence DOUBLE,
        max_drawdown_5m DOUBLE,
        max_runup_5m DOUBLE,
        realized_volatility_5m DOUBLE,
        had_regime_change BOOLEAN,
        had_spike_event BOOLEAN,
        label_quality STRING,
        label_version STRING
      ) TIMESTAMP(timestamp) PARTITION BY DAY WAL
      DEDUP UPSERT KEYS(timestamp, reference_instrument);`,
    ];

    // Materialized Views for auto-aggregation (Blueprint requirement)
    const materializedViews = [
      // 1-minute candles (auto-aggregated from market_quotes)
      // Reduces query-time computation for dashboard charts
      `CREATE MATERIALIZED VIEW IF NOT EXISTS market_candles_1m AS
      SELECT
        timestamp,
        instrument_key,
        '1m' as interval,
        first(ltp) as open,
        max(ltp) as high,
        min(ltp) as low,
        last(ltp) as close,
        sum(volume) as volume,
        last(open_interest) as open_interest
      FROM market_quotes
      SAMPLE BY 1m
      ALIGN TO CALENDAR;`,

      // 30-minute candles (auto-aggregated from 1m candles)
      // For longer-term analysis and backtesting
      `CREATE MATERIALIZED VIEW IF NOT EXISTS market_candles_30m AS
      SELECT
        timestamp,
        instrument_key,
        '30m' as interval,
        first(open) as open,
        max(high) as high,
        min(low) as low,
        last(close) as close,
        sum(volume) as volume,
        last(open_interest) as open_interest
      FROM market_candles
      WHERE interval = '1m'
      SAMPLE BY 30m
      ALIGN TO CALENDAR;`,
    ];

    // Create base tables
    for (const sql of tables) {
      try {
        await this.query(sql);
        const tableName = sql.match(/TABLE IF NOT EXISTS (\w+)/)?.[1];
        this.logger.log(`Table created/verified: ${tableName}`);
      } catch (error) {
        this.logger.error(`Failed to create table: ${sql}`, error);
      }
    }

    // Create materialized views (after base tables exist)
    for (const sql of materializedViews) {
      try {
        await this.query(sql);
        const viewName = sql.match(/VIEW IF NOT EXISTS (\w+)/)?.[1];
        this.logger.log(`Materialized view created/verified: ${viewName}`);
      } catch (error) {
        this.logger.warn(`Failed to create materialized view: ${sql}`, error);
        // Non-fatal: views may already exist or require base data
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
   * Get ILP sender instance (for direct writes in repositories)
   */
  getSender(): Sender | null {
    return this.sender;
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

    // Auto-flush if buffer is large
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
    // Load SQL from @repo/schema (shared with Python training pipeline)
    let sql = loadSqlQueryCached("utils/check-data-exists");

    // Substitute table name (safe - table name is from enum, not user input)
    sql = sql.replace("{TABLE_NAME}", table);

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

  /**
   * Write audit log entry (distributed tracing)
   *
   * @param traceId Unique trace ID for request correlation
   * @param service Service name (e.g., 'market-feeder', 'trading-engine')
   * @param level Log level ('INFO', 'WARN', 'ERROR', 'FATAL')
   * @param action Action performed (e.g., 'FETCH_INIT', 'ORDER_SENT', 'MODEL_LOAD')
   * @param metadata Additional context (JSON string or object)
   * Write to system_audit table with trace_id
   *
   * @param params Audit log parameters with trace_id, span_id, service metadata
   */
  async writeAuditLog(params: {
    trace_id: string;
    span_id?: string;
    service_name: string;
    layer_name?: string;
    operation_name: string;
    status: "success" | "error";
    error_message?: string | null;
    metadata?: string;
    timestamp: number;
  }): Promise<void> {
    if (!this.sender) {
      throw new Error("ILP sender not initialized");
    }

    try {
      this.sender
        .table("system_audit")
        .symbol("trace_id", params.trace_id)
        .symbol("span_id", params.span_id || "")
        .symbol("service_name", params.service_name)
        .symbol("layer_name", params.layer_name || "")
        .symbol("operation_name", params.operation_name)
        .symbol("status", params.status)
        .stringColumn("error_message", params.error_message || "")
        .stringColumn("metadata", params.metadata || "{}")
        .timestampColumn("timestamp", params.timestamp * 1_000_000); // Convert ms to microseconds

      this.pendingWrites++;

      // Flush immediately for errors (durability)
      if (params.status === "error") {
        await this.flushILP();
      }
    } catch (error) {
      this.logger.error(
        `Failed to write audit log: ${params.operation_name}`,
        error
      );
    }
  }

  /**
   * Get last known timestamp for an instrument (LATEST ON query)
   * Critical for gap detection and smart backfill
   *
   * @param table Table to query
   * @param instrumentKey Instrument to check
   * @returns Last recorded timestamp or null if no data
   */
  async getLastTimestamp(
    table: "market_candles" | "market_quotes" | "option_greeks",
    instrumentKey: string
  ): Promise<Date | null> {
    // Load SQL from @repo/schema (shared with Python training pipeline)
    let sql = loadSqlQueryCached("utils/get-last-timestamp");

    // Substitute table name (safe - table name is from enum, not user input)
    sql = sql.replace("{TABLE_NAME}", table);

    const result = await this.query<{ timestamp: string }>(sql, [
      instrumentKey,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return new Date(result.rows[0].timestamp);
  }

  /**
   * Get all instruments with their last timestamps (bulk gap detection)
   * Efficiently identifies which instruments need data refresh
   *
   * @param table Table to query
   * @param minTimestamp Only return instruments with data after this time
   * @returns Map of instrument_key -> last timestamp
   */
  async getAllLastTimestamps(
    table: "market_candles" | "market_quotes",
    minTimestamp?: Date
  ): Promise<Map<string, Date>> {
    // Load SQL from @repo/schema (shared with Python training pipeline)
    let sql = loadSqlQueryCached("utils/get-all-last-timestamps");

    // Substitute table name (safe - table name is from enum, not user input)
    sql = sql.replace("{TABLE_NAME}", table);

    // Add optional filter (dynamic SQL for performance)
    if (minTimestamp) {
      sql = sql.replace(
        "LATEST ON timestamp PARTITION BY instrument_key;",
        `LATEST ON timestamp PARTITION BY instrument_key\nWHERE timestamp > '${minTimestamp.toISOString()}';`
      );
    }

    const result = await this.query<{
      instrument_key: string;
      timestamp: string;
    }>(sql);

    const map = new Map<string, Date>();
    for (const row of result.rows) {
      map.set(row.instrument_key, new Date(row.timestamp));
    }

    return map;
  }

  /**
   * Query audit logs by trace ID (full request lifecycle)
   *
   * @param traceId Trace ID to search for
   * @returns All audit log entries for this trace
   */
  async getAuditLogsByTraceId(traceId: string): Promise<any[]> {
    // Load SQL from @repo/schema (shared with Python training pipeline)
    const sql = loadSqlQueryCached("utils/get-audit-logs-by-trace-id");

    const result = await this.query(sql, [traceId]);
    return result.rows;
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
