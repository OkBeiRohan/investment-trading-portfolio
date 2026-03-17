import { Injectable, Logger } from "@nestjs/common";
import { HttpClientService } from "../../../../core/http-client.service";
import { AuthManagerService } from "@repo/authentication";
import {
  UPSTOX_API_URLS,
  UPSTOX_ENDPOINTS,
  UPSTOX_CONSTANTS,
  UPSTOX_V3_ENDPOINTS,
} from "../../constants";
import type {
  UpstoxApiResponse,
  PlaceOrderRequest,
  PlaceOrderResponse,
  PlaceMultiOrderRequest,
  PlaceMultiOrderResponse,
  ModifyOrderRequest,
  Order,
  Trade,
} from "../types";

/** @deprecated Use PlaceOrderRequest from api/types instead */
export interface PlaceOrderParams {
  quantity: number;
  product: "I" | "D" | "CO" | "MTF";
  validity: "DAY" | "IOC";
  price?: number;
  tag?: string;
  instrument_token: string;
  order_type: "MARKET" | "LIMIT" | "SL" | "SL-M";
  transaction_type: "BUY" | "SELL";
  disclosed_quantity?: number;
  trigger_price?: number;
  is_amo?: boolean;
  slice?: boolean;
}

@Injectable()
export class OrdersRepository {
  private readonly logger = new Logger(OrdersRepository.name);

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly authManager: AuthManagerService,
  ) {}

  // ─── Place Order (V2) ────────────────────────────────────────────────

  async placeOrder(
    userId: string,
    params: PlaceOrderParams,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<PlaceOrderResponse>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.PLACE_ORDER}`,
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
      body: params,
    });
  }

  // ─── Place Order V3 ──────────────────────────────────────────────────

  async placeOrderV3(
    userId: string,
    params: PlaceOrderRequest,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<PlaceOrderResponse>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${UPSTOX_CONSTANTS.API.BASE_URL_V3}${UPSTOX_V3_ENDPOINTS.PLACE_ORDER}`,
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: params,
    });
  }

  // ─── Place Multi Order ───────────────────────────────────────────────

  async placeMultiOrder(
    userId: string,
    params: PlaceMultiOrderRequest,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<PlaceMultiOrderResponse>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.PLACE_MULTI_ORDER}`,
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
      body: params,
    });
  }

  // ─── Modify Order (V2) ───────────────────────────────────────────────

  async modifyOrder(
    userId: string,
    params: ModifyOrderRequest,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<PlaceOrderResponse>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.MODIFY_ORDER}`,
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
      body: params,
    });
  }

  // ─── Modify Order V3 ─────────────────────────────────────────────────

  async modifyOrderV3(
    userId: string,
    params: ModifyOrderRequest,
  ): Promise<UpstoxApiResponse<PlaceOrderResponse>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", "LIVE");

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${UPSTOX_CONSTANTS.API.BASE_URL_V3}${UPSTOX_V3_ENDPOINTS.MODIFY_ORDER}`,
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: params,
    });
  }

  // ─── Cancel Order (V2) ───────────────────────────────────────────────

  async cancelOrder(
    userId: string,
    orderId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<{ order_id: string }>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.CANCEL_ORDER}/${orderId}`,
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
    });
  }

  // ─── Cancel Order V3 ─────────────────────────────────────────────────

  async cancelOrderV3(
    userId: string,
    orderId: string,
  ): Promise<UpstoxApiResponse<{ order_id: string }>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", "LIVE");

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${UPSTOX_CONSTANTS.API.BASE_URL_V3}${UPSTOX_V3_ENDPOINTS.CANCEL_ORDER}/${orderId}`,
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // ─── Cancel Multi Order ──────────────────────────────────────────────

  async cancelMultiOrder(
    userId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<string[]>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.CANCEL_MULTI_ORDER}`,
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
    });
  }

  // ─── Exit All Positions ──────────────────────────────────────────────

  async exitAllPositions(
    userId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<boolean>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.EXIT_ALL_POSITIONS}`,
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
    });
  }

  // ─── Get Order Book ──────────────────────────────────────────────────

  async getOrderBook(
    userId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<Order[]>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.ORDER_BOOK}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
    });
  }

  // ─── Get Order Details ───────────────────────────────────────────────

  async getOrderDetails(
    userId: string,
    orderId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<Order>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.ORDER_DETAILS}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
      params: { order_id: orderId },
    });
  }

  // ─── Get Order History ───────────────────────────────────────────────

  async getOrderHistory(
    userId: string,
    orderId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<Order[]>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.ORDER_HISTORY}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
      params: { order_id: orderId },
    });
  }

  // ─── Get Trades (for day) ────────────────────────────────────────────

  async getTrades(
    userId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<Trade[]>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.GET_TRADES}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
    });
  }

  // ─── Get Order Trades ────────────────────────────────────────────────

  async getOrderTrades(
    userId: string,
    orderId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<Trade[]>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.GET_ORDER_TRADES}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
      params: { order_id: orderId },
    });
  }

  // ─── Get Trade History ───────────────────────────────────────────────

  async getTradeHistory(
    userId: string,
    startDate: string,
    endDate: string,
    pageNumber = 1,
    pageSize = 500,
  ): Promise<UpstoxApiResponse<Trade[]>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", "LIVE");

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${UPSTOX_CONSTANTS.API.BASE_URL_V3}${UPSTOX_V3_ENDPOINTS.HISTORICAL_TRADES}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      params: {
        start_date: startDate,
        end_date: endDate,
        page_number: pageNumber,
        page_size: pageSize,
      },
    });
  }
}
