/**
 * Simple Upstox Historical Data Client
 * Fetches historical candles using Upstox V3 API
 */

import axios, { AxiosInstance } from "axios";

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

export class SimpleUpstoxClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl = "https://api.upstox.com";

  constructor(private readonly accessToken: string) {
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Api-Version": "2.0",
      },
    });
  }

  /**
   * Fetch historical candle data
   * @param instrumentKey - e.g., 'NSE_INDEX|Nifty 50', 'NSE_EQ|RELIANCE'
   * @param interval - '1minute', '30minute', '1day'
   * @param fromDate - ISO date string (YYYY-MM-DD)
   * @param toDate - ISO date string (YYYY-MM-DD)
   */
  async getHistoricalCandles(
    instrumentKey: string,
    interval: string,
    fromDate: string,
    toDate: string
  ): Promise<UpstoxCandleData[]> {
    try {
      const response = await this.axiosInstance.get<UpstoxHistoricalResponse>(
        `/v2/historical-candle/${instrumentKey}/${interval}/${toDate}/${fromDate}`
      );

      if (response.data.status !== "success" || !response.data.data?.candles) {
        throw new Error(`Failed to fetch candles for ${instrumentKey}`);
      }

      // Transform array format to object format
      return response.data.data.candles.map((candle) => ({
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
        throw new Error(
          `Upstox API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Fetch historical candles in batches (Upstox limits to ~1000 candles per request)
   * For 1-minute data, fetch in 1-day batches
   */
  async getHistoricalCandlesBatched(
    instrumentKey: string,
    interval: string,
    startDate: Date,
    endDate: Date
  ): Promise<UpstoxCandleData[]> {
    const allCandles: UpstoxCandleData[] = [];
    const batchSizeDays = interval === "1minute" ? 1 : 30; // 1 day for 1min, 30 days for others

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const batchEnd = new Date(currentDate);
      batchEnd.setDate(batchEnd.getDate() + batchSizeDays);

      const actualEnd = batchEnd > endDate ? endDate : batchEnd;

      const fromDateStr = currentDate.toISOString().split("T")[0];
      const toDateStr = actualEnd.toISOString().split("T")[0];

      console.log(
        `Fetching ${instrumentKey} from ${fromDateStr} to ${toDateStr}`
      );

      const candles = await this.getHistoricalCandles(
        instrumentKey,
        interval,
        fromDateStr,
        toDateStr
      );

      allCandles.push(...candles);

      // Rate limiting: 250 requests/second, so wait 100ms between requests
      await new Promise((resolve) => setTimeout(resolve, 100));

      currentDate.setDate(currentDate.getDate() + batchSizeDays + 1);
    }

    return allCandles;
  }
}
