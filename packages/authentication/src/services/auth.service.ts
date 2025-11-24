import { Injectable, OnModuleInit } from "@nestjs/common";
import { createBetterAuthInstance } from "../server/auth.config";
import { BetterAuthAdapterFactory } from "../adapters/adapter.factory";
import { EmailService } from "./email.service";
import { AUTH_CONFIG } from "../config/auth.config";
import type { Auth } from "../server/auth.types";

@Injectable()
export class AuthService implements OnModuleInit {
  private auth: Auth;

  constructor(
    private readonly adapterFactory: BetterAuthAdapterFactory,
    private readonly emailService: EmailService
  ) {}

  onModuleInit() {
    this.auth = createBetterAuthInstance({
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

  getAuthInstance(): Auth {
    return this.auth;
  }

  // Helper methods for common operations
  async getSession(token: string) {
    return this.auth.api.getSession({
      headers: new Headers({ cookie: `better-auth.session_token=${token}` }),
    });
  }

  async verifySession(token: string) {
    try {
      const session = await this.getSession(token);
      return session?.session && session.user
        ? { session: session.session, user: session.user }
        : null;
    } catch {
      return null;
    }
  }

  async getUserById(headers: Headers) {
    return this.auth.api.getSession({
      headers,
    });
  }

  async getOrganization(headers: Headers) {
    return this.auth.api.getFullOrganization({
      headers,
    });
  }

  async checkPermission(
    headers: Headers,
    permissions: Record<string, string[]>
  ) {
    return this.auth.api.hasPermission({
      headers,
      body: {
        permissions,
      },
    });
  }
}
