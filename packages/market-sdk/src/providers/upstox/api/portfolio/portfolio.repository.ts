import { Injectable } from "@nestjs/common";
import { HttpClientService } from "../../../../core/http-client.service";
import { AuthManagerService } from "@repo/authentication";
import { UPSTOX_API_URLS, UPSTOX_ENDPOINTS } from "../../constants";
import type {
  UpstoxApiResponse,
  Position,
  Holding,
  FundsAndMargin,
  ConvertPositionRequest,
} from "../types";

@Injectable()
export class PortfolioRepository {
  constructor(
    private readonly httpClient: HttpClientService,
    private readonly authManager: AuthManagerService,
  ) {}

  async getPositions(
    userId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<Position[]>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.POSITIONS}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
    });
  }

  async getMtfPositions(
    userId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<Position[]>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.MTF_POSITIONS}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
    });
  }

  async convertPosition(
    userId: string,
    params: ConvertPositionRequest,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<boolean>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.CONVERT_POSITION}`,
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
      body: params,
    });
  }

  async getHoldings(
    userId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<Holding[]>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.HOLDINGS}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
    });
  }

  async getFunds(
    userId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<FundsAndMargin>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.FUNDS}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
    });
  }
}
