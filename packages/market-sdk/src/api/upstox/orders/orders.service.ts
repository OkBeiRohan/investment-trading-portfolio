import { Injectable, Logger, HttpException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import { AuthService } from "../auth/auth.service";
import { UpstoxV3Constants } from "../constants";
import { UpstoxEnv } from "@repo/schema";

export interface PlaceOrderDto {
  quantity: number;
  product: "I" | "D"; // Intraday, Delivery
  validity: "DAY" | "IOC";
  price: number;
  tag?: string;
  instrument_token: string;
  order_type: "MARKET" | "LIMIT" | "SL" | "SL-M";
  transaction_type: "BUY" | "SELL";
  disclosed_quantity?: number;
  trigger_price?: number;
  is_amo?: boolean;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private axiosInstance: AxiosInstance;

  constructor(
    private authService: AuthService,
    private configService: ConfigService
  ) {
    this.axiosInstance = axios.create({
      baseURL: UpstoxV3Constants.BASE_URL, // https://api.upstox.com/v3
      timeout: 5000,
    });
  }

  private async getHeaders(userId: string) {
    const env =
      this.configService.get("UPSTOX_ENV") === "SANDBOX"
        ? UpstoxEnv.SANDBOX
        : UpstoxEnv.LIVE;

    const token = await this.authService.getAccessToken(userId, env);
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  async placeOrder(userId: string, orderDetails: PlaceOrderDto) {
    try {
      const headers = await this.getHeaders(userId);

      // Note: Upstox V3 Order API structure
      const response = await this.axiosInstance.post(
        "/order/place",
        orderDetails,
        { headers }
      );

      this.logger.log(
        `Order Placed: ${response.data.data.order_id} for User: ${userId}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error, userId);
    }
  }

  async modifyOrder(
    userId: string,
    orderId: string,
    modifications: Partial<PlaceOrderDto>
  ) {
    try {
      const headers = await this.getHeaders(userId);
      const response = await this.axiosInstance.put(
        "/order/modify",
        {
          order_id: orderId,
          ...modifications,
        },
        { headers }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, userId);
    }
  }

  async cancelOrder(userId: string, orderId: string) {
    try {
      const headers = await this.getHeaders(userId);
      const response = await this.axiosInstance.delete(
        `/order/cancel?order_id=${orderId}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      this.handleError(error, userId);
    }
  }

  private handleError(error: any, userId: string) {
    const msg = error.response?.data?.errors?.[0]?.message || error.message;
    this.logger.error(`Order Failed for ${userId}: ${msg}`);
    // Propagate specific Upstox errors as HttpExceptions for NestJS filters
    throw new HttpException(
      {
        status: "ORDER_FAILED",
        upstoxError: error.response?.data || msg,
      },
      error.response?.status || 500
    );
  }
}
