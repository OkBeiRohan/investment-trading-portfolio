import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, Session } from '@repo/authentication';
import {
  TradingConfigRepository,
  BrokerAccountRepository,
  AuditLogRepository,
} from '@repo/database';

@Controller('api/trading')
@UseGuards(AuthGuard)
export class TradingSettingsController {
  constructor(
    private readonly tradingConfigRepo: TradingConfigRepository,
    private readonly brokerAccountRepo: BrokerAccountRepository,
    private readonly auditLogRepo: AuditLogRepository,
  ) {}

  @Get('settings')
  async getSettings(@Session() session: any) {
    const userId = session.user.id;
    let config = await this.tradingConfigRepo.findByUserId(userId);

    if (!config) {
      config = await this.tradingConfigRepo.create({
        userId,
        enabled: false,
        sandboxMode: true,
        dailyReAuthRequired: true,
        segments: {
          equity: false,
          fno: true,
          mcx: false,
          currency: false,
        },
        riskLimits: {
          maxDailyLoss: 50000,
          maxPositions: 10,
          maxOrderSize: 1800,
          maxDrawdownPercent: 5,
          maxLeverageMultiple: 1,
        },
      });
    }

    return config;
  }

  @Put('settings')
  async updateSettings(@Session() session: any, @Body() body: any) {
    const userId = session.user.id;

    const allowed = [
      'sandboxMode',
      'segments',
      'riskLimits',
      'allowedInstruments',
      'blockedInstruments',
      'strategyConfig',
      'tradingStartTime',
      'tradingEndTime',
      'notes',
    ];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const config = await this.tradingConfigRepo.updateByUserId(userId, updates);

    await this.auditLogRepo.create({
      action: 'trading.settings.update',
      category: 'trading',
      userId,
      details: updates,
    });

    return config;
  }

  @Post('enable')
  async enableTrading(@Session() session: any) {
    const userId = session.user.id;

    const brokerAccount = await this.brokerAccountRepo.findOne({
      userId,
      providerId: 'upstox',
    });
    if (!brokerAccount) {
      throw new HttpException(
        'No Upstox account linked. Please link your Upstox account first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const config = await this.tradingConfigRepo.enableTrading(userId);

    await this.auditLogRepo.create({
      action: 'trading.enable',
      category: 'trading',
      userId,
      details: { sandboxMode: config?.sandboxMode },
    });

    return { enabled: true, config };
  }

  @Post('disable')
  async disableTrading(@Session() session: any) {
    const userId = session.user.id;

    await this.tradingConfigRepo.disableTrading(userId);

    await this.auditLogRepo.create({
      action: 'trading.disable',
      category: 'trading',
      userId,
    });

    return { enabled: false };
  }

  @Get('status')
  async getStatus(@Session() session: any) {
    const userId = session.user.id;
    const config = await this.tradingConfigRepo.findByUserId(userId);
    const brokerAccount = await this.brokerAccountRepo.findOne({
      userId,
      providerId: 'upstox',
    });

    const now = new Date();
    const reAuthValid =
      config?.lastReAuthAt &&
      config?.reAuthExpiresAt &&
      config.reAuthExpiresAt > now;

    return {
      hasConfig: !!config,
      hasBrokerAccount: !!brokerAccount,
      tradingEnabled: config?.enabled || false,
      sandboxMode: config?.sandboxMode ?? true,
      needsReAuth: !reAuthValid,
      lastReAuthAt: config?.lastReAuthAt || null,
      segments: config?.segments || {},
    };
  }
}
