import { userRoleEnum } from "@repo/schema";
import { BetterAuthOptions } from "better-auth";

export const AUTH_CONFIG = {
  appName: process.env.APP_NAME || "My App",
  baseURL: process.env.APP_URL || "http://localhost:3004",
  secret:
    process.env.AUTH_SECRET || "QV/ip1mm8B9jENzPZdaMTVqftKqWaz7NdFlzu0G07ww=",
  trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") || [
    "http://localhost:3000",
  ],

  user: {
    additionalFields: {
      // Add custom fields as needed
      dateOfBirth: {
        type: "string",
        required: false,
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
        required: false,
        input: false,
      },
      isBlocked: {
        type: "boolean",
        defaultValue: false,
        required: false,
        input: false,
      },
      role: {
        type: "string[]",
        required: false,
        defaultValue: [userRoleEnum.enum.Investor],
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
      trustedProviders: ["google", "github"],
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
    enabled: process.env.RATE_LIMIT_ENABLED !== "false",
    window: parseInt(process.env.RATE_LIMIT_WINDOW || "60000"),
    max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
    storage: "memory",
  },

  socialProviders: {
    google: process.env.GOOGLE_CLIENT_ID
      ? {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          scope: ["openid", "email", "profile"],
        }
      : undefined,
    github: process.env.GITHUB_CLIENT_ID
      ? {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          scope: ["user:email"],
        }
      : undefined,
    discord: process.env.DISCORD_CLIENT_ID
      ? {
          clientId: process.env.DISCORD_CLIENT_ID,
          clientSecret: process.env.DISCORD_CLIENT_SECRET!,
          scope: ["identify", "email"],
        }
      : undefined,
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "better-auth",
    crossSubDomainCookies: {
      enabled: true,
    },
    defaultCookieAttributes: {
      sameSite: "lax" as const,
      path: "/",
      httpOnly: true,
    },
    database: {
      useNumberId: false,
      generateId: false,
    },
  },
} as const satisfies BetterAuthOptions;
