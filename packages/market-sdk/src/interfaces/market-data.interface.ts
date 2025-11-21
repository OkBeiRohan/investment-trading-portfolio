import { Candle, MarketQuote, OptionGreeks } from "@repo/schema";

export interface IMarketDataProvider {
  /**
   * Get last traded price for multiple instruments
   */
  getLTP(instrumentKeys: string[]): Promise<Map<string, number>>;

  /**
   * Get full market quote with depth
   */
  getFullMarketQuote(instrumentKeys: string[]): Promise<MarketQuote[]>;

  /**
   * Get option Greeks (Delta, Gamma, Vega, Theta, IV)
   */
  getOptionGreeks(instrumentKeys: string[]): Promise<Map<string, OptionGreeks>>;

  /**
   * Get historical candle data
   */
  getHistoricalData(params: HistoricalDataParams): Promise<Candle[]>;

  /**
   * Get option chain for an underlying
   */
  getOptionChain(
    underlying: string,
    expiry: string
  ): Promise<OptionChainData[]>;
}

export interface HistoricalDataParams {
  instrumentKey: string;
  interval: "1m" | "5m" | "15m" | "30m" | "1h" | "1d";
  startDate: Date;
  endDate: Date;
}
