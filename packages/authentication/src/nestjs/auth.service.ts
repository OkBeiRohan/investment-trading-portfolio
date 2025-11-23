import { Injectable, Inject, OnModuleInit } from "@nestjs/common";
import { BETTER_AUTH_OPTIONS } from "./auth.module";
import {
  createBetterAuthInstance,
  type BetterAuthServerConfig,
  type Auth,
} from "../server";

@Injectable()
export class AuthService implements OnModuleInit {
  private auth: Auth;

  constructor(
    @Inject(BETTER_AUTH_OPTIONS)
    private readonly config: BetterAuthServerConfig
  ) {}

  onModuleInit() {
    this.auth = createBetterAuthInstance(this.config);
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
