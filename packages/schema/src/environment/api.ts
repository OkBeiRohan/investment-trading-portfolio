import z from "zod";

export const CONFIG_TOKEN = "config";

export const environmentSchema = z
  .object({
    // App
    NODE_ENV: z
      .enum(["development", "production", "staging", "test"])
      .default("development"),
    PORT: z
      .string()
      .default("3004")
      .transform((val) => parseInt(val, 10)),
    DEVTOOLS: z
      .string()
      .default("false")
      .transform((val) => val === "true"),

    // MongoDB
    MONGODB_URI: z.string().default("mongodb://localhost:27017"),

    // Authentication
    APP_NAME: z.string().default("Investment Trading Portfolio"),
    APP_URL: z.string().default("http://localhost:3004"),
    AUTH_SECRET: z.string().min(32),
    TRUSTED_ORIGINS: z.string().default("http://localhost:3000"),
    FRONTEND_URL: z.string().default("http://localhost:3000"),
    TRANSACTIONS: z.string().default("false"),

    // Social Providers (optional)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    DISCORD_CLIENT_ID: z.string().optional(),
    DISCORD_CLIENT_SECRET: z.string().optional(),

    // Broker Providers (optional)
    UPSTOX_CLIENT_ID: z.string().optional(),
    UPSTOX_CLIENT_SECRET: z.string().optional(),

    // Rate Limiting
    RATE_LIMIT_ENABLED: z.string().default("true"),
    RATE_LIMIT_WINDOW: z.string().default("60000"),
    RATE_LIMIT_MAX: z.string().default("100"),
  })
  .transform((data) => ({
    environment: data.NODE_ENV,
    port: data.PORT,
    devtools: data.DEVTOOLS,

    mongodb: {
      uri: data.MONGODB_URI,
    },

    auth: {
      appName: data.APP_NAME,
      appUrl: data.APP_URL,
      secret: data.AUTH_SECRET,
      trustedOrigins: data.TRUSTED_ORIGINS.split(",").map((o) => o.trim()),
      frontendUrl: data.FRONTEND_URL,
      transactions: data.TRANSACTIONS === "true",

      socialProviders: {
        google: data.GOOGLE_CLIENT_ID
          ? {
              clientId: data.GOOGLE_CLIENT_ID,
              clientSecret: data.GOOGLE_CLIENT_SECRET!,
            }
          : undefined,
        github: data.GITHUB_CLIENT_ID
          ? {
              clientId: data.GITHUB_CLIENT_ID,
              clientSecret: data.GITHUB_CLIENT_SECRET!,
            }
          : undefined,
        discord: data.DISCORD_CLIENT_ID
          ? {
              clientId: data.DISCORD_CLIENT_ID,
              clientSecret: data.DISCORD_CLIENT_SECRET!,
            }
          : undefined,
      },

      brokerProviders: {
        upstox: data.UPSTOX_CLIENT_ID
          ? {
              clientId: data.UPSTOX_CLIENT_ID,
              clientSecret: data.UPSTOX_CLIENT_SECRET!,
            }
          : undefined,
      },

      rateLimit: {
        enabled: data.RATE_LIMIT_ENABLED === "true",
        window: parseInt(data.RATE_LIMIT_WINDOW, 10),
        max: parseInt(data.RATE_LIMIT_MAX, 10),
      },
    },
  }));

export type IEnvironment = z.infer<typeof environmentSchema>;
