/**
 * Position Repository
 * Handles position persistence and queries
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Position, PositionDocument } from '@repo/database';
import {
  type PositionCreate,
  type PositionUpdate,
  type PositionStatus,
  positionSchema,
} from '@repo/schema';

@Injectable()
export class PositionRepository {
  private readonly logger = new Logger(PositionRepository.name);

  constructor(
    @InjectModel(Position.name, 'trading')
    private readonly positionModel: Model<PositionDocument>,
  ) {}

  /**
   * Create a new position
   */
  async create(data: PositionCreateInput): Promise<string> {
    try {
      // Validate with Zod
      const validated = positionSchema.parse({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const created = await this.positionModel.create(validated);
      this.logger.log(`Position created: ${created._id}`);
      return created._id.toString();
    } catch (error) {
      this.logger.error('Failed to create position', error);
      throw error;
    }
  }

  /**
   * Find position by ID
   */
  async findById(
    id: string,
    userId?: string,
  ): Promise<PositionDocument | null> {
    try {
      const filter: any = { _id: id };
      if (userId) {
        filter.userId = userId;
      }

      return await this.positionModel.findOne(filter).exec();
    } catch (error) {
      this.logger.error(`Failed to find position ${id}`, error);
      throw error;
    }
  }

  /**
   * Find all open positions for a user
   */
  async findOpenPositions(userId: string): Promise<PositionDocument[]> {
    try {
      return await this.positionModel
        .find({ userId, status: 'OPEN' })
        .sort({ entryDate: -1 })
        .exec();
    } catch (error) {
      this.logger.error('Failed to find open positions', error);
      throw error;
    }
  }

  /**
   * Find positions by strategy
   */
  async findByStrategy(
    userId: string,
    strategy: string,
  ): Promise<PositionDocument[]> {
    try {
      return await this.positionModel
        .find({ userId, strategy })
        .sort({ entryDate: -1 })
        .exec();
    } catch (error) {
      this.logger.error(
        `Failed to find positions for strategy ${strategy}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update position
   */
  async update(
    id: string,
    data: PositionUpdateInput,
    userId?: string,
  ): Promise<boolean> {
    try {
      const filter: any = { _id: id };
      if (userId) {
        filter.userId = userId;
      }

      const result = await this.positionModel
        .updateOne(filter, {
          $set: {
            ...data,
            updatedAt: new Date(),
          },
        })
        .exec();

      this.logger.log(`Position updated: ${id}`);
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`Failed to update position ${id}`, error);
      throw error;
    }
  }

  /**
   * Close position
   */
  async close(
    id: string,
    exitDate: Date,
    realizedPnL: number,
    userId?: string,
  ): Promise<boolean> {
    try {
      const filter: any = { _id: id };
      if (userId) {
        filter.userId = userId;
      }

      const result = await this.positionModel
        .updateOne(filter, {
          $set: {
            status: 'CLOSED',
            exitDate,
            realizedPnL,
            updatedAt: new Date(),
          },
        })
        .exec();

      this.logger.log(`Position closed: ${id}, P&L: ${realizedPnL}`);
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`Failed to close position ${id}`, error);
      throw error;
    }
  }

  /**
   * Calculate portfolio Greeks (sum of all open positions)
   */
  async calculatePortfolioGreeks(userId: string): Promise<{
    delta: number;
    gamma: number;
    vega: number;
    theta: number;
  }> {
    try {
      const result = await this.positionModel
        .aggregate([
          { $match: { userId, status: 'OPEN' } },
          {
            $group: {
              _id: null,
              totalDelta: { $sum: '$greeks.delta' },
              totalGamma: { $sum: '$greeks.gamma' },
              totalVega: { $sum: '$greeks.vega' },
              totalTheta: { $sum: '$greeks.theta' },
            },
          },
        ])
        .exec();

      if (result.length === 0) {
        return { delta: 0, gamma: 0, vega: 0, theta: 0 };
      }

      return {
        delta: result[0].totalDelta || 0,
        gamma: result[0].totalGamma || 0,
        vega: result[0].totalVega || 0,
        theta: result[0].totalTheta || 0,
      };
    } catch (error) {
      this.logger.error('Failed to calculate portfolio Greeks', error);
      throw error;
    }
  }

  /**
   * Calculate unrealized P&L for all open positions
   */
  async calculateUnrealizedPnL(userId: string): Promise<number> {
    try {
      const result = await this.positionModel
        .aggregate([
          { $match: { userId, status: 'OPEN' } },
          {
            $group: {
              _id: null,
              totalUnrealizedPnL: { $sum: '$unrealizedPnL' },
            },
          },
        ])
        .exec();

      return result.length > 0 ? result[0].totalUnrealizedPnL || 0 : 0;
    } catch (error) {
      this.logger.error('Failed to calculate unrealized P&L', error);
      throw error;
    }
  }

  /**
   * Get position history for date range
   */
  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<PositionDocument[]> {
    try {
      return await this.positionModel
        .find({
          userId,
          entryDate: { $gte: startDate, $lte: endDate },
        })
        .sort({ entryDate: -1 })
        .exec();
    } catch (error) {
      this.logger.error('Failed to find positions by date range', error);
      throw error;
    }
  }

  /**
   * Delete position (for testing only - use close() in production)
   */
  async delete(id: string, userId?: string): Promise<boolean> {
    try {
      const filter: any = { _id: id };
      if (userId) {
        filter.userId = userId;
      }

      const result = await this.positionModel.deleteOne(filter).exec();
      this.logger.log(`Position deleted: ${id}`);
      return result.deletedCount > 0;
    } catch (error) {
      this.logger.error(`Failed to delete position ${id}`, error);
      throw error;
    }
  }
}
