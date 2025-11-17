/**
 * Feature Snapshot Repository
 * Handles time-series feature data storage and retrieval
 * Uses MongoDB time-series collection for optimal performance
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FeatureSnapshot, FeatureSnapshotDocument } from '@repo/database';
import {
  type FeatureSnapshot as IFeatureSnapshot,
  featureSnapshotSchema,
} from '@repo/schema';

@Injectable()
export class FeatureSnapshotRepository {
  private readonly logger = new Logger(FeatureSnapshotRepository.name);

  constructor(
    @InjectModel(FeatureSnapshot.name, 'trading')
    private readonly featureSnapshotModel: Model<FeatureSnapshotDocument>,
  ) {}

  // Note: Time-series collection setup is handled in the database module
  // The ensureTimeSeriesCollection method has been removed

  /**
   * Save feature snapshot
   */
  async create(data: Omit<IFeatureSnapshot, '_id'>): Promise<string> {
    try {
      // Validate with Zod
      const validated = featureSnapshotSchema.parse(data);

      const created = await this.featureSnapshotModel.create(validated);
      return created._id.toString();
    } catch (error) {
      this.logger.error('Failed to save feature snapshot', error);
      throw error;
    }
  }

  /**
   * Batch insert feature snapshots (more efficient)
   */
  async createMany(data: Omit<IFeatureSnapshot, '_id'>[]): Promise<number> {
    try {
      const validated = data.map((item) => featureSnapshotSchema.parse(item));
      const result = await this.featureSnapshotModel.insertMany(validated);
      this.logger.log(`Inserted ${result.length} feature snapshots`);
      return result.length;
    } catch (error) {
      this.logger.error('Failed to batch insert feature snapshots', error);
      throw error;
    }
  }

  /**
   * Get latest feature snapshot for instrument
   */
  async findLatest(
    instrument: string,
  ): Promise<FeatureSnapshotDocument | null> {
    try {
      return await this.featureSnapshotModel
        .findOne({ instrument })
        .sort({ timestamp: -1 })
        .exec();
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
  ): Promise<FeatureSnapshotDocument[]> {
    try {
      const query = this.featureSnapshotModel
        .find({
          instrument,
          timestamp: { $gte: startTime, $lte: endTime },
        })
        .sort({ timestamp: -1 });

      if (limit) {
        query.limit(limit);
      }

      return await query.exec();
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
  ): Promise<FeatureSnapshotDocument[]> {
    try {
      return await this.featureSnapshotModel
        .find({
          instrument,
          timestamp: { $gte: startTime, $lte: endTime },
          'metadata.dataQuality': 'good',
        })
        .sort({ timestamp: -1 })
        .exec();
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

      const result: any = await this.featureSnapshotModel
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
        ] as any[])
        .exec();

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
      return await this.featureSnapshotModel
        .countDocuments({
          instrument,
          timestamp: { $gte: startTime, $lte: endTime },
        })
        .exec();
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

      const result = await this.featureSnapshotModel
        .deleteMany({
          timestamp: { $lt: cutoffDate },
        })
        .exec();

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
