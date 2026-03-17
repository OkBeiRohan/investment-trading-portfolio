import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  TradingConfigRepository,
  BrokerAccountRepository,
  AuditLogRepository,
} from '@repo/database';

@Injectable()
export class DailyReAuthService {
  private readonly logger = new Logger(DailyReAuthService.name);

  constructor(
    private readonly tradingConfigRepo: TradingConfigRepository,
    private readonly brokerAccountRepo: BrokerAccountRepository,
    private readonly auditLogRepo: AuditLogRepository,
  ) {}

  /**
   * Mon-Fri at 03:30 UTC (09:00 IST) — check all trading-enabled users.
   *
   * 1. Query TradingConfigs where enabled + dailyReAuthRequired
   * 2. For each user, verify broker_accounts token validity (lastReAuthAt vs today)
   * 3. If expired / stale, disable trading until re-auth
   * 4. Log results to AuditLog
   * 5. Emit event for notification-service (future)
   */
  @Cron('30 3 * * 1-5')
  async checkDailyReAuth() {
    this.logger.log('Starting daily re-auth check...');

    // TODO: Implement full flow once TradingConfig has dailyReAuthRequired field
    // 1. const configs = await this.tradingConfigRepo.findEnabledWithReAuth();
    // 2. For each config, check broker account token freshness
    // 3. Disable trading for stale tokens
    // 4. Log audit entries

    // TODO: Add actual Upstox token validation via API call
  }

  /**
   * Called after successful re-auth to re-enable trading.
   * Sets lastReAuthAt to now and reAuthExpiresAt to end-of-day IST.
   */
  async onReAuthComplete(userId: string) {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setHours(23, 59, 59, 999);

    await this.tradingConfigRepo.update(userId, {
      lastReAuthAt: now,
      reAuthExpiresAt: expiresAt,
    });

    await this.auditLogRepo.create({
      action: 'trading.reauth.complete',
      category: 'auth',
      userId,
      details: { reAuthAt: now, expiresAt },
    });

    this.logger.log(`Re-auth complete for user ${userId}`);
  }
}
