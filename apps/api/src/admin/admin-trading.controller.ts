import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, Session } from '@repo/authentication';
import {
  TradingConfigRepository,
  BrokerAccountRepository,
  AuditLogRepository,
} from '@repo/database';

// TODO: Add admin role check guard
@Controller('api/admin/trading')
@UseGuards(AuthGuard)
export class AdminTradingController {
  private readonly logger = new Logger(AdminTradingController.name);

  constructor(
    private readonly tradingConfigRepo: TradingConfigRepository,
    private readonly brokerAccountRepo: BrokerAccountRepository,
    private readonly auditLogRepo: AuditLogRepository,
  ) {}

  /**
   * List all users with trading status.
   * @route GET /api/admin/trading/users
   */
  @Get('users')
  @HttpCode(HttpStatus.OK)
  async listUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    // TODO: Get all trading configs with pagination, join with broker accounts
    return { page: +page, limit: +limit, items: [], total: 0 };
  }

  /**
   * Admin enables trading for a specific user.
   * @route POST /api/admin/trading/users/:userId/enable
   */
  @Post('users/:userId/enable')
  @HttpCode(HttpStatus.OK)
  async enableUserTrading(
    @Param('userId') userId: string,
    @Session() session: any,
  ) {
    const config = await this.tradingConfigRepo.enableTrading(userId);

    await this.auditLogRepo.create({
      action: 'admin.trading.enable',
      category: 'admin',
      userId: session.user.id,
      targetId: userId,
      targetType: 'user',
    });

    this.logger.log(`Admin ${session.user.id} enabled trading for user ${userId}`);
    return config;
  }

  /**
   * Admin disables trading for a specific user.
   * @route POST /api/admin/trading/users/:userId/disable
   */
  @Post('users/:userId/disable')
  @HttpCode(HttpStatus.OK)
  async disableUserTrading(
    @Param('userId') userId: string,
    @Session() session: any,
  ) {
    await this.tradingConfigRepo.disableTrading(userId);

    await this.auditLogRepo.create({
      action: 'admin.trading.disable',
      category: 'admin',
      userId: session.user.id,
      targetId: userId,
      targetType: 'user',
    });

    this.logger.log(`Admin ${session.user.id} disabled trading for user ${userId}`);
    return { disabled: true };
  }

  /**
   * System-wide trading status overview.
   * @route GET /api/admin/trading/status
   */
  @Get('status')
  @HttpCode(HttpStatus.OK)
  async getSystemStatus() {
    // TODO: Aggregate counts — active traders, total configs, disabled, sandbox, etc.
    return { activeTraders: 0, totalConfigs: 0, disabled: 0, sandbox: 0 };
  }

  /**
   * Global kill switch — disables all trading configs immediately.
   * @route POST /api/admin/trading/kill-switch
   */
  @Post('kill-switch')
  @HttpCode(HttpStatus.OK)
  async killSwitch(
    @Session() session: any,
    @Body() body: { reason: string },
  ) {
    // TODO: Disable all trading configs in bulk
    this.logger.warn(`KILL SWITCH activated by admin ${session.user.id}: ${body.reason}`);

    await this.auditLogRepo.create({
      action: 'admin.trading.kill-switch',
      category: 'admin',
      userId: session.user.id,
      details: { reason: body.reason },
    });

    return { killSwitch: true, reason: body.reason };
  }
}
