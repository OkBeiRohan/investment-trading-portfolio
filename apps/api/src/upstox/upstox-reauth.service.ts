import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrokerAccountRepository } from '@repo/database';

/**
 * Upstox Phase 2 Re-Authentication Service
 *
 * Upstox access tokens expire every day at midnight.
 * Phase 2 re-auth is a manual daily flow:
 *  1. User clicks "Re-Authenticate" in the web app
 *  2. API generates an Upstox authorization URL (this service)
 *  3. User is redirected to Upstox to approve
 *  4. Upstox redirects back to our callback with `code` + `state`
 *  5. We exchange `code` for `access_token` and store it
 *
 * This is separate from Phase 1 (initial account linking via better-auth genericOAuth).
 */
@Injectable()
export class UpstoxReAuthService {
  private readonly logger = new Logger(UpstoxReAuthService.name);

  private readonly UPSTOX_AUTH_URL =
    'https://api.upstox.com/v2/login/authorization/dialog';
  private readonly UPSTOX_TOKEN_URL =
    'https://api.upstox.com/v2/login/authorization/token';

  constructor(
    private readonly brokerAccountRepository: BrokerAccountRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Build the Upstox Phase 2 authorization URL.
   * The `state` parameter encodes the userId so we can identify
   * the account on callback without a session.
   */
  buildReAuthUrl(userId: string): string {
    const clientId = this.configService.getOrThrow<string>(
      'upstox.clientId',
    );
    const redirectUri = this.configService.getOrThrow<string>(
      'upstox.reAuthRedirectUri',
    );

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state: userId, // Encode userId so callback can look up the account
    });

    return `${this.UPSTOX_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange Phase 2 authorization code for an access token.
   * Called by the callback controller after Upstox redirects back.
   */
  async exchangeCodeForToken(
    code: string,
    userId: string,
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    const clientId = this.configService.getOrThrow<string>('upstox.clientId');
    const clientSecret = this.configService.getOrThrow<string>(
      'upstox.clientSecret',
    );
    const redirectUri = this.configService.getOrThrow<string>(
      'upstox.reAuthRedirectUri',
    );

    this.logger.log(`Exchanging Phase 2 code for token — userId: ${userId}`);

    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(this.UPSTOX_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Token exchange failed: ${response.status} — ${error}`);
      throw new UnauthorizedException(
        `Upstox token exchange failed: ${response.status}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number; // seconds
    };

    // Upstox tokens expire at midnight IST — expires_in is approximate
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in ?? 86400));

    return { accessToken: data.access_token, expiresAt };
  }

  /**
   * Complete Phase 2 re-auth: store new token + update lastReAuthAt.
   * Called after successful code exchange.
   */
  async completeReAuth(
    userId: string,
    accessToken: string,
    expiresAt: Date,
  ): Promise<void> {
    this.logger.log(`Completing Phase 2 re-auth for userId: ${userId}`);

    await this.brokerAccountRepository.updateAccessToken(
      userId,
      accessToken,
      expiresAt,
    );

    await this.brokerAccountRepository.updateLastReAuth(userId);

    this.logger.log(
      `Phase 2 re-auth complete for ${userId}, token expires: ${expiresAt.toISOString()}`,
    );
  }
}
