import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BetterAuthAdapterFactory } from "./adapters/adapter.factory";
import { AuthService } from "./services/auth.service";
import { EmailService } from "./services/email.service";
import { MongoDBModule } from "@repo/database";

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), MongoDBModule],
  providers: [BetterAuthAdapterFactory, EmailService, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
