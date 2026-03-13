import { USER_ROLES } from "@repo/schema";
import { BetterAuthOptions } from "better-auth";

export interface IBrokerProviders {
  upstox?: { clientId: string; clientSecret: string };
}

export interface AuthConfigOptions {
  appName: string;
  appUrl: string;
  secret: string;
  trustedOrigins: string[];
  socialProviders?: {
    google?: { clientId: string; clientSecret: string };
    github?: { clientId: string; clientSecret: string };
    discord?: { clientId: string; clientSecret: string };
  };
  brokerProviders?: IBrokerProviders;
  rateLimit?: {
    enabled: boolean;
    window: number;
    max: number;
  };
  environment?: "development" | "production" | "staging" | "test";
}

export const createAuthConfig = (options: AuthConfigOptions) =>
  ({
    appName: options.appName,
    baseURL: options.appUrl,
    secret: options.secret,
    trustedOrigins: options.trustedOrigins,

    experimental: { joins: true },

    user: {
      additionalFields: {
        dateOfBirth: {
          type: "date",
          required: false,
        },
        isActive: {
          type: "boolean",
          defaultValue: true,
          required: true,
          input: false,
        },
        isBlocked: {
          type: "boolean",
          defaultValue: false,
          required: true,
          input: false,
        },
        role: {
          type: ["Investor", "Trader", "Admin"],
          required: true,
          defaultValue: USER_ROLES[0],
          input: false,
        },
        lastLoginAt: {
          type: "date",
          required: false,
          input: false,
        },
        passwordChangedAt: {
          type: "date",
          required: false,
          input: false,
        },
      },
    },

    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "github", "upstox"],
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },

    rateLimit: {
      enabled: options.rateLimit?.enabled ?? true,
      window: options.rateLimit?.window ?? 60000,
      max: options.rateLimit?.max ?? 100,
      storage: "memory",
    },

    socialProviders: {
      google: options.socialProviders?.google
        ? {
            clientId: options.socialProviders.google.clientId,
            clientSecret: options.socialProviders.google.clientSecret,
            scope: ["openid", "email", "profile"],
          }
        : undefined,
      github: options.socialProviders?.github
        ? {
            clientId: options.socialProviders.github.clientId,
            clientSecret: options.socialProviders.github.clientSecret,
            scope: ["user:email"],
          }
        : undefined,
      discord: options.socialProviders?.discord
        ? {
            clientId: options.socialProviders.discord.clientId,
            clientSecret: options.socialProviders.discord.clientSecret,
            scope: ["identify", "email"],
          }
        : undefined,
    },

    brokerProviders: options.brokerProviders,

    advanced: {
      useSecureCookies: options.environment === "production",
      cookiePrefix: options.appName || "better-auth",
      crossSubDomainCookies: {
        enabled: false, // CRITICAL: Disable to prevent Domain attribute
      },
      defaultCookieAttributes: {
        // CRITICAL: Use "none" for cross-origin (Vercel <-> Render)
        // "lax" only works for same-site requests
        sameSite: options.environment === "production" ? "none" : "lax",
        path: "/",
        httpOnly: true,
        secure: options.environment === "production", // Required with sameSite=none
        // Do NOT set domain - let browser use current origin (Vercel)
      },
      database: {
        generateId: false,
      },
    },
  }) as const satisfies BetterAuthOptions & {
    brokerProviders?: IBrokerProviders;
  };
