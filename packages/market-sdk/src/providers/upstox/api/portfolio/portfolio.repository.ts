import { Injectable } from "@nestjs/common";
import { HttpClientService } from "../../../../core/http-client.service";
import { AuthManagerService } from "@repo/authentication";
import { UPSTOX_API_URLS, UPSTOX_ENDPOINTS } from "../../constants";

@Injectable()
export class PortfolioRepository {
  constructor(
    private readonly httpClient: HttpClientService,
    private readonly authManager: AuthManagerService
  ) {}

  async getPositions(
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
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.POSITIONS}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Api-Version": "2.0",
      },
    });
  }

  async getHoldings(
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
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.HOLDINGS}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Api-Version": "2.0",
      },
    });
  }

  async getFunds(
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
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.FUNDS}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Api-Version": "2.0",
      },
    });
  }
}
