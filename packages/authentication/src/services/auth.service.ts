import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createBetterAuthInstance } from "../server/auth.config";
import { BetterAuthAdapterFactory } from "../adapters/adapter.factory";
import { EmailService } from "./email.service";
import { createAuthConfig } from "../config/auth.config";
import { CONFIG_TOKEN, IEnvironment } from "@repo/schema";
import type { betterAuth } from "better-auth";

@Injectable()
export class AuthService {
  constructor(
    private readonly adapterFactory: BetterAuthAdapterFactory,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService
  ) {}

  getAuthInstance(): ReturnType<typeof betterAuth> {
    const config = this.configService.getOrThrow<IEnvironment>(CONFIG_TOKEN);

    return createBetterAuthInstance({
      adapter: this.adapterFactory.createAdapter(
        config.environment === "development"
      ),
      options: createAuthConfig({
        appName: config.auth.appName,
        appUrl: config.auth.appUrl,
        secret: config.auth.secret,
        trustedOrigins: config.auth.trustedOrigins,
        socialProviders: config.auth.socialProviders,
        rateLimit: config.auth.rateLimit,
        environment: config.environment,
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
