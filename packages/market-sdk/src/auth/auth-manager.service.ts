import { Injectable, UnauthorizedException, Logger, Inject, Optional } from "@nestjs/common";
import { AccountRepository, BrokerAccountRepository, REDIS_CLIENT } from "@repo/database";
import * as crypto from "crypto";

// Minimal Redis interface matching ioredis client
interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<any>;
  del(key: string): Promise<number>;
}

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

/**
 * Enhanced Multi-Tenant Auth Manager
 *
 * Features:
 * - L1 Cache: Redis (6-hour TTL, <1ms access)
 * - L2 Storage: MongoDB (encrypted, persistent)
 * - Sandbox/Live mode support
 * - Automatic token refresh integration
 *
 * @example
 * ```typescript
 * const token = await authManager.getAccessToken('user123', 'upstox', 'LIVE');
 * ```
 */
@Injectable()
export class AuthManagerService {
  private readonly logger = new Logger(AuthManagerService.name);
  private readonly REDIS_TTL = 21600; // 6 hours in seconds

  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly brokerAccountRepository: BrokerAccountRepository,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: IRedisClient
  ) {}


  /**
   * Get access token with L1 (Redis) + L2 (MongoDB) caching
   *
   * @param userId - Better-auth user ID
   * @param provider - Provider name (upstox, binance, yahoo)
   * @param environment - SANDBOX or LIVE mode
   */
  async getAccessToken(
    userId: string,
    provider: string = "upstox",
    environment: "SANDBOX" | "LIVE" = "LIVE"
  ): Promise<string> {
    // L1: Check Redis cache (skipped when Redis is unavailable)
    const cacheKey = this.getCacheKey(userId, provider, environment);

    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(
          `Token cache HIT for ${userId} (${provider}/${environment})`
        );
        return cached;
      }
      this.logger.debug(
        `Token cache MISS for ${userId} (${provider}/${environment})`
      );
    }

    // L2: Check broker_accounts (PRIMARY — written by Upstox webhook / re-auth)
    const brokerAccount =
      await this.brokerAccountRepository.findWithAccessToken(userId, provider);

    if (brokerAccount?.accessToken) {
      if (
        brokerAccount.accessTokenExpiresAt &&
        new Date() > brokerAccount.accessTokenExpiresAt
      ) {
        throw new UnauthorizedException(
          `${provider} session expired (broker account). Please re-authenticate.`
        );
      }

      this.logger.debug(
        `Token resolved from broker_accounts for ${userId} (${provider})`
      );
      await this.cacheToken(cacheKey, brokerAccount.accessToken, this.REDIS_TTL);
      return brokerAccount.accessToken;
    }

    // L3: Fallback to Better Auth accounts collection
    const account = await this.accountRepository.findOne({
      userId,
      providerId: provider,
    });

    if (!account?.accessToken) {
      throw new UnauthorizedException(
        `No ${provider} access token found for user ${userId}. Please connect your account.`
      );
    }

    if (
      account.accessTokenExpiresAt &&
      new Date() > account.accessTokenExpiresAt
    ) {
      throw new UnauthorizedException(
        `${provider} session expired. Please re-authenticate.`
      );
    }

    this.logger.debug(
      `Token resolved from auth accounts (fallback) for ${userId} (${provider})`
    );
    await this.cacheToken(cacheKey, account.accessToken, this.REDIS_TTL);
    return account.accessToken;
  }

  /**
   * Cache token in Redis with TTL
   */
  private async cacheToken(
    key: string,
    token: string,
    ttl: number
  ): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(key, token, "EX", ttl);
      this.logger.debug(`Cached token: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Failed to cache token: ${error}`);
    }
  }

  /**
   * Invalidate token cache (e.g., after refresh or revoke)
   */
  async invalidateCache(
    userId: string,
    provider: string,
    environment: "SANDBOX" | "LIVE"
  ): Promise<void> {
    if (!this.redis) return;
    const cacheKey = this.getCacheKey(userId, provider, environment);
    await this.redis.del(cacheKey);
    this.logger.log(`Invalidated token cache: ${cacheKey}`);
  }

  /**
   * Generate Redis cache key
   */
  private getCacheKey(
    userId: string,
    provider: string,
    environment: string
  ): string {
    return `auth:${provider}:${environment}:${userId}`;
  }

  /**
   * Get access token (legacy method - defaults to Upstox LIVE)
   * @deprecated Use getAccessToken(userId, provider, environment) instead
   */
  async getUpstoxAccessToken(userId: string): Promise<string> {
    return this.getAccessToken(userId, "upstox", "LIVE");
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
