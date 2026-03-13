/**
 * QuestDB Service v2.1
 * Production-grade time-series database service
 *
 * Features:
 * - PostgreSQL wire protocol for queries
 * - Auto-creates tables from SQL files (117-feature architecture)
 * - Connection pooling with health monitoring
 *
 * Architecture:
 * - Port 8812: PostgreSQL wire protocol
 * - Schema: packages/schema/sql/schema/create_*.sql
 *
 * v2.1 Changes (Jan 2026):
 * - Added tick_data table (depth-30 for live trading)
 * - Added instrument_features_1d (daily features for regime model)
 * - Added training_labels_1d (daily labels for 26-year training)
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { loadSqlQuery } from "./utils/sql-loader";

export interface QuestDBConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  poolSize?: number;
}

@Injectable()
export class QuestDBService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QuestDBService.name);
  private pool: Pool;
  private readonly config: QuestDBConfig;

  constructor() {
    this.config = {
      host: process.env.QUESTDB_HOST || "localhost",
      port: parseInt(process.env.QUESTDB_PG_PORT || "8812", 10),
      user: process.env.QUESTDB_USER || "admin",
      password: process.env.QUESTDB_PASSWORD || "quest",
      database: "qdb",
      poolSize: parseInt(process.env.QUESTDB_POOL_SIZE || "20", 10),
    };

    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
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
      // Test connection
      await this.pool.query("SELECT 1 as test");
      this.logger.log(
        `Connected to QuestDB at ${this.config.host}:${this.config.port}`,
      );

      // Create tables from SQL files
      await this.createTables();
    } catch (error) {
      this.logger.error("Failed to initialize QuestDB", error);
      throw error;
    }
  }

  /**
   * Create all tables from SQL files using sql-loader
   * Order matters: create dependencies first
   *
   * v3.0 Schema - Unified Schema
   * 9 tables: instrument_master, market_candles, orderbook_l2_snapshots,
   *           tick_data, option_chain_snapshot, instrument_features,
   *           training_labels, macro_sentiment, dataset_folds
   */
  private async createTables(): Promise<void> {
    this.logger.log("Creating QuestDB v3.0 tables from schema files...");

    // Core tables (no dependencies)
    await this.createTable(
      "instrument_master",
      "schema/create_instrument_master",
    );

    // Market data tables (depend on instrument_master)
    await this.createTable("tick_data", "schema/create_tick_data");
    await this.createTable("market_candles", "schema/create_market_candles");
    await this.createTable(
      "orderbook_l2_snapshots",
      "schema/create_orderbook_l2_snapshots",
    );

    // Option tables
    await this.createTable(
      "option_chain_snapshot",
      "schema/create_option_chain_snapshot",
    );

    // Feature and label tables (unified with interval fields)
    await this.createTable(
      "instrument_features",
      "schema/create_instrument_features",
    );
    await this.createTable("training_labels", "schema/create_training_labels");

    // Supplementary tables
    await this.createTable(
      "macro_sentiment",
      "schema/create_macro_sentiment",
    );
    await this.createTable("dataset_folds", "schema/07_dataset_folds_v3");

    this.logger.log("✓ All v3.0 tables created successfully (9 tables)");
  }

  /**
   * Create a single table using sql-loader
   */
  private async createTable(tableName: string, sqlPath: string): Promise<void> {
    try {
      const sql = loadSqlQuery(sqlPath);
      await this.pool.query(sql);
      this.logger.log(`✓ Created table: ${tableName}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Ignore "table already exists" errors
      if (
        errorMsg.includes("already exists") ||
        errorMsg.includes("Duplicate")
      ) {
        this.logger.debug(`Table ${tableName} already exists (skipped)`);
      } else {
        this.logger.error(`✗ Failed to create table ${tableName}: ${errorMsg}`);
        throw error; // Fail fast on real errors
      }
    }
  }

  /**
   * Execute a raw SQL query
   */
  async query<T = any>(
    sql: string,
    params: any[] = [],
  ): Promise<{ rows: T[]; rowCount: number }> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0,
      };
    } catch (error) {
      this.logger.error("Query failed", {
        message: error instanceof Error ? error.message : String(error),
        sql: sql.substring(0, 200),
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute query within a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
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
   * Get connection pool (for direct injection into repositories)
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log("QuestDB connection pool closed");
  }
}
