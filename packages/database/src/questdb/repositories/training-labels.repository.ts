import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import {
  TrainingLabels1m,
  TrainingLabels1mSchema,
  TrainingLabelDistribution,
} from "@repo/schema";
import { loadSqlQueryCached } from "../utils/sql-loader";

@Injectable()
export class TrainingLabelsRepository {
  private readonly logger = new Logger(TrainingLabelsRepository.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Insert training labels (batch)
   */
  async insertBatch(labels: TrainingLabels1m[]): Promise<void> {
    if (labels.length === 0) return;

    const sqlPrefix = loadSqlQueryCached("training-labels/insert-batch-prefix");
    const values = labels
      .map((l) => {
        const v = TrainingLabels1mSchema.parse(l);
        return `('${v.timestamp.toISOString()}', ${v.horizonMinutes}, ${v.label}, ${v.futureReturn}, ${v.atrThreshold})`;
      })
      .join(",");

    const query = `${sqlPrefix} ${values}`;
    await this.pool.query(query);
    this.logger.log(`Inserted ${labels.length} training labels`);
  }

  /**
   * Get labels for time range
   */
  async getByTimeRange(
    startTime: Date,
    endTime: Date,
    horizon: number
  ): Promise<TrainingLabels1m[]> {
    const sql = loadSqlQueryCached("training-labels/get-by-time-range");
    const result = await this.pool.query(sql, [
      startTime.toISOString(),
      endTime.toISOString(),
      horizon,
    ]);

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Get labels for all horizons in time range
   * Used for multi-task learning where model predicts multiple horizons
   */
  async getAllHorizonsByTimeRange(
    startTime: Date,
    endTime: Date
  ): Promise<TrainingLabels1m[]> {
    const sql = loadSqlQueryCached("training-labels/get-all-horizons");
    const result = await this.pool.query(sql, [
      startTime.toISOString(),
      endTime.toISOString(),
    ]);

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Get labels grouped by timestamp (all horizons for each timestamp)
   * Returns map of timestamp -> array of labels (one per horizon)
   */
  async getGroupedByTimestamp(
    startTime: Date,
    endTime: Date
  ): Promise<Map<number, TrainingLabels1m[]>> {
    const labels = await this.getAllHorizonsByTimeRange(startTime, endTime);
    const grouped = new Map<number, TrainingLabels1m[]>();

    for (const label of labels) {
      const key = label.timestamp.getTime();
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(label);
    }

    return grouped;
  }

  /**
   * Get label distribution statistics by horizon
   * Useful for checking class balance before training
   */
  async getDistributionByHorizon(
    startTime: Date,
    endTime: Date
  ): Promise<TrainingLabelDistribution[]> {
    const sql = loadSqlQueryCached(
      "training-labels/get-distribution-by-horizon"
    );
    const result = await this.pool.query(sql, [
      startTime.toISOString(),
      endTime.toISOString(),
    ]);

    return result.rows.map((row) => ({
      horizonMinutes: parseInt(row.horizon_minutes),
      totalLabels: parseInt(row.total_labels),
      upLabels: parseInt(row.up_labels),
      neutralLabels: parseInt(row.neutral_labels),
      downLabels: parseInt(row.down_labels),
      avgReturn: parseFloat(row.avg_return),
      avgThreshold: parseFloat(row.avg_threshold),
    }));
  }

  private mapRow(row: any): TrainingLabels1m {
    return {
      timestamp: new Date(row.timestamp),
      horizonMinutes: parseInt(row.horizon_minutes),
      label: parseInt(row.label),
      futureReturn: parseFloat(row.future_return),
      atrThreshold: parseFloat(row.atr_threshold),
    };
  }
}
