import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { UpstoxReAuthService } from './upstox-reauth.service';
import { ConfigService } from '@nestjs/config';

/**
 * Upstox Phase 2 Re-Authentication Controller
 *
 * Handles the daily re-authentication flow for Upstox tokens.
 * Upstox tokens expire at midnight every day; users must re-authorize.
 */
@Controller('upstox/reauth')
export class UpstoxReAuthController {
  private readonly logger = new Logger(UpstoxReAuthController.name);

  constructor(
    private readonly reAuthService: UpstoxReAuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a Phase 2 Upstox authorization URL for a user.
   * Called by the web app when user clicks "Re-Authenticate".
   *
   * @route GET /api/upstox/reauth/url?userId=
   */
  @Get('url')
  @HttpCode(HttpStatus.OK)
  getReAuthUrl(
    @Query('userId') userId: string,
  ): { url: string } {
    if (!userId) {
      throw new UnauthorizedException('userId is required');
    }

    const url = this.reAuthService.buildReAuthUrl(userId);
    return { url };
  }

  /**
   * Phase 2 OAuth callback — Upstox redirects here after user approves.
   * Exchanges `code` for an access token, stores it, then redirects to web app.
   *
   * @route GET /api/upstox/reauth/callback?code=&state=
   */
  @Get('callback')
  async handleReAuthCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    const webAppUrl = this.configService.get<string>(
      'app.webUrl',
      'http://localhost:3000',
    );
    const successRedirect = `${webAppUrl}/account/upstox?reauth=success`;
    const errorRedirect = `${webAppUrl}/account/upstox?reauth=error`;

    if (error) {
      this.logger.warn(
        `Phase 2 re-auth rejected by user or Upstox: ${error} (userId: ${userId})`,
      );
      res.redirect(errorRedirect);
      return;
    }

    if (!code || !userId) {
      this.logger.error('Phase 2 callback missing code or state');
      res.redirect(errorRedirect);
      return;
    }

    try {
      const { accessToken, expiresAt } =
        await this.reAuthService.exchangeCodeForToken(code, userId);

      await this.reAuthService.completeReAuth(userId, accessToken, expiresAt);

      this.logger.log(
        `Phase 2 re-auth complete for ${userId}, redirecting to web app`,
      );
      res.redirect(successRedirect);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Phase 2 re-auth failed: ${message}`);
      res.redirect(`${errorRedirect}&message=${encodeURIComponent(message)}`);
    }
  }
}
