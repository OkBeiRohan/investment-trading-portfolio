export const UPSTOX_CONSTANTS = {
  API: {
    BASE_URL_V2: "https://api.upstox.com/v2",
    BASE_URL_V3: "https://api.upstox.com/v3",
    AUTH_URL: "https://api.upstox.com/v2/login/authorization/dialog",
    TOKEN_URL: "https://api.upstox.com/v2/login/authorization/token",
  },
  WEBSOCKET: {
    MARKET_DATA_URL: "wss://api.upstox.com/v2/feed/market-data-feed",
    PORTFOLIO_URL: "wss://api.upstox.com/v2/feed/portfolio-stream-feed",
    ORDER_URL: "wss://api.upstox.com/v2/feed/order-stream-feed",
  },
  RATE_LIMITS: {
    MARKET_DATA: 25, // requests per second
    ORDER_PLACEMENT: 10, // requests per second
    HISTORICAL_DATA: 5, // requests per second
  },
  WEBSOCKET_LIMITS: {
    MAX_CONNECTIONS_FREE: 2,
    MAX_CONNECTIONS_PLUS: 5,
    MAX_SUBSCRIPTIONS_PER_SOCKET: 3000,
    MAX_SUBSCRIPTIONS_PLUS: 5000,
  },
  INTERVALS: {
    "1m": "1minute",
    "5m": "5minute",
    "15m": "15minute",
    "30m": "30minute",
    "1h": "60minute",
    "1d": "day",
  },
  SEGMENTS: {
    NSE_EQ: "NSE_EQ",
    NSE_FO: "NSE_FO",
    NSE_INDEX: "NSE_INDEX",
    BSE_EQ: "BSE_EQ",
    BSE_FO: "BSE_FO",
    MCX_FO: "MCX_FO",
  },
  TIMEOUT: {
    API_CALL: 5000,
    WEBSOCKET_CONNECT: 10000,
    WEBSOCKET_PING: 30000,
  },
} as const;

export type UpstoxInterval = keyof typeof UPSTOX_CONSTANTS.INTERVALS;
export type UpstoxSegment = keyof typeof UPSTOX_CONSTANTS.SEGMENTS;
