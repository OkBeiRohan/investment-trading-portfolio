import { Injectable, Logger } from "@nestjs/common";
import { HttpClientService } from "../../../../core/http-client.service";
import { AuthManagerService } from "@repo/authentication";
import { UPSTOX_CONSTANTS, UPSTOX_ENDPOINTS } from "../../constants";
import type { UpstoxApiResponse, PlaceGttOrderRequest, GttOrder } from "../types";

@Injectable()
export class GttService {
  private readonly logger = new Logger(GttService.name);

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly authManager: AuthManagerService,
  ) {}

  async placeGttOrder(userId: string, params: PlaceGttOrderRequest): Promise<{ gtt_order_id: string }> {
    const token = await this.authManager.getAccessToken(userId, "upstox", "LIVE");
    const response = await this.httpClient.request<UpstoxApiResponse<{ gtt_order_id: string }>>({
      provider: "upstox",
      endpoint: `${UPSTOX_CONSTANTS.API.BASE_URL_V2}${UPSTOX_ENDPOINTS.PLACE_GTT_ORDER}`,
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: params,
    });
    return response.data;
  }

  async modifyGttOrder(userId: string, gttOrderId: string, params: Partial<PlaceGttOrderRequest>): Promise<{ gtt_order_id: string }> {
    const token = await this.authManager.getAccessToken(userId, "upstox", "LIVE");
    const response = await this.httpClient.request<UpstoxApiResponse<{ gtt_order_id: string }>>({
      provider: "upstox",
      endpoint: `${UPSTOX_CONSTANTS.API.BASE_URL_V2}${UPSTOX_ENDPOINTS.MODIFY_GTT_ORDER}`,
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: { gtt_order_id: gttOrderId, ...params },
    });
    return response.data;
  }

  async cancelGttOrder(userId: string, gttOrderId: string): Promise<{ gtt_order_id: string }> {
    const token = await this.authManager.getAccessToken(userId, "upstox", "LIVE");
    const response = await this.httpClient.request<UpstoxApiResponse<{ gtt_order_id: string }>>({
      provider: "upstox",
      endpoint: `${UPSTOX_CONSTANTS.API.BASE_URL_V2}${UPSTOX_ENDPOINTS.CANCEL_GTT_ORDER}`,
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      params: { gtt_order_id: gttOrderId },
    });
    return response.data;
  }

  async getGttOrderDetails(userId: string, gttOrderId: string): Promise<GttOrder> {
    const token = await this.authManager.getAccessToken(userId, "upstox", "LIVE");
    const response = await this.httpClient.request<UpstoxApiResponse<GttOrder>>({
      provider: "upstox",
      endpoint: `${UPSTOX_CONSTANTS.API.BASE_URL_V2}${UPSTOX_ENDPOINTS.GET_GTT_ORDER_DETAILS}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      params: { gtt_order_id: gttOrderId },
    });
    return response.data;
  }
}
