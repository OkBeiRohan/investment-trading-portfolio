import { Injectable, Logger } from "@nestjs/common";
import { HttpClientService } from "../../../../core/http-client.service";
import { AuthManagerService } from "@repo/authentication";
import { UPSTOX_API_URLS, UPSTOX_ENDPOINTS } from "../../constants";
import type {
  UpstoxApiResponse,
  BrokerageRequest,
  BrokerageDetails,
  MarginRequest,
  MarginDetails,
} from "../types";

@Injectable()
export class ChargesService {
  private readonly logger = new Logger(ChargesService.name);

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly authManager: AuthManagerService
  ) {}

  async getBrokerage(
    userId: string,
    params: BrokerageRequest
  ): Promise<BrokerageDetails> {
    try {
      const token = await this.authManager.getAccessToken(
        userId,
        "upstox",
        "LIVE"
      );

      const response = await this.httpClient.request<
        UpstoxApiResponse<BrokerageDetails>
      >({
        provider: "upstox",
        endpoint: `${UPSTOX_API_URLS.LIVE}${UPSTOX_ENDPOINTS.BROKERAGE}`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Api-Version": "2.0",
        },
        body: params,
      });

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to get brokerage for user ${userId}: ${error?.message}`
      );
      throw error;
    }
  }

  async getMargin(
    userId: string,
    params: MarginRequest
  ): Promise<MarginDetails> {
    try {
      const token = await this.authManager.getAccessToken(
        userId,
        "upstox",
        "LIVE"
      );

      const response = await this.httpClient.request<
        UpstoxApiResponse<MarginDetails>
      >({
        provider: "upstox",
        endpoint: `${UPSTOX_API_URLS.LIVE}${UPSTOX_ENDPOINTS.MARGIN}`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Api-Version": "2.0",
        },
        body: params,
      });

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to get margin for user ${userId}: ${error?.message}`
      );
      throw error;
    }
  }
}
