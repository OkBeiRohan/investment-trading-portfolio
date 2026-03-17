import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TokenRefreshService } from '@repo/authentication';

@Injectable()
export class TokenRefreshCronService {
  private readonly logger = new Logger(TokenRefreshCronService.name);

  constructor(
    private readonly tokenRefreshService: TokenRefreshService,
  ) {}

  /** Run at 03:00 UTC (08:30 IST) Mon-Fri, before market opens */
  @Cron('0 3 * * 1-5')
  async refreshTokensDaily() {
    this.logger.log('Starting daily token refresh...');
    try {
      await this.tokenRefreshService.checkAndRefreshExpiringTokens();
      this.logger.log('Daily token refresh completed successfully');
    } catch (error) {
      this.logger.error('Daily token refresh failed', error);
    }
  }
}
