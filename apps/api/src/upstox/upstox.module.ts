import { Module } from '@nestjs/common';
import { UpstoxWebhookController } from './upstox-webhook.controller';
import { MongoDBModule } from '@repo/database';
import { TokenRefreshService } from '@repo/market-sdk';
import { AuthManagerService } from '@repo/market-sdk';

@Module({
  imports: [MongoDBModule],
  controllers: [UpstoxWebhookController],
  providers: [TokenRefreshService, AuthManagerService],
  exports: [TokenRefreshService],
})
export class UpstoxModule {}
