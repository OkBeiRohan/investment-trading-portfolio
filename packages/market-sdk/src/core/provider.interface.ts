import {
  Candle,
  MarketQuote,
  OptionGreeks,
  Order,
  // OrderParams,
  Position,
  Holding,
} from "@repo/schema";

export interface ProviderConfig {
  apiKey?: string;
  apiSecret?: string;
  environment?: string;
  [key: string]: any;
}

export interface IProvider {
  readonly name: string;
  readonly version: string;
  initialize(config: ProviderConfig): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export interface IMarketDataProvider extends IProvider {
  getLTP(instrumentKeys: string[]): Promise<Map<string, number>>;
  getFullMarketQuote(instrumentKeys: string[]): Promise<MarketQuote[]>;
  getOptionGreeks(instrumentKeys: string[]): Promise<Map<string, OptionGreeks>>;
  getHistoricalData(params: HistoricalDataParams): Promise<Candle[]>;
  getOptionChain(
    underlying: string,
    expiry: string
  ): Promise<OptionChainData[]>;
}

export interface IOrderProvider extends IProvider {
  // placeOrder(userId: string, params: OrderParams): Promise<Order>;
  placeMultiLegOrder(
    userId: string,
    params: MultiLegOrderParams
  ): Promise<Order>;
  modifyOrder(
    userId: string,
    orderId: string,
    // modifications: Partial<OrderParams>
  ): Promise<Order>;
  cancelOrder(userId: string, orderId: string): Promise<{ success: boolean }>;
  getOrderBook(userId: string): Promise<Order[]>;
  getOrderDetails(userId: string, orderId: string): Promise<Order>;
}

export interface IPortfolioProvider extends IProvider {
  getPositions(userId: string): Promise<Position[]>;
  getHoldings(userId: string): Promise<Holding[]>;
  getFunds(userId: string): Promise<FundDetails>;
}

export interface IWebSocketProvider extends IProvider {
  connect(userId: string): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(instrumentKeys: string[]): Promise<void>;
  unsubscribe(instrumentKeys: string[]): Promise<void>;
  on(event: string, callback: (...args: any[]) => void): void;
}

export interface HistoricalDataParams {
  instrumentKey: string;
  interval: "1m" | "5m" | "15m" | "30m" | "1h" | "1d";
  startDate: Date;
  endDate: Date;
}

export interface OptionChainData {
  instrumentKey: string;
  strikePrice: number;
  expiryDate: string;
  optionType: "CE" | "PE";
  ltp?: number;
  iv?: number;
  greeks?: OptionGreeks;
}

export interface MultiLegOrderParams {
  // legs: OrderParams[];
  strategy?: "STRADDLE" | "STRANGLE" | "IRON_CONDOR" | "BUTTERFLY";
}

export interface FundDetails {
  availableMargin: number;
  usedMargin: number;
  totalMargin: number;
  blockedMargin: number;
  currency: string;
  segments: {
    equity?: SegmentFunds;
    commodity?: SegmentFunds;
    futures?: SegmentFunds;
  };
}

export interface SegmentFunds {
  available: number;
  used: number;
  total: number;
}
