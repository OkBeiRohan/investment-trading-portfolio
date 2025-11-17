/**
 * Signal Repository
 * Handles database operations for trading signals
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TradingSignal, TradingSignalDocument } from '@repo/database';
import type { Prediction } from '@repo/schema';

export interface SignalStats {
  totalSignals: number;
  avgConfidence: number;
  highConfidenceCount: number;
  predictionDistribution: Record<string, number>;
}

@Injectable()
export class SignalRepository {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    @InjectModel(TradingSignal.name, 'trading')
    private readonly signalModel: Model<TradingSignalDocument>,
  ) {}

  /**
   * Create and save a new trading signal
   */
  async create(signal: Omit<TradingSignal, '_id'>): Promise<TradingSignal> {
    const created = new this.signalModel(signal);
    return created.save();
  }

  /**
   * Find signal by ID
   */
  async findById(id: string): Promise<TradingSignal | null> {
    return this.signalModel.findById(id).exec();
  }

  /**
   * Find recent signals for a user
   */
  async findRecent(userId: string, limit = 50): Promise<TradingSignal[]> {
    return this.signalModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Find signals within a time range
   */
  async findByTimeRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TradingSignal[]> {
    return this.signalModel
      .find({
        userId,
        timestamp: { $gte: startDate, $lte: endDate },
      })
      .sort({ timestamp: -1 })
      .exec();
  }

  /**
   * Find signals by prediction type
   */
  async findByPrediction(
    userId: string,
    prediction: Prediction,
    limit = 50,
  ): Promise<TradingSignal[]> {
    return this.signalModel
      .find({ userId, prediction })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Find high-confidence signals
   */
  async findHighConfidence(
    userId: string,
    minConfidence = 0.7,
    limit = 50,
  ): Promise<TradingSignal[]> {
    return this.signalModel
      .find({
        userId,
        confidence: { $gte: minConfidence },
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get performance statistics for signals
   */
  async getPerformanceStats(userId: string, days = 30): Promise<SignalStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.signalModel
      .aggregate([
        { $match: { userId, timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalSignals: { $sum: 1 },
            avgConfidence: { $avg: '$confidence' },
            highConfidenceCount: {
              $sum: { $cond: [{ $gte: ['$confidence', 0.7] }, 1, 0] },
            },
          },
        },
      ])
      .exec();

    // Get prediction distribution
    const predictionDist = await this.signalModel
      .aggregate<{ _id: string; count: number }>([
        { $match: { userId, timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: '$prediction',
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const distributionMap: Record<string, number> = {};
    predictionDist.forEach((item) => {
      distributionMap[item._id] = item.count;
    });

    const firstResult = result[0] as
      | {
          totalSignals: number;
          avgConfidence: number;
          highConfidenceCount: number;
        }
      | undefined;

    return {
      totalSignals: firstResult?.totalSignals || 0,
      avgConfidence: firstResult?.avgConfidence || 0,
      highConfidenceCount: firstResult?.highConfidenceCount || 0,
      predictionDistribution: distributionMap,
    };
  }

  /**
   * Get model contribution statistics
   */
  async getModelContributionStats(
    userId: string,
    days = 30,
  ): Promise<
    Record<
      string,
      {
        avgContribution: number;
        maxContribution: number;
        minContribution: number;
      }
    >
  > {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const signals = await this.signalModel
      .find({
        userId,
        timestamp: { $gte: startDate },
      })
      .exec();

    const modelStats: Record<
      string,
      { sum: number; max: number; min: number; count: number }
    > = {};

    signals.forEach((signal) => {
      Object.entries(signal.modelContributions).forEach(([model, value]) => {
        const numValue = value; // Value is number from modelContributions schema
        if (!modelStats[model]) {
          modelStats[model] = {
            sum: 0,
            max: -Infinity,
            min: Infinity,
            count: 0,
          };
        }
        modelStats[model].sum += numValue;
        modelStats[model].max = Math.max(modelStats[model].max, numValue);
        modelStats[model].min = Math.min(modelStats[model].min, numValue);
        modelStats[model].count++;
      });
    });

    const result: Record<
      string,
      {
        avgContribution: number;
        maxContribution: number;
        minContribution: number;
      }
    > = {};

    Object.entries(modelStats).forEach(([model, stats]) => {
      result[model] = {
        avgContribution: stats.sum / stats.count,
        maxContribution: stats.max,
        minContribution: stats.min,
      };
    });

    return result;
  }

  /**
   * Delete old signals (for data retention)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.signalModel
      .deleteMany({ timestamp: { $lt: cutoffDate } })
      .exec();

    return result.deletedCount;
  }

  /**
   * Count total signals for a user
   */
  async countByUser(userId: string): Promise<number> {
    return this.signalModel.countDocuments({ userId }).exec();
  }

  /**
   * Get latest signal for a user
   */
  async getLatest(userId: string): Promise<TradingSignal | null> {
    return this.signalModel.findOne({ userId }).sort({ timestamp: -1 }).exec();
  }
}
