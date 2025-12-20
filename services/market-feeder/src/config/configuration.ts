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

  // Scheduler Configuration
  scheduler: {
    // Nightly backfill at 12 AM IST (6:30 PM UTC previous day)
    nightlyBackfill: {
      enabled: process.env.SCHEDULER_NIGHTLY_ENABLED === 'true',
      cronExpression: process.env.SCHEDULER_NIGHTLY_CRON || '30 18 * * *', // 12 AM IST
      lookbackDays: parseInt(process.env.SCHEDULER_LOOKBACK_DAYS || '7', 10),
    },

    // Intraday data fetching (every 5 minutes during market hours)
    intradayFetch: {
      enabled: process.env.SCHEDULER_INTRADAY_ENABLED === 'true',
      cronExpression: process.env.SCHEDULER_INTRADAY_CRON || '*/5 9-15 * * 1-5', // Every 5 min, 9 AM - 3 PM IST
    },
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

  // Data Fetching Configuration
  dataFetching: {
    // Instruments to track (comma-separated list)
    instruments: (process.env.INSTRUMENTS || '').split(',').filter(Boolean),

    // Default intervals to fetch
    intervals: (process.env.INTERVALS || '1m,5m,15m,1h,1d').split(','),

    // Concurrency limit for bulk fetching
    concurrency: parseInt(process.env.FETCH_CONCURRENCY || '5', 10),

    // Max retries on failure
    maxRetries: parseInt(process.env.FETCH_MAX_RETRIES || '3', 10),
  },
});
