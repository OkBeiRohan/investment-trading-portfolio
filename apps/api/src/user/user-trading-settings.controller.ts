import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import { BrokerAccountRepository } from '@repo/database';
import type { BrokerSegment } from '@repo/schema';

/**
 * User Trading Settings Controller
 *
 * Allows users to manage their own Upstox trading settings and
 * admins to manage data-collection enrollment.
 *
 * Note: Route guards and session extraction should be added via
 * the app's auth middleware (NestJS guards + better-auth session).
 */
@Controller('user')
export class UserTradingSettingsController {
  private readonly logger = new Logger(UserTradingSettingsController.name);

  constructor(
    private readonly brokerAccountRepository: BrokerAccountRepository,
  ) {}

  /**
   * Get the current user's Upstox broker account info.
   * Returns everything except the raw access token.
   *
   * @route GET /api/user/broker-account
   */
  @Get('broker-account')
  @HttpCode(HttpStatus.OK)
  async getBrokerAccount(
    // TODO: Replace with @CurrentUser() decorator from auth guard
    // For now userId comes from query — add proper auth guard
  ) {
    // Placeholder: real implementation extracts userId from session
    return { message: 'Attach auth guard to extract userId from session' };
  }

  /**
   * User updates their own trading settings.
   * Users can enable/disable trading and choose segments.
   *
   * @route PUT /api/user/broker-account/trading-settings
   * Body: { hasTradingEnabled?: boolean, tradingSegments?: BrokerSegment[] }
   */
  @Put('broker-account/trading-settings')
  @HttpCode(HttpStatus.OK)
  async updateTradingSettings(
    @Body()
    body: {
      userId: string; // TODO: extract from auth session instead
      hasTradingEnabled?: boolean;
      tradingSegments?: BrokerSegment[];
    },
  ) {
    const { userId, hasTradingEnabled, tradingSegments } = body;

    if (!userId) {
      throw new UnauthorizedException('userId is required');
    }

    this.logger.log(
      `Updating trading settings for user ${userId}: hasTradingEnabled=${hasTradingEnabled}, segments=${tradingSegments?.join(',')}`,
    );

    const updated = await this.brokerAccountRepository.updateTradingSettings(
      userId,
      {
        ...(hasTradingEnabled !== undefined && { hasTradingEnabled }),
        ...(tradingSegments !== undefined && { tradingSegments }),
      },
    );

    if (!updated) {
      throw new UnauthorizedException(
        'Broker account not found for this user',
      );
    }

    return {
      success: true,
      hasTradingEnabled: updated.hasTradingEnabled,
      tradingSegments: updated.tradingSegments,
    };
  }

  /**
   * Admin toggles data-collection enrollment for any user.
   * Only users with role=Admin can call this.
   *
   * @route PUT /api/admin/users/:userId/data-collection
   * Body: { enabled: boolean, requestingAdminId: string }
   */
  @Put('admin/users/:userId/data-collection')
  @HttpCode(HttpStatus.OK)
  async setDataCollection(
    @Param('userId') targetUserId: string,
    @Body()
    body: {
      enabled: boolean;
      requestingAdminId: string; // TODO: extract from auth session + role guard
    },
  ) {
    const { enabled, requestingAdminId } = body;

    if (!requestingAdminId) {
      throw new ForbiddenException('Admin authentication required');
    }

    this.logger.log(
      `Admin ${requestingAdminId} setting isDataCollectionEnabled=${enabled} for user ${targetUserId}`,
    );

    const updated = await this.brokerAccountRepository.updateTradingSettings(
      targetUserId,
      { isDataCollectionEnabled: enabled },
    );

    if (!updated) {
      throw new UnauthorizedException(
        `Broker account not found for user ${targetUserId}`,
      );
    }

    return {
      success: true,
      userId: targetUserId,
      isDataCollectionEnabled: updated.isDataCollectionEnabled,
    };
  }
}
