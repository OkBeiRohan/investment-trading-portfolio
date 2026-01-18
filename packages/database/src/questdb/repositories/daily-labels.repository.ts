/**
 * Daily Labels Repository
 * Repository for training_labels_1d table
 * Uses SQL queries from @repo/schema/sql/daily-labels/
 */

import { Injectable, Logger } from "@nestjs/common";
import { Pool, QueryResultRow } from "pg";
import { loadSqlQueryCached } from "../utils/sql-loader";

export interface TrainingLabels1d {
    timestamp: Date;
    instrumentKey: string;

    // Regression Targets
    targetReturn1d: number;
    targetReturn5d: number;
    targetReturn20d: number;

    // Volatility Targets
    targetVolatility5d: number;
    targetVolatility20d: number;
    targetMaxDrawdown5d: number;

    // Classification Targets
    targetDirection1d: number;
    targetDirection5d: number;
    targetDirection20d: number;

    // Regime Labels
    regimeLabel: string;
    regimeConfidence: number;

    // Event Flags
    hadRegimeChange: boolean;
    hadCrash: boolean;
    hadRally: boolean;

    // Validity
    isValid: boolean;
    invalidReason?: string;
}

@Injectable()
export class DailyLabelsRepository {
    private readonly logger = new Logger(DailyLabelsRepository.name);

    constructor(private readonly pool: Pool) { }

    /**
     * Insert daily labels batch
     */
    async insertBatch(labels: TrainingLabels1d[]): Promise<void> {
        if (labels.length === 0) return;

        const sqlPrefix = loadSqlQueryCached("daily-labels/insert-batch-prefix");
        const values = labels.map((l) => {
            return `('${l.timestamp.toISOString()}', '${l.instrumentKey}',
        ${l.targetReturn1d}, ${l.targetReturn5d}, ${l.targetReturn20d},
        ${l.targetVolatility5d}, ${l.targetVolatility20d}, ${l.targetMaxDrawdown5d},
        ${l.targetDirection1d}, ${l.targetDirection5d}, ${l.targetDirection20d},
        '${l.regimeLabel}', ${l.regimeConfidence},
        ${l.hadRegimeChange}, ${l.hadCrash}, ${l.hadRally},
        ${l.isValid}, ${l.invalidReason ? `'${l.invalidReason}'` : "NULL"})`;
        }).join(",");

        const query = `${sqlPrefix}${values}`;
        await this.pool.query(query);
        this.logger.log(`Inserted ${labels.length} daily labels`);
    }

    /**
     * Get labels for time range
     */
    async findByTimeRange(
        instrumentKey: string,
        startTime: Date,
        endTime: Date,
        limit = 10000
    ): Promise<TrainingLabels1d[]> {
        const sql = loadSqlQueryCached("daily-labels/get-by-time-range");
        const result = await this.pool.query(sql, [
            instrumentKey,
            startTime.toISOString(),
            endTime.toISOString(),
            limit
        ]);

        return result.rows.map((row: QueryResultRow) => this.mapRow(row));
    }

    /**
     * Get for training with regime model
     */
    async getForTraining(
        instrumentKey: string,
        startYear: number,
        endYear: number
    ): Promise<TrainingLabels1d[]> {
        const sql = loadSqlQueryCached("daily-labels/get-for-training");
        const result = await this.pool.query(sql, [
            instrumentKey,
            `${startYear}-01-01T00:00:00Z`,
            `${endYear}-12-31T23:59:59Z`
        ]);

        return result.rows.map((row: QueryResultRow) => this.mapRow(row));
    }

    /**
     * Get regime change events
     */
    async getRegimeChanges(
        instrumentKey: string,
        startTime: Date,
        endTime: Date
    ): Promise<TrainingLabels1d[]> {
        const sql = loadSqlQueryCached("daily-labels/get-regime-changes");
        const result = await this.pool.query(sql, [
            instrumentKey,
            startTime.toISOString(),
            endTime.toISOString()
        ]);

        return result.rows.map((row: QueryResultRow) => this.mapRow(row));
    }

    private mapRow(row: QueryResultRow): TrainingLabels1d {
        return {
            timestamp: new Date(row.timestamp as string),
            instrumentKey: row.instrument_key as string,
            targetReturn1d: parseFloat(row.target_return_1d as string),
            targetReturn5d: parseFloat(row.target_return_5d as string),
            targetReturn20d: parseFloat(row.target_return_20d as string),
            targetVolatility5d: parseFloat(row.target_volatility_5d as string),
            targetVolatility20d: parseFloat(row.target_volatility_20d as string),
            targetMaxDrawdown5d: parseFloat(row.target_max_drawdown_5d as string),
            targetDirection1d: parseInt(row.target_direction_1d as string),
            targetDirection5d: parseInt(row.target_direction_5d as string),
            targetDirection20d: parseInt(row.target_direction_20d as string),
            regimeLabel: row.regime_label as string,
            regimeConfidence: parseFloat(row.regime_confidence as string),
            hadRegimeChange: row.had_regime_change as boolean,
            hadCrash: row.had_crash as boolean,
            hadRally: row.had_rally as boolean,
            isValid: row.is_valid as boolean,
            invalidReason: (row.invalid_reason as string) || undefined,
        };
    }
}
