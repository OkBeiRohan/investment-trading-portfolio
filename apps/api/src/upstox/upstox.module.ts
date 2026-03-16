import { Module } from '@nestjs/common';
import { UpstoxWebhookController } from './upstox-webhook.controller';
import { UpstoxReAuthController } from './upstox-reauth.controller';
import { MongoDBModule } from '@repo/database';
import { TokenRefreshService, AuthManagerService } from '@repo/market-sdk';

@Module({
  imports: [MongoDBModule],
  controllers: [UpstoxWebhookController, UpstoxReAuthController],
  // UpstoxReAuthService is @Global via AuthModule — no need to redeclare
  providers: [TokenRefreshService, AuthManagerService],
  exports: [TokenRefreshService],
})
export class UpstoxModule {}


