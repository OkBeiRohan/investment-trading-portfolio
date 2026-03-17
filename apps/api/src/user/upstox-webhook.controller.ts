import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import type { IUpstoxNotifierWebhook } from '@repo/schema';
import { BrokerAccountRepository } from '@repo/database';
import { TokenRefreshService } from '@repo/authentication';

/**
 * Upstox Webhook Controller
 * Receives access tokens from Upstox Notifier Webhook
 * https://upstox.com/developer/api-documentation/access-token-request#notifier-webhook
 */
@Controller('webhooks/upstox')
export class UpstoxWebhookController {
  private readonly logger = new Logger(UpstoxWebhookController.name);

  constructor(
    private readonly brokerAccountRepository: BrokerAccountRepository,
    private readonly tokenRefreshService: TokenRefreshService,
  ) {}

  /**
   * Notifier Webhook Endpoint
   * Receives access tokens when user approves request
   *
   * @route POST /api/webhooks/upstox/token-notification
   */
  @Post('token-notification')
  @HttpCode(HttpStatus.OK)
  async handleTokenNotification(
    @Body() payload: IUpstoxNotifierWebhook,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `Received access token for user: ${payload.user_id}, expires at: ${new Date(Number(payload.expires_at)).toISOString()}`,
    );

    try {
      // Find the broker account by Upstox user_id (stored in profile.userId)
      const brokerAccount =
        await this.brokerAccountRepository.findByUpstoxUserId(payload.user_id);

      if (!brokerAccount) {
        this.logger.error(
          `No broker account found for Upstox user_id: ${payload.user_id}`,
        );
        throw new UnauthorizedException(
          `Broker account not found for Upstox user ${payload.user_id}`,
        );
      }

      // Update access token and expiry
      await this.brokerAccountRepository.updateAccessToken(
        brokerAccount.userId,
        payload.access_token,
        new Date(Number(payload.expires_at)),
      );

      this.logger.log(
        `Successfully updated access token for user: ${brokerAccount.userId}`,
      );

      return {
        success: true,
        message: 'Access token updated successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to process token notification: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Manually trigger token refresh for a user
   * Useful for testing or forcing refresh
   *
   * @route GET /api/webhooks/upstox/refresh-token/:userId
   */
  @Get('refresh-token/:userId')
  async refreshToken(
    @Param('userId') userId: string,
  ): Promise<{ requested: boolean; message: string }> {
    this.logger.log(`Manual token refresh requested for user: ${userId}`);

    try {
      const result = await this.tokenRefreshService.refreshTokenForUser(userId);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Token refresh failed: ${errorMessage}`);
      throw error;
    }
  }
}
