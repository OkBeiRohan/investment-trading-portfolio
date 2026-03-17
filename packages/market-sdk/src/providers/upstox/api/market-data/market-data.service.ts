import { Injectable, Logger } from "@nestjs/common";
import {
  MarketDataRepository,
  UpstoxQuoteResponse,
} from "./market-data.repository";

export interface MarketQuote {
  instrumentKey: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  timestamp: Date;
}

/**
 * Market Data Service
 *
 * Business logic layer:
 * - Data transformation (Upstox format → common format)
 * - Validation
 * - Caching (future)
 */
@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(private readonly repository: MarketDataRepository) { }

  /**
   * Get Last Traded Price (LTP) for instruments
   */
  async getLTP(
    userId: string,
    instrumentKeys: string[]
  ): Promise<Map<string, number>> {
    const response = await this.repository.getQuote(userId, instrumentKeys);

    const ltpMap = new Map<string, number>();
    for (const [key, data] of Object.entries(response.data)) {
      ltpMap.set(key, data.last_price);
    }

    this.logger.debug(`Fetched LTP for ${ltpMap.size} instruments`);
    return ltpMap;
  }

  /**
   * Get full market quote (provider-agnostic format)
   */
  async getFullMarketQuote(
    userId: string,
    instrumentKeys: string[]
  ): Promise<MarketQuote[]> {
    const response = await this.repository.getFullMarketQuote(
      userId,
      instrumentKeys
    );

    return this.transformToMarketQuote(response);
  }

  /**
   * Get option chain for underlying instrument
   */
  async getOptionChain(
    userId: string,
    underlying: string,
    expiry: string
  ): Promise<any[]> {
    const response = await this.repository.getOptionChain(
      userId,
      underlying,
      expiry
    );

    // Transform to common format (future enhancement)
    return response.data;
  }

  /**
   * Transform Upstox-specific format to provider-agnostic MarketQuote
   */
  private transformToMarketQuote(response: UpstoxQuoteResponse): MarketQuote[] {
    return Object.entries(response.data).map(([key, data]) => ({
      instrumentKey: key,
      ltp: data.last_price,
      open: data.ohlc.open,
      high: data.ohlc.high,
      low: data.ohlc.low,
      close: data.ohlc.close,
      volume: data.volume,
      bid: data.depth.buy[0]?.price || 0,
      ask: data.depth.sell[0]?.price || 0,
      bidSize: data.depth.buy[0]?.quantity || 0,
      askSize: data.depth.sell[0]?.quantity || 0,
      timestamp: new Date(data.last_trade_time || ""),
    }));
  }
}
