import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRouter } from './user.router';
import { UserTradingSettingsController } from './user-trading-settings.controller';
import { MongoDBModule } from '@repo/database';

@Module({
  imports: [MongoDBModule],
  controllers: [UserController, UserTradingSettingsController],
  providers: [UserService, UserRouter],
})
export class UserModule {}
