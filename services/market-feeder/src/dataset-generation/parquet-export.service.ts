import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Database } from 'duckdb-async';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ParquetExportService {
  private readonly logger = new Logger(ParquetExportService.name);
  private db: Database;
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('Initializing DuckDB for Parquet Exports...');
    try {
      this.db = await Database.create(':memory:');
      
      // Install and load the postgres/parquet extensions
      await this.db.all("INSTALL postgres;");
      await this.db.all("LOAD postgres;");
      
      const host = this.configService.get<string>('DB_HOST', 'localhost');
      const port = this.configService.get<string>('DB_PG_PORT', '8812'); // QuestDB Postgres port
      const user = this.configService.get<string>('DB_USER', 'admin');
      const pass = this.configService.get<string>('DB_PASSWORD', 'quest');

      // Attach QuestDB to DuckDB
      const attachQuery = `
        ATTACH 'dbname=qdb user=${user} password=${pass} host=${host} port=${port}' 
        AS questdb (TYPE postgres);
      `;
      
      await this.db.all(attachQuery);
      this.isInitialized = true;
      this.logger.log('Successfully attached QuestDB to DuckDB via Postgres Scanner');
    } catch (err) {
      this.logger.error('Failed to initialize DuckDB Postgres attachment', err);
      // Fail silently, maybe run without Parquet capability
    }
  }

  /**
   * Export a specified time range joining features and labels into a `.parquet` file
   */
  async exportSplitToParquet(
    instrumentKey: string,
    trainOrTest: 'train' | 'test',
    fold: number,
    ranges: { start: string; end: string }[],
    outputDir: string
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error("DuckDB is not initialized. Cannot export parquet.");
    }

    if (ranges.length === 0) {
      this.logger.warn(`No ranges provided for ${trainOrTest} fold ${fold}`);
      return '';
    }

    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `${instrumentKey.replace(/[^a-zA-Z0-9]/g, '_')}_fold${fold}_${trainOrTest}.parquet`;
    const outputPath = path.join(outputDir, fileName);

    // Build the WHERE clause for ranges
    const rangeConditions = ranges.map(r => 
      `(f.timestamp >= '${r.start}' AND f.timestamp < '${r.end}')`
    ).join(' OR ');

    // The QuestDB tables we query
    const sql = `
      COPY (
        SELECT 
            f.timestamp,
            f.instrumentKey,
            f.pct_stocks_above_vwap,
            f.pct_stocks_above_ema20,
            f.fut_rsi_14,
            f.fut_macd,
            f.india_vix,
            f.is_expiry_day,
            f.minutes_from_open,
            f.minutes_to_close,
            -- Important target labels
            l.label_1m,
            l.label_5m,
            l.label_15m,
            l.label_30m
        FROM questdb.market_state_1m f
        JOIN questdb.training_labels_1m l 
          ON f.timestamp = l.timestamp 
          AND f.instrumentKey = l.instrumentKey
        WHERE f.instrumentKey = '${instrumentKey}'
          AND (${rangeConditions})
        ORDER BY f.timestamp ASC
      ) TO '${outputPath}' (FORMAT PARQUET);
    `;

    try {
      this.logger.log(`Exporting ${trainOrTest} fold ${fold} to ${outputPath} ...`);
      const start = process.hrtime.bigint();
      
      // Execute the COPY INTO operation natively using DuckDB
      await this.db.all(sql);
      
      const end = process.hrtime.bigint();
      this.logger.log(`Export completed in ${Number(end - start) / 1000000}ms`);
      
      return outputPath;
    } catch (error) {
      this.logger.error(`Failed to export Parquet for fold ${fold}`, error);
      throw error;
    }
  }
}
