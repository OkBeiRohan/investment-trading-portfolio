/**
 * ExecutionMonitorService
 * Monitors order fills and execution quality
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Order, OrderLeg } from '@repo/schema';

interface FillNotification {
  orderId: string;
  legIndex: number;
  filledQuantity: number;
  averagePrice: number;
  timestamp: Date;
}

interface ExecutionMetrics {
  slippage: number; // Difference from expected price
  fillRate: number; // Percentage of order filled
  executionTime: number; // Time to fill (ms)
  marketImpact: number; // Price movement caused by order
}

@Injectable()
export class ExecutionMonitorService {
  private readonly logger = new Logger(ExecutionMonitorService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Start monitoring order fills
   * TODO: Subscribe to Upstox PortfolioDataStreamer WebSocket
   */
  async startMonitoring(orderId: string): Promise<void> {
    this.logger.log(`Started monitoring order: ${orderId}`);

    // TODO: Integrate with @repo/market-sdk PortfolioDataStreamer
    // const upstox = new UpstoxClient(config);
    // const portfolioStream = upstox.createPortfolioStream();
    //
    // portfolioStream.on('fill', async (fill) => {
    //   if (fill.orderId === orderId) {
    //     await this.handleFillNotification({
    //       orderId: fill.orderId,
    //       legIndex: fill.legIndex,
    //       filledQuantity: fill.quantity,
    //       averagePrice: fill.price,
    //       timestamp: new Date(fill.timestamp),
    //     });
    //   }
    // });
  }

  /**
   * Handle order fill notification
   */
  async handleFillNotification(fill: FillNotification): Promise<void> {
    this.logger.log(
      `Fill received: Order ${fill.orderId}, ` +
        `Qty: ${fill.filledQuantity}, Price: ${fill.averagePrice}`,
    );

    // TODO: Update order in MongoDB
    // await collections.orders.updateOne(
    //   { orderId: fill.orderId },
    //   {
    //     $set: {
    //       'legs.$[leg].filledQuantity': fill.filledQuantity,
    //       'legs.$[leg].averagePrice': fill.averagePrice,
    //       'legs.$[leg].status': 'FILLED',
    //       'legs.$[leg].filledAt': fill.timestamp,
    //       updatedAt: new Date(),
    //     },
    //   },
    //   { arrayFilters: [{ 'leg.index': fill.legIndex }] }
    // );

    // Check if all legs filled
    await this.checkOrderCompletion(fill.orderId);
  }

  /**
   * Check if all legs of order are filled
   */
  private async checkOrderCompletion(orderId: string): Promise<void> {
    // TODO: Query order from MongoDB
    // const order = await collections.orders.findOne({ orderId });

    // if (order && order.legs.every(leg => leg.status === 'FILLED')) {
    //   await collections.orders.updateOne(
    //     { orderId },
    //     { $set: { status: 'FILLED', updatedAt: new Date() } }
    //   );
    //   this.logger.log(`Order ${orderId} fully filled`);
    // }

    this.logger.debug(`Checking completion for order: ${orderId}`);
  }

  /**
   * Calculate execution metrics
   */
  async calculateExecutionMetrics(
    order: Order,
    expectedPrices: number[],
  ): Promise<ExecutionMetrics> {
    const legs = order.legs;
    let totalSlippage = 0;
    let filledLegs = 0;

    // Calculate slippage for each leg
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const expectedPrice = expectedPrices[i];

      if (leg.status === 'FILLED' && leg.averagePrice) {
        const slippage = Math.abs(leg.averagePrice - expectedPrice);
        totalSlippage += slippage;
        filledLegs++;
      }
    }

    const avgSlippage = filledLegs > 0 ? totalSlippage / filledLegs : 0;
    const fillRate = filledLegs / legs.length;

    // Calculate execution time
    const createdAt = order.createdAt;
    const lastFilled = legs
      .filter((l) => l.filledAt)
      .sort((a, b) => {
        return (b.filledAt?.getTime() ?? 0) - (a.filledAt?.getTime() ?? 0);
      })[0];

    const executionTime = lastFilled?.filledAt
      ? lastFilled.filledAt.getTime() - createdAt.getTime()
      : 0;

    return {
      slippage: avgSlippage,
      fillRate,
      executionTime,
      marketImpact: 0, // TODO: Calculate based on price movement
    };
  }

  /**
   * Monitor for partial fills and timeout
   */
  async monitorPartialFills(
    orderId: string,
    timeoutMs: number = 60000,
  ): Promise<void> {
    this.logger.log(
      `Monitoring partial fills for ${orderId}, timeout: ${timeoutMs}ms`,
    );

    // TODO: Set up timeout to cancel unfilled legs
    // setTimeout(async () => {
    //   const order = await collections.orders.findOne({ orderId });
    //   if (order && order.status === 'PENDING') {
    //     this.logger.warn(`Order ${orderId} timed out, cancelling unfilled legs`);
    //     await this.cancelUnfilledLegs(orderId);
    //   }
    // }, timeoutMs);
  }

  /**
   * Cancel unfilled legs of partially filled order
   */
  private async cancelUnfilledLegs(orderId: string): Promise<void> {
    this.logger.log(`Cancelling unfilled legs for order: ${orderId}`);

    // TODO: Query order and cancel unfilled legs via Upstox API
    // const order = await collections.orders.findOne({ orderId });
    // if (order) {
    //   for (const leg of order.legs) {
    //     if (leg.status === 'PENDING') {
    //       await upstox.cancelOrder(leg.legOrderId);
    //       await collections.orders.updateOne(
    //         { orderId, 'legs.instrumentKey': leg.instrumentKey },
    //         { $set: { 'legs.$.status': 'CANCELLED' } }
    //       );
    //     }
    //   }
    // }
  }

  /**
   * Get execution quality report
   */
  async getExecutionQualityReport(
    orderId: string,
  ): Promise<ExecutionMetrics | null> {
    // TODO: Query order and calculate metrics
    // const order = await collections.orders.findOne({ orderId });
    // if (!order) return null;

    // const expectedPrices = order.legs.map(leg => leg.price ?? 0);
    // return this.calculateExecutionMetrics(order, expectedPrices);

    this.logger.debug(`Generating execution quality report for: ${orderId}`);
    return null; // Placeholder
  }
}
