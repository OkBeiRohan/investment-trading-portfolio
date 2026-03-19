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
import {
  HistoricalCandleRequest,
  CandleResponse,
  IntradayCandleRequest,
  ExpiredContractsRequest,
  ExpiredContractsResponse,
  ExpiredDerivativesResponse,
  ExpiredInstrument,
  ActiveOptionContractsResponse,
  ActiveOptionContract,
  ExpiryDatesResponse,
  OptionChainResponse,
  OptionChainStrike,
  UpstoxCandleData,
  parseCandleArray,
} from "./dto/historical.request.dto";
import { UPSTOX_CONSTANTS } from "../../constants";

/**
 * Date range chunk for API requests
 */
interface DateChunk {
  from: Date;
  to: Date;
}

/**
 * Simple token bucket rate limiter (50 req/sec for Upstox Plus)
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
    // Rate limit: 50 requests/second (Upstox Plus limit)
    this.rateLimiter = new TokenBucket(50, 50 / 1000);
  }

  private v2Client: AxiosInstance | null = null;

  /**
   * Initialize HTTP clients with access token.
   * V3 client for historical candles, V2 client for options/expiry/derivatives.
   */
  setAccessToken(accessToken: string): void {
    const commonHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    };

    this.client = axios.create({
      baseURL: UPSTOX_CONSTANTS.API.BASE_URL_V3,
      headers: commonHeaders,
      timeout: 10000,
    });

    this.v2Client = axios.create({
      baseURL: UPSTOX_CONSTANTS.API.BASE_URL_V2,
      headers: commonHeaders,
      timeout: 10000,
    });
  }

  private ensureClient(): AxiosInstance {
    if (!this.client) {
      throw new Error(
        "UpstoxHistoricalAPI not initialized. Call setAccessToken() first."
      );
    }
    return this.client;
  }

  private ensureV2Client(): AxiosInstance {
    if (!this.v2Client) {
      throw new Error(
        "UpstoxHistoricalAPI not initialized. Call setAccessToken() first."
      );
    }
    return this.v2Client;
  }

  // ═══════════════════════════════════════════════════════
  // Historical Candle Endpoints
  // ═══════════════════════════════════════════════════════

  /**
   * Fetch historical candles with automatic chunking
   * Handles API date range limits transparently
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
      await this.rateLimiter.wait();

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
          continue;
        }

        const authHeader = this.client?.defaults.headers?.Authorization || this.client?.defaults.headers?.common?.Authorization;
        const maskedToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? `Bearer ${authHeader.slice(7, 11)}...${authHeader.slice(-4)}`
          : '(no auth header)';
        const url = `/historical-candle/${request.instrument_key}/${request.unit}/${request.interval}/${chunk.to.toISOString().split("T")[0]}/${chunk.from.toISOString().split("T")[0]}`;

        this.logger.error(
          `Failed to fetch historical candles | ` +
          `Status: ${error.response?.status ?? 'N/A'} | Token: ${maskedToken} | ` +
          `URL: ${this.client?.defaults.baseURL}${url} | ` +
          `Response: ${JSON.stringify(error.response?.data ?? error.message)}`,
        );
        throw error;
      }
    }

    return allCandles;
  }

  /**
   * Fetch historical candles and return as typed objects
   */
  async fetchHistoricalCandlesTyped(
    instrumentKey: string,
    unit: string,
    interval: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<UpstoxCandleData[]> {
    const raw = await this.fetchHistoricalCandles({
      instrument_key: instrumentKey,
      interval,
      unit: unit as any,
      from_date: fromDate.toISOString().split("T")[0],
      to_date: toDate.toISOString().split("T")[0],
    });

    return raw.map((c) => parseCandleArray(c as any));
  }

  /**
   * Fetch intraday candles (current trading day only)
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

  // ═══════════════════════════════════════════════════════
  // V3 Expired Derivatives Endpoints
  // ═══════════════════════════════════════════════════════

  /**
   * Get all expiry dates for an instrument
   * GET /v2/expired-instruments/expiries?instrument_key=...
   */
  async getExpiryDates(instrumentKey: string): Promise<string[]> {
    await this.rateLimiter.wait();
    const client = this.ensureV2Client();

    try {
      const response = await client.get<ExpiryDatesResponse>(
        "/expired-instruments/expiries",
        { params: { instrument_key: instrumentKey } }
      );

      if (response.data.status === "success" && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      const authHeader = client.defaults.headers?.Authorization || client.defaults.headers?.common?.Authorization;
      const maskedToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? `Bearer ${authHeader.slice(7, 11)}...${authHeader.slice(-4)}`
        : '(no auth header)';
      this.logger.error(
        `Failed to get expiry dates | Status: ${error.response?.status ?? 'N/A'} | ` +
        `Token: ${maskedToken} | URL: ${client.defaults.baseURL}/expired-instruments/expiries | ` +
        `Params: ${JSON.stringify({ instrument_key: instrumentKey })} | ` +
        `Response: ${JSON.stringify(error.response?.data ?? error.message)}`,
      );
      throw error;
    }
  }

  /**
   * Get active option contracts for an underlying + expiry
   * GET /v2/option/contract?instrument_key=...&expiry_date=...
   */
  async getActiveOptionContracts(
    instrumentKey: string,
    expiryDate?: string,
  ): Promise<ActiveOptionContract[]> {
    await this.rateLimiter.wait();
    const client = this.ensureV2Client();

    try {
      const params: Record<string, string> = { instrument_key: instrumentKey };
      if (expiryDate) params.expiry_date = expiryDate;

      const response = await client.get<ActiveOptionContractsResponse>(
        "/option/contract",
        { params }
      );

      if (response.data.status === "success" && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      const authHeader = client.defaults.headers?.Authorization || client.defaults.headers?.common?.Authorization;
      const maskedToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? `Bearer ${authHeader.slice(7, 11)}...${authHeader.slice(-4)}`
        : '(no auth header)';
      this.logger.error(
        `Failed to get option contracts | Status: ${error.response?.status ?? 'N/A'} | ` +
        `Token: ${maskedToken} | URL: ${client.defaults.baseURL}/option/contract | ` +
        `Params: ${JSON.stringify({ instrument_key: instrumentKey, expiry_date: expiryDate })} | ` +
        `Response: ${JSON.stringify(error.response?.data ?? error.message)}`,
      );
      throw error;
    }
  }

  /**
   * Get option chain with Greeks for an underlying + expiry
   * GET /v2/option/chain?instrument_key=...&expiry_date=...
   */
  async getOptionChainV3(
    instrumentKey: string,
    expiryDate: string,
  ): Promise<OptionChainStrike[]> {
    await this.rateLimiter.wait();
    const client = this.ensureV2Client();

    try {
      const response = await client.get<OptionChainResponse>(
        "/option/chain",
        { params: { instrument_key: instrumentKey, expiry_date: expiryDate } }
      );

      if (response.data.status === "success" && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      const authHeader = client.defaults.headers?.Authorization || client.defaults.headers?.common?.Authorization;
      const maskedToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? `Bearer ${authHeader.slice(7, 11)}...${authHeader.slice(-4)}`
        : '(no auth header)';
      this.logger.error(
        `Failed to get option chain | Status: ${error.response?.status ?? 'N/A'} | ` +
        `Token: ${maskedToken} | URL: ${client.defaults.baseURL}/option/chain | ` +
        `Params: ${JSON.stringify({ instrument_key: instrumentKey, expiry_date: expiryDate })} | ` +
        `Response: ${JSON.stringify(error.response?.data ?? error.message)}`,
      );
      throw error;
    }
  }

  /**
   * Get expired futures for an underlying + expiry date
   * GET /v2/expired-instruments/future/contract?instrument_key=...&expiry_date=...
   */
  async getExpiredFutures(
    instrumentKey: string,
    expiryDate: string,
  ): Promise<ExpiredInstrument[]> {
    await this.rateLimiter.wait();
    const client = this.ensureV2Client();

    try {
      const response = await client.get<ExpiredDerivativesResponse>(
        "/expired-instruments/future/contract",
        { params: { instrument_key: instrumentKey, expiry_date: expiryDate } }
      );

      if (response.data.status === "success" && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      const authHeader = client.defaults.headers?.Authorization || client.defaults.headers?.common?.Authorization;
      const maskedToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? `Bearer ${authHeader.slice(7, 11)}...${authHeader.slice(-4)}`
        : '(no auth header)';
      this.logger.error(
        `Failed to get expired futures | Status: ${error.response?.status ?? 'N/A'} | ` +
        `Token: ${maskedToken} | URL: ${client.defaults.baseURL}/expired-instruments/future/contract | ` +
        `Params: ${JSON.stringify({ instrument_key: instrumentKey, expiry_date: expiryDate })} | ` +
        `Response: ${JSON.stringify(error.response?.data ?? error.message)}`,
      );
      return [];
    }
  }

  /**
   * Get expired options for an underlying + expiry date
   * GET /v2/expired-instruments/option/contract?instrument_key=...&expiry_date=...
   */
  async getExpiredOptions(
    instrumentKey: string,
    expiryDate: string,
  ): Promise<ExpiredInstrument[]> {
    await this.rateLimiter.wait();
    const client = this.ensureV2Client();

    try {
      const response = await client.get<ExpiredDerivativesResponse>(
        "/expired-instruments/option/contract",
        { params: { instrument_key: instrumentKey, expiry_date: expiryDate } }
      );

      if (response.data.status === "success" && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      const authHeader = client.defaults.headers?.Authorization || client.defaults.headers?.common?.Authorization;
      const maskedToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? `Bearer ${authHeader.slice(7, 11)}...${authHeader.slice(-4)}`
        : '(no auth header)';
      this.logger.error(
        `Failed to get expired options | Status: ${error.response?.status ?? 'N/A'} | ` +
        `Token: ${maskedToken} | URL: ${client.defaults.baseURL}/expired-instruments/option/contract | ` +
        `Params: ${JSON.stringify({ instrument_key: instrumentKey, expiry_date: expiryDate })} | ` +
        `Response: ${JSON.stringify(error.response?.data ?? error.message)}`,
      );
      return [];
    }
  }

  /**
   * Get expired candles (historical data for expired instruments)
   * Uses same endpoint as active candles, but for expired instrument keys
   */
  async fetchExpiredCandles(
    instrumentKey: string,
    interval: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<UpstoxCandleData[]> {
    // For expired instruments, use the same chunking logic
    const unit = this.resolveUnit(interval);
    const intervalValue = this.resolveInterval(interval);

    const raw = await this.fetchHistoricalCandles({
      instrument_key: instrumentKey,
      interval: intervalValue,
      unit,
      from_date: fromDate.toISOString().split("T")[0],
      to_date: toDate.toISOString().split("T")[0],
    });

    return raw.map((c) => parseCandleArray(c as any));
  }

  /**
   * Get legacy expired contracts (by symbol)
   */
  async getExpiredContracts(
    request: ExpiredContractsRequest
  ): Promise<string[]> {
    await this.rateLimiter.wait();

    try {
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

  // ═══════════════════════════════════════════════════════
  // Market Quotes (via V2 API for backwards compatibility)
  // ═══════════════════════════════════════════════════════

  /**
   * Get market quotes for instruments (V2 API)
   */
  async getMarketQuotes(instrumentKeys: string[]): Promise<any> {
    await this.rateLimiter.wait();
    const client = this.ensureClient();

    // Market quotes use V2 API
    const v2Client = axios.create({
      baseURL: UPSTOX_CONSTANTS.API.BASE_URL_V2,
      headers: client.defaults.headers as any,
      timeout: 10000,
    });

    try {
      const response = await v2Client.get("/market-quote/quotes", {
        params: { instrument_key: instrumentKeys.join(",") },
      });

      if (response.data.status === "success") {
        return response.data.data;
      }
      return {};
    } catch (error: any) {
      const authHeader = client.defaults.headers?.Authorization || client.defaults.headers?.common?.Authorization;
      const maskedToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? `Bearer ${authHeader.slice(7, 11)}...${authHeader.slice(-4)}`
        : '(no auth header)';
      this.logger.error(
        `Failed to get market quotes | Status: ${error.response?.status ?? 'N/A'} | ` +
        `Token: ${maskedToken} | ` +
        `Params: ${JSON.stringify({ instrument_key: instrumentKeys.join(",") })} | ` +
        `Response: ${JSON.stringify(error.response?.data ?? error.message)}`,
      );
      return {};
    }
  }

  // ═══════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════

  /**
   * Resolve interval string to API unit
   */
  private resolveUnit(interval: string): "minutes" | "hours" | "days" | "weeks" | "months" {
    if (interval.includes("minute") || interval === "1minute") return "minutes";
    if (interval === "day") return "days";
    if (interval === "week") return "weeks";
    if (interval === "month") return "months";
    return "days";
  }

  /**
   * Resolve interval string to interval value
   */
  private resolveInterval(interval: string): string {
    const match = interval.match(/^(\d+)/);
    return match ? match[1] : "1";
  }

  /**
   * Calculate date chunks based on API constraints
   */
  private calculateChunks(
    from: Date,
    to: Date,
    unit: string,
    interval: number
  ): DateChunk[] {
    const chunks: DateChunk[] = [];

    let maxChunkDays: number;

    if (unit === "minutes" && interval <= 15) {
      maxChunkDays = 30;
    } else if (unit === "minutes" || (unit === "hours" && interval <= 5)) {
      maxChunkDays = 90;
    } else if (unit === "days") {
      maxChunkDays = 3650;
    } else {
      return [{ from, to }];
    }

    let currentStart = new Date(from);

    while (currentStart < to) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + maxChunkDays);

      if (currentEnd > to) {
        currentEnd.setTime(to.getTime());
      }

      chunks.push({
        from: new Date(currentStart),
        to: new Date(currentEnd),
      });

      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1);
    }

    return chunks;
  }

  /**
   * Estimate total API calls required for a date range
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

