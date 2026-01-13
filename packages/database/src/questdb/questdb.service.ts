/**
 * QuestDB Service v2.0
 * Production-grade time-series database service
 *
 * Features:
 * - PostgreSQL wire protocol for queries
 * - Auto-creates tables from SQL files
 * - Connection pooling with health monitoring
 *
 * Architecture:
 * - Port 8812: PostgreSQL wire protocol
 * - Schema: packages/schema/sql/schema/create_*.sql
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

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
        `Connected to QuestDB at ${this.config.host}:${this.config.port}`
      );

      // Create tables from SQL files
      await this.createTables();
    } catch (error) {
      this.logger.error("Failed to initialize QuestDB", error);
      throw error;
    }
  }

  /**
   * Create all tables from SQL files
   */
  private async createTables(): Promise<void> {
    let schemaPath: string;

    // Try multiple resolution strategies
    try {
      // Strategy 1: Resolve from built package
      const schemaPackagePath = require.resolve("@repo/schema/package.json");
      schemaPath = join(schemaPackagePath, "..", "sql", "schema");
      this.logger.debug(`Using @repo/schema package: ${schemaPath}`);
    } catch {
      // Strategy 2: Traverse up from __dirname to find monorepo root
      let currentDir = __dirname;
      let monorepoRoot: string | null = null;

      // Go up max 10 levels to find package.json with workspaces
      for (let i = 0; i < 10; i++) {
        const parentDir = join(currentDir, "..");
        try {
          const pkgPath = join(parentDir, "package.json");
          const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
          if (pkg.workspaces || pkg.name === "investment-trading-portfolio") {
            monorepoRoot = parentDir;
            break;
          }
        } catch {
          // Continue searching
        }
        currentDir = parentDir;
      }

      if (monorepoRoot) {
        schemaPath = join(monorepoRoot, "packages", "schema", "sql", "schema");
        this.logger.debug(`Using monorepo root: ${schemaPath}`);
      } else {
        // Strategy 3: Hardcoded fallback (development only)
        schemaPath = join(
          __dirname,
          "..",
          "..",
          "..",
          "..",
          "..",
          "packages",
          "schema",
          "sql",
          "schema"
        );
        this.logger.warn(`Using hardcoded fallback: ${schemaPath}`);
      }
    }

    await this.executeTableCreation(schemaPath);
  }

  private async executeTableCreation(schemaPath: string): Promise<void> {
    const tableFiles = [
      "create_instrument_master.sql",
      "create_market_candles.sql",
      "create_orderbook_l2_snapshots.sql",
      "create_instrument_features_1m.sql",
      "create_option_chain_snapshot.sql",
      "create_market_state_1m.sql",
      "create_training_labels_1m.sql",
      "create_system_audit.sql",
    ];

    this.logger.log(`Creating ${tableFiles.length} tables from SQL files...`);
    this.logger.log(`Schema path: ${schemaPath}`);

    for (const file of tableFiles) {
      try {
        const filePath = join(schemaPath, file);
        const sql = readFileSync(filePath, "utf-8");
        await this.pool.query(sql);
        this.logger.log(
          `✓ Created table: ${file.replace("create_", "").replace(".sql", "")}`
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`✗ Failed to create table from ${file}: ${errorMsg}`);
        // Continue with other tables
      }
    }

    this.logger.log("Table creation completed");
  }

  /**
   * Execute a raw SQL query
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
