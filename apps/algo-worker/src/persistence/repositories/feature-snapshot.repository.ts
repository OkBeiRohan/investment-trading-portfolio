/**
 * Feature Snapshot Repository
 * Handles time-series feature data storage and retrieval
 * Uses MongoDB time-series collection for optimal performance
 */

import { Injectable, Logger } from '@nestjs/common';
import { Collection } from 'mongodb';
import { db } from '@repo/database';
import {
  type FeatureSnapshot,
  type FeatureSnapshotCreateInput,
  featureSnapshotSchema,
} from '@repo/schema';

@Injectable()
export class FeatureSnapshotRepository {
  private readonly logger = new Logger(FeatureSnapshotRepository.name);
  private readonly collection: any;

  constructor() {
    // Time-series collection for efficient storage
    this.collection = db.collection<FeatureSnapshot>('features');
  }

  /**
   * Create time-series collection if not exists
   * Should be called on application startup
   */
  async ensureTimeSeriesCollection(): Promise<void> {
    try {
      const collections = await db
        .listCollections({ name: 'features' })
        .toArray();

      if (collections.length === 0) {
        await db.createCollection('features', {
          timeseries: {
            timeField: 'timestamp',
            metaField: 'instrument',
            granularity: 'minutes',
          },
        });
        this.logger.log('Created time-series collection: features');
      }
    } catch (error) {
      this.logger.error('Failed to ensure time-series collection', error);
      // Don't throw - collection might already exist
    }
  }

  /**
   * Save feature snapshot
   */
  async create(data: FeatureSnapshotCreateInput): Promise<string> {
    try {
      // Validate with Zod
      const validated = featureSnapshotSchema.parse(data);

      const result = await this.collection.insertOne(
        validated as FeatureSnapshot,
      );
      return result.insertedId.toString();
    } catch (error) {
      this.logger.error('Failed to save feature snapshot', error);
      throw error;
    }
  }

  /**
   * Batch insert feature snapshots (more efficient)
   */
  async createMany(data: FeatureSnapshotCreateInput[]): Promise<number> {
    try {
      const validated = data.map((item) => featureSnapshotSchema.parse(item));
      const result = await this.collection.insertMany(
        validated as FeatureSnapshot[],
      );
      this.logger.log(`Inserted ${result.insertedCount} feature snapshots`);
      return result.insertedCount;
    } catch (error) {
      this.logger.error('Failed to batch insert feature snapshots', error);
      throw error;
    }
  }

  /**
   * Get latest feature snapshot for instrument
   */
  async findLatest(instrument: string): Promise<FeatureSnapshot | null> {
    try {
      return await this.collection
        .find({ instrument })
        .sort({ timestamp: -1 })
        .limit(1)
        .next();
    } catch (error) {
      this.logger.error(
        `Failed to find latest features for ${instrument}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get feature snapshots for time range
   */
  async findByTimeRange(
    instrument: string,
    startTime: Date,
    endTime: Date,
    limit?: number,
  ): Promise<FeatureSnapshot[]> {
    try {
      const query = this.collection
        .find({
          instrument,
          timestamp: { $gte: startTime, $lte: endTime },
        })
        .sort({ timestamp: -1 });

      if (limit) {
        query.limit(limit);
      }

      return await query.toArray();
    } catch (error) {
      this.logger.error('Failed to find features by time range', error);
      throw error;
    }
  }

  /**
   * Get features for last N minutes
   */
  async findRecent(
    instrument: string,
    minutes: number,
  ): Promise<FeatureSnapshot[]> {
    try {
      const startTime = new Date();
      startTime.setMinutes(startTime.getMinutes() - minutes);

      return await this.findByTimeRange(instrument, startTime, new Date());
    } catch (error) {
      this.logger.error(
        `Failed to find features for last ${minutes} minutes`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get feature snapshots with good data quality only
   */
  async findGoodQuality(
    instrument: string,
    startTime: Date,
    endTime: Date,
  ): Promise<FeatureSnapshot[]> {
    try {
      return await this.collection
        .find({
          instrument,
          timestamp: { $gte: startTime, $lte: endTime },
          'metadata.dataQuality': 'good',
        })
        .sort({ timestamp: -1 })
        .toArray();
    } catch (error) {
      this.logger.error('Failed to find good quality features', error);
      throw error;
    }
  }

  /**
   * Get aggregated features (e.g., average over time window)
   */
  async getAggregatedFeatures(
    instrument: string,
    startTime: Date,
    endTime: Date,
    aggregation: 'avg' | 'min' | 'max' | 'first' | 'last' = 'avg',
  ): Promise<Record<string, number> | null> {
    try {
      const mongoAgg =
        aggregation === 'avg'
          ? '$avg'
          : aggregation === 'min'
            ? '$min'
            : aggregation === 'max'
              ? '$max'
              : aggregation === 'first'
                ? '$first'
                : '$last';

      const result = await this.collection
        .aggregate([
          {
            $match: {
              instrument,
              timestamp: { $gte: startTime, $lte: endTime },
            },
          },
          {
            $group: {
              _id: null,
              realizedVol5d: { [mongoAgg]: '$features.realizedVol5d' },
              realizedVol10d: { [mongoAgg]: '$features.realizedVol10d' },
              realizedVol20d: { [mongoAgg]: '$features.realizedVol20d' },
              rsi14: { [mongoAgg]: '$features.rsi14' },
              indiaVix: { [mongoAgg]: '$features.indiaVix' },
              pcrVolume: { [mongoAgg]: '$features.pcrVolume' },
              pcrOI: { [mongoAgg]: '$features.pcrOI' },
              atmIV: { [mongoAgg]: '$features.atmIV' },
              volSkew: { [mongoAgg]: '$features.volSkew' },
              termStructure: { [mongoAgg]: '$features.termStructure' },
            },
          },
        ])
        .toArray();

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logger.error('Failed to get aggregated features', error);
      throw error;
    }
  }

  /**
   * Count snapshots in time range
   */
  async countByTimeRange(
    instrument: string,
    startTime: Date,
    endTime: Date,
  ): Promise<number> {
    try {
      return await this.collection.countDocuments({
        instrument,
        timestamp: { $gte: startTime, $lte: endTime },
      });
    } catch (error) {
      this.logger.error('Failed to count feature snapshots', error);
      throw error;
    }
  }

  /**
   * Delete old feature snapshots (data retention)
   */
  async deleteOlderThan(days: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await this.collection.deleteMany({
        timestamp: { $lt: cutoffDate },
      });

      this.logger.log(
        `Deleted ${result.deletedCount} feature snapshots older than ${days} days`,
      );
      return result.deletedCount;
    } catch (error) {
      this.logger.error('Failed to delete old feature snapshots', error);
      throw error;
    }
  }
}
