import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AccountRepository } from "@repo/database";
import * as crypto from "crypto";

/**
 * Upstox Access Token Request Response
 * https://upstox.com/developer/api-documentation/access-token-request
 */
interface UpstoxAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
  refresh_token?: string;
}

@Injectable()
export class AuthManagerService {
  constructor(private readonly accountRepository: AccountRepository) {}

  /**
   * Get access token for Upstox from better-auth Account collection
   * Upstox accounts are stored with providerId="upstox"
   */
  async getAccessToken(userId: string): Promise<string> {
    const account = await this.accountRepository.findOne({
      userId,
      providerId: "upstox",
    });

    if (!account) {
      throw new UnauthorizedException(
        `No Upstox account linked for user ${userId}. Please connect your Upstox account.`
      );
    }

    if (!account.accessToken) {
      throw new UnauthorizedException(
        "Upstox access token not found. Please re-authenticate."
      );
    }

    // Check token expiry
    if (
      account.accessTokenExpiresAt &&
      new Date() > account.accessTokenExpiresAt
    ) {
      throw new UnauthorizedException(
        "Upstox session expired. Please re-authenticate."
      );
    }

    return account.accessToken;
  }

  /**
   * Get the Upstox account ID (user_id from Upstox)
   */
  async getUpstoxUserId(userId: string): Promise<string> {
    const account = await this.accountRepository.findOne({
      userId,
      providerId: "upstox",
    });

    if (!account) {
      throw new UnauthorizedException(
        `No Upstox account linked for user ${userId}.`
      );
    }

    return account.accountId;
  }

  /**
   * Check if user has linked Upstox account
   */
  async hasUpstoxAccount(userId: string): Promise<boolean> {
    const account = await this.accountRepository.findOne({
      userId,
      providerId: "upstox",
    });

    return !!account;
  }

  /**
   * Revoke Upstox account link
   */
  async revokeUpstoxAccount(userId: string): Promise<void> {
    const account = await this.accountRepository.findOne({
      userId,
      providerId: "upstox",
    });

    if (account) {
      await this.accountRepository.delete(account._id.toString());
    }
  }

  /**
   * Generate Upstox access token using API key + secret (Direct API flow)
   * This is different from OAuth flow - used for server-to-server authentication
   *
   * @see https://upstox.com/developer/api-documentation/access-token-request
   *
   * @param apiKey - Upstox API key from developer console
   * @param apiSecret - Upstox API secret from developer console
   * @param environment - 'sandbox' or 'live'
   * @returns Access token response with token and expiry
   *
   * @example
   * ```typescript
   * const token = await authManager.requestAccessToken(
   *   process.env.UPSTOX_API_KEY,
   *   process.env.UPSTOX_API_SECRET,
   *   'sandbox'
   * );
   * ```
   */
  async requestAccessToken(
    apiKey: string,
    apiSecret: string,
    environment: "sandbox" | "live" = "sandbox"
  ): Promise<UpstoxAccessTokenResponse> {
    const baseUrl =
      environment === "sandbox"
        ? "https://api-hft.upstox.com"
        : "https://api.upstox.com";

    const endpoint = `${baseUrl}/v2/login/authorization/token`;

    // Generate timestamp for request signature
    const timestamp = Date.now().toString();

    // Create signature: HMAC-SHA256(api_secret, timestamp)
    const signature = crypto
      .createHmac("sha256", apiSecret)
      .update(timestamp)
      .digest("hex");

    const requestBody = {
      api_key: apiKey,
      timestamp: timestamp,
      signature: signature,
      grant_type: "client_credentials",
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new UnauthorizedException(
          `Upstox access token request failed: ${errorData.error || response.statusText}`
        );
      }

      const data = (await response.json()) as UpstoxAccessTokenResponse;

      return data;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        `Failed to request Upstox access token: ${error?.message}`
      );
    }
  }

  /**
   * Refresh expired Upstox access token
   *
   * @param refreshToken - The refresh token from previous authentication
   * @param environment - 'sandbox' or 'live'
   * @returns New access token response
   *
   * @example
   * ```typescript
   * const newToken = await authManager.refreshAccessToken(
   *   account.refreshToken,
   *   'sandbox'
   * );
   * ```
   */
  async refreshAccessToken(
    refreshToken: string,
    environment: "sandbox" | "live" = "sandbox"
  ): Promise<UpstoxAccessTokenResponse> {
    const baseUrl =
      environment === "sandbox"
        ? "https://api-hft.upstox.com"
        : "https://api.upstox.com";

    const endpoint = `${baseUrl}/v2/login/authorization/token`;

    const requestBody = {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new UnauthorizedException(
          `Upstox token refresh failed: ${errorData.error || response.statusText}`
        );
      }

      const data = (await response.json()) as UpstoxAccessTokenResponse;

      return data;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        `Failed to refresh Upstox access token: ${error?.message}`
      );
    }
  }

  /**
   * Logout from Upstox (revoke access token)
   *
   * @see https://upstox.com/developer/api-documentation/logout
   *
   * @param accessToken - Current access token to revoke
   * @param environment - 'sandbox' or 'live'
   * @returns Success status
   */
  async logoutUpstox(
    accessToken: string,
    environment: "sandbox" | "live" = "sandbox"
  ): Promise<{ success: boolean }> {
    const baseUrl =
      environment === "sandbox"
        ? "https://api-hft.upstox.com"
        : "https://api.upstox.com";

    const endpoint = `${baseUrl}/v2/logout`;

    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Upstox logout failed:", errorData);
        return { success: false };
      }

      return { success: true };
    } catch (error: any) {
      console.error("Failed to logout from Upstox:", error);
      return { success: false };
    }
  }
}
