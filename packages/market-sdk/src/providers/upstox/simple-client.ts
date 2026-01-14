/**
 * Simple Upstox Historical Data Client
 * Fetches historical candles using Upstox V3 API
 */

import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import got, { Got } from "got";

export interface UpstoxCandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  open_interest?: number;
}

export interface UpstoxHistoricalResponse {
  status: string;
  data: {
    candles: [string, number, number, number, number, number, number?][];
  };
}

export interface UpstoxMarketQuoteResponse {
  status: string;
  data: {
    [instrumentKey: string]: {
      instrument_token: string;
      exchange: string;
      trading_symbol: string;
      isin?: string;
      last_price: number;
      ohlc: {
        open: number;
        high: number;
        low: number;
        close: number;
      };
      volume: number;
      average_price: number;
      oi?: number;
      net_change: number;
      lower_circuit_limit: number;
      upper_circuit_limit: number;
      last_trade_time: string;
      oi_day_high?: number;
      oi_day_low?: number;
    };
  };
}

export interface InstrumentMasterData {
  instrumentKey: string;
  exchange: string;
  segment: string;
  tradingSymbol: string;
  name: string;
  isin?: string;
  lastPrice?: number;
  lastUpdated: Date;
}

@Injectable()
export class SimpleUpstoxClient {
  private readonly logger = new Logger(SimpleUpstoxClient.name);
  private readonly api: Got;
  private readonly baseUrl = "https://api.upstox.com";

  constructor() {
    const accessToken = process.env.UPSTOX_ACCESS_TOKEN;

    if (!accessToken) {
      this.logger.warn("UPSTOX_ACCESS_TOKEN not set in environment");
    } else {
      this.logger.log(
        `Upstox client initialized with token (first 10 chars): ${accessToken.substring(0, 10)}...`
      );
    }

    this.api = got.extend({
      prefixUrl: this.baseUrl,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken || ""}`,
        "Api-Version": "3.0",
      },
      throwHttpErrors: true,
      timeout: { request: 30000 },
      responseType: "json",
    });
  }

  /**
   * Fetch historical candle data using V3 API
   * @param instrumentKey - e.g., 'NSE_INDEX|Nifty 50', 'NSE_EQ|INE002A01018' (ISIN format)
   * @param unit - 'minutes', 'hours', 'days', 'weeks', 'months'
   * @param interval - For minutes: 1-300, hours: 1-5, days/weeks/months: 1
   * @param fromDate - ISO date string (YYYY-MM-DD)
   * @param toDate - ISO date string (YYYY-MM-DD)
   */
  async getHistoricalCandles(
    instrumentKey: string,
    unit: "minutes" | "hours" | "days" | "weeks" | "months",
    interval: number,
    fromDate: string,
    toDate: string
  ): Promise<UpstoxCandleData[]> {
    try {
      // V3 API endpoint: /v3/historical-candle/:instrument_key/:unit/:interval/:to_date/:from_date
      const encodedKey = encodeURIComponent(instrumentKey);
      const response = await this.api.get<UpstoxHistoricalResponse>(
        `/v3/historical-candle/${encodedKey}/${unit}/${interval}/${toDate}/${fromDate}`
      );

      if (response.body.status !== "success" || !response.body.data?.candles) {
        throw new Error(`Failed to fetch candles for ${instrumentKey}`);
      } else {
        this.logger.log(
          `Fetched ${response.body.data.candles.length} candles for ${instrumentKey} (${unit}/${interval}) from ${fromDate} to ${toDate}`
        );
      }

      // Transform array format to object format
      return response.body.data.candles.map((candle) => ({
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
        open_interest: candle[6],
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorDetails = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          code: error.code,
          message: error.message,
        };
        this.logger.error(
          `Upstox API error details: ${JSON.stringify(errorDetails, null, 2)}`
        );
        throw new Error(
          `Upstox API error: ${error.response?.status || error.code} - ${JSON.stringify(error.response?.data || error.message)}`
        );
      }
      // Log non-axios errors
      this.logger.error(
        `Non-Axios error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Fetch historical candles in batches based on V3 API constraints
   *
   * Data availability (from V3 API docs):
   * - minutes (1-300): Available from Jan 2022
   *   - 1-15 min intervals: Max 1 month per request
   *   - >15 min intervals: Max 1 quarter per request
   * - hours (1-5): Available from Jan 2022, max 1 quarter per request
   * - days: Available from Jan 2000, max 1 decade per request
   * - weeks/months: Available from Jan 2000, no limit
   *
   * @param instrumentKey - e.g., 'NSE_INDEX|Nifty 50', 'NSE_EQ|INE002A01018'
   * @param unit - 'minutes', 'hours', 'days', 'weeks', 'months'
   * @param interval - Interval value (1-300 for minutes, 1-5 for hours, 1 for others)
   * @param startDate - Start date (will be clamped to Jan 2022 for minutes/hours)
   * @param endDate - End date
   */
  async getHistoricalCandlesBatched(
    instrumentKey: string,
    unit: "minutes" | "hours" | "days" | "weeks" | "months",
    interval: number,
    startDate: Date,
    endDate: Date
  ): Promise<UpstoxCandleData[]> {
    // Enforce data availability constraints
    const minDate = new Date("2022-01-01");
    if ((unit === "minutes" || unit === "hours") && startDate < minDate) {
      this.logger.warn(
        `Requested start date ${startDate.toISOString().split("T")[0]} is before Jan 2022. Clamping to 2022-01-01.`
      );
      startDate = minDate;
    }

    const allCandles: UpstoxCandleData[] = [];

    // Determine batch size based on unit and interval
    let batchSizeDays: number;
    if (unit === "minutes") {
      // 1-15 min: 1 month, >15 min: 1 quarter (90 days)
      batchSizeDays = interval <= 15 ? 30 : 90;
    } else if (unit === "hours") {
      batchSizeDays = 90; // 1 quarter
    } else if (unit === "days") {
      batchSizeDays = 3650; // 1 decade
    } else {
      // weeks/months: no limit, fetch all at once
      batchSizeDays =
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;
    }

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const batchEnd = new Date(currentDate);
      batchEnd.setDate(batchEnd.getDate() + batchSizeDays - 1); // Subtract 1 to avoid overlap

      const actualEnd = batchEnd > endDate ? endDate : batchEnd;

      const fromDateStr = currentDate.toISOString().split("T")[0];
      const toDateStr = actualEnd.toISOString().split("T")[0];

      this.logger.log(
        `Fetching ${instrumentKey} (${unit}/${interval}) from ${fromDateStr} to ${toDateStr}`
      );

      const candles = await this.getHistoricalCandles(
        instrumentKey,
        unit,
        interval,
        fromDateStr,
        toDateStr
      );

      allCandles.push(...candles);

      // Rate limiting: 250 requests/second, so wait 100ms between requests
      await new Promise((resolve) => setTimeout(resolve, 100));

      currentDate.setDate(currentDate.getDate() + batchSizeDays);
    }

    return allCandles;
  }

  /**
   * Test method to fetch a single batch for debugging
   * @param instrumentKey - Instrument to test
   * @param daysBack - How many days back to fetch (default 7)
   */
  async testFetch(
    instrumentKey: string,
    daysBack: number = 7
  ): Promise<{
    success: boolean;
    candleCount: number;
    error?: string;
    sampleCandle?: UpstoxCandleData;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      this.logger.log(
        `Testing fetch for ${instrumentKey} from ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`
      );

      const candles = await this.getHistoricalCandles(
        instrumentKey,
        "minutes",
        1,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0]
      );

      return {
        success: true,
        candleCount: candles.length,
        sampleCandle: candles[0],
      };
    } catch (error) {
      return {
        success: false,
        candleCount: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Fetch full market quote for instruments
   * @param instrumentKeys - Array of instrument keys (e.g., ['NSE_INDEX|Nifty 50', 'NSE_EQ|INE002A01018'])
   * @returns Market quote data for instruments
   */
  async getFullMarketQuote(
    instrumentKeys: string[]
  ): Promise<InstrumentMasterData[]> {
    try {
      // API endpoint: /v2/market-quote/quotes?instrument_key=KEY1&instrument_key=KEY2
      const params = new URLSearchParams();
      instrumentKeys.forEach((key) => params.append("instrument_key", key));

      const response = await this.api.get<UpstoxMarketQuoteResponse>(
        `/v2/market-quote/quotes?${params.toString()}`
      );

      if (response.body.status !== "success" || !response.body.data) {
        throw new Error("Failed to fetch market quotes");
      }

      // Transform to InstrumentMasterData
      return Object.entries(response.body.data).map(([key, quote]) => {
        // Parse segment from instrument key (e.g., NSE_EQ|INE002A01018 -> NSE_EQ)
        const [segment] = key.split("|");
        const [exchange] = segment.split("_");

        return {
          instrumentKey: key,
          exchange: quote.exchange || exchange,
          segment: segment,
          tradingSymbol: quote.trading_symbol,
          name: quote.trading_symbol, // API doesn't provide full name, use symbol
          isin: quote.isin,
          lastPrice: quote.last_price,
          lastUpdated: new Date(),
        };
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorDetails = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        };
        this.logger.error(
          `Upstox Market Quote API error: ${JSON.stringify(errorDetails, null, 2)}`
        );
        throw new Error(
          `Market Quote API error: ${error.response?.status} - ${JSON.stringify(error.response?.data || error.message)}`
        );
      }
      throw error;
    }
  }

  /**
   * Fetch market quotes in batches (max 500 per request)
   * @param instrumentKeys - Array of instrument keys
   * @returns All instrument master data
   */
  async getFullMarketQuoteBatched(
    instrumentKeys: string[]
  ): Promise<InstrumentMasterData[]> {
    const BATCH_SIZE = 500;
    const allData: InstrumentMasterData[] = [];

    for (let i = 0; i < instrumentKeys.length; i += BATCH_SIZE) {
      const batch = instrumentKeys.slice(i, i + BATCH_SIZE);
      this.logger.log(
        `Fetching market quotes batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} instruments)`
      );

      const data = await this.getFullMarketQuote(batch);
      allData.push(...data);

      // Rate limiting
      if (i + BATCH_SIZE < instrumentKeys.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return allData;
  }
}
