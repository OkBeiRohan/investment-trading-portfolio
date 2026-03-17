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
 *  1. buildReAuthUrl(userId) -> send user to Upstox authorization page
 *  2. Upstox redirects to /api/upstox/reauth/callback?code=&state={userId}
 *  3. exchangeCodeForToken(code, userId) -> POST to Upstox token endpoint
 *  4. completeReAuth(userId, token, expiresAt) -> write token to better-auth
 *     accounts collection + update broker_accounts.lastReAuthAt
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

  async completeReAuth(
    userId: string,
    accessToken: string,
    expiresAt: Date
  ): Promise<void> {
    this.logger.log(`Completing Phase 2 re-auth for userId: ${userId}`);

    const account = await this.accountRepository.findOne({
      userId,
      providerId: "upstox",
    });

    if (!account) {
      throw new UnauthorizedException(
        `No Upstox account linked for user ${userId}`
      );
    }

    await this.accountRepository.updateMany(
      { userId, providerId: "upstox" },
      { accessToken, accessTokenExpiresAt: expiresAt }
    );

    await this.brokerAccountRepository.updateLastReAuth(userId);

    this.logger.log(
      `Phase 2 re-auth complete for ${userId}, expires: ${expiresAt.toISOString()}`
    );
  }
}
