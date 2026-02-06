import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { TrainingLabels, TrainingLabelsSchema } from "@repo/schema";

/**
 * Repository for unified training_labels table
 * Handles both 1m and 1d labels with interval-based storage
 */
@Injectable()
export class LabelsRepository {
  private readonly logger = new Logger(LabelsRepository.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Bulk insert labels
   */
  async bulkInsert(labels: TrainingLabels[]): Promise<boolean> {
    if (labels.length === 0) return true;

    try {
      const client = await this.pool.connect();
      try {
        const columns = [
          "timestamp",
          "instrument_key",
          "interval_value",
          "interval_unit",
          "target_return_5m",
          "target_return_15m",
          "target_return_30m",
          "target_return_1h",
          "target_return_eod",
          "target_return_1d",
          "target_return_5d",
          "target_return_20d",
          "target_volatility_5m",
          "target_volatility_15m",
          "target_max_drawdown_5m",
          "target_max_runup_5m",
          "target_volatility_5d",
          "target_volatility_20d",
          "target_max_drawdown_5d",
          "target_direction_5m",
          "target_direction_15m",
          "target_direction_30m",
          "target_direction_1d",
          "target_direction_5d",
          "target_direction_20d",
          "regime_label",
          "regime_confidence",
          "had_regime_change",
          "had_spike_event",
          "had_gap_event",
          "had_crash",
          "had_rally",
          "is_valid",
          "invalid_reason",
          "label_quality",
        ];

        for (const label of labels) {
          const v = TrainingLabelsSchema.parse(label);
          const values = [
            v.timestamp.toISOString(),
            v.instrumentKey,
            v.intervalValue,
            v.intervalUnit,
            v.targetReturn5m ?? null,
            v.targetReturn15m ?? null,
            v.targetReturn30m ?? null,
            v.targetReturn1h ?? null,
            v.targetReturnEod ?? null,
            v.targetReturn1d ?? null,
            v.targetReturn5d ?? null,
            v.targetReturn20d ?? null,
            v.targetVolatility5m ?? null,
            v.targetVolatility15m ?? null,
            v.targetMaxDrawdown5m ?? null,
            v.targetMaxRunup5m ?? null,
            v.targetVolatility5d ?? null,
            v.targetVolatility20d ?? null,
            v.targetMaxDrawdown5d ?? null,
            v.targetDirection5m ?? null,
            v.targetDirection15m ?? null,
            v.targetDirection30m ?? null,
            v.targetDirection1d ?? null,
            v.targetDirection5d ?? null,
            v.targetDirection20d ?? null,
            v.regimeLabel ?? null,
            v.regimeConfidence ?? null,
            v.hadRegimeChange ?? null,
            v.hadSpikeEvent ?? null,
            v.hadGapEvent ?? null,
            v.hadCrash ?? null,
            v.hadRally ?? null,
            v.isValid ?? null,
            v.invalidReason ?? null,
            v.labelQuality ?? null,
          ];

          const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
          await client.query(
            `INSERT INTO training_labels (${columns.join(", ")}) VALUES (${placeholders})`,
            values,
          );
        }

        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error("Error during bulk insert of labels", error);
      return false;
    }
  }

  /**
   * Get labels for a specific instrument and interval
   */
  async getLabels(
    instrumentKey: string,
    intervalValue: number,
    intervalUnit: "minute" | "day",
    startTime: Date,
    endTime: Date,
  ): Promise<TrainingLabels[]> {
    const result = await this.pool.query(
      `SELECT * FROM training_labels 
       WHERE instrument_key = $1 
       AND interval_value = $2 
       AND interval_unit = $3
       AND timestamp >= $4 
       AND timestamp <= $5
       ORDER BY timestamp ASC`,
      [instrumentKey, intervalValue, intervalUnit, startTime, endTime],
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Get label distribution for analysis
   */
  async getLabelDistribution(
    intervalValue: number,
    intervalUnit: "minute" | "day",
  ): Promise<{ up: number; neutral: number; down: number }> {
    const result = await this.pool.query(
      `SELECT 
        SUM(CASE WHEN target_direction_5m = 1 THEN 1 ELSE 0 END) as up,
        SUM(CASE WHEN target_direction_5m = 0 THEN 1 ELSE 0 END) as neutral,
        SUM(CASE WHEN target_direction_5m = -1 THEN 1 ELSE 0 END) as down
       FROM training_labels
       WHERE interval_value = $1 AND interval_unit = $2`,
      [intervalValue, intervalUnit],
    );

    const row = result.rows[0];
    return {
      up: parseInt(row.up || "0"),
      neutral: parseInt(row.neutral || "0"),
      down: parseInt(row.down || "0"),
    };
  }

  private mapRow(row: any): TrainingLabels {
    return {
      timestamp: new Date(row.timestamp),
      instrumentKey: row.instrument_key,
      intervalValue: row.interval_value,
      intervalUnit: row.interval_unit,
      targetReturn5m: row.target_return_5m,
      targetReturn15m: row.target_return_15m,
      targetReturn30m: row.target_return_30m,
      targetReturn1h: row.target_return_1h,
      targetReturnEod: row.target_return_eod,
      targetReturn1d: row.target_return_1d,
      targetReturn5d: row.target_return_5d,
      targetReturn20d: row.target_return_20d,
      targetVolatility5m: row.target_volatility_5m,
      targetVolatility15m: row.target_volatility_15m,
      targetMaxDrawdown5m: row.target_max_drawdown_5m,
      targetMaxRunup5m: row.target_max_runup_5m,
      targetVolatility5d: row.target_volatility_5d,
      targetVolatility20d: row.target_volatility_20d,
      targetMaxDrawdown5d: row.target_max_drawdown_5d,
      targetDirection5m: row.target_direction_5m,
      targetDirection15m: row.target_direction_15m,
      targetDirection30m: row.target_direction_30m,
      targetDirection1d: row.target_direction_1d,
      targetDirection5d: row.target_direction_5d,
      targetDirection20d: row.target_direction_20d,
      regimeLabel: row.regime_label,
      regimeConfidence: row.regime_confidence,
      hadRegimeChange: row.had_regime_change,
      hadSpikeEvent: row.had_spike_event,
      hadGapEvent: row.had_gap_event,
      hadCrash: row.had_crash,
      hadRally: row.had_rally,
      isValid: row.is_valid,
      invalidReason: row.invalid_reason,
      labelQuality: row.label_quality,
    };
  }
}
