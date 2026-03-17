import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import {
  TradingConfigRepository,
  BrokerAccountRepository,
  AuditLogRepository,
  UserRepository,
  DbConfigService,
} from "@repo/database";
import { MarketCalendarService } from "@repo/market-sdk";
import Redis from "ioredis";

@Injectable()
export class DailyReAuthService {
  private readonly logger = new Logger(DailyReAuthService.name);
  private redis: Redis | null = null;

  constructor(
    private readonly tradingConfigRepo: TradingConfigRepository,
    private readonly brokerAccountRepo: BrokerAccountRepository,
    private readonly auditLogRepo: AuditLogRepository,
    private readonly userRepo: UserRepository,
    private readonly dbConfig: DbConfigService,
    private readonly marketCalendar: MarketCalendarService,
  ) {}

  /**
   * Mon-Fri at 03:00 UTC (08:30 IST) -- configurable via system_configs.
   * Checks if today is a trading day and notifies users who need re-auth.
   */
  @Cron("0 3 * * 1-5")
  async checkDailyReAuth(): Promise<void> {
    this.logger.log("Starting daily re-auth check...");

    const isTrading = await this.marketCalendar.isMarketOpenToday("NSE");
    if (!isTrading) {
      this.logger.log("Not a trading day; skipping re-auth check");
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const configs = await this.tradingConfigRepo.findEnabledConfigs();
    const adminUsers = await this.userRepo.findByRole("Admin");

    const userIdsToCheck = new Set<string>();
    for (const config of configs) {
      userIdsToCheck.add(config.userId);
    }
    for (const admin of adminUsers) {
      userIdsToCheck.add(admin._id.toString());
    }

    this.logger.log(
      `Checking ${userIdsToCheck.size} users (${configs.length} trading-enabled, ${adminUsers.length} admins)`,
    );

    let notified = 0;
    let skipped = 0;
    let disabled = 0;

    for (const userId of userIdsToCheck) {
      try {
        const brokerAccount =
          await this.brokerAccountRepo.findWithAccessToken(userId, "upstox");

        if (!brokerAccount) {
          this.logger.debug(`User ${userId}: no broker account`);
          continue;
        }

        const tokenExpiry = brokerAccount.accessTokenExpiresAt;
        const isTokenValid =
          tokenExpiry && new Date(tokenExpiry) > new Date();

        const lastReAuth = brokerAccount.lastReAuthAt;
        const reAuthedToday =
          lastReAuth && new Date(lastReAuth) >= todayStart;

        if (isTokenValid && reAuthedToday) {
          skipped++;
          continue;
        }

        const user = await this.userRepo.findById(userId);
        if (!user) continue;

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const reAuthUrl = `${frontendUrl}/auth/reauth?userId=${userId}`;

        await this.publishNotification({
          type: "daily-reauth",
          userId,
          recipientEmail: user.email,
          recipientName: user.name,
          data: { reAuthUrl, name: user.name },
        });

        notified++;

        await this.auditLogRepo.create({
          action: "trading.reauth.reminder-sent",
          category: "auth",
          userId,
          details: {
            email: user.email,
            tokenExpired: !isTokenValid,
            reAuthedToday,
          },
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error checking user ${userId}: ${msg}`);
      }
    }

    this.logger.log(
      `Daily re-auth check complete: ${notified} notified, ${skipped} skipped (already authenticated), ${disabled} disabled`,
    );
  }

  async onReAuthComplete(userId: string): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setHours(23, 59, 59, 999);

    await this.tradingConfigRepo.update(userId, {
      lastReAuthAt: now,
      reAuthExpiresAt: expiresAt,
    });

    await this.auditLogRepo.create({
      action: "trading.reauth.complete",
      category: "auth",
      userId,
      details: { reAuthAt: now, expiresAt },
    });

    this.logger.log(`Re-auth complete for user ${userId}`);
  }

  private async publishNotification(payload: Record<string, unknown>): Promise<void> {
    try {
      const redis = await this.getRedis();
      await redis.publish("notification.send", JSON.stringify(payload));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to publish notification: ${msg}`);
    }
  }

  private async getRedis(): Promise<Redis> {
    if (this.redis) return this.redis;
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    this.redis = new Redis(redisUrl);
    return this.redis;
  }
}
