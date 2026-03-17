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
  MarketQuoteFull,
  OhlcQuote,
  LtpQuote,
  OptionGreek,
  MarketHolidayEntry,
  MarketTiming,
  ExchangeStatus,
  WebSocketAuthResponse,
} from "../types";

/** @deprecated Use MarketQuoteFull from api/types instead */
export interface UpstoxQuoteResponse {
  status: string;
  data: Record<string, MarketQuoteFull>;
}

@Injectable()
export class MarketDataRepository {
  private readonly logger = new Logger(MarketDataRepository.name);

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly authManager: AuthManagerService,
  ) {}

  // ─── Full Market Quotes (V2) ─────────────────────────────────────────

  async getFullMarketQuote(
    userId: string,
    instrumentKeys: string[],
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<Record<string, MarketQuoteFull>>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.FULL_MARKET_QUOTE}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
      params: { instrument_key: instrumentKeys.join(",") },
    });
  }

  // ─── OHLC Quotes (V2) ────────────────────────────────────────────────

  async getOhlcQuote(
    userId: string,
    instrumentKeys: string[],
    interval: "1d" | "I1" | "I5" | "I15" | "I30" = "1d",
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<Record<string, OhlcQuote>>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.OHLC_QUOTE}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
      params: { instrument_key: instrumentKeys.join(","), interval },
    });
  }

  // ─── LTP Quotes (V2) ─────────────────────────────────────────────────

  async getLtpQuote(
    userId: string,
    instrumentKeys: string[],
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<Record<string, LtpQuote>>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.LTP_QUOTE}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
      params: { instrument_key: instrumentKeys.join(",") },
    });
  }

  // ─── OHLC Quotes V3 ──────────────────────────────────────────────────

  async getOhlcQuoteV3(
    userId: string,
    instrumentKeys: string[],
    interval: "1d" | "I1" | "I5" | "I15" | "I30" = "1d",
  ): Promise<UpstoxApiResponse<Record<string, OhlcQuote>>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", "LIVE");

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${UPSTOX_CONSTANTS.API.BASE_URL_V3}${UPSTOX_V3_ENDPOINTS.OHLC_QUOTE}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      params: { instrument_key: instrumentKeys.join(","), interval },
    });
  }

  // ─── LTP Quotes V3 ───────────────────────────────────────────────────

  async getLtpQuoteV3(
    userId: string,
    instrumentKeys: string[],
  ): Promise<UpstoxApiResponse<Record<string, LtpQuote>>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", "LIVE");

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${UPSTOX_CONSTANTS.API.BASE_URL_V3}${UPSTOX_V3_ENDPOINTS.LTP_QUOTE}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      params: { instrument_key: instrumentKeys.join(",") },
    });
  }

  // ─── Option Greeks ────────────────────────────────────────────────────

  async getOptionGreeks(
    userId: string,
    instrumentKeys: string[],
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<Record<string, OptionGreek>>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.OPTION_GREEKS}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
      params: { instrument_key: instrumentKeys.join(",") },
    });
  }

  // ─── Option Chain (V2) ────────────────────────────────────────────────

  async getOptionChain(
    userId: string,
    instrumentKey: string,
    expiryDate: string,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<unknown[]>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.OPTION_CHAIN}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
      params: { instrument_key: instrumentKey, expiry_date: expiryDate },
    });
  }

  /** @deprecated Use getFullMarketQuote instead */
  async getQuote(
    userId: string,
    instrumentKeys: string[],
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxQuoteResponse> {
    return this.getFullMarketQuote(userId, instrumentKeys, environment) as any;
  }

  // ─── Market Information ───────────────────────────────────────────────

  async getMarketHolidays(
    date?: string,
  ): Promise<UpstoxApiResponse<MarketHolidayEntry[]>> {
    const url = date
      ? `${UPSTOX_API_URLS.LIVE}${UPSTOX_ENDPOINTS.MARKET_HOLIDAYS}/${date}`
      : `${UPSTOX_API_URLS.LIVE}${UPSTOX_ENDPOINTS.MARKET_HOLIDAYS}`;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: url,
      method: "GET",
      headers: { Accept: "application/json" },
    });
  }

  async getMarketTimings(
    date: string,
  ): Promise<UpstoxApiResponse<MarketTiming[]>> {
    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${UPSTOX_API_URLS.LIVE}${UPSTOX_ENDPOINTS.MARKET_TIMINGS}/${date}`,
      method: "GET",
      headers: { Accept: "application/json" },
    });
  }

  async getExchangeStatus(
    exchange: string,
  ): Promise<UpstoxApiResponse<ExchangeStatus>> {
    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${UPSTOX_API_URLS.LIVE}${UPSTOX_ENDPOINTS.EXCHANGE_STATUS}/${exchange}`,
      method: "GET",
      headers: { Accept: "application/json" },
    });
  }

  // ─── WebSocket Auth URLs ──────────────────────────────────────────────

  async getMarketDataFeedAuthorizeUrl(
    userId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<WebSocketAuthResponse>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.MARKET_DATA_FEED_AUTHORIZE}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
    });
  }

  async getMarketDataFeedAuthorizeUrlV3(
    userId: string,
  ): Promise<UpstoxApiResponse<WebSocketAuthResponse>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", "LIVE");

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${UPSTOX_CONSTANTS.API.BASE_URL_V3}${UPSTOX_V3_ENDPOINTS.MARKET_DATA_FEED_AUTHORIZE}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getPortfolioStreamFeedAuthorizeUrl(
    userId: string,
    environment: "SANDBOX" | "LIVE" = "LIVE",
  ): Promise<UpstoxApiResponse<WebSocketAuthResponse>> {
    const token = await this.authManager.getAccessToken(userId, "upstox", environment);
    const baseUrl = environment === "LIVE" ? UPSTOX_API_URLS.LIVE : UPSTOX_API_URLS.SANDBOX;

    return this.httpClient.request({
      provider: "upstox",
      endpoint: `${baseUrl}${UPSTOX_ENDPOINTS.PORTFOLIO_STREAM_AUTHORIZE}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Api-Version": "2.0" },
    });
  }
}
