/**
 * Upstox Constants
 * V2/V3 API URLs, rate limits, WebSocket limits, Plus account enhanced limits,
 * and global symbol mappings for market data ingestion
 *
 * All endpoints audited against https://upstox.com/developer/api-documentation/open-api/
 */

export const UPSTOX_CONSTANTS = {
  API: {
    BASE_URL: "https://api.upstox.com",
    BASE_URL_V2: "https://api.upstox.com/v2",
    BASE_URL_V3: "https://api.upstox.com/v3",
    AUTH_URL: "https://api.upstox.com/v2/login/authorization/dialog",
    TOKEN_URL: "https://api.upstox.com/v2/login/authorization/token",
    TOKEN_REQUEST_URL: "https://api.upstox.com/v3/login/auth/token/request",
  },
  WEBSOCKET: {
    MARKET_DATA_URL: "wss://api.upstox.com/v2/feed/market-data-feed",
    MARKET_DATA_URL_V3: "wss://api.upstox.com/v3/feed/market-data-feed",
    PORTFOLIO_URL: "wss://api.upstox.com/v2/feed/portfolio-stream-feed",
    ORDER_URL: "wss://api.upstox.com/v2/feed/order-stream-feed",
  },
  RATE_LIMITS: {
    MARKET_DATA: 25,
    ORDER_PLACEMENT: 10,
    HISTORICAL_DATA: 5,
    HISTORICAL_DATA_PLUS: 50,
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
    BSE_INDEX: "BSE_INDEX",
    MCX_FO: "MCX_FO",
    NCD_FO: "NCD_FO",
    BCD_FO: "BCD_FO",
    NSE_COM: "NSE_COM",
  },
  TIMEOUT: {
    API_CALL: 5000,
    WEBSOCKET_CONNECT: 10000,
    WEBSOCKET_PING: 30000,
  },
} as const;

export type UpstoxInterval = keyof typeof UPSTOX_CONSTANTS.INTERVALS;
export type UpstoxSegment = keyof typeof UPSTOX_CONSTANTS.SEGMENTS;

export const UPSTOX_API_URLS = {
  LIVE: UPSTOX_CONSTANTS.API.BASE_URL_V2,
  SANDBOX: "https://api-hft.upstox.com/v2",
};

// ─── V2 Endpoints ────────────────────────────────────────────────────────────

export const UPSTOX_ENDPOINTS = {
  // ── Login ──
  AUTHORIZE: "/login/authorization/dialog",
  GET_TOKEN: "/login/authorization/token",
  LOGOUT: "/logout",

  // ── User ──
  GET_PROFILE: "/user/get-profile",
  GET_FUNDS_AND_MARGIN: "/user/get-funds-and-margin",

  // ── Charges ──
  BROKERAGE: "/charges/brokerage",

  // ── Margins ──
  MARGIN: "/charges/margin",

  // ── Orders (V2) ──
  PLACE_ORDER: "/order/place",
  MODIFY_ORDER: "/order/modify",
  CANCEL_ORDER: "/order/cancel",
  PLACE_MULTI_ORDER: "/order/multi/place",
  CANCEL_MULTI_ORDER: "/order/multi/cancel",
  EXIT_ALL_POSITIONS: "/order/positions/exit",
  ORDER_BOOK: "/order/retrieve-all",
  ORDER_DETAILS: "/order/details",
  ORDER_HISTORY: "/order/history",
  GET_TRADES: "/order/trades/get-trades-for-day",
  GET_ORDER_TRADES: "/order/trades",

  // ── GTT Orders ──
  PLACE_GTT_ORDER: "/gtt/place",
  MODIFY_GTT_ORDER: "/gtt/modify",
  CANCEL_GTT_ORDER: "/gtt/cancel",
  GET_GTT_ORDER_DETAILS: "/gtt/details",

  // ── Portfolio ──
  POSITIONS: "/portfolio/short-term-positions",
  MTF_POSITIONS: "/portfolio/mtf-positions",
  CONVERT_POSITION: "/portfolio/convert-position",
  HOLDINGS: "/portfolio/long-term-holdings",
  FUNDS: "/user/get-funds-and-margin",

  // ── Trade Profit & Loss ──
  PNL_REPORT_METADATA: "/trade/profit-and-loss/metadata",
  PNL_REPORT: "/trade/profit-and-loss/report",
  PNL_TRADE_CHARGES: "/trade/profit-and-loss/charges",

  // ── Market Quote (V2) ──
  FULL_MARKET_QUOTE: "/market-quote/quotes",
  OHLC_QUOTE: "/market-quote/ohlc",
  LTP_QUOTE: "/market-quote/ltp",
  OPTION_GREEKS: "/option/chain/greeks",

  // ── Market Information ──
  MARKET_HOLIDAYS: "/market/holidays",
  MARKET_TIMINGS: "/market/timings",
  EXCHANGE_STATUS: "/market/status",

  // ── Option Chain (V2) ──
  OPTION_CHAIN: "/option/chain",

  // ── Historical Data (V2) ──
  HISTORICAL_CANDLES_V2: "/historical-candle",
  INTRADAY_CANDLES_V2: "/historical-candle/intraday",

  // ── Expired Instruments (V2) ──
  EXPIRED_HISTORICAL_CANDLE: "/expired-instruments/historical-candle",

  // ── WebSocket Auth URLs ──
  MARKET_DATA_FEED_AUTHORIZE: "/feed/market-data-feed/authorize",
  PORTFOLIO_STREAM_AUTHORIZE: "/feed/portfolio-stream-feed/authorize",
  QUOTES: "/market-quote/quotes",

  // ── Historical Data (V3 uses different base) ──
  HISTORICAL_CANDLES: "/historical-candle",
  INTRADAY_CANDLES: "/historical-candle/intraday",
};

// ─── V3 Endpoints (use BASE_URL_V3) ─────────────────────────────────────────

export const UPSTOX_V3_ENDPOINTS = {
  // ── Orders V3 ──
  PLACE_ORDER: "/order/place",
  MODIFY_ORDER: "/order/modify",
  CANCEL_ORDER: "/order/cancel",

  // ── Login V3 ──
  TOKEN_REQUEST: "/login/auth/token/request",

  // ── Historical Data V3 ──
  HISTORICAL_CANDLES: "/historical-candle",
  INTRADAY_CANDLES: "/historical-candle/intraday",

  // ── Market Quote V3 ──
  OHLC_QUOTE: "/market-quote/ohlc",
  LTP_QUOTE: "/market-quote/ltp",

  // ── Option Chain V3 ──
  OPTION_CONTRACT: "/option/contract",
  OPTION_CONTRACT_EXPIRY: "/option/contract/expiry",
  OPTION_CHAIN: "/option/chain",

  // ── Expired Derivatives V3 ──
  EXPIRED_FUTURES: "/expired-derivatives/future",
  EXPIRED_OPTIONS: "/expired-derivatives/option",

  // ── WebSocket Auth V3 ──
  MARKET_DATA_FEED_AUTHORIZE: "/feed/market-data-feed/authorize",

  // ── Trade History V3 ──
  HISTORICAL_TRADES: "/charges/historical-trades",
};

export const UPSTOX_DATA_AVAILABILITY = {
  DAILY_START: new Date("2000-01-01"),
  MINUTE_START: new Date("2023-11-01"),
  FIVE_MINUTE_START: new Date("2023-11-01"),
  HIGHER_MINUTE_START: new Date("2022-01-01"),
};

export const UPSTOX_PLUS_LIMITS = {
  capacity: 50,
  refillRate: 50,
  refillInterval: 20,
};

export const GLOBAL_SYMBOL_MAPPINGS = {
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
  "GLOBAL|Crude Oil WTI": "CL=F",
  "GLOBAL|Crude Oil Brent": "BZ=F",
  "GLOBAL|Gold": "GC=F",
  "GLOBAL|Silver": "SI=F",
  "GLOBAL|Copper": "HG=F",
  "GLOBAL|Natural Gas": "NG=F",
  "GLOBAL|USD/INR": "INR=X",
  "GLOBAL|EUR/USD": "EURUSD=X",
  "GLOBAL|GBP/USD": "GBPUSD=X",
  "GLOBAL|USD/JPY": "USDJPY=X",
  "GLOBAL|US 10Y Yield": "^TNX",
} as const;
