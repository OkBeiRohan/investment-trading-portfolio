import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRouter } from './user.router';
import { UserTradingSettingsController } from './user-trading-settings.controller';
import { UpstoxWebhookController } from './upstox-webhook.controller';
import { UpstoxReAuthController } from './upstox-reauth.controller';
import { MongoDBModule } from '@repo/database';
import { TokenRefreshService, AuthManagerService, UpstoxReAuthService } from '@repo/market-sdk';

@Module({
  imports: [MongoDBModule],
  controllers: [
    UserController,
    UserTradingSettingsController,
    UpstoxWebhookController,
    UpstoxReAuthController,
  ],
  providers: [
    UserService,
    UserRouter,
    TokenRefreshService,
    AuthManagerService,
    UpstoxReAuthService,
  ],
})
export class UserModule {}
