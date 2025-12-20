import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createBetterAuthInstance } from "../server/auth.config";
import { EmailService } from "./email.service";
import { createAuthConfig } from "../config/auth.config";
import { CONFIG_TOKEN, IEnvironment } from "@repo/schema";
import { MongoDBService } from "@repo/database";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

@Injectable()
export class AuthService {
  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly mongoDBService: MongoDBService
  ) {}

  getAuthInstance() {
    const config = this.configService.getOrThrow<IEnvironment>(CONFIG_TOKEN);

    return createBetterAuthInstance({
      adapter: mongodbAdapter(
        this.mongoDBService.getDatabase() as any,
        config.auth.transactions
          ? {
              client: this.mongoDBService.getClient() as any,
            }
          : undefined
      ),
      options: createAuthConfig({
        appName: config.auth.appName,
        appUrl: config.auth.appUrl,
        secret: config.auth.secret,
        trustedOrigins: config.auth.trustedOrigins,
        socialProviders: config.auth.socialProviders,
        rateLimit: config.auth.rateLimit,
        environment: config.environment,
        brokerProviders: config.auth.brokerProviders,
      }),
      emailProvider: {
        sendVerificationEmail: (data) =>
          this.emailService.sendVerificationEmail(data),
        sendResetPasswordEmail: (data) =>
          this.emailService.sendResetPasswordEmail(data),
      },
      organizationConfig: {
        sendInvitationEmail: (data) =>
          this.emailService.sendInvitationEmail(data),
      },
      twoFactorConfig: {
        sendOTP: (data) => this.emailService.sendOTP(data),
      },
    });
  }
}
