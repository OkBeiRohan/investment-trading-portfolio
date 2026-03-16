import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { AccountRepository, BrokerAccountRepository } from "@repo/database";

/**
 * Upstox Phase 2 Re-Authentication Service
 *
 * Upstox access tokens expire daily at midnight. Phase 2 re-auth is the
 * daily manual flow that refreshes these tokens WITHOUT revoking Phase 1
 * (the initial better-auth genericOAuth account link).
 *
 * Flow:
 *  1. buildReAuthUrl(userId) → send user to Upstox authorization page
 *  2. Upstox redirects to /api/upstox/reauth/callback?code=&state={userId}
 *  3. exchangeCodeForToken(code, userId) → POST to Upstox token endpoint
 *  4. completeReAuth(userId, token, expiresAt) → write token to better-auth
 *     accounts collection + update broker_accounts.lastReAuthAt
 *
 * Lives in @repo/market-sdk/src/auth/ alongside AuthManagerService,
 * TokenRefreshService, and TokenStorageService because:
 *  - Token management is a market-data SDK concern (tokens enable API/WS calls)
 *  - Any service (api, algo-worker) may need to trigger this flow
 *  - apps/api is a gateway; business logic belongs in shared packages
 */
@Injectable()
export class UpstoxReAuthService {
  private readonly logger = new Logger(UpstoxReAuthService.name);

  private readonly UPSTOX_AUTH_URL =
    "https://api.upstox.com/v2/login/authorization/dialog";
  private readonly UPSTOX_TOKEN_URL =
    "https://api.upstox.com/v2/login/authorization/token";

  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly brokerAccountRepository: BrokerAccountRepository
  ) {}

  /**
   * Build the Phase 2 Upstox authorization URL.
   *
   * @param userId - better-auth user ID (encoded in `state` so callback can look up account)
   * @param clientId - Upstox app clientId
   * @param redirectUri - Phase 2 redirect URI (different from Phase 1)
   */
  buildReAuthUrl(
    userId: string,
    clientId: string,
    redirectUri: string
  ): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state: userId,
    });
    return `${this.UPSTOX_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange Phase 2 authorization code for an access token.
   *
   * @param code - OAuth authorization code from Upstox callback
   * @param userId - better-auth user ID (from callback `state`)
   * @param clientId - Upstox app clientId
   * @param clientSecret - Upstox app clientSecret
   * @param redirectUri - Phase 2 redirect URI
   */
  async exchangeCodeForToken(
    code: string,
    userId: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    this.logger.log(`Phase 2 code exchange — userId: ${userId}`);

    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const response = await fetch(this.UPSTOX_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(
        `Token exchange failed: ${response.status} — ${error}`
      );
      throw new UnauthorizedException(
        `Upstox token exchange failed: ${response.status}`
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in?: number;
    };

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in ?? 86400));

    return { accessToken: data.access_token, expiresAt };
  }

  /**
   * Complete Phase 2 re-auth:
   * 1. Write new token to better-auth's accounts collection (AccountRepository)
   * 2. Record lastReAuthAt on broker_accounts
   */
  async completeReAuth(
    userId: string,
    accessToken: string,
    expiresAt: Date
  ): Promise<void> {
    this.logger.log(`Completing Phase 2 re-auth for userId: ${userId}`);

    // Verify Upstox account exists before updating
    const account = await this.accountRepository.findOne({
      userId,
      providerId: "upstox",
    });

    if (!account) {
      throw new UnauthorizedException(
        `No Upstox account linked for user ${userId}`
      );
    }

    // Write token to better-auth's accounts collection (source of truth for tokens)
    await this.accountRepository.updateMany(
      { userId, providerId: "upstox" },
      { accessToken, accessTokenExpiresAt: expiresAt }
    );

    // Record re-auth timestamp on broker_accounts for admin visibility
    await this.brokerAccountRepository.updateLastReAuth(userId);

    this.logger.log(
      `Phase 2 re-auth complete for ${userId}, expires: ${expiresAt.toISOString()}`
    );
  }
}
