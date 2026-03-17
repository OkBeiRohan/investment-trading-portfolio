import { Injectable, Logger } from "@nestjs/common";
import { HttpClientService } from "../../../../core/http-client.service";
import { AuthManagerService } from "@repo/authentication";
import { UPSTOX_API_URLS, UPSTOX_ENDPOINTS } from "../../constants";

export interface PlaceOrderParams {
  quantity: number;
  product: "I" | "D"; // Intraday or Delivery
  validity: "DAY" | "IOC";
  price?: number;
  tag?: string;
  instrument_token: string;
  order_type: "MARKET" | "LIMIT" | "SL" | "SL-M";
  transaction_type: "BUY" | "SELL";
  disclosed_quantity?: number;
  trigger_price?: number;
  is_amo: boolean;
}

/**
 * Orders Repository
 *
 * Handles HTTP calls to Upstox order endpoints.
 */
@Injectable()
export class OrdersRepository {
  private readonly logger = new Logger(OrdersRepository.name);

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly authManager: AuthManagerService
  ) {}

  async placeOrder(
    userId: string,
    params: PlaceOrderParams,
    environment: "SANDBOX" | "LIVE" = "LIVE"
  ): Promise<any> {
    const token = await this.authManager.getAccessToken(
      userId,
      "upstox",
      environment
    );
    const baseUrl =
      environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    this.logger.log(
      `Placing order for user ${userId}: ${params.transaction_type} ${params.quantity} ${params.instrument_token}`
    );

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.PLACE_ORDER}`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Api-Version": "2.0",
      },
      body: params,
    });
  }

  async cancelOrder(
    userId: string,
    orderId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE"
  ): Promise<any> {
    const token = await this.authManager.getAccessToken(
      userId,
      "upstox",
      environment
    );
    const baseUrl =
      environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.CANCEL_ORDER}/${orderId}`,
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Api-Version": "2.0",
      },
    });
  }

  async getOrderBook(
    userId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE"
  ): Promise<any> {
    const token = await this.authManager.getAccessToken(
      userId,
      "upstox",
      environment
    );
    const baseUrl =
      environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.ORDER_BOOK}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Api-Version": "2.0",
      },
    });
  }
}
