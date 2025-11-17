/**
 * OrderPlacementService
 * Places orders via Upstox API (@repo/market-sdk)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  Order,
  OrderCreateInput,
  OrderLeg,
  OrderPlacement,
  MultiLegOrderRequest,
  Strategy,
} from '@repo/schema';

@Injectable()
export class OrderPlacementService {
  private readonly logger = new Logger(OrderPlacementService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Place multi-leg option strategy order
   * TODO: Integrate with @repo/market-sdk UpstoxClient
   */
  async placeOrder(
    strategy: Strategy,
    legs: OrderLeg[],
    userId: string,
  ): Promise<Order> {
    this.logger.log(`Placing order: ${strategy.name} with ${legs.length} legs`);

    // TODO: Initialize UpstoxClient from @repo/market-sdk
    // const upstox = new UpstoxClient(config);

    try {
      // TODO: Call Upstox OrderApiV3.placeOrder()
      // const result = await upstox.placeOrder({
      //   legs: legs.map(leg => ({
      //     instrument: leg.instrumentKey,
      //     side: leg.transactionType,
      //     quantity: leg.quantity,
      //     orderType: leg.orderType,
      //     price: leg.price,
      //   })),
      //   orderType: 'MARKET', // or 'LIMIT'
      // });

      // Mock response for now
      const mockOrderId = `ORD_${Date.now()}`;

      const order: OrderCreateInput = {
        userId,
        provider: 'upstox',
        orderId: mockOrderId,
        signalId: strategy._id as string, // Reference to signal that generated strategy
        strategy: strategy.name,
        legs: legs.map((leg) => ({
          ...leg,
          status: 'PENDING' as const,
          filledQuantity: 0,
        })),
        status: 'PENDING' as const,
        totalCost: this.calculateTotalCost(legs),
      };

      // TODO: Persist to MongoDB via @repo/database
      // await collections.orders.insertOne(order);

      this.logger.log(`Order placed successfully: ${mockOrderId}`);

      return order as Order; // Cast for now
    } catch (error) {
      this.logger.error('Order placement failed', error);
      throw error;
    }
  }

  /**
   * Place market order for immediate execution
   */
  async placeMarketOrder(
    legs: OrderLeg[],
    strategy: string,
    userId: string,
  ): Promise<Order> {
    const marketLegs = legs.map((leg) => ({
      ...leg,
      orderType: 'MARKET' as const,
      price: undefined, // No price for market orders
    }));

    // TODO: Use actual strategy object
    const mockStrategy = {
      _id: 'strategy_123',
      name: strategy,
    } as Strategy;

    return this.placeOrder(mockStrategy, marketLegs, userId);
  }

  /**
   * Place limit order with specified prices
   */
  async placeLimitOrder(
    legs: OrderLeg[],
    strategy: string,
    userId: string,
  ): Promise<Order> {
    // Validate that all legs have prices
    for (const leg of legs) {
      if (!leg.price) {
        throw new Error(
          `Leg ${leg.instrumentKey} missing price for LIMIT order`,
        );
      }
    }

    const limitLegs = legs.map((leg) => ({
      ...leg,
      orderType: 'LIMIT' as const,
    }));

    // TODO: Use actual strategy object
    const mockStrategy = {
      _id: 'strategy_123',
      name: strategy,
    } as Strategy;

    return this.placeOrder(mockStrategy, limitLegs, userId);
  }

  /**
   * Modify existing order (price/quantity)
   */
  async modifyOrder(
    orderId: string,
    modifications: Partial<OrderLeg>,
  ): Promise<void> {
    this.logger.log(`Modifying order: ${orderId}`);

    // TODO: Integrate with Upstox OrderApiV3.modifyOrder()
    // await upstox.modifyOrder(orderId, {
    //   quantity: modifications.quantity,
    //   price: modifications.price,
    // });

    // TODO: Update in MongoDB
    // await collections.orders.updateOne(
    //   { orderId },
    //   { $set: { ...modifications, updatedAt: new Date() } }
    // );
  }

  /**
   * Cancel pending order
   */
  async cancelOrder(orderId: string): Promise<void> {
    this.logger.log(`Cancelling order: ${orderId}`);

    // TODO: Integrate with Upstox OrderApiV3.cancelOrder()
    // await upstox.cancelOrder(orderId);

    // TODO: Update in MongoDB
    // await collections.orders.updateOne(
    //   { orderId },
    //   { $set: { status: 'CANCELLED', updatedAt: new Date() } }
    // );
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<Order | null> {
    // TODO: Query from MongoDB
    // return collections.orders.findOne({ orderId });

    return null; // Placeholder
  }

  /**
   * Calculate total cost of order (considering all legs)
   */
  private calculateTotalCost(legs: OrderLeg[]): number {
    return legs.reduce((total, leg) => {
      const legCost = (leg.price ?? 0) * leg.quantity;

      // BUY = debit (negative), SELL = credit (positive)
      return leg.side === 'BUY' ? total - legCost : total + legCost;
    }, 0);
  }

  /**
   * Build multi-leg order request
   */
  buildMultiLegOrder(
    strategy: Strategy,
    instruments: Array<{
      instrumentKey: string;
      instrument: string;
      side: 'BUY' | 'SELL';
      quantity: number;
      price?: number;
    }>,
  ): MultiLegOrderRequest {
    const legs: OrderPlacement[] = instruments.map((inst) => ({
      instrumentKey: inst.instrumentKey,
      instrument: inst.instrument,
      transactionType: inst.side,
      quantity: inst.quantity,
      orderType: inst.price ? ('LIMIT' as const) : ('MARKET' as const),
      price: inst.price,
    }));

    return {
      legs,
      strategy: strategy.name,
      executionPolicy: 'SIMULTANEOUS' as const, // Execute all legs together
    };
  }
}
