import { Injectable, Logger } from "@nestjs/common";
import { HttpClientService } from "../../../core/http-client.service";
import { AuthManagerService } from "@repo/authentication";
import { UPSTOX_API_URLS, UPSTOX_ENDPOINTS } from "../constants";
import type {
  UpstoxApiResponse,
  UserProfile,
  FundsAndMargin,
} from "../api/types";

/**
 * Service to manage Upstox user configurations and details.
 *
 * For users actively trading, their information will be kept in memory
 * for quicker usage of accessToken, trading mode (live or sandbox), etc
 * without needing to fetch from DB every time.
 *
 * For other operations, this service can fetch user details from database.
 * Also handles updating information, etc.
 */
@Injectable()
export class UpstoxUsersService {
  private readonly logger = new Logger(UpstoxUsersService.name);

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly authManager: AuthManagerService
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    try {
      const token = await this.authManager.getAccessToken(
        userId,
        "upstox",
        "LIVE"
      );

      const response = await this.httpClient.request<
        UpstoxApiResponse<UserProfile>
      >({
        provider: "upstox",
        endpoint: `${UPSTOX_API_URLS.LIVE}${UPSTOX_ENDPOINTS.GET_PROFILE}`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Api-Version": "2.0",
        },
      });

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to get profile for user ${userId}: ${error?.message}`
      );
      throw error;
    }
  }

  async getFundsAndMargin(userId: string): Promise<FundsAndMargin> {
    try {
      const token = await this.authManager.getAccessToken(
        userId,
        "upstox",
        "LIVE"
      );

      const response = await this.httpClient.request<
        UpstoxApiResponse<FundsAndMargin>
      >({
        provider: "upstox",
        endpoint: `${UPSTOX_API_URLS.LIVE}${UPSTOX_ENDPOINTS.GET_FUNDS_AND_MARGIN}`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Api-Version": "2.0",
        },
      });

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to get funds and margin for user ${userId}: ${error?.message}`
      );
      throw error;
    }
  }
}
