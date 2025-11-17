/**
 * WebSocket Market Data Stream Types
 */

export enum MarketDataMode {
  LTPC = "ltpc", // Last Traded Price
  FULL = "full", // Full market data with depth
  OPTION_GREEKS = "option_greeks", // Option greeks
  FULL_D30 = "full_d30", // Full with 30-day depth
}

export interface MarketDataFeed {
  instrumentKey: string;
  mode: MarketDataMode;
  lastPrice?: number;
  lastQuantity?: number;
  lastTradeTime?: Date;
  ohlc?: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  bidPrice?: number;
  bidQuantity?: number;
  askPrice?: number;
  askQuantity?: number;
  volume?: number;
  totalBuyQuantity?: number;
  totalSellQuantity?: number;
  averagePrice?: number;
  openInterest?: number;
  netChange?: number;
  depth?: {
    buy: Array<{ price: number; quantity: number; orders: number }>;
    sell: Array<{ price: number; quantity: number; orders: number }>;
  };
  greeks?: {
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
    iv?: number;
  };
}

export interface PortfolioStreamFeed {
  type: "order" | "position" | "holding";
  data: any;
  timestamp: Date;
}

export interface WebSocketConfig {
  reconnect: boolean;
  reconnectInterval: number; // milliseconds
  maxReconnectAttempts: number;
}

export type MarketDataCallback = (data: MarketDataFeed) => void;
export type PortfolioStreamCallback = (data: PortfolioStreamFeed) => void;
export type ErrorCallback = (error: Error) => void;
export type ConnectionCallback = () => void;
