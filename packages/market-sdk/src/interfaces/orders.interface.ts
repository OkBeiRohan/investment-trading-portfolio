import { Order } from "@repo/schema";

export interface IOrderProvider {
  /**
   * Place a single order
   */
  // placeOrder(userId: string, params: OrderParams): Promise<Order>;

  // /**
  //  * Place multi-leg order (straddle, iron condor, etc.)
  //  */
  // placeMultiLegOrder(
  //   userId: string,
  //   params: MultiLegOrderParams
  // ): Promise<Order>;

  // /**
  //  * Modify existing order
  //  */
  // modifyOrder(
  //   userId: string,
  //   orderId: string,
  //   modifications: Partial<OrderParams>
  // ): Promise<Order>;

  /**
   * Cancel order
   */
  cancelOrder(userId: string, orderId: string): Promise<{ success: boolean }>;

  /**
   * Get order book (all orders for user)
   */
  getOrderBook(userId: string): Promise<Order[]>;

  /**
   * Get specific order details
   */
  getOrderDetails(userId: string, orderId: string): Promise<Order>;
}
