import { Module, Global } from "@nestjs/common";
import { BetterAuthAdapterFactory } from "./adapters/adapter.factory";
import { AuthService } from "./services/auth.service";
import { EmailService } from "./services/email.service";
import { MongoDBModule } from "@repo/database";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";

@Global()
@Module({
  imports: [
    MongoDBModule,
    BetterAuthModule.forRootAsync({
      imports: [AuthModule],
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
