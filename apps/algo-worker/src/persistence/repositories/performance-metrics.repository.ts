/**
 * Performance Metrics Repository
 * Handles performance metrics persistence and calculations
 */

import { Injectable, Logger } from '@nestjs/common';
import { Collection, ObjectId } from 'mongodb';
import { db } from '@repo/database';
import {
  type PerformanceMetrics,
  type PerformanceMetricsCreateInput,
  performanceMetricsSchema,
  type Period,
} from '@repo/schema';

@Injectable()
export class PerformanceMetricsRepository {
  private readonly logger = new Logger(PerformanceMetricsRepository.name);
  private readonly collection: Collection<PerformanceMetrics>;

  constructor() {
    this.collection = db.collection<PerformanceMetrics>('performanceMetrics');
  }

  /**
   * Create new performance metrics
   */
  async create(data: PerformanceMetricsCreateInput): Promise<string> {
    try {
      // Validate with Zod
      const validated = performanceMetricsSchema.parse({
        ...data,
        createdAt: new Date(),
      });

      const result = await this.collection.insertOne(
        validated as PerformanceMetrics,
      );
      this.logger.log(`Performance metrics created: ${result.insertedId}`);
      return result.insertedId.toString();
    } catch (error) {
      this.logger.error('Failed to create performance metrics', error);
      throw error;
    }
  }

  /**
   * Find metrics by user and period
   */
  async findByUserAndPeriod(
    userId: string,
    period: Period,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PerformanceMetrics[]> {
    try {
      const filter: any = { userId, period };

      if (startDate || endDate) {
        filter.startDate = {};
        if (startDate) filter.startDate.$gte = startDate;
        if (endDate) filter.startDate.$lte = endDate;
      }

      return await this.collection
        .find(filter)
        .sort({ startDate: -1 })
        .toArray();
    } catch (error) {
      this.logger.error('Failed to find performance metrics', error);
      throw error;
    }
  }

  /**
   * Get latest metrics for user
   */
  async findLatest(
    userId: string,
    period: Period,
  ): Promise<PerformanceMetrics | null> {
    try {
      return await this.collection
        .find({ userId, period })
        .sort({ startDate: -1 })
        .limit(1)
        .next();
    } catch (error) {
      this.logger.error('Failed to find latest metrics', error);
      throw error;
    }
  }

  /**
   * Get monthly performance summary
   */
  async getMonthlySummary(
    userId: string,
    months = 12,
  ): Promise<PerformanceMetrics[]> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      return await this.collection
        .find({
          userId,
          period: 'MONTHLY',
          startDate: { $gte: startDate },
        })
        .sort({ startDate: -1 })
        .toArray();
    } catch (error) {
      this.logger.error('Failed to get monthly summary', error);
      throw error;
    }
  }

  /**
   * Calculate aggregate statistics
   */
  async getAggregateStats(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    avgSharpeRatio: number;
    avgSortinoRatio: number;
    maxDrawdown: number;
    totalReturn: number;
    totalTrades: number;
    overallWinRate: number;
  }> {
    try {
      const result = await this.collection
        .aggregate([
          {
            $match: {
              userId,
              startDate: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: null,
              avgSharpeRatio: { $avg: '$metrics.sharpeRatio' },
              avgSortinoRatio: { $avg: '$metrics.sortinoRatio' },
              maxDrawdown: { $max: '$metrics.maxDrawdown' },
              totalReturn: { $sum: '$metrics.totalReturn' },
              totalTrades: { $sum: '$trades.total' },
              totalWins: { $sum: '$trades.wins' },
              totalLosses: { $sum: '$trades.losses' },
            },
          },
        ])
        .toArray();

      if (result.length === 0) {
        return {
          avgSharpeRatio: 0,
          avgSortinoRatio: 0,
          maxDrawdown: 0,
          totalReturn: 0,
          totalTrades: 0,
          overallWinRate: 0,
        };
      }

      const stats = result[0];
      const overallWinRate =
        stats.totalTrades > 0 ? stats.totalWins / stats.totalTrades : 0;

      return {
        avgSharpeRatio: stats.avgSharpeRatio || 0,
        avgSortinoRatio: stats.avgSortinoRatio || 0,
        maxDrawdown: stats.maxDrawdown || 0,
        totalReturn: stats.totalReturn || 0,
        totalTrades: stats.totalTrades || 0,
        overallWinRate,
      };
    } catch (error) {
      this.logger.error('Failed to calculate aggregate stats', error);
      throw error;
    }
  }

  /**
   * Find best performing periods
   */
  async findBestPerformers(
    userId: string,
    metricField: 'sharpeRatio' | 'sortinoRatio' | 'totalReturn',
    limit = 10,
  ): Promise<PerformanceMetrics[]> {
    try {
      const sortField = `metrics.${metricField}`;
      return await this.collection
        .find({ userId })
        .sort({ [sortField]: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      this.logger.error('Failed to find best performers', error);
      throw error;
    }
  }

  /**
   * Check if performance has degraded (for alerts)
   */
  async checkPerformanceDegradation(
    userId: string,
    sharpeThreshold = 1.0,
    drawdownThreshold = -20,
  ): Promise<{
    degraded: boolean;
    reason?: string;
  }> {
    try {
      const latest = await this.findLatest(userId, 'DAILY');

      if (!latest) {
        return { degraded: false };
      }

      if (latest.metrics.sharpeRatio < sharpeThreshold) {
        return {
          degraded: true,
          reason: `Sharpe ratio ${latest.metrics.sharpeRatio.toFixed(2)} below threshold ${sharpeThreshold}`,
        };
      }

      if (latest.metrics.maxDrawdown < drawdownThreshold) {
        return {
          degraded: true,
          reason: `Max drawdown ${latest.metrics.maxDrawdown.toFixed(2)}% exceeds ${drawdownThreshold}%`,
        };
      }

      return { degraded: false };
    } catch (error) {
      this.logger.error('Failed to check performance degradation', error);
      throw error;
    }
  }

  /**
   * Delete metrics (for testing)
   */
  async delete(id: string, userId?: string): Promise<boolean> {
    try {
      const filter: any = { _id: new ObjectId(id) };
      if (userId) {
        filter.userId = userId;
      }

      const result = await this.collection.deleteOne(filter);
      this.logger.log(`Performance metrics deleted: ${id}`);
      return result.deletedCount > 0;
    } catch (error) {
      this.logger.error(`Failed to delete performance metrics ${id}`, error);
      throw error;
    }
  }
}
