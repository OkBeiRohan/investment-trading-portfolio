import { BetterAuthOptions } from "better-auth";

export const AUTH_CONFIG = {
  appName: process.env.APP_NAME || "My App",
  baseURL: process.env.APP_URL || "http://localhost:3001",
  secret: process.env.AUTH_SECRET || "dev-secret",
  trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") || [
    "http://localhost:3000",
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,
    cookieCache: {
      maxAge: 60 * 5,
    },
  },

  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== "false",
    window: parseInt(process.env.RATE_LIMIT_WINDOW || "60000"),
    max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
  },

  socialProviders: {
    google: process.env.GOOGLE_CLIENT_ID
      ? {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }
      : undefined,
    github: process.env.GITHUB_CLIENT_ID
      ? {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        }
      : undefined,
  },

  advanced: {
    database: {
      useNumberId: false,
      generateId: false,
    },
  },
} as const satisfies BetterAuthOptions;
