import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { AuthenticationError } from "../../../core/error";
import { UPSTOX_CONSTANTS } from "../constants";

export interface LiveAuthConfig {
  apiKey: string;
  apiSecret: string;
  redirectUri: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
}

@Injectable()
export class LiveAuthStrategy {
  private readonly logger = new Logger(LiveAuthStrategy.name);

  constructor(private config: ConfigService) {}

  generateAuthUrl(config: LiveAuthConfig, state?: string): string {
    const params = new URLSearchParams({
      client_id: config.apiKey,
      redirect_uri: config.redirectUri,
      response_type: "code",
      ...(state && { state }),
    });

    const url = `${UPSTOX_CONSTANTS.API.AUTH_URL}?${params.toString()}`;
    this.logger.debug(`Generated auth URL: ${url}`);
    return url;
  }

  async exchangeCodeForToken(
    authCode: string,
    config: LiveAuthConfig
  ): Promise<TokenResponse> {
    try {
      const params = new URLSearchParams({
        code: authCode,
        client_id: config.apiKey,
        client_secret: config.apiSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      });

      this.logger.debug("Exchanging authorization code for access token");

      const response = await axios.post<{ data: TokenResponse }>(
        UPSTOX_CONSTANTS.API.TOKEN_URL,
        params,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          timeout: UPSTOX_CONSTANTS.TIMEOUT.API_CALL,
        }
      );

      this.logger.log("Successfully obtained access token");
      return response.data.data;
    } catch (error: any) {
      const message =
        error.response?.data?.errors?.[0]?.message || error.message;
      this.logger.error(`Token exchange failed: ${message}`);
      throw new AuthenticationError(
        `Failed to exchange code for token: ${message}`,
        {
          upstoxError: error.response?.data,
        }
      );
    }
  }

  async refreshToken(
    refreshToken: string,
    config: LiveAuthConfig
  ): Promise<TokenResponse> {
    try {
      const params = new URLSearchParams({
        refresh_token: refreshToken,
        client_id: config.apiKey,
        client_secret: config.apiSecret,
        grant_type: "refresh_token",
      });

      const response = await axios.post<{ data: TokenResponse }>(
        UPSTOX_CONSTANTS.API.TOKEN_URL,
        params,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      this.logger.log("Token refreshed successfully");
      return response.data.data;
    } catch (error: any) {
      const message =
        error.response?.data?.errors?.[0]?.message || error.message;
      this.logger.error(`Token refresh failed: ${message}`);
      throw new AuthenticationError(`Failed to refresh token: ${message}`);
    }
  }
}
