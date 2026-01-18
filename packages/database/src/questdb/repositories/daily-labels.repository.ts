/**
 * Daily Labels Repository
 * Repository for training_labels_1d table
 * Used for 26-year regime model training (2000-2026)
 */

import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";

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
    targetDirection1d: number;   // -1, 0, 1
    targetDirection5d: number;
    targetDirection20d: number;

    // Regime Labels
    regimeLabel: string;         // 'BULL', 'BEAR', 'RANGING', 'VOLATILE'
    regimeConfidence: number;

    // Event Flags
    hadRegimeChange: boolean;
    hadCrash: boolean;           // >5% single day drop
    hadRally: boolean;           // >5% single day gain

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

        const columns = [
            "timestamp", "instrument_key",
            "target_return_1d", "target_return_5d", "target_return_20d",
            "target_volatility_5d", "target_volatility_20d", "target_max_drawdown_5d",
            "target_direction_1d", "target_direction_5d", "target_direction_20d",
            "regime_label", "regime_confidence",
            "had_regime_change", "had_crash", "had_rally",
            "is_valid", "invalid_reason"
        ].join(", ");

        const values = labels.map((l) => {
            return `('${l.timestamp.toISOString()}', '${l.instrumentKey}',
        ${l.targetReturn1d}, ${l.targetReturn5d}, ${l.targetReturn20d},
        ${l.targetVolatility5d}, ${l.targetVolatility20d}, ${l.targetMaxDrawdown5d},
        ${l.targetDirection1d}, ${l.targetDirection5d}, ${l.targetDirection20d},
        '${l.regimeLabel}', ${l.regimeConfidence},
        ${l.hadRegimeChange}, ${l.hadCrash}, ${l.hadRally},
        ${l.isValid}, ${l.invalidReason ? `'${l.invalidReason}'` : "NULL"})`;
        }).join(",");

        const query = `INSERT INTO training_labels_1d (${columns}) VALUES ${values}`;
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
        const result = await this.pool.query(
            `SELECT * FROM training_labels_1d 
       WHERE instrument_key = $1 
       AND timestamp >= $2 
       AND timestamp <= $3
       AND is_valid = true
       ORDER BY timestamp ASC 
       LIMIT $4`,
            [instrumentKey, startTime.toISOString(), endTime.toISOString(), limit]
        );

        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * Get for training with regime model
     */
    async getForTraining(
        instrumentKey: string,
        startYear: number,
        endYear: number
    ): Promise<TrainingLabels1d[]> {
        const result = await this.pool.query(
            `SELECT * FROM training_labels_1d 
       WHERE instrument_key = $1 
       AND timestamp >= $2 
       AND timestamp <= $3
       AND is_valid = true
       ORDER BY timestamp ASC`,
            [
                instrumentKey,
                `${startYear}-01-01T00:00:00Z`,
                `${endYear}-12-31T23:59:59Z`
            ]
        );

        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * Get regime change events
     */
    async getRegimeChanges(
        instrumentKey: string,
        startTime: Date,
        endTime: Date
    ): Promise<TrainingLabels1d[]> {
        const result = await this.pool.query(
            `SELECT * FROM training_labels_1d 
       WHERE instrument_key = $1 
       AND timestamp >= $2 
       AND timestamp <= $3
       AND had_regime_change = true
       ORDER BY timestamp ASC`,
            [instrumentKey, startTime.toISOString(), endTime.toISOString()]
        );

        return result.rows.map((row) => this.mapRow(row));
    }

    private mapRow(row: any): TrainingLabels1d {
        return {
            timestamp: new Date(row.timestamp),
            instrumentKey: row.instrument_key,
            targetReturn1d: parseFloat(row.target_return_1d),
            targetReturn5d: parseFloat(row.target_return_5d),
            targetReturn20d: parseFloat(row.target_return_20d),
            targetVolatility5d: parseFloat(row.target_volatility_5d),
            targetVolatility20d: parseFloat(row.target_volatility_20d),
            targetMaxDrawdown5d: parseFloat(row.target_max_drawdown_5d),
            targetDirection1d: parseInt(row.target_direction_1d),
            targetDirection5d: parseInt(row.target_direction_5d),
            targetDirection20d: parseInt(row.target_direction_20d),
            regimeLabel: row.regime_label,
            regimeConfidence: parseFloat(row.regime_confidence),
            hadRegimeChange: row.had_regime_change,
            hadCrash: row.had_crash,
            hadRally: row.had_rally,
            isValid: row.is_valid,
            invalidReason: row.invalid_reason || undefined,
        };
    }
}
