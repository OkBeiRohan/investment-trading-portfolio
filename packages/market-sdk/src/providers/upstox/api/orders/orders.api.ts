import { Injectable, Logger, HttpException } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";

export interface OrderParams {
  quantity: number;
  product: string;
  validity: string;
  price?: number;
  tag?: string;
  instrumentKey: string;
  orderType: string;
  transactionType: string;
  disclosedQuantity?: number;
  triggerPrice?: number;
  isAMO?: boolean;
}

export interface Order {
  orderId: string;
  instrumentKey: string;
  quantity: number;
  price: number;
  orderType: string;
  transactionType: string;
  status: string;
  filledQuantity: number;
  averagePrice: number;
  createdAt: Date;
  updatedAt: Date;
}

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

  async placeOrder(accessToken: string, params: OrderParams): Promise<Order> {
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
      },
    );

    this.logger.log(`Order placed: ${response.data.data.order_id}`);
    return this.mapToOrder(response.data.data);
  }

  async cancelOrder(
    accessToken: string,
    orderId: string,
  ): Promise<{ success: boolean }> {
    await this.axiosInstance.delete(`/order/cancel`, {
      params: { order_id: orderId },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    this.logger.log(`Order cancelled: ${orderId}`);
    return { success: true };
  }

  async getOrderBook(accessToken: string): Promise<Order[]> {
    const response = await this.axiosInstance.get("/order/retrieve-all", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return (response.data.data ?? []).map((d: Record<string, unknown>) =>
      this.mapToOrder(d),
    );
  }

  async getOrderDetails(
    accessToken: string,
    orderId: string,
  ): Promise<Order> {
    const response = await this.axiosInstance.get("/order/history", {
      params: { order_id: orderId },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return this.mapToOrder(response.data.data[0]);
  }

  private mapToOrder(data: Record<string, unknown>): Order {
    return {
      orderId: String(data.order_id ?? ""),
      instrumentKey: String(data.instrument_token ?? ""),
      quantity: Number(data.quantity ?? 0),
      price: Number(data.price ?? 0),
      orderType: String(data.order_type ?? ""),
      transactionType: String(data.transaction_type ?? ""),
      status: String(data.status ?? ""),
      filledQuantity: Number(data.filled_quantity ?? 0),
      averagePrice: Number(data.average_price ?? 0),
      createdAt: new Date(String(data.order_timestamp ?? Date.now())),
      updatedAt: new Date(String(data.order_timestamp ?? Date.now())),
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
      error.response?.status || 500,
    );
  }
}
