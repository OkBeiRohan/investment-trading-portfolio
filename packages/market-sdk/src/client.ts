/**
 * Upstox Client - Main SDK Entry Point
 * Comprehensive wrapper for Upstox API with TypeScript support
 */

import UpstoxClient from "upstox-js-sdk";
import { OrderApi } from "./api/order.api";
import { MarketDataApi } from "./api/market-data.api";
import { PortfolioApi } from "./api/portfolio.api";
import { MarketDataStream } from "./websocket/market-data.stream";
import { PortfolioStream } from "./websocket/portfolio.stream";
import type { ApiConfig } from "./types";

export class UpstoxSDK {
  private apiClient: typeof UpstoxClient.ApiClient;
  private config: ApiConfig;

  // API modules
  public order: OrderApi;
  public marketData: MarketDataApi;
  public portfolio: PortfolioApi;

  // WebSocket streams (lazy-loaded)
  private _marketDataStream?: MarketDataStream;
  private _portfolioStream?: PortfolioStream;

  constructor(config: ApiConfig) {
    this.config = config;

    // Initialize Upstox API client
    this.apiClient = UpstoxClient.ApiClient.instance;
    const oauth2 = this.apiClient.authentications["OAUTH2"];

    if (config.accessToken) {
      oauth2.accessToken = config.accessToken;
    }

    // Initialize API modules
    this.order = new OrderApi(this.apiClient);
    this.marketData = new MarketDataApi(this.apiClient);
    this.portfolio = new PortfolioApi(this.apiClient);
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(accessToken: string): void {
    this.config.accessToken = accessToken;
    const oauth2 = this.apiClient.authentications["OAUTH2"];
    oauth2.accessToken = accessToken;
  }

  /**
   * Get authorization URL for OAuth2 flow
   */
  getAuthorizationUrl(): string {
    const baseUrl = "https://api.upstox.com/v2/login/authorization/dialog";
    const params = new URLSearchParams({
      client_id: this.config.apiKey,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
    });
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string): Promise<{
    accessToken: string;
    expiresIn: number;
    tokenType: string;
  }> {
    const loginApi = new UpstoxClient.LoginApi();

    return new Promise((resolve, reject) => {
      const tokenRequest = new UpstoxClient.TokenRequest(
        code,
        this.config.apiKey,
        this.config.apiSecret,
        this.config.redirectUri,
        "authorization_code"
      );

      loginApi.token(
        "2.0",
        tokenRequest,
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            const accessToken = data.access_token;
            this.setAccessToken(accessToken);

            resolve({
              accessToken: data.access_token,
              expiresIn: data.expires_in,
              tokenType: data.token_type,
            });
          }
        }
      );
    });
  }

  /**
   * Get user profile information
   */
  async getUserProfile(): Promise<any> {
    const userApi = new UpstoxClient.UserApi();

    return new Promise((resolve, reject) => {
      userApi.getProfile("2.0", (error: any, data: any, response: any) => {
        if (error) {
          reject(this.parseError(error));
        } else {
          resolve(data.data);
        }
      });
    });
  }

  /**
   * Create market data stream (lazy initialization)
   */
  createMarketDataStream(config?: {
    reconnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
  }): MarketDataStream {
    if (!this._marketDataStream) {
      this._marketDataStream = new MarketDataStream(config);
    }
    return this._marketDataStream;
  }

  /**
   * Create portfolio stream (lazy initialization)
   */
  createPortfolioStream(config?: {
    reconnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
  }): PortfolioStream {
    if (!this._portfolioStream) {
      this._portfolioStream = new PortfolioStream(config);
    }
    return this._portfolioStream;
  }

  /**
   * Cleanup and disconnect all streams
   */
  disconnect(): void {
    if (this._marketDataStream) {
      this._marketDataStream.disconnect();
      this._marketDataStream = undefined;
    }

    if (this._portfolioStream) {
      this._portfolioStream.disconnect();
      this._portfolioStream = undefined;
    }
  }

  private parseError(error: any): Error {
    if (error.response && error.response.text) {
      try {
        const errorData = JSON.parse(error.response.text);
        const errorMessage =
          errorData.errors?.[0]?.message ||
          errorData.message ||
          "Unknown error";
        return new Error(errorMessage);
      } catch {
        return new Error(error.response.text);
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}

// Re-export everything for convenience
export * from "./types";
export * from "./api";
export * from "./websocket";
