import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthService } from "./services/auth.service";
import { EmailService } from "./services/email.service";
import { AuthManagerService } from "./services/auth-manager.service";
import { TokenRefreshService } from "./services/token-refresh.service";
import { UpstoxReAuthService } from "./services/upstox-reauth.service";
import { EncryptionUtil } from "./services/encryption.util";
import { MongoDBModule } from "@repo/database";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";

@Global()
@Module({
  imports: [
    ConfigModule,
    MongoDBModule,
    BetterAuthModule.forRootAsync({
      imports: [AuthModule, ConfigModule],
      useFactory: (authService: AuthService) => ({
        auth: authService.getAuthInstance(),

        // Fix for Express 5: The /*path pattern sets req.url=/ and req.baseUrl=full_path
        // better-call concatenates baseUrl+url creating a trailing slash that causes 404
        // This middleware restores req.url to the full path before the handler runs
        middleware: (req, _res, next) => {
          req.url = req.originalUrl;
          req.baseUrl = "";
          next();
        },
      }),
      inject: [AuthService],
    }),
  ],
  providers: [
    EmailService,
    AuthService,
    AuthManagerService,
    TokenRefreshService,
    UpstoxReAuthService,
    EncryptionUtil,
  ],
  exports: [
    AuthService,
    AuthManagerService,
    TokenRefreshService,
    UpstoxReAuthService,
    EncryptionUtil,
  ],
})
export class AuthModule {}
