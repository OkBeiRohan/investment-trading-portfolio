import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRouter } from './user.router';

@Module({
  controllers: [UserController],
  providers: [UserService, UserRouter],
})
export class UserModule {}
