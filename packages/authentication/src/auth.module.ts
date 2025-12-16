import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthService } from "./services/auth.service";
import { EmailService } from "./services/email.service";
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
  providers: [EmailService, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
