/**
 * Alpha Vantage Provider
 * Free-tier API for US Treasury yields and forex data
 * Requires API key (500 requests/day on free tier)
 */

import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

const AV_BASE_URL = "https://www.alphavantage.co/query";

export interface AlphaVantageTreasuryYield {
  date: Date;
  yield: number;
}

export interface AlphaVantageForexDaily {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
}

@Injectable()
export class AlphaVantageProvider {
  private readonly logger = new Logger(AlphaVantageProvider.name);
  readonly name = "alpha-vantage";

  /**
   * Get US Treasury yield data
   * @param apiKey Alpha Vantage API key
   * @param maturity Bond maturity: '3month', '2year', '5year', '7year', '10year', '30year'
   * @param interval 'daily' | 'weekly' | 'monthly'
   */
  async getTreasuryYield(
    apiKey: string,
    maturity = "10year",
    interval = "daily",
  ): Promise<AlphaVantageTreasuryYield[]> {
    try {
      const response = await axios.get(AV_BASE_URL, {
        params: {
          function: "TREASURY_YIELD",
          interval,
          maturity,
          apikey: apiKey,
        },
        timeout: 15000,
      });

      const data = response.data?.data;
      if (!data || !Array.isArray(data)) {
        this.logger.warn("No treasury yield data returned");
        return [];
      }

      return data
        .filter((d: any) => d.value !== ".")
        .map((d: any) => ({
          date: new Date(d.date),
          yield: parseFloat(d.value),
        }));
    } catch (error: any) {
      this.logger.error(`Treasury yield fetch failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get daily forex data
   * @param apiKey Alpha Vantage API key
   * @param fromCurrency Source currency (e.g., 'USD')
   * @param toCurrency Target currency (e.g., 'INR')
   */
  async getForexDaily(
    apiKey: string,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<AlphaVantageForexDaily[]> {
    try {
      const response = await axios.get(AV_BASE_URL, {
        params: {
          function: "FX_DAILY",
          from_symbol: fromCurrency,
          to_symbol: toCurrency,
          outputsize: "full",
          apikey: apiKey,
        },
        timeout: 15000,
      });

      const timeSeries = response.data?.["Time Series FX (Daily)"];
      if (!timeSeries) {
        this.logger.warn(`No forex data for ${fromCurrency}/${toCurrency}`);
        return [];
      }

      return Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
        date: new Date(date),
        open: parseFloat(values["1. open"]),
        high: parseFloat(values["2. high"]),
        low: parseFloat(values["3. low"]),
        close: parseFloat(values["4. close"]),
      }));
    } catch (error: any) {
      this.logger.error(`Forex fetch failed for ${fromCurrency}/${toCurrency}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get daily stock/ETF time series
   */
  async getDailyTimeSeries(
    apiKey: string,
    symbol: string,
  ): Promise<AlphaVantageForexDaily[]> {
    try {
      const response = await axios.get(AV_BASE_URL, {
        params: {
          function: "TIME_SERIES_DAILY",
          symbol,
          outputsize: "full",
          apikey: apiKey,
        },
        timeout: 15000,
      });

      const timeSeries = response.data?.["Time Series (Daily)"];
      if (!timeSeries) {
        this.logger.warn(`No time series data for ${symbol}`);
        return [];
      }

      return Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
        date: new Date(date),
        open: parseFloat(values["1. open"]),
        high: parseFloat(values["2. high"]),
        low: parseFloat(values["3. low"]),
        close: parseFloat(values["4. close"]),
      }));
    } catch (error: any) {
      this.logger.error(`Daily time series fetch failed for ${symbol}: ${error.message}`);
      return [];
    }
  }
}
