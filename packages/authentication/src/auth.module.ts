import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BetterAuthAdapterFactory } from "./adapters/adapter.factory";
import { AuthService } from "./services/auth.service";
import { EmailService } from "./services/email.service";
import { MongoDBModule } from "@repo/database";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";

@Global()
@Module({
  imports: [
    ConfigModule, // Import ConfigModule to access environment config
    MongoDBModule,
    BetterAuthModule.forRootAsync({
      imports: [AuthModule, ConfigModule],
      useFactory: (authService: AuthService) => ({
        auth: authService.getAuthInstance(),
      }),
      inject: [AuthService],
    }),
  ],
  providers: [BetterAuthAdapterFactory, EmailService, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
