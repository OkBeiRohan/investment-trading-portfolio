/**
 * Order API Module
 * Handles order placement, modification, cancellation, and retrieval
 */

import { UpstoxClient } from "upstox-js-sdk";
import type {
  PlaceOrderRequest,
  PlaceOrderResponse,
  ModifyOrderRequest,
  CancelOrderRequest,
  OrderDetails,
  Trade,
  MultiLegOrder,
  MultiLegOrderResponse,
} from "@repo/schema";

export class OrderApi {
  private apiClient: typeof UpstoxClient.ApiClient;
  private orderApiV2: UpstoxClient.OrderApi;
  private orderApiV3: UpstoxClient.OrderApiV3;

  constructor(apiClient: typeof UpstoxClient.ApiClient) {
    this.apiClient = apiClient;
    this.orderApiV2 = new UpstoxClient.OrderApi();
    this.orderApiV3 = new UpstoxClient.OrderApiV3();
  }

  /**
   * Place a new order (V3 API)
   */
  async placeOrder(
    request: PlaceOrderRequest,
    algoName?: string
  ): Promise<PlaceOrderResponse> {
    return new Promise((resolve, reject) => {
      const orderRequest = new UpstoxClient.PlaceOrderV3Request(
        request.quantity,
        request.product,
        request.validity,
        request.price,
        request.instrumentKey,
        request.orderType,
        request.transactionType,
        request.disclosedQuantity || 0,
        request.triggerPrice || 0,
        request.isAmo || false
      );

      this.orderApiV3.placeOrder(
        orderRequest,
        {},
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            resolve({
              orderId: data.data.order_id,
              status: data.data.status,
              message: data.data.message,
            });
          }
        },
        algoName
      );
    });
  }

  /**
   * Place multiple orders in one request (multi-leg strategy)
   */
  async placeMultiLegOrder(
    request: MultiLegOrder,
    algoName?: string
  ): Promise<MultiLegOrderResponse> {
    return new Promise((resolve, reject) => {
      const legRequests = request.legs.map((leg) => {
        return new UpstoxClient.PlaceOrderV3Request(
          leg.quantity,
          leg.product,
          leg.validity,
          leg.price,
          leg.instrumentKey,
          leg.orderType,
          leg.transactionType,
          leg.disclosedQuantity || 0,
          leg.triggerPrice || 0,
          leg.isAmo || false
        );
      });

      // Use V2 multi-order API for now as V3 might not support multi-leg yet
      this.orderApiV2.placeMultiOrder(
        legRequests,
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            resolve({
              orderId: data.data.order_id,
              legs: data.data.legs || [],
            });
          }
        },
        algoName
      );
    });
  }

  /**
   * Modify an existing order (V3 API)
   */
  async modifyOrder(
    request: ModifyOrderRequest,
    algoName?: string
  ): Promise<PlaceOrderResponse> {
    return new Promise((resolve, reject) => {
      const modifyRequest = new UpstoxClient.ModifyOrderV3Request(
        request.quantity,
        request.validity,
        request.price,
        request.orderId,
        request.orderType,
        request.disclosedQuantity || 0,
        request.triggerPrice || 0
      );

      this.orderApiV3.modifyOrder(
        modifyRequest,
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            resolve({
              orderId: data.data.order_id,
              status: data.data.status,
              message: data.data.message,
            });
          }
        },
        algoName
      );
    });
  }

  /**
   * Cancel an existing order (V3 API)
   */
  async cancelOrder(
    request: CancelOrderRequest,
    algoName?: string
  ): Promise<PlaceOrderResponse> {
    return new Promise((resolve, reject) => {
      this.orderApiV3.cancelOrder(
        request.orderId,
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            resolve({
              orderId: data.data.order_id,
              status: data.data.status,
              message: data.data.message,
            });
          }
        },
        algoName
      );
    });
  }

  /**
   * Get order book (all orders for the day)
   */
  async getOrderBook(): Promise<OrderDetails[]> {
    return new Promise((resolve, reject) => {
      this.orderApiV2.getOrderBook(
        "2.0",
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            const orders = (data.data || []).map((order: any) =>
              this.mapOrderDetails(order)
            );
            resolve(orders);
          }
        }
      );
    });
  }

  /**
   * Get order details by order ID
   */
  async getOrderDetails(orderId: string): Promise<OrderDetails> {
    return new Promise((resolve, reject) => {
      this.orderApiV2.getOrderDetails(
        "2.0",
        orderId,
        undefined,
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            resolve(this.mapOrderDetails(data.data));
          }
        }
      );
    });
  }

  /**
   * Get trade book (all executed trades for the day)
   */
  async getTradeBook(): Promise<Trade[]> {
    return new Promise((resolve, reject) => {
      this.orderApiV2.getTradeHistory(
        "2.0",
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            const trades = (data.data || []).map((trade: any) =>
              this.mapTrade(trade)
            );
            resolve(trades);
          }
        }
      );
    });
  }

  /**
   * Get trades for a specific order
   */
  async getTradesForOrder(orderId: string): Promise<Trade[]> {
    return new Promise((resolve, reject) => {
      this.orderApiV2.getTradesByOrder(
        orderId,
        "2.0",
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            const trades = (data.data || []).map((trade: any) =>
              this.mapTrade(trade)
            );
            resolve(trades);
          }
        }
      );
    });
  }

  private mapOrderDetails(data: any): OrderDetails {
    return {
      orderId: data.order_id,
      parentOrderId: data.parent_order_id,
      exchangeOrderId: data.exchange_order_id,
      placedBy: data.placed_by,
      tradingSymbol: data.trading_symbol,
      instrumentKey: data.instrument_token,
      exchange: data.exchange,
      orderType: data.order_type,
      transactionType: data.transaction_type,
      product: data.product,
      validity: data.validity,
      price: parseFloat(data.price),
      triggerPrice: data.trigger_price
        ? parseFloat(data.trigger_price)
        : undefined,
      quantity: parseInt(data.quantity),
      disclosedQuantity: parseInt(data.disclosed_quantity),
      filledQuantity: parseInt(data.filled_quantity),
      pendingQuantity: parseInt(data.pending_quantity),
      averagePrice: parseFloat(data.average_price),
      orderTimestamp: new Date(data.order_timestamp),
      exchangeTimestamp: data.exchange_timestamp
        ? new Date(data.exchange_timestamp)
        : undefined,
      status: data.status,
      statusMessage: data.status_message,
      statusMessageRaw: data.status_message_raw,
      isAmo: data.is_amo,
      tag: data.tag,
    };
  }

  private mapTrade(data: any): Trade {
    return {
      tradeId: data.trade_id,
      orderId: data.order_id,
      exchangeOrderId: data.exchange_order_id,
      instrumentKey: data.instrument_token,
      tradingSymbol: data.trading_symbol,
      exchange: data.exchange,
      transactionType: data.transaction_type,
      product: data.product,
      quantity: parseInt(data.quantity),
      price: parseFloat(data.price),
      tradeTimestamp: new Date(data.trade_timestamp),
    };
  }

  private parseError(error: any): Error {
    if (error.response && error.response.text) {
      try {
        const errorData = JSON.parse(error.response.text);
        const errorMessage =
          errorData.errors?.[0]?.message ||
          errorData.message ||
          "Unknown error";
        return new Error(errorMessage);
      } catch {
        return new Error(error.response.text);
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
