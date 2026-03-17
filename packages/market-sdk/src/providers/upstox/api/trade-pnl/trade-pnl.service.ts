import { Injectable, Logger } from "@nestjs/common";
import { HttpClientService } from "../../../../core/http-client.service";
import { AuthManagerService } from "@repo/authentication";
import { UPSTOX_CONSTANTS, UPSTOX_ENDPOINTS } from "../../constants";
import type { UpstoxApiResponse, PnlReportMetadata, PnlReportEntry, TradeCharges } from "../types";

@Injectable()
export class TradePnlService {
  private readonly logger = new Logger(TradePnlService.name);

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly authManager: AuthManagerService,
  ) {}

  async getReportMetadata(userId: string, financialYear: string): Promise<PnlReportMetadata> {
    const token = await this.authManager.getAccessToken(userId, "upstox", "LIVE");
    const response = await this.httpClient.request<UpstoxApiResponse<PnlReportMetadata>>({
      provider: "upstox",
      endpoint: `${UPSTOX_CONSTANTS.API.BASE_URL_V2}${UPSTOX_ENDPOINTS.PNL_REPORT_METADATA}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      params: { financial_year: financialYear },
    });
    return response.data;
  }

  async getProfitLossReport(
    userId: string,
    financialYear: string,
    page?: number,
    size?: number,
  ): Promise<PnlReportEntry[]> {
    const token = await this.authManager.getAccessToken(userId, "upstox", "LIVE");
    const params: Record<string, string | number> = { financial_year: financialYear };
    if (page !== undefined) params.page = page;
    if (size !== undefined) params.size = size;
    const response = await this.httpClient.request<UpstoxApiResponse<PnlReportEntry[]>>({
      provider: "upstox",
      endpoint: `${UPSTOX_CONSTANTS.API.BASE_URL_V2}${UPSTOX_ENDPOINTS.PNL_REPORT}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    return response.data;
  }

  async getTradeCharges(
    userId: string,
    financialYear: string,
    page?: number,
    size?: number,
  ): Promise<TradeCharges[]> {
    const token = await this.authManager.getAccessToken(userId, "upstox", "LIVE");
    const params: Record<string, string | number> = { financial_year: financialYear };
    if (page !== undefined) params.page = page;
    if (size !== undefined) params.size = size;
    const response = await this.httpClient.request<UpstoxApiResponse<TradeCharges[]>>({
      provider: "upstox",
      endpoint: `${UPSTOX_CONSTANTS.API.BASE_URL_V2}${UPSTOX_ENDPOINTS.PNL_TRADE_CHARGES}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    return response.data;
  }
}
