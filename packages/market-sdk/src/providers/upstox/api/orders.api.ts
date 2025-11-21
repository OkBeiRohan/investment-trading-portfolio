import { Injectable, Logger, HttpException } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import { Order, OrderParams } from "@repo/schema";

@Injectable()
export class OrdersApi {
  private readonly logger = new Logger(OrdersApi.name);
  private readonly baseUrl = "https://api.upstox.com/v2";
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
    });
  }

  /**
   * Place a single order
   */
  async placeOrder(accessToken: string, params: OrderParams): Promise<Order> {
    try {
      const response = await this.axiosInstance.post(
        "/order/place",
        {
          quantity: params.quantity,
          product: params.product,
          validity: params.validity,
          price: params.price,
          tag: params.tag,
          instrument_token: params.instrumentKey,
          order_type: params.orderType,
          transaction_type: params.transactionType,
          disclosed_quantity: params.disclosedQuantity,
          trigger_price: params.triggerPrice,
          is_amo: params.isAMO,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      this.logger.log(`Order placed: ${response.data.data.order_id}`);
      return this.mapToOrder(response.data.data);
    } catch (error: any) {
      this.handleError(error);
    }
  }

  /**
   * Place multi-leg order (e.g., straddle, iron condor)
   */
  async placeMultiLegOrder(
    accessToken: string,
    params: MultiLegOrderParams
  ): Promise<Order> {
    try {
      const response = await this.axiosInstance.post(
        "/order/multi/place",
        {
          orders: params.legs.map((leg) => ({
            quantity: leg.quantity,
            product: leg.product,
            validity: leg.validity,
            price: leg.price,
            instrument_token: leg.instrumentKey,
            order_type: leg.orderType,
            transaction_type: leg.transactionType,
          })),
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return this.mapToOrder(response.data.data);
    } catch (error: any) {
      this.handleError(error);
    }
  }

  /**
   * Modify existing order
   */
  async modifyOrder(
    accessToken: string,
    orderId: string,
    modifications: Partial<OrderParams>
  ): Promise<Order> {
    try {
      const response = await this.axiosInstance.put(
        "/order/modify",
        {
          order_id: orderId,
          ...modifications,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return this.mapToOrder(response.data.data);
    } catch (error: any) {
      this.handleError(error);
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    accessToken: string,
    orderId: string
  ): Promise<{ success: boolean }> {
    try {
      await this.axiosInstance.delete(`/order/cancel`, {
        params: { order_id: orderId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      this.logger.log(`Order cancelled: ${orderId}`);
      return { success: true };
    } catch (error: any) {
      this.handleError(error);
    }
  }

  /**
   * Get order book (all orders)
   */
  async getOrderBook(accessToken: string): Promise<Order[]> {
    try {
      const response = await this.axiosInstance.get("/order/retrieve-all", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.data.map(this.mapToOrder);
    } catch (error: any) {
      this.handleError(error);
    }
  }

  /**
   * Get specific order details
   */
  async getOrderDetails(accessToken: string, orderId: string): Promise<Order> {
    try {
      const response = await this.axiosInstance.get("/order/history", {
        params: { order_id: orderId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return this.mapToOrder(response.data.data[0]);
    } catch (error: any) {
      this.handleError(error);
    }
  }

  // ---- Helper Methods ----

  private mapToOrder(data: any): Order {
    return {
      orderId: data.order_id,
      instrumentKey: data.instrument_token,
      quantity: data.quantity,
      price: data.price,
      orderType: data.order_type,
      transactionType: data.transaction_type,
      status: data.status,
      filledQuantity: data.filled_quantity,
      averagePrice: data.average_price,
      createdAt: new Date(data.order_timestamp),
      updatedAt: new Date(data.order_timestamp),
    };
  }

  private handleError(error: any): never {
    const msg = error.response?.data?.errors?.[0]?.message || error.message;
    this.logger.error(`Upstox API Error: ${msg}`);
    throw new HttpException(
      {
        status: "API_ERROR",
        message: msg,
        upstoxError: error.response?.data,
      },
      error.response?.status || 500
    );
  }
}
