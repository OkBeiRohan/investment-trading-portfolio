/**
 * Market Data API Module
 * Handles market quotes, historical data, and option chain
 */

import UpstoxClient from "upstox-js-sdk";
import type {
  Quote,
  MarketQuote,
  OptionChainData,
  Candle,
  OptionGreeks,
  CandleInterval,
  Exchange,
} from "@repo/schema";

export class MarketDataApi {
  private apiClient: typeof UpstoxClient.ApiClient;
  private marketQuoteApi: UpstoxClient.MarketQuoteApi;
  private marketQuoteApiV3: UpstoxClient.MarketQuoteV3Api;
  private historyApi: UpstoxClient.HistoryV3Api;
  private optionsApi: UpstoxClient.OptionsApi;

  constructor(apiClient: typeof UpstoxClient.ApiClient) {
    this.apiClient = apiClient;
    this.marketQuoteApi = new UpstoxClient.MarketQuoteApi();
    this.marketQuoteApiV3 = new UpstoxClient.MarketQuoteV3Api();
    this.historyApi = new UpstoxClient.HistoryV3Api();
    this.optionsApi = new UpstoxClient.OptionsApi();
  }

  /**
   * Get Last Traded Price (LTP) for instruments (V3 API)
   */
  async getLTP(instrumentKeys: string[]): Promise<Map<string, number>> {
    return new Promise((resolve, reject) => {
      const instrumentKey = instrumentKeys.join(",");

      this.marketQuoteApiV3.getLtp(
        { instrumentKey },
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            const ltpMap = new Map<string, number>();
            Object.entries(data.data || {}).forEach(
              ([key, value]: [string, any]) => {
                ltpMap.set(key, value.last_price);
              }
            );
            resolve(ltpMap);
          }
        }
      );
    });
  }

  /**
   * Get full market quote with depth
   */
  async getFullMarketQuote(instrumentKeys: string[]): Promise<MarketQuote[]> {
    return new Promise((resolve, reject) => {
      const symbol = instrumentKeys.join(",");

      this.marketQuoteApi.getFullMarketQuote(
        symbol,
        "2.0",
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            const quotes = Object.entries(data.data || {}).map(
              ([key, value]: [string, any]) => this.mapMarketQuote(key, value)
            );
            resolve(quotes);
          }
        }
      );
    });
  }

  /**
   * Get OHLC data for instruments (V3 API)
   */
  async getOHLC(
    instrumentKeys: string[],
    interval: CandleInterval = "day"
  ): Promise<Map<string, any>> {
    return new Promise((resolve, reject) => {
      const instrumentKey = instrumentKeys.join(",");

      this.marketQuoteApiV3.getOhlc(
        { instrumentKey, interval },
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            const ohlcMap = new Map();
            Object.entries(data.data || {}).forEach(([key, value]) => {
              ohlcMap.set(key, value);
            });
            resolve(ohlcMap);
          }
        }
      );
    });
  }

  /**
   * Get Option Greeks (V3 API)
   */
  async getOptionGreeks(
    instrumentKeys: string[]
  ): Promise<Map<string, OptionGreeks>> {
    return new Promise((resolve, reject) => {
      const instrumentKey = instrumentKeys.join(",");

      this.marketQuoteApiV3.getOptionGreek(
        { instrumentKey },
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            const greeksMap = new Map<string, OptionGreeks>();
            Object.entries(data.data || {}).forEach(
              ([key, value]: [string, any]) => {
                greeksMap.set(key, {
                  delta: value.delta,
                  gamma: value.gamma,
                  theta: value.theta,
                  vega: value.vega,
                  rho: value.rho,
                  iv: value.iv,
                });
              }
            );
            resolve(greeksMap);
          }
        }
      );
    });
  }

  /**
   * Get historical intraday candles (V3 API)
   */
  async getIntradayCandles(
    instrumentKey: string,
    interval: CandleInterval,
    fromDate: Date,
    toDate: Date
  ): Promise<Candle[]> {
    return new Promise((resolve, reject) => {
      this.historyApi.getIntraDayCandleData(
        instrumentKey,
        interval,
        fromDate.toISOString().split("T")[0],
        toDate.toISOString().split("T")[0],
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            const candles = (data.data?.candles || []).map((candle: any) =>
              this.mapCandle(candle)
            );
            resolve(candles);
          }
        }
      );
    });
  }

  /**
   * Get historical data for longer timeframes (V3 API)
   */
  async getHistoricalData(
    instrumentKey: string,
    interval: CandleInterval,
    fromDate: Date,
    toDate: Date
  ): Promise<Candle[]> {
    return new Promise((resolve, reject) => {
      this.historyApi.getHistoricalCandleData(
        instrumentKey,
        interval,
        toDate.toISOString().split("T")[0],
        fromDate.toISOString().split("T")[0],
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            const candles = (data.data?.candles || []).map((candle: any) =>
              this.mapCandle(candle)
            );
            resolve(candles);
          }
        }
      );
    });
  }

  /**
   * Get option chain for a given expiry
   */
  async getOptionChain(
    instrumentKey: string,
    expiryDate: string
  ): Promise<OptionChainData[]> {
    return new Promise((resolve, reject) => {
      this.optionsApi.getOptionContracts(
        instrumentKey,
        expiryDate,
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            const optionChain = (data.data || []).map((option: any) =>
              this.mapOptionChainData(option)
            );
            resolve(optionChain);
          }
        }
      );
    });
  }

  /**
   * Get Put-Call Ratio (PCR) for analysis
   * This is calculated from option chain data
   */
  async getPutCallRatio(
    instrumentKey: string,
    expiryDate: string
  ): Promise<{
    pcrVolume: number;
    pcrOI: number;
  }> {
    const optionChain = await this.getOptionChain(instrumentKey, expiryDate);

    let callVolume = 0;
    let putVolume = 0;
    let callOI = 0;
    let putOI = 0;

    optionChain.forEach((option) => {
      if (option.optionType === "CALL") {
        callVolume += option.volume;
        callOI += option.openInterest;
      } else {
        putVolume += option.volume;
        putOI += option.openInterest;
      }
    });

    return {
      pcrVolume: callVolume > 0 ? putVolume / callVolume : 0,
      pcrOI: callOI > 0 ? putOI / callOI : 0,
    };
  }

  private mapMarketQuote(instrumentKey: string, data: any): MarketQuote {
    // Extract exchange from instrumentKey (e.g., "NSE_EQ|INE669E01016")
    const exchange = instrumentKey.split("|")[0] as Exchange;

    return {
      instrumentKey,
      exchange,
      lastPrice: data.last_price,
      lastQuantity: data.last_quantity,
      lastTradeTime: data.last_trade_time
        ? new Date(data.last_trade_time)
        : undefined,
      averagePrice: data.average_price,
      totalBuyQuantity: data.total_buy_quantity,
      totalSellQuantity: data.total_sell_quantity,
      ohlc: data.ohlc
        ? {
            open: data.ohlc.open,
            high: data.ohlc.high,
            low: data.ohlc.low,
            close: data.ohlc.close,
            volume: data.volume,
          }
        : undefined,
      netChange: data.net_change,
      percentChange: data.percent_change,
      openInterest: data.oi,
      depth: data.depth
        ? {
            buy: data.depth.buy?.map((item: any) => ({
              price: item.price,
              quantity: item.quantity,
              orders: item.orders,
            })),
            sell: data.depth.sell?.map((item: any) => ({
              price: item.price,
              quantity: item.quantity,
              orders: item.orders,
            })),
          }
        : undefined,
    };
  }

  private mapCandle(data: any): Candle {
    return {
      timestamp: new Date(data[0]),
      open: data[1],
      high: data[2],
      low: data[3],
      close: data[4],
      volume: data[5],
    };
  }

  private mapOptionChainData(data: any): OptionChainData {
    return {
      instrumentKey: data.instrument_key,
      strike: data.strike_price,
      expiryDate: data.expiry,
      optionType: data.option_type,
      lastPrice: data.last_price,
      openInterest: data.open_interest,
      volume: data.volume,
      bidPrice: data.bid_price,
      bidQty: data.bid_qty,
      askPrice: data.ask_price,
      askQty: data.ask_qty,
      greeks: data.greeks
        ? {
            delta: data.greeks.delta,
            gamma: data.greeks.gamma,
            theta: data.greeks.theta,
            vega: data.greeks.vega,
            iv: data.greeks.iv,
          }
        : undefined,
    };
  }

  private parseError(error: any): Error {
    if (error.response && error.response.text) {
      try {
        const errorData = JSON.parse(error.response.text);
        const errorMessage =
          errorData.errors?.[0]?.message ||
          errorData.message ||
          "Unknown error";
        return new Error(errorMessage);
      } catch {
        return new Error(error.response.text);
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
