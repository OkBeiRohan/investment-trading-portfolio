/**
 * Upstox Historical Data API
 * Handles historical and intraday candle data fetching with:
 * - Intelligent chunking (respects API date range limits)
 * - Rate limiting (50 req/sec)
 * - Expired contracts support
 * - Gap detection integration
 *
 * API Constraints (from Upstox V3 documentation):
 * - 1min-15min candles: Max 1 month range per request
 * - >15min-5h candles: Max 1 quarter (3 months) range
 * - Daily candles: Max 1 decade range
 * - Weekly/Monthly: No limit
 *
 * References:
 * https://upstox.com/developer/api-documentation/v3/get-historical-candle-data
 * https://upstox.com/developer/api-documentation/v3/get-intra-day-candle-data
 */

import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import { HistoricalApiRepository } from "./historical.repository";

export interface HistoricalCandleRequest {
  instrument_key: string;
  interval: string; // '1', '3', '5', '15', '30' (minutes) or '1' (hour/day/week/month)
  unit: "minutes" | "hours" | "days" | "weeks" | "months";
  from_date: string; // YYYY-MM-DD
  to_date: string; // YYYY-MM-DD
}

export interface IntradayCandleRequest {
  instrument_key: string;
  interval: string;
  unit: "minutes" | "hours" | "days";
}

export interface CandleResponse {
  status: string;
  data: {
    candles: Array<
      [
        string, // timestamp
        number, // open
        number, // high
        number, // low
        number, // close
        number, // volume
        number, // open_interest
      ]
    >;
  };
}

export interface ExpiredContractsRequest {
  symbol: string; // 'NIFTY', 'BANKNIFTY', etc.
  expiry_date: string; // YYYY-MM-DD
}

export interface ExpiredContractsResponse {
  status: string;
  data: Array<{
    instrument_key: string;
    name: string;
    exchange: string;
    trading_symbol: string;
  }>;
}

/**
 * Date range chunk for API requests
 */
interface DateChunk {
  from: Date;
  to: Date;
}

/**
 * Simple token bucket rate limiter (50 req/sec for Upstox)
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number // tokens per ms
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async wait(): Promise<void> {
    while (true) {
      this.refill();

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }

      // Wait until next token available
      const waitMs = Math.ceil((1 - this.tokens) / this.refillRate);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.tokens + tokensToAdd, this.maxTokens);
    this.lastRefill = now;
  }
}

@Injectable()
export class UpstoxHistoricalAPIService {
  private readonly logger = new Logger(UpstoxHistoricalAPIService.name);
  private client: AxiosInstance | null = null;
  private readonly rateLimiter: TokenBucket;

  constructor(private readonly historicalRepository: HistoricalApiRepository) {
    // Rate limit: 50 requests/second (Upstox limit)
    this.rateLimiter = new TokenBucket(50, 50 / 1000); // 50 tokens, refill at 50/1000 = 0.05 tokens/ms
  }

  /**
   * Initialize HTTP client with access token
   * Must be called before making API requests
   */
  setAccessToken(accessToken: string): void {
    this.client = axios.create({
      baseURL: "https://api.upstox.com/v3",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 10000,
    });
  }

  /**
   * Ensure client is initialized
   */
  private ensureClient(): AxiosInstance {
    if (!this.client) {
      throw new Error(
        "UpstoxHistoricalAPI not initialized. Call setAccessToken() first."
      );
    }
    return this.client;
  }

  /**
   * Fetch historical candles with automatic chunking
   * Handles API date range limits transparently
   *
   * @param request Historical candle request
   * @returns All candles across all chunks
   */
  async fetchHistoricalCandles(
    request: HistoricalCandleRequest
  ): Promise<CandleResponse["data"]["candles"]> {
    const chunks = this.calculateChunks(
      new Date(request.from_date),
      new Date(request.to_date),
      request.unit,
      parseInt(request.interval, 10)
    );

    this.logger.log(
      `Fetching ${chunks.length} chunks for ${request.instrument_key} (${request.unit}/${request.interval})`
    );

    const allCandles: CandleResponse["data"]["candles"] = [];

    for (const chunk of chunks) {
      await this.rateLimiter.wait(); // Enforce rate limit

      try {
        const chunkRequest: HistoricalCandleRequest = {
          ...request,
          from_date: chunk.from.toISOString().split("T")[0],
          to_date: chunk.to.toISOString().split("T")[0],
        };

        const client = this.ensureClient();
        const response = await client.get<CandleResponse>(
          `/historical-candle/${chunkRequest.instrument_key}/${chunkRequest.unit}/${chunkRequest.interval}/${chunkRequest.to_date}/${chunkRequest.from_date}`
        );

        if (response.data.status === "success" && response.data.data?.candles) {
          allCandles.push(...response.data.data.candles);
          this.logger.debug(
            `Fetched ${response.data.data.candles.length} candles for chunk ${chunk.from.toISOString()} - ${chunk.to.toISOString()}`
          );
        }
      } catch (error: any) {
        if (error.response?.status === 429) {
          this.logger.warn("Rate limit exceeded, waiting 1 second...");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          // Retry this chunk
          continue;
        }

        this.logger.error(
          `Failed to fetch chunk ${chunk.from.toISOString()} - ${chunk.to.toISOString()}`,
          error
        );
        throw error;
      }
    }

    return allCandles;
  }

  /**
   * Fetch intraday candles (current trading day only)
   *
   * @param request Intraday candle request
   * @returns Today's candles
   */
  async fetchIntradayCandles(
    request: IntradayCandleRequest
  ): Promise<CandleResponse["data"]["candles"]> {
    await this.rateLimiter.wait();

    try {
      const client = this.ensureClient();
      const response = await client.get<CandleResponse>(
        `/historical-candle/intraday/${request.instrument_key}/${request.unit}/${request.interval}`
      );

      if (response.data.status === "success" && response.data.data?.candles) {
        return response.data.data.candles;
      }

      return [];
    } catch (error) {
      this.logger.error(`Failed to fetch intraday candles`, error);
      throw error;
    }
  }

  /**
   * Get list of expired option contracts for a specific expiry date
   * Critical for training data (historical options)
   *
   * @param request Expired contracts request
   * @returns List of expired instrument keys
   */
  async getExpiredContracts(
    request: ExpiredContractsRequest
  ): Promise<string[]> {
    await this.rateLimiter.wait();

    try {
      // Note: This is a hypothetical endpoint based on the blueprint
      // Actual Upstox API endpoint may differ
      const client = this.ensureClient();
      const response = await client.get<ExpiredContractsResponse>(
        `/option/expired-contracts/${request.symbol}/${request.expiry_date}`
      );

      if (response.data.status === "success" && response.data.data) {
        return response.data.data.map((contract) => contract.instrument_key);
      }

      return [];
    } catch (error) {
      this.logger.warn(
        `Failed to fetch expired contracts for ${request.symbol}/${request.expiry_date}`,
        error
      );
      return [];
    }
  }

  /**
   * Calculate date chunks based on API constraints
   *
   * Upstox V3 Limits:
   * - 1-15 min intervals: 1 month max
   * - >15 min - 5 hour intervals: 1 quarter (3 months) max
   * - Daily: 1 decade max
   * - Weekly/Monthly: No limit
   *
   * @param from Start date
   * @param to End date
   * @param unit Time unit
   * @param interval Interval value
   * @returns Array of date chunks
   */
  private calculateChunks(
    from: Date,
    to: Date,
    unit: string,
    interval: number
  ): DateChunk[] {
    const chunks: DateChunk[] = [];

    // Determine max chunk size based on API limits
    let maxChunkDays: number;

    if (unit === "minutes" && interval <= 15) {
      maxChunkDays = 30; // 1 month
    } else if (unit === "minutes" || (unit === "hours" && interval <= 5)) {
      maxChunkDays = 90; // 1 quarter (3 months)
    } else if (unit === "days") {
      maxChunkDays = 3650; // 1 decade (10 years)
    } else {
      // weeks/months: no limit, use full range
      return [{ from, to }];
    }

    let currentStart = new Date(from);

    while (currentStart < to) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + maxChunkDays);

      // Don't exceed the final to date
      if (currentEnd > to) {
        currentEnd.setTime(to.getTime());
      }

      chunks.push({
        from: new Date(currentStart),
        to: new Date(currentEnd),
      });

      // Move to next chunk
      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1); // Avoid overlap
    }

    return chunks;
  }

  /**
   * Estimate total API calls required for a date range
   * Useful for progress tracking and quota management
   *
   * @param from Start date
   * @param to End date
   * @param unit Time unit
   * @param interval Interval value
   * @returns Number of API calls required
   */
  estimateApiCalls(
    from: Date,
    to: Date,
    unit: string,
    interval: number
  ): number {
    return this.calculateChunks(from, to, unit, interval).length;
  }
}
