import { Injectable, Logger } from "@nestjs/common";
import { OrdersRepository, PlaceOrderParams } from "./orders.repository";

/**
 * Orders Service
 *
 * Business logic for order management:
 * - Pre-trade validation
 * - SEBI compliance (Algo ID tagging)
 * - Order transformation
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly repository: OrdersRepository) {}

  async placeOrder(userId: string, params: PlaceOrderParams): Promise<any> {
    // Future: Add pre-trade risk checks
    // - Position size validation
    // - Daily loss limit
    // - SEBI algo ID validation

    return this.repository.placeOrder(userId, params);
  }

  async cancelOrder(userId: string, orderId: string): Promise<any> {
    return this.repository.cancelOrder(userId, orderId);
  }

  async getOrderBook(userId: string): Promise<any[]> {
    const response = await this.repository.getOrderBook(userId);
    // Transform to common format
    return response.data || [];
  }
}
