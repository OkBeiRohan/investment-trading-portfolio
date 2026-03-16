import { Module } from '@nestjs/common';
import { UpstoxWebhookController } from './upstox-webhook.controller';
import { UpstoxReAuthController } from './upstox-reauth.controller';
import { UpstoxReAuthService } from './upstox-reauth.service';
import { MongoDBModule } from '@repo/database';
import { TokenRefreshService } from '@repo/market-sdk';
import { AuthManagerService } from '@repo/market-sdk';

@Module({
  imports: [MongoDBModule],
  controllers: [UpstoxWebhookController, UpstoxReAuthController],
  providers: [TokenRefreshService, AuthManagerService, UpstoxReAuthService],
  exports: [TokenRefreshService, UpstoxReAuthService],
})
export class UpstoxModule {}

