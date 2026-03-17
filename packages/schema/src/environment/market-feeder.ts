import z from "zod";

export const MARKET_FEEDER_CONFIG_TOKEN = "config";

export const marketFeederEnvironmentSchema = z
  .object({
    // App
    NODE_ENV: z
      .enum(["development", "production", "staging", "test"])
      .default("development"),
    PORT: z
      .string()
      .default("3005")
      .transform((val) => parseInt(val, 10)),
    GRPC_PORT: z
      .string()
      .default("50052")
      .transform((val) => parseInt(val, 10)),

    // MongoDB
    MONGODB_URI: z.string().default("mongodb://localhost:27017"),

    // QuestDB
    QUESTDB_HOST: z.string().default("localhost"),
    QUESTDB_PG_PORT: z
      .string()
      .default("8812")
      .transform((val) => parseInt(val, 10)),
    QUESTDB_ILP_PORT: z
      .string()
      .default("9009")
      .transform((val) => parseInt(val, 10)),
    QUESTDB_USER: z.string().default("admin"),
    QUESTDB_PASSWORD: z.string().default("quest"),
    QUESTDB_DATABASE: z.string().default("qdb"),
    QUESTDB_POOL_SIZE: z
      .string()
      .default("20")
      .transform((val) => parseInt(val, 10)),

    // Redis
    REDIS_URL: z.string().default("redis://localhost:6379"),

    // Authentication (required by @repo/authentication)
    APP_NAME: z.string().default("Investment Trading Portfolio"),
    AUTH_SECRET: z.string().min(32),
    FRONTEND_URL: z.string().default("http://localhost:3000"),
    TRUSTED_ORIGINS: z.string().default("http://localhost:3000"),

    // Upstox (API Key = Client ID in Upstox terminology)
    UPSTOX_API_KEY: z.string().default(""),
    UPSTOX_API_SECRET: z.string().default(""),
    UPSTOX_REDIRECT_URI: z
      .string()
      .default("http://localhost:3004/api/upstox/reauth/callback"),

    // Security
    ENCRYPTION_KEY: z.string().min(32),

    // Global Data Providers (optional)
    ALPHA_VANTAGE_API_KEY: z.string().optional(),
    FINNHUB_API_KEY: z.string().optional(),

    // Observability (optional)
    SENTRY_DSN: z.string().optional(),
  })
  .transform((data) => ({
    environment: data.NODE_ENV,

    service: {
      name: "market-feeder" as const,
      port: data.PORT,
      grpcPort: data.GRPC_PORT,
    },

    mongodb: {
      uri: data.MONGODB_URI,
    },

    questdb: {
      host: data.QUESTDB_HOST,
      pgPort: data.QUESTDB_PG_PORT,
      ilpPort: data.QUESTDB_ILP_PORT,
      user: data.QUESTDB_USER,
      password: data.QUESTDB_PASSWORD,
      database: data.QUESTDB_DATABASE,
      poolSize: data.QUESTDB_POOL_SIZE,
    },

    redis: {
      url: data.REDIS_URL,
    },

    auth: {
      appName: data.APP_NAME,
      appUrl: data.FRONTEND_URL,
      secret: data.AUTH_SECRET,
      trustedOrigins: data.TRUSTED_ORIGINS.split(",").map((o) => o.trim()),
      frontendUrl: data.FRONTEND_URL,
      transactions: false,
      brokerProviders: {
        upstox: data.UPSTOX_API_KEY
          ? {
              clientId: data.UPSTOX_API_KEY,
              clientSecret: data.UPSTOX_API_SECRET,
            }
          : undefined,
      },
      rateLimit: {
        enabled: false,
        window: 60000,
        max: 100,
      },
    },

    upstox: {
      apiKey: data.UPSTOX_API_KEY,
      apiSecret: data.UPSTOX_API_SECRET,
      redirectUri: data.UPSTOX_REDIRECT_URI,
    },

    encryption: {
      key: data.ENCRYPTION_KEY,
    },

    globalData: {
      alphaVantage: { apiKey: data.ALPHA_VANTAGE_API_KEY || "" },
      finnhub: { apiKey: data.FINNHUB_API_KEY || "" },
    },

    sentry: {
      dsn: data.SENTRY_DSN,
    },
  }));

export type IMarketFeederEnvironment = z.infer<
  typeof marketFeederEnvironmentSchema
>;
