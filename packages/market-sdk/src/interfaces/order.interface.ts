/**
 * Order Provider Interface
 * Common interface for order execution across providers
 */

import type { Order } from "@repo/schema";
import type { Exchange, InstrumentType } from "./market-data.interface";

// ============================================
// Order Types
// ============================================

export interface OrderLeg {
  instrumentKey: string;
  transactionType: "BUY" | "SELL";
  quantity: number;
  orderType: "MARKET" | "LIMIT" | "STOP_LOSS" | "STOP_LOSS_MARKET";
  price?: number;
  triggerPrice?: number;
  disclosedQuantity?: number;
  product?: "INTRADAY" | "DELIVERY" | "CARRYFORWARD";
  validity?: "DAY" | "IOC" | "GTC";
}

export interface OrderRequest {
  legs: OrderLeg[];
  strategy?: string;
  metadata?: Record<string, unknown>;
}

export interface OrderResponse {
  orderId: string;
  status: "PENDING" | "OPEN" | "COMPLETE" | "CANCELLED" | "REJECTED";
  message?: string;
  legs?: Array<{
    instrumentKey: string;
    status: string;
    orderId?: string;
  }>;
}

export interface ModifyOrderRequest {
  orderId: string;
  quantity?: number;
  price?: number;
  triggerPrice?: number;
  validity?: "DAY" | "IOC" | "GTC";
}

export interface OrderStatus {
  orderId: string;
  status:
    | "PENDING"
    | "OPEN"
    | "COMPLETE"
    | "CANCELLED"
    | "REJECTED"
    | "TRIGGER_PENDING"
    | "PARTIALLY_FILLED";
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  averagePrice?: number;
  instrument: string;
  transactionType: "BUY" | "SELL";
  orderType: string;
  price?: number;
  triggerPrice?: number;
  placedAt: Date;
  updatedAt: Date;
  filledAt?: Date;
  message?: string;
}

export interface Fill {
  orderId: string;
  fillId: string;
  instrument: string;
  quantity: number;
  price: number;
  timestamp: Date;
  side: "BUY" | "SELL";
}

// ============================================
// Order Provider Interface
// ============================================

export interface IOrderProvider {
  /**
   * Provider identification
   */
  readonly providerId: string;
  readonly providerName: string;
  readonly supportedExchanges: Exchange[];

  /**
   * Initialize the provider with credentials
   */
  initialize(config: Record<string, unknown>): Promise<void>;

  /**
   * Place a new order (single or multi-leg)
   */
  placeOrder(request: OrderRequest): Promise<OrderResponse>;

  /**
   * Modify an existing order
   */
  modifyOrder(request: ModifyOrderRequest): Promise<OrderResponse>;

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string): Promise<OrderResponse>;

  /**
   * Get order status
   */
  getOrderStatus(orderId: string): Promise<OrderStatus>;

  /**
   * Get all orders for the day
   */
  getOrders(date?: Date): Promise<OrderStatus[]>;

  /**
   * Get order history
   */
  getOrderHistory(fromDate: Date, toDate: Date): Promise<OrderStatus[]>;

  /**
   * Get trade/fill history
   */
  getTradeHistory(fromDate: Date, toDate: Date): Promise<Fill[]>;

  /**
   * Subscribe to order updates
   * Returns an event emitter for real-time order status updates
   */
  subscribeOrderUpdates?(): Promise<OrderUpdateStream>;

  /**
   * Unsubscribe from order updates
   */
  unsubscribeOrderUpdates?(): Promise<void>;

  /**
   * Check if provider is initialized and ready
   */
  isReady(): boolean;

  /**
   * Clean up resources
   */
  disconnect(): Promise<void>;
}

// ============================================
// Order Update Stream Interface
// ============================================

export interface OrderUpdateEvent {
  type: "order_update" | "fill";
  orderId: string;
  timestamp: Date;
  data: OrderStatus | Fill;
}

export interface OrderUpdateStream {
  on(event: "data", listener: (data: OrderUpdateEvent) => void): void;
  on(event: "error", listener: (error: Error) => void): void;
  on(event: "close", listener: () => void): void;
  off(
    event: "data" | "error" | "close",
    listener: (...args: any[]) => void
  ): void;
  close(): Promise<void>;
}
