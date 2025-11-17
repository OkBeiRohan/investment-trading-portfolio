/**
 * Position Repository
 * Handles position persistence and queries
 */

import { Injectable, Logger } from '@nestjs/common';
import { Collection, ObjectId } from 'mongodb';
import { db } from '@repo/database';
import {
  type Position,
  type PositionCreateInput,
  type PositionUpdateInput,
  positionSchema,
} from '@repo/schema';

@Injectable()
export class PositionRepository {
  private readonly logger = new Logger(PositionRepository.name);
  private readonly collection: Collection<Position>;

  constructor() {
    this.collection = db.collection<Position>('positions');
  }

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

      const result = await this.collection.insertOne(validated as Position);
      this.logger.log(`Position created: ${result.insertedId}`);
      return result.insertedId.toString();
    } catch (error) {
      this.logger.error('Failed to create position', error);
      throw error;
    }
  }

  /**
   * Find position by ID
   */
  async findById(id: string, userId?: string): Promise<Position | null> {
    try {
      const filter: any = { _id: new ObjectId(id) };
      if (userId) {
        filter.userId = userId;
      }

      return await this.collection.findOne(filter);
    } catch (error) {
      this.logger.error(`Failed to find position ${id}`, error);
      throw error;
    }
  }

  /**
   * Find all open positions for a user
   */
  async findOpenPositions(userId: string): Promise<Position[]> {
    try {
      return await this.collection
        .find({ userId, status: 'OPEN' })
        .sort({ entryDate: -1 })
        .toArray();
    } catch (error) {
      this.logger.error('Failed to find open positions', error);
      throw error;
    }
  }

  /**
   * Find positions by strategy
   */
  async findByStrategy(userId: string, strategy: string): Promise<Position[]> {
    try {
      return await this.collection
        .find({ userId, strategy })
        .sort({ entryDate: -1 })
        .toArray();
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
      const filter: any = { _id: new ObjectId(id) };
      if (userId) {
        filter.userId = userId;
      }

      const result = await this.collection.updateOne(filter, {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      });

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
      const filter: any = { _id: new ObjectId(id) };
      if (userId) {
        filter.userId = userId;
      }

      const result = await this.collection.updateOne(filter, {
        $set: {
          status: 'CLOSED',
          exitDate,
          realizedPnL,
          updatedAt: new Date(),
        },
      });

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
      const result = await this.collection
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
        .toArray();

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
      const result = await this.collection
        .aggregate([
          { $match: { userId, status: 'OPEN' } },
          {
            $group: {
              _id: null,
              totalUnrealizedPnL: { $sum: '$unrealizedPnL' },
            },
          },
        ])
        .toArray();

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
  ): Promise<Position[]> {
    try {
      return await this.collection
        .find({
          userId,
          entryDate: { $gte: startDate, $lte: endDate },
        })
        .sort({ entryDate: -1 })
        .toArray();
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
      const filter: any = { _id: new ObjectId(id) };
      if (userId) {
        filter.userId = userId;
      }

      const result = await this.collection.deleteOne(filter);
      this.logger.log(`Position deleted: ${id}`);
      return result.deletedCount > 0;
    } catch (error) {
      this.logger.error(`Failed to delete position ${id}`, error);
      throw error;
    }
  }
}
