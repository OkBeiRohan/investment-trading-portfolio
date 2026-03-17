import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRouter } from './user.router';
import { TradingSettingsController } from './user-trading-settings.controller';
import { UpstoxWebhookController } from './upstox-webhook.controller';
import { UpstoxReAuthController } from './upstox-reauth.controller';
import { DailyReAuthService } from './daily-reauth.service';
import { MongoDBModule } from '@repo/database';

@Module({
  imports: [MongoDBModule],
  controllers: [
    UserController,
    TradingSettingsController,
    UpstoxWebhookController,
    UpstoxReAuthController,
  ],
  providers: [
    UserService,
    UserRouter,
    DailyReAuthService,
  ],
})
export class UserModule {}
