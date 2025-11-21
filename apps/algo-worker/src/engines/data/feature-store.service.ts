/**
 * FeatureStoreService
 * Manages QuestDB time-series storage for features
 * Stores computed features for ML training and analysis
 */

import { Injectable, Logger } from '@nestjs/common';
import { QuestDBService, type FeatureData } from '@repo/database';
import { type FeatureSnapshot } from '@repo/schema';

@Injectable()
export class FeatureStoreService {
  private readonly logger = new Logger(FeatureStoreService.name);

  constructor(private readonly questdb: QuestDBService) {}

  /**
   * Store feature snapshot in QuestDB time-series database
   */
  async saveFeatures(snapshot: FeatureSnapshot): Promise<void> {
    try {
      const featureData: FeatureData = {
        timestamp: snapshot.timestamp,
        symbol: snapshot.instrument || 'NIFTY50',
        features: this.flattenFeatures(snapshot.features),
        metadata: snapshot.metadata,
      };

      await this.questdb.insertFeatures([featureData]);

      this.logger.debug(
        `Saved features for ${featureData.symbol} at ${featureData.timestamp}`,
      );
    } catch (error) {
      this.logger.error('Failed to save features to QuestDB', error);
      throw error;
    }
  }

  /**
   * Batch save multiple feature snapshots
   * More efficient for high-frequency data
   */
  async saveFeaturesBatch(snapshots: FeatureSnapshot[]): Promise<void> {
    try {
      const featureDataArray = snapshots.map((snapshot) => ({
        timestamp: snapshot.timestamp,
        symbol: snapshot.instrument || 'NIFTY50',
        features: this.flattenFeatures(snapshot.features),
        metadata: snapshot.metadata,
      }));

      await this.questdb.insertFeatures(featureDataArray);

      this.logger.debug(
        `Batch saved ${featureDataArray.length} feature snapshots`,
      );
    } catch (error) {
      this.logger.error('Failed to batch save features to QuestDB', error);
      throw error;
    }
  }

  /**
   * Retrieve recent features for an instrument
   */
  async getRecentFeatures(
    instrument: string,
    limit = 100,
  ): Promise<FeatureSnapshot[]> {
    this.logger.debug(`Fetching ${limit} recent features for ${instrument}`);

    try {
      const query = `
        SELECT timestamp, symbol, features, metadata
        FROM features
        WHERE symbol = '${instrument}'
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;

      const results = await this.questdb.query(query);
      return results.map((row) => this.rowToSnapshot(row));
    } catch (error) {
      this.logger.error(
        `Failed to fetch recent features for ${instrument}`,
        error,
      );
      return [];
    }
  }

  /**
   * Get features within a time range
   */
  async getFeaturesInRange(
    instrument: string,
    startDate: Date,
    endDate: Date,
  ): Promise<FeatureSnapshot[]> {
    this.logger.debug(
      `Fetching features for ${instrument} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    try {
      const query = `
        SELECT timestamp, symbol, features, metadata
        FROM features
        WHERE symbol = '${instrument}'
          AND timestamp >= '${startDate.toISOString()}'
          AND timestamp <= '${endDate.toISOString()}'
        ORDER BY timestamp ASC
      `;

      const results = await this.questdb.query(query);
      return results.map((row) => this.rowToSnapshot(row));
    } catch (error) {
      this.logger.error(
        `Failed to fetch features in range for ${instrument}`,
        error,
      );
      return [];
    }
  }

  /**
   * Get feature statistics
   */
  async getFeatureStats(
    instrument: string,
    days = 30,
  ): Promise<{
    totalSnapshots: number;
    avgFeatureCount: number;
    firstSnapshot: Date | null;
    lastSnapshot: Date | null;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          MIN(timestamp) as first_snapshot,
          MAX(timestamp) as last_snapshot
        FROM features
        WHERE symbol = '${instrument}'
          AND timestamp >= '${startDate.toISOString()}'
      `;

      const results = await this.questdb.query(query);

      if (results.length === 0) {
        return {
          totalSnapshots: 0,
          avgFeatureCount: 0,
          firstSnapshot: null,
          lastSnapshot: null,
        };
      }

      return {
        totalSnapshots: results[0].total || 0,
        avgFeatureCount: 0,
        firstSnapshot: results[0].first_snapshot
          ? new Date(results[0].first_snapshot)
          : null,
        lastSnapshot: results[0].last_snapshot
          ? new Date(results[0].last_snapshot)
          : null,
      };
    } catch (error) {
      this.logger.error(`Failed to get feature stats for ${instrument}`, error);
      return {
        totalSnapshots: 0,
        avgFeatureCount: 0,
        firstSnapshot: null,
        lastSnapshot: null,
      };
    }
  }

  /**
   * Flatten nested features object to flat structure for QuestDB
   */
  private flattenFeatures(features: any): Record<string, number> {
    const flattened: Record<string, number> = {};

    const flatten = (obj: any, prefix = ''): void => {
      for (const key in obj) {
        if (
          typeof obj[key] === 'object' &&
          obj[key] !== null &&
          !Array.isArray(obj[key])
        ) {
          flatten(obj[key], prefix + key + '_');
        } else if (typeof obj[key] === 'number') {
          flattened[prefix + key] = obj[key];
        }
      }
    };

    flatten(features);
    return flattened;
  }

  /**
   * Convert QuestDB row to FeatureSnapshot
   */
  private rowToSnapshot(row: any): FeatureSnapshot {
    return {
      timestamp: new Date(row.timestamp),
      instrument: row.symbol,
      features: row.features,
      metadata: row.metadata || {
        dataQuality: 'good',
        missingFields: [],
        version: '1.0.0',
      },
    };
  }
}
