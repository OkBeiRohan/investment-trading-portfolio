import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { TrainingLabels1m, TrainingLabels1mSchema } from "@repo/schema";

@Injectable()
export class TrainingLabelsRepository {
  private readonly logger = new Logger(TrainingLabelsRepository.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Insert training labels (batch)
   */
  async insertBatch(labels: TrainingLabels1m[]): Promise<void> {
    if (labels.length === 0) return;

    const values = labels
      .map((l) => {
        const v = TrainingLabels1mSchema.parse(l);
        return `('${v.timestamp.toISOString()}', ${v.horizonMinutes}, ${v.label}, ${v.futureReturn}, ${v.atrThreshold})`;
      })
      .join(",");

    const query = `
      INSERT INTO training_labels_1m (
        timestamp, horizon_minutes, label, future_return, atr_threshold
      ) VALUES ${values}
    `;

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
    const result = await this.pool.query(
      `SELECT * FROM training_labels_1m 
       WHERE timestamp >= $1 
       AND timestamp < $2 
       AND horizon_minutes = $3
       ORDER BY timestamp ASC`,
      [startTime.toISOString(), endTime.toISOString(), horizon]
    );

    return result.rows.map((row) => this.mapRow(row));
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
