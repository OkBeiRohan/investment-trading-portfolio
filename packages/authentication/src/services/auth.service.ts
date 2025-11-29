import { Injectable } from "@nestjs/common";
import { createBetterAuthInstance } from "../server/auth.config";
import { BetterAuthAdapterFactory } from "../adapters/adapter.factory";
import { EmailService } from "./email.service";
import { AUTH_CONFIG } from "../config/auth.config";
@Injectable()
export class AuthService {
  constructor(
    private readonly adapterFactory: BetterAuthAdapterFactory,
    private readonly emailService: EmailService
  ) {}

  getAuthInstance() {
    return createBetterAuthInstance({
      adapter: this.adapterFactory.createAdapter(
        process.env.NODE_ENV === "development"
      ),
      options: AUTH_CONFIG,
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
