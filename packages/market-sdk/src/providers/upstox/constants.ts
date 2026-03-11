/**
 * Upstox Constants
 * V3 API URLs, rate limits, WebSocket limits, Plus account enhanced limits,
 * and global symbol mappings for market data ingestion
 */

export const UPSTOX_CONSTANTS = {
  API: {
    BASE_URL: "https://api.upstox.com",
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
    HISTORICAL_DATA: 5, // requests per second (free)
    HISTORICAL_DATA_PLUS: 50, // Plus account: 50 req/sec
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

// Re-export for cleaner imports
export const UPSTOX_API_URLS = {
  LIVE: UPSTOX_CONSTANTS.API.BASE_URL_V2,
  SANDBOX: "https://api-hft.upstox.com/v2", // Sandbox URL
};

export const UPSTOX_ENDPOINTS = {
  // Market Data (V2)
  QUOTES: "/market-quote/quotes",
  FULL_MARKET_QUOTE: "/market-quote/ltp",
  OPTION_CHAIN: "/option/chain",

  // Historical Data (V3: /v3/historical-candle/...)
  HISTORICAL_CANDLES: "/historical-candle",
  INTRADAY_CANDLES: "/historical-candle/intraday",

  // Expired Instruments (V3)
  EXPIRED_CANDLE: "/historical-candle",            // /v3/historical-candle/{instrument_key}/{interval}/{to_date}/{from_date}
  EXPIRY_DATES: "/option/contract/expiry",         // GET /v3/option/contract/expiry?instrument_key=...
  ACTIVE_OPTION_CONTRACTS: "/option/contract",     // GET /v3/option/contract?instrument_key=...&expiry_date=...
  EXPIRED_FUTURES: "/expired-derivatives/future",  // GET /v3/expired-derivatives/future?instrument_key=...&expiry_date=...
  EXPIRED_OPTIONS: "/expired-derivatives/option",  // GET /v3/expired-derivatives/option?instrument_key=...&expiry_date=...

  // Orders
  PLACE_ORDER: "/order/place",
  MODIFY_ORDER: "/order/modify",
  CANCEL_ORDER: "/order/cancel",
  ORDER_BOOK: "/order/retrieve-all",
  ORDER_DETAILS: "/order/history",

  // Portfolio
  POSITIONS: "/portfolio/long-term-holdings",
  HOLDINGS: "/portfolio/short-term-holdings",
  FUNDS: "/user/get-funds-and-margin",
};

/**
 * Data availability windows for Upstox V3
 */
export const UPSTOX_DATA_AVAILABILITY = {
  /** Daily candle data available from */
  DAILY_START: new Date("2000-01-01"),
  /** 1-minute candle data available from */
  MINUTE_START: new Date("2023-11-01"),
  /** 5-minute candle data available from */
  FIVE_MINUTE_START: new Date("2023-11-01"),
  /** 15-minute and higher available from */
  HIGHER_MINUTE_START: new Date("2022-01-01"),
};

/**
 * Plus account rate limit config
 */
export const UPSTOX_PLUS_LIMITS = {
  capacity: 50,
  refillRate: 50, // 50 req/sec for Plus
  refillInterval: 20,
};

/**
 * Global symbol mappings for Yahoo Finance
 * Maps internal instrument keys to Yahoo Finance symbols
 */
export const GLOBAL_SYMBOL_MAPPINGS = {
  // Major Global Indices
  "GLOBAL|S&P 500": "^GSPC",
  "GLOBAL|Dow Jones": "^DJI",
  "GLOBAL|NASDAQ Composite": "^IXIC",
  "GLOBAL|FTSE 100": "^FTSE",
  "GLOBAL|DAX": "^GDAXI",
  "GLOBAL|Nikkei 225": "^N225",
  "GLOBAL|Hang Seng": "^HSI",
  "GLOBAL|Shanghai Composite": "000001.SS",
  "GLOBAL|KOSPI": "^KS11",
  "GLOBAL|ASX 200": "^AXJO",

  // Commodities
  "GLOBAL|Crude Oil WTI": "CL=F",
  "GLOBAL|Crude Oil Brent": "BZ=F",
  "GLOBAL|Gold": "GC=F",
  "GLOBAL|Silver": "SI=F",
  "GLOBAL|Copper": "HG=F",
  "GLOBAL|Natural Gas": "NG=F",

  // Forex
  "GLOBAL|USD/INR": "INR=X",
  "GLOBAL|EUR/USD": "EURUSD=X",
  "GLOBAL|GBP/USD": "GBPUSD=X",
  "GLOBAL|USD/JPY": "USDJPY=X",

  // Bond Futures
  "GLOBAL|US 10Y Yield": "^TNX",
} as const;
