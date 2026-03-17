/**
 * Market Feeder Configuration
 * Only secrets and connection strings live here.
 * All other configuration is stored in MongoDB system_configs
 * and accessed via DbConfigService.
 */

export default () => ({
  service: {
    name: 'market-feeder',
    port: parseInt(process.env.PORT || '3005', 10),
    environment: process.env.NODE_ENV || 'development',
  },

  questdb: {
    host: process.env.QUESTDB_HOST || 'localhost',
    pgPort: parseInt(process.env.QUESTDB_PG_PORT || '8812', 10),
    ilpPort: parseInt(process.env.QUESTDB_ILP_PORT || '9000', 10),
    user: process.env.QUESTDB_USER || 'admin',
    password: process.env.QUESTDB_PASSWORD || 'quest',
    database: process.env.QUESTDB_DATABASE || 'qdb',
    poolSize: parseInt(process.env.QUESTDB_POOL_SIZE || '10', 10),
  },

  upstox: {
    apiKey: process.env.UPSTOX_API_KEY || '',
    apiSecret: process.env.UPSTOX_API_SECRET || '',
    redirectUri:
      process.env.UPSTOX_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  },

  globalData: {
    alphaVantage: {
      apiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
    },
    finnhub: {
      apiKey: process.env.FINNHUB_API_KEY || '',
    },
  },
});
