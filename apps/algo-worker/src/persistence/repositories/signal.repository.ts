/**
 * Signal Repository
 * Handles database operations for trading signals
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TradingSignal,
  TradingSignalDocument,
  type SignalPredictionEnum,
} from '@repo/schema';

export interface SignalStats {
  totalSignals: number;
  avgConfidence: number;
  highConfidenceCount: number;
  predictionDistribution: Record<string, number>;
}

@Injectable()
export class SignalRepository {
  constructor(
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
    prediction: SignalPredictionEnum,
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
      .aggregate([
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

    return {
      totalSignals: result[0]?.totalSignals || 0,
      avgConfidence: result[0]?.avgConfidence || 0,
      highConfidenceCount: result[0]?.highConfidenceCount || 0,
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
        if (!modelStats[model]) {
          modelStats[model] = {
            sum: 0,
            max: -Infinity,
            min: Infinity,
            count: 0,
          };
        }
        modelStats[model].sum += value;
        modelStats[model].max = Math.max(modelStats[model].max, value);
        modelStats[model].min = Math.min(modelStats[model].min, value);
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
