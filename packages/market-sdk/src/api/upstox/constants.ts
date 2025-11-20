export const UpstoxV3Constants = {
  // --- API Endpoints ---
  BASE_URL: 'https://api.upstox.com/v3',
  AUTH_URL: 'https://api.upstox.com/v2/login/authorization/token', // V2 Auth still used for token generation
  MARKET_FEED_AUTH_URL: 'https://api.upstox.com/v3/feed/market-data-feed/authorize',

  // --- WebSocket Limits (V3) ---
  // "Normal Connection and Subscription Limits" [3]
  LIMITS: {
    MAX_SOCKETS_BASIC: 2,
    MAX_SOCKETS_PLUS: 5,
    
    // Subscription Keys per Socket
    MAX_KEYS_LTPC: 5000,         // Mode: LTPC
    MAX_KEYS_FULL: 2000,         // Mode: FULL
    MAX_KEYS_OPTION_GREEKS: 3000 // Mode: OPTION_GREEKS
  },

  // --- Configuration Defaults ---
  DEFAULTS: {
    REDIRECT_Follow: true,      // Node.js client must follow redirects [3]
    HEARTBEAT_INTERVAL: 3000,   // Ping interval
    RECONNECT_DELAY: 5000,      // 5 seconds backoff
    MAX_RECONNECT_ATTEMPTS: 10
  },

  // --- Redis Channels ---
  CHANNELS: {
    MARKET_DATA: 'upstox:feed:live',
    ORDER_UPDATES: 'upstox:feed:orders'
  }
};

export enum FeedMode {
  LTPC = 'ltpc',
  FULL = 'full',
  OPTION_GREEKS = 'option_greeks'
}