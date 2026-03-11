import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { DatasetFolds, DatasetFoldsSchema } from "@repo/schema";

/**
 * Repository for dataset_folds table
 * Stores machine learning train/test splits derived from CPCV
 */
@Injectable()
export class DatasetFoldsRepository {
  private readonly logger = new Logger(DatasetFoldsRepository.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Bulk insert dataset folds
   */
  async bulkInsert(folds: DatasetFolds[]): Promise<boolean> {
    if (folds.length === 0) return true;

    try {
      const client = await this.pool.connect();
      try {
        const columns = [
          "instrument_key",
          "dataset_name",
          "fold_id",
          "split_type",
          "range_start",
          "range_end",
          "created_at",
        ];

        for (const fold of folds) {
          const v = DatasetFoldsSchema.parse({
            ...fold,
            createdAt: fold.createdAt || new Date(),
          });
          const values = [
            v.instrumentKey,
            v.datasetName,
            v.foldId,
            v.splitType,
            v.rangeStart.toISOString(),
            v.rangeEnd.toISOString(),
            v.createdAt!.toISOString(),
          ];

          const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
          await client.query(
            `INSERT INTO dataset_folds (${columns.join(", ")}) VALUES (${placeholders})`,
            values,
          );
        }

        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error("Error during bulk insert of dataset folds", error);
      return false;
    }
  }

  /**
   * Get folds for a specific dataset
   */
  async getFolds(
    instrumentKey: string,
    datasetName: string,
  ): Promise<DatasetFolds[]> {
    const result = await this.pool.query(
      `SELECT * FROM dataset_folds 
       WHERE instrument_key = $1 
       AND dataset_name = $2
       ORDER BY fold_id ASC, range_start ASC`,
      [instrumentKey, datasetName],
    );

    return result.rows.map((row) => this.mapRow(row));
  }
  
  /**
   * Delete existing folds for a dataset (e.g. before replacing them)
   */
  async deleteFolds(
    instrumentKey: string,
    datasetName: string,
  ): Promise<boolean> {
      try {
        await this.pool.query(
          `DELETE FROM dataset_folds 
           WHERE instrument_key = $1 
           AND dataset_name = $2`,
          [instrumentKey, datasetName],
        );
        return true;
      } catch (error) {
          this.logger.error(`Error deleting dataset folds for ${datasetName}`, error);
          return false;
      }
  }

  private mapRow(row: any): DatasetFolds {
    return {
      instrumentKey: row.instrument_key,
      datasetName: row.dataset_name,
      foldId: row.fold_id,
      splitType: row.split_type,
      rangeStart: new Date(row.range_start),
      rangeEnd: new Date(row.range_end),
      createdAt: new Date(row.created_at),
    };
  }
}
