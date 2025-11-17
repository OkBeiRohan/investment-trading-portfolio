/**
 * Order Repository
 * Handles database operations for orders
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '@repo/database';
import type { OrderStatus } from '@repo/schema';

export interface OrderStats {
  totalOrders: number;
  filledOrders: number;
  pendingOrders: number;
  rejectedOrders: number;
  cancelledOrders: number;
  avgFillTime: number; // milliseconds
}

@Injectable()
export class OrderRepository {
  constructor(
    @InjectModel(Order.name, 'trading')
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  /**
   * Create a new order
   */
  async create(order: Omit<Order, '_id'>): Promise<Order> {
    const created = new this.orderModel(order);
    return created.save();
  }

  /**
   * Find order by ID
   */
  async findById(id: string): Promise<Order | null> {
    return this.orderModel.findById(id).exec();
  }

  /**
   * Find order by Upstox order ID
   */
  async findByOrderId(orderId: string): Promise<Order | null> {
    return this.orderModel.findOne({ orderId }).exec();
  }

  /**
   * Find recent orders for a user
   */
  async findRecent(userId: string, limit = 50): Promise<Order[]> {
    return this.orderModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Find orders by status
   */
  async findByStatus(
    userId: string,
    status: OrderStatus,
    limit = 50,
  ): Promise<Order[]> {
    return this.orderModel
      .find({ userId, status })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Find pending orders
   */
  async findPending(userId: string): Promise<Order[]> {
    return this.orderModel
      .find({
        userId,
        status: { $in: ['PENDING', 'PARTIALLY_FILLED'] },
      })
      .sort({ createdAt: 1 })
      .exec();
  }

  /**
   * Find orders by signal ID
   */
  async findBySignalId(signalId: string): Promise<Order[]> {
    return this.orderModel.find({ signalId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find orders by strategy
   */
  async findByStrategy(
    userId: string,
    strategy: string,
    limit = 50,
  ): Promise<Order[]> {
    return this.orderModel
      .find({ userId, strategy })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Update order status
   */
  async updateStatus(
    orderId: string,
    status: OrderStatus,
  ): Promise<Order | null> {
    return this.orderModel
      .findOneAndUpdate(
        { orderId },
        { $set: { status, updatedAt: new Date() } },
        { new: true },
      )
      .exec();
  }

  /**
   * Update order leg status
   */
  async updateLegStatus(
    orderId: string,
    legIndex: number,
    updates: {
      status?: OrderStatus;
      filledQuantity?: number;
      averagePrice?: number;
      filledAt?: Date;
    },
  ): Promise<Order | null> {
    const updateFields: Record<string, unknown> = {};

    if (updates.status) {
      updateFields[`legs.${legIndex}.status`] = updates.status;
    }
    if (updates.filledQuantity !== undefined) {
      updateFields[`legs.${legIndex}.filledQuantity`] = updates.filledQuantity;
    }
    if (updates.averagePrice !== undefined) {
      updateFields[`legs.${legIndex}.averagePrice`] = updates.averagePrice;
    }
    if (updates.filledAt) {
      updateFields[`legs.${legIndex}.filledAt`] = updates.filledAt;
    }

    updateFields.updatedAt = new Date();

    return this.orderModel
      .findOneAndUpdate({ orderId }, { $set: updateFields }, { new: true })
      .exec();
  }

  /**
   * Update total cost
   */
  async updateTotalCost(
    orderId: string,
    totalCost: number,
  ): Promise<Order | null> {
    return this.orderModel
      .findOneAndUpdate(
        { orderId },
        { $set: { totalCost, updatedAt: new Date() } },
        { new: true },
      )
      .exec();
  }

  /**
   * Get order statistics
   */
  async getStats(userId: string, days = 30): Promise<OrderStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.orderModel
      .aggregate([
        { $match: { userId, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            filledOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'FILLED'] }, 1, 0] },
            },
            pendingOrders: {
              $sum: {
                $cond: [
                  {
                    $in: ['$status', ['PENDING', 'PARTIALLY_FILLED']],
                  },
                  1,
                  0,
                ],
              },
            },
            rejectedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] },
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] },
            },
          },
        },
      ])
      .exec();

    // Calculate average fill time for filled orders
    const filledOrders = await this.orderModel
      .find({
        userId,
        status: 'FILLED',
        createdAt: { $gte: startDate },
      })
      .exec();

    let totalFillTime = 0;
    let filledCount = 0;

    filledOrders.forEach((order) => {
      // Find the last filled leg
      const lastFilledLeg = order.legs
        .filter((leg: any) => leg.filledAt)
        .sort(
          (a: any, b: any) =>
            (b.filledAt?.getTime() || 0) - (a.filledAt?.getTime() || 0),
        )[0];

      if (lastFilledLeg?.filledAt) {
        totalFillTime +=
          lastFilledLeg.filledAt.getTime() - (order as any).createdAt.getTime();
        filledCount++;
      }
    });

    const avgFillTime = filledCount > 0 ? totalFillTime / filledCount : 0;

    return {
      totalOrders: result[0]?.totalOrders || 0,
      filledOrders: result[0]?.filledOrders || 0,
      pendingOrders: result[0]?.pendingOrders || 0,
      rejectedOrders: result[0]?.rejectedOrders || 0,
      cancelledOrders: result[0]?.cancelledOrders || 0,
      avgFillTime,
    };
  }

  /**
   * Delete old orders (for data retention)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.orderModel
      .deleteMany({ createdAt: { $lt: cutoffDate } })
      .exec();

    return result.deletedCount;
  }

  /**
   * Count total orders for a user
   */
  async countByUser(userId: string): Promise<number> {
    return this.orderModel.countDocuments({ userId }).exec();
  }
}
