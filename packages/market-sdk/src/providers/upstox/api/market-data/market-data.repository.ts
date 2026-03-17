import { Injectable, Logger } from "@nestjs/common";
import { HttpClientService } from "../../../../core/http-client.service";
import { AuthManagerService } from "@repo/authentication";
import { UPSTOX_API_URLS, UPSTOX_ENDPOINTS } from "../../constants";

export interface UpstoxQuoteResponse {
  status: string;
  data: Record<
    string,
    {
      last_price: number;
      ohlc: {
        open: number;
        high: number;
        low: number;
        close: number;
      };
      volume: number;
      depth: {
        buy: Array<{
          price: number;
          quantity: number;
          orders: number;
        }>;
        sell: Array<{
          price: number;
          quantity: number;
          orders: number;
        }>;
      };
      last_trade_time: string;
    }
  >;
}

/**
 * Market Data Repository
 *
 * Handles HTTP calls to Upstox market data endpoints.
 * Repository layer - no business logic, just data fetching.
 */
@Injectable()
export class MarketDataRepository {
  private readonly logger = new Logger(MarketDataRepository.name);

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly authManager: AuthManagerService
  ) {}

  /**
   * Get real-time quotes for instruments
   */
  async getQuote(
    userId: string,
    instrumentKeys: string[],
    environment: "SANDBOX" | "LIVE" = "LIVE"
  ): Promise<UpstoxQuoteResponse> {
    const token = await this.authManager.getAccessToken(
      userId,
      "upstox",
      environment
    );
    const baseUrl =
      environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    this.logger.debug(
      `Fetching quotes for ${instrumentKeys.length} instruments`
    );

    return this.httpClient.request<UpstoxQuoteResponse>({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.QUOTES}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Api-Version": "2.0",
      },
      params: {
        instrument_key: instrumentKeys.join(","),
      },
    });
  }

  /**
   * Get full market quote with depth
   */
  async getFullMarketQuote(
    userId: string,
    instrumentKeys: string[],
    environment: "SANDBOX" | "LIVE" = "LIVE"
  ): Promise<UpstoxQuoteResponse> {
    const token = await this.authManager.getAccessToken(
      userId,
      "upstox",
      environment
    );
    const baseUrl =
      environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request<UpstoxQuoteResponse>({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.FULL_MARKET_QUOTE}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Api-Version": "2.0",
      },
      params: {
        instrument_key: instrumentKeys.join(","),
      },
    });
  }

  /**
   * Get option chain for underlying
   */
  async getOptionChain(
    userId: string,
    instrumentKey: string,
    expiryDate: string,
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
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.OPTION_CHAIN}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Api-Version": "2.0",
      },
      params: {
        instrument_key: instrumentKey,
        expiry_date: expiryDate,
      },
    });
  }
}
