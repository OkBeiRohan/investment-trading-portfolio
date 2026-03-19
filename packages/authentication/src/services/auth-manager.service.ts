import { Injectable, UnauthorizedException, Logger, Inject, Optional } from "@nestjs/common";
import { AccountRepository, BrokerAccountRepository, REDIS_CLIENT } from "@repo/database";
import * as crypto from "crypto";

interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<any>;
  del(key: string): Promise<number>;
}

interface UpstoxAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

/**
 * Multi-tenant broker access-token manager.
 *
 * L1 Cache : Redis  (6 h TTL, optional — gracefully degrades without Redis)
 * L2 Store : broker_accounts (MongoDB)
 * L3 Fallback : better-auth accounts collection
 */
@Injectable()
export class AuthManagerService {
  private readonly logger = new Logger(AuthManagerService.name);
  private readonly REDIS_TTL = 21600; // 6 hours

  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly brokerAccountRepository: BrokerAccountRepository,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: IRedisClient
  ) {}

  async getAccessToken(
    userId: string,
    provider: string = "upstox",
    environment: "SANDBOX" | "LIVE" = "LIVE"
  ): Promise<string> {
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

    if (userId === "system") {
      const token = await this.resolveSystemToken(provider, cacheKey);
      if (token) {
        const masked = token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : '****';
        this.logger.log(`System access token resolved (token: ${masked})`);
        return token;
      }
      this.logger.warn(`System token resolution returned null for ${provider}/${environment}`);
    }

    // L2: broker_accounts (written by webhook / re-auth)
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

    // L3: better-auth accounts collection
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
   * For system-level access (market-feeder, cron jobs), find any valid token.
   * Priority: accounts collection (fresh OAuth) -> data-collection broker accounts -> any broker account
   */
  private async resolveSystemToken(
    provider: string,
    cacheKey: string,
  ): Promise<string | null> {
    const now = new Date();
    const maskToken = (t: string) => t.length > 8 ? `${t.slice(0, 4)}...${t.slice(-4)}` : '****';

    // L1: better-auth accounts collection (most recently authenticated OAuth tokens)
    const authAccounts = await this.accountRepository.findMany(
      {
        providerId: provider,
        accessToken: { $exists: true, $ne: null },
      },
      { limit: 5, sort: { updatedAt: -1 } },
    );

    for (const account of authAccounts) {
      if (
        account.accessToken &&
        (!account.accessTokenExpiresAt || now < account.accessTokenExpiresAt)
      ) {
        this.logger.log(
          `System token resolved from accounts collection (user: ${account.userId}, token: ${maskToken(account.accessToken)}, expiresAt: ${account.accessTokenExpiresAt ?? 'not set'})`,
        );
        await this.cacheToken(cacheKey, account.accessToken, this.REDIS_TTL);
        return account.accessToken;
      } else if (account.accessToken && account.accessTokenExpiresAt && now >= account.accessTokenExpiresAt) {
        this.logger.warn(
          `Skipping expired token from accounts collection (user: ${account.userId}, token: ${maskToken(account.accessToken)}, expired: ${account.accessTokenExpiresAt.toISOString()})`,
        );
      }
    }

    // L2: data-collection-enabled broker accounts
    const enabledAccounts =
      await this.brokerAccountRepository.findDataCollectionEnabledAccounts();

    for (const account of enabledAccounts) {
      if (
        account.accessToken &&
        (!account.accessTokenExpiresAt || now < account.accessTokenExpiresAt)
      ) {
        this.logger.log(
          `System token resolved from data-collection broker account (user: ${account.userId}, token: ${maskToken(account.accessToken)}, expiresAt: ${account.accessTokenExpiresAt ?? 'not set'})`,
        );
        await this.cacheToken(cacheKey, account.accessToken, this.REDIS_TTL);
        return account.accessToken;
      } else if (account.accessToken && account.accessTokenExpiresAt && now >= account.accessTokenExpiresAt) {
        this.logger.warn(
          `Skipping expired token from broker account (user: ${account.userId}, token: ${maskToken(account.accessToken)}, expired: ${account.accessTokenExpiresAt.toISOString()})`,
        );
      }
    }

    // L3: any broker_accounts entry with a valid token
    const anyBroker =
      await this.brokerAccountRepository.findAnyValidToken(provider);

    if (anyBroker?.accessToken) {
      this.logger.log(
        `System token resolved from broker account fallback (user: ${anyBroker.userId}, token: ${maskToken(anyBroker.accessToken)})`,
      );
      await this.cacheToken(cacheKey, anyBroker.accessToken, this.REDIS_TTL);
      return anyBroker.accessToken;
    }

    this.logger.warn(
      `No valid ${provider} token found for system access across accounts or broker_accounts. Ensure at least one user has authenticated today.`,
    );
    return null;
  }

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

  private getCacheKey(
    userId: string,
    provider: string,
    environment: string
  ): string {
    return `auth:${provider}:${environment}:${userId}`;
  }

  /** @deprecated Use getAccessToken(userId, provider, environment) */
  async getUpstoxAccessToken(userId: string): Promise<string> {
    return this.getAccessToken(userId, "upstox", "LIVE");
  }

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

  async hasUpstoxAccount(userId: string): Promise<boolean> {
    const account = await this.accountRepository.findOne({
      userId,
      providerId: "upstox",
    });
    return !!account;
  }

  async revokeUpstoxAccount(userId: string): Promise<void> {
    const account = await this.accountRepository.findOne({
      userId,
      providerId: "upstox",
    });
    if (account) {
      await this.accountRepository.delete(account._id.toString());
    }
  }

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
    const timestamp = Date.now().toString();
    const signature = crypto
      .createHmac("sha256", apiSecret)
      .update(timestamp)
      .digest("hex");

    const requestBody = {
      api_key: apiKey,
      timestamp,
      signature,
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

      return (await response.json()) as UpstoxAccessTokenResponse;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(
        `Failed to request Upstox access token: ${error?.message}`
      );
    }
  }

  async refreshAccessToken(
    refreshToken: string,
    environment: "sandbox" | "live" = "sandbox"
  ): Promise<UpstoxAccessTokenResponse> {
    const baseUrl =
      environment === "sandbox"
        ? "https://api-hft.upstox.com"
        : "https://api.upstox.com";

    const endpoint = `${baseUrl}/v2/login/authorization/token`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new UnauthorizedException(
          `Upstox token refresh failed: ${errorData.error || response.statusText}`
        );
      }

      return (await response.json()) as UpstoxAccessTokenResponse;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(
        `Failed to refresh Upstox access token: ${error?.message}`
      );
    }
  }

  async logoutUpstox(
    accessToken: string,
    environment: "sandbox" | "live" = "sandbox"
  ): Promise<{ success: boolean }> {
    const baseUrl =
      environment === "sandbox"
        ? "https://api-hft.upstox.com"
        : "https://api.upstox.com";

    try {
      const response = await fetch(`${baseUrl}/v2/logout`, {
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
