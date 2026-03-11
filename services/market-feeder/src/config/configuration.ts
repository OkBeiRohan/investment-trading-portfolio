/**
 * Market Feeder Configuration
 * Environment-based configuration for market data fetching
 */

export default () => ({
  // Service Configuration
  service: {
    name: 'market-feeder',
    port: parseInt(process.env.PORT || '3005', 10),
    environment: process.env.NODE_ENV || 'development',
  },

  // QuestDB Configuration
  questdb: {
    host: process.env.QUESTDB_HOST || 'localhost',
    pgPort: parseInt(process.env.QUESTDB_PG_PORT || '8812', 10),
    ilpPort: parseInt(process.env.QUESTDB_ILP_PORT || '9000', 10),
    user: process.env.QUESTDB_USER || 'admin',
    password: process.env.QUESTDB_PASSWORD || 'quest',
    database: process.env.QUESTDB_DATABASE || 'qdb',
    poolSize: parseInt(process.env.QUESTDB_POOL_SIZE || '10', 10),
  },

  // Upstox Configuration
  upstox: {
    apiKey: process.env.UPSTOX_API_KEY || '',
    apiSecret: process.env.UPSTOX_API_SECRET || '',
    redirectUri:
      process.env.UPSTOX_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  },

  // Global Data Providers
  globalData: {
    yahooFinance: {
      enabled: process.env.YAHOO_FINANCE_ENABLED !== 'false', // Enabled by default (no API key needed)
    },
    alphaVantage: {
      apiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
      enabled: !!process.env.ALPHA_VANTAGE_API_KEY,
    },
    finnhub: {
      apiKey: process.env.FINNHUB_API_KEY || '',
      enabled: !!process.env.FINNHUB_API_KEY,
    },
  },

  // Scheduler Configuration
  scheduler: {
    // Nightly backfill at 12 AM IST (6:30 PM UTC previous day)
    nightlyBackfill: {
      enabled: process.env.SCHEDULER_NIGHTLY_ENABLED === 'true',
      cronExpression: process.env.SCHEDULER_NIGHTLY_CRON || '30 18 * * *',
      lookbackDays: parseInt(process.env.SCHEDULER_LOOKBACK_DAYS || '7', 10),
    },

    // Intraday data fetching (every 5 minutes during market hours)
    intradayFetch: {
      enabled: process.env.SCHEDULER_INTRADAY_ENABLED === 'true',
      cronExpression: process.env.SCHEDULER_INTRADAY_CRON || '*/5 9-15 * * 1-5',
    },
  },

  // Ingestion Configuration
  ingestion: {
    // Max expired futures to process per run
    maxExpiredFutures: parseInt(process.env.INGESTION_MAX_EXPIRED_FUTURES || '100', 10),
    // Max options to process per run
    maxOptions: parseInt(process.env.INGESTION_MAX_OPTIONS || '200', 10),
    // Max expiry dates to process for expired instruments
    maxExpiries: parseInt(process.env.INGESTION_MAX_EXPIRIES || '52', 10),
    // Concurrency limit for bulk fetching
    concurrency: parseInt(process.env.FETCH_CONCURRENCY || '5', 10),
    // Max retries on failure
    maxRetries: parseInt(process.env.FETCH_MAX_RETRIES || '3', 10),
  },

  // WebSocket Configuration
  websocket: {
    enabled: process.env.WEBSOCKET_ENABLED === 'true',
    reconnectInterval: parseInt(
      process.env.WEBSOCKET_RECONNECT_INTERVAL || '5000',
      10,
    ),
    bufferFlushInterval: parseInt(
      process.env.WEBSOCKET_BUFFER_FLUSH_INTERVAL || '1000',
      10,
    ),
  },

  // Data Fetching Configuration (legacy — use ingestion config instead)
  dataFetching: {
    instruments: (process.env.INSTRUMENTS || '').split(',').filter(Boolean),
    intervals: (process.env.INTERVALS || '1m,5m,15m,1h,1d').split(','),
    concurrency: parseInt(process.env.FETCH_CONCURRENCY || '5', 10),
    maxRetries: parseInt(process.env.FETCH_MAX_RETRIES || '3', 10),
  },
});
