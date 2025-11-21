/**
 * QuestDB Service
 * PostgreSQL wire protocol client for QuestDB time-series database
 * Port 8812 - PostgreSQL wire protocol
 * Port 9000 - REST API
 * Port 9009 - InfluxDB line protocol
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool, PoolClient, QueryResult } from "pg";

export interface QuestDBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number; // Max pool size
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface TickData {
  symbol: string;
  timestamp: Date;
  price: number;
  volume: number;
  bid?: number;
  ask?: number;
  ltp: number;
}

export interface CandleData {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  interval: "1m" | "5m" | "15m" | "1h" | "1d";
}

export interface FeatureData {
  timestamp: Date;
  symbol: string;
  features: Record<string, number>;
  metadata?: Record<string, any>;
}

@Injectable()
export class QuestDBService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QuestDBService.name);
  private pool: Pool;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Initialize QuestDB connection pool
   */
  private async connect(): Promise<void> {
    try {
      const config: QuestDBConfig = {
        host: this.configService.get<string>("questdb.host", "localhost"),
        port: this.configService.get<number>("questdb.port", 8812),
        database: this.configService.get<string>("questdb.database", "qdb"),
        user: this.configService.get<string>("questdb.user", "admin"),
        password: this.configService.get<string>("questdb.password", "quest"),
        max: this.configService.get<number>("questdb.poolSize", 20),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };

      this.pool = new Pool(config);

      // Test connection
      const client = await this.pool.connect();
      const result = await client.query("SELECT 1 as test");
      client.release();

      this.isConnected = true;
      this.logger.log(`QuestDB connected: ${config.host}:${config.port}`);
    } catch (error) {
      this.logger.error("Failed to connect to QuestDB", error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from QuestDB
   */
  private async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      this.logger.log("QuestDB disconnected");
    }
  }

  /**
   * Check if QuestDB is connected
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const client = await this.pool.connect();
      await client.query("SELECT 1");
      client.release();
      return true;
    } catch (error) {
      this.logger.error("QuestDB health check failed", error);
      return false;
    }
  }

  /**
   * Execute raw SQL query
   */
  async query<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<QueryResult<T>> {
    const client = await this.pool.connect();
    try {
      return await client.query<T>(sql, params);
    } finally {
      client.release();
    }
  }

  /**
   * Get a pool client for transactions
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  // ============================================================================
  // TICK DATA METHODS
  // ============================================================================

  /**
   * Insert tick data (market quote)
   */
  async insertTick(tick: TickData): Promise<void> {
    const sql = `
      INSERT INTO ticks (symbol, timestamp, price, volume, bid, ask, ltp)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await this.query(sql, [
      tick.symbol,
      tick.timestamp,
      tick.price,
      tick.volume,
      tick.bid || null,
      tick.ask || null,
      tick.ltp,
    ]);
  }

  /**
   * Bulk insert ticks for high-frequency data
   */
  async insertTicksBatch(ticks: TickData[]): Promise<void> {
    if (ticks.length === 0) return;

    const client = await this.getClient();
    try {
      await client.query("BEGIN");

      const sql = `
        INSERT INTO ticks (symbol, timestamp, price, volume, bid, ask, ltp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      for (const tick of ticks) {
        await client.query(sql, [
          tick.symbol,
          tick.timestamp,
          tick.price,
          tick.volume,
          tick.bid || null,
          tick.ask || null,
          tick.ltp,
        ]);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Failed to insert ticks batch", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Query recent ticks
   */
  async getRecentTicks(symbol: string, limit = 100): Promise<TickData[]> {
    const sql = `
      SELECT symbol, timestamp, price, volume, bid, ask, ltp
      FROM ticks
      WHERE symbol = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;

    const result = await this.query<TickData>(sql, [symbol, limit]);
    return result.rows;
  }

  // ============================================================================
  // CANDLE DATA METHODS
  // ============================================================================

  /**
   * Insert candle data (OHLCV)
   */
  async insertCandle(candle: CandleData): Promise<void> {
    const tableName = `candles_${candle.interval}`;

    const sql = `
      INSERT INTO ${tableName} (symbol, timestamp, open, high, low, close, volume)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await this.query(sql, [
      candle.symbol,
      candle.timestamp,
      candle.open,
      candle.high,
      candle.low,
      candle.close,
      candle.volume,
    ]);
  }

  /**
   * Bulk insert candles
   */
  async insertCandlesBatch(candles: CandleData[]): Promise<void> {
    if (candles.length === 0) return;

    // Group by interval
    const grouped = candles.reduce(
      (acc, candle) => {
        if (!acc[candle.interval]) acc[candle.interval] = [];
        acc[candle.interval].push(candle);
        return acc;
      },
      {} as Record<string, CandleData[]>
    );

    const client = await this.getClient();
    try {
      await client.query("BEGIN");

      for (const [interval, candleGroup] of Object.entries(grouped)) {
        const tableName = `candles_${interval}`;
        const sql = `
          INSERT INTO ${tableName} (symbol, timestamp, open, high, low, close, volume)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        for (const candle of candleGroup) {
          await client.query(sql, [
            candle.symbol,
            candle.timestamp,
            candle.open,
            candle.high,
            candle.low,
            candle.close,
            candle.volume,
          ]);
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Failed to insert candles batch", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Query candles for a time range
   */
  async getCandles(
    symbol: string,
    interval: CandleData["interval"],
    startTime: Date,
    endTime: Date
  ): Promise<CandleData[]> {
    const tableName = `candles_${interval}`;

    const sql = `
      SELECT symbol, timestamp, open, high, low, close, volume
      FROM ${tableName}
      WHERE symbol = $1
        AND timestamp >= $2
        AND timestamp <= $3
      ORDER BY timestamp ASC
    `;

    const result = await this.query<CandleData>(sql, [
      symbol,
      startTime,
      endTime,
    ]);
    return result.rows.map((row) => ({ ...row, interval }));
  }

  // ============================================================================
  // FEATURE DATA METHODS
  // ============================================================================

  /**
   * Insert feature snapshot
   */
  async insertFeature(feature: FeatureData): Promise<void> {
    const sql = `
      INSERT INTO features (timestamp, symbol, features, metadata)
      VALUES ($1, $2, $3, $4)
    `;

    await this.query(sql, [
      feature.timestamp,
      feature.symbol,
      JSON.stringify(feature.features),
      feature.metadata ? JSON.stringify(feature.metadata) : null,
    ]);
  }

  /**
   * Bulk insert features
   */
  async insertFeaturesBatch(features: FeatureData[]): Promise<void> {
    if (features.length === 0) return;

    const client = await this.getClient();
    try {
      await client.query("BEGIN");

      const sql = `
        INSERT INTO features (timestamp, symbol, features, metadata)
        VALUES ($1, $2, $3, $4)
      `;

      for (const feature of features) {
        await client.query(sql, [
          feature.timestamp,
          feature.symbol,
          JSON.stringify(feature.features),
          feature.metadata ? JSON.stringify(feature.metadata) : null,
        ]);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Failed to insert features batch", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Query recent features
   */
  async getRecentFeatures(symbol: string, limit = 100): Promise<FeatureData[]> {
    const sql = `
      SELECT timestamp, symbol, features, metadata
      FROM features
      WHERE symbol = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;

    const result = await this.query<any>(sql, [symbol, limit]);
    return result.rows.map((row) => ({
      timestamp: row.timestamp,
      symbol: row.symbol,
      features:
        typeof row.features === "string"
          ? JSON.parse(row.features)
          : row.features,
      metadata: row.metadata
        ? typeof row.metadata === "string"
          ? JSON.parse(row.metadata)
          : row.metadata
        : undefined,
    }));
  }

  // ============================================================================
  // TABLE MANAGEMENT
  // ============================================================================

  /**
   * Create tables if they don't exist
   */
  async createTables(): Promise<void> {
    const tables = [
      // Ticks table
      `
      CREATE TABLE IF NOT EXISTS ticks (
        symbol SYMBOL CAPACITY 256 CACHE,
        timestamp TIMESTAMP,
        price DOUBLE,
        volume LONG,
        bid DOUBLE,
        ask DOUBLE,
        ltp DOUBLE
      ) TIMESTAMP(timestamp) PARTITION BY DAY WAL;
      `,

      // Candles tables for different intervals
      `
      CREATE TABLE IF NOT EXISTS candles_1m (
        symbol SYMBOL CAPACITY 256 CACHE,
        timestamp TIMESTAMP,
        open DOUBLE,
        high DOUBLE,
        low DOUBLE,
        close DOUBLE,
        volume LONG
      ) TIMESTAMP(timestamp) PARTITION BY DAY WAL;
      `,
      `
      CREATE TABLE IF NOT EXISTS candles_5m (
        symbol SYMBOL CAPACITY 256 CACHE,
        timestamp TIMESTAMP,
        open DOUBLE,
        high DOUBLE,
        low DOUBLE,
        close DOUBLE,
        volume LONG
      ) TIMESTAMP(timestamp) PARTITION BY DAY WAL;
      `,
      `
      CREATE TABLE IF NOT EXISTS candles_15m (
        symbol SYMBOL CAPACITY 256 CACHE,
        timestamp TIMESTAMP,
        open DOUBLE,
        high DOUBLE,
        low DOUBLE,
        close DOUBLE,
        volume LONG
      ) TIMESTAMP(timestamp) PARTITION BY DAY WAL;
      `,
      `
      CREATE TABLE IF NOT EXISTS candles_1h (
        symbol SYMBOL CAPACITY 256 CACHE,
        timestamp TIMESTAMP,
        open DOUBLE,
        high DOUBLE,
        low DOUBLE,
        close DOUBLE,
        volume LONG
      ) TIMESTAMP(timestamp) PARTITION BY HOUR WAL;
      `,
      `
      CREATE TABLE IF NOT EXISTS candles_1d (
        symbol SYMBOL CAPACITY 256 CACHE,
        timestamp TIMESTAMP,
        open DOUBLE,
        high DOUBLE,
        low DOUBLE,
        close DOUBLE,
        volume LONG
      ) TIMESTAMP(timestamp) PARTITION BY MONTH WAL;
      `,

      // Features table
      `
      CREATE TABLE IF NOT EXISTS features (
        timestamp TIMESTAMP,
        symbol SYMBOL CAPACITY 256 CACHE,
        features STRING,
        metadata STRING
      ) TIMESTAMP(timestamp) PARTITION BY DAY WAL;
      `,
    ];

    const client = await this.getClient();
    try {
      for (const tableSQL of tables) {
        await client.query(tableSQL);
      }
      this.logger.log("QuestDB tables created/verified");
    } catch (error) {
      this.logger.error("Failed to create QuestDB tables", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Drop all tables (use with caution!)
   */
  async dropTables(): Promise<void> {
    const tables = [
      "ticks",
      "candles_1m",
      "candles_5m",
      "candles_15m",
      "candles_1h",
      "candles_1d",
      "features",
    ];

    const client = await this.getClient();
    try {
      for (const table of tables) {
        await client.query(`DROP TABLE IF EXISTS ${table}`);
      }
      this.logger.warn("QuestDB tables dropped");
    } catch (error) {
      this.logger.error("Failed to drop QuestDB tables", error);
      throw error;
    } finally {
      client.release();
    }
  }
}
