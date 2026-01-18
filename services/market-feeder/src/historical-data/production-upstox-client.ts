/**
 * Production Upstox Data Fetcher
 * Comprehensive data fetching with smart date discovery and error handling
 * 
 * Upstox V3 API Constraints:
 * - Minutes/Hours: Available from Jan 2022
 * - Days: Available from Jan 2000
 * - Rate limits: 50 req/sec, 500 req/min
 * 
 * Features:
 * - Smart date discovery (binary search to find earliest data)
 * - Retry with exponential backoff
 * - Proper Upstox error code handling
 * - All options/futures fetching
 */

import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { CandlesRepository, InstrumentMasterRepository } from "@repo/database";
import { AxiosError, isAxiosError } from "axios";

// ============================================================================
// UPSTOX API TYPES
// ============================================================================

/** Upstox API response wrapper */
export interface UpstoxResponse<T> {
    status: "success" | "error";
    data: T;
}

/** Upstox error response */
export interface UpstoxErrorResponse {
    status: "error";
    errors: UpstoxApiError[];
}

/** Individual Upstox API error */
export interface UpstoxApiError {
    errorCode: string;
    message: string;
    propertyPath: string;
    invalidValue?: string;
}

/** Candle array format [timestamp, open, high, low, close, volume, oi?] */
export type CandleArray = [string, number, number, number, number, number, number?];

/** Candle data response */
export interface CandleData {
    candles: CandleArray[];
}

/** Parsed candle data */
export interface ParsedCandle {
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    openInterest: number | null;
}

/** Expiry dates response */
export interface ExpiriesData {
    expiries: string[];
}

/** Option contract from Upstox */
export interface OptionContract {
    name: string;
    segment: string;
    exchange: string;
    expiry: string;
    instrument_key: string;
    exchange_token: string;
    trading_symbol: string;
    tick_size: number;
    lot_size: number;
    instrument_type: string;
    freeze_quantity: number;
    underlying_key: string;
    underlying_type: string;
    underlying_symbol: string;
    minimum_lot: number;
    strike_price: number;
    option_type: "CE" | "PE";
}

/** Future contract from Upstox */
export interface FutureContract {
    name: string;
    segment: string;
    exchange: string;
    expiry: string;
    instrument_key: string;
    exchange_token: string;
    trading_symbol: string;
    tick_size: number;
    lot_size: number;
    instrument_type: string;
    freeze_quantity: number;
    underlying_key: string;
    underlying_type: string;
    underlying_symbol: string;
    minimum_lot: number;
}

/** Data availability by timeframe */
export const DATA_AVAILABILITY = {
    MINUTE: new Date("2022-01-01"),
    HOUR: new Date("2022-01-01"),
    DAY: new Date("2000-01-01"),
    WEEK: new Date("2000-01-01"),
    MONTH: new Date("2000-01-01"),
} as const;

/** Upstox error codes */
export const UPSTOX_ERROR_CODES = {
    INVALID_DATE_RANGE: "UDAPI1148",
    INSTRUMENT_KEY_REQUIRED: "UDAPI1026",
    INVALID_ORDER_TYPE: "UDAPI1004",
    NO_DATA_AVAILABLE: "UDAPI10044",
} as const;

// ============================================================================
// RATE LIMITER
// ============================================================================

class RateLimiter {
    private tokens: number;
    private lastRefill: number;
    private readonly maxTokens: number;
    private readonly refillRate: number; // tokens per second

    constructor(maxTokens: number, refillRate: number) {
        this.maxTokens = maxTokens;
        this.tokens = maxTokens;
        this.refillRate = refillRate;
        this.lastRefill = Date.now();
    }

    async acquire(): Promise<void> {
        this.refill();

        while (this.tokens < 1) {
            const waitTime = Math.ceil((1 - this.tokens) / this.refillRate * 1000);
            await this.sleep(Math.min(waitTime, 100));
            this.refill();
        }

        this.tokens -= 1;
    }

    private refill(): void {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        const tokensToAdd = elapsed * this.refillRate;
        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ============================================================================
// PRODUCTION UPSTOX CLIENT
// ============================================================================

@Injectable()
export class ProductionUpstoxClient {
    private readonly logger = new Logger(ProductionUpstoxClient.name);

    // Rate limiter: 40 req/sec (safe buffer under 50 limit)
    private readonly rateLimiter = new RateLimiter(40, 40);

    // Retry configuration
    private readonly maxRetries = 3;
    private readonly baseBackoffMs = 1000;

    constructor(
        private readonly http: HttpService,
        private readonly candlesRepository: CandlesRepository,
        private readonly instrumentMasterRepository: InstrumentMasterRepository
    ) { }

    // ==========================================================================
    // SMART DATE DISCOVERY
    // ==========================================================================

    /**
     * Discover earliest available data date for an instrument
     * Uses binary search to efficiently find the start date
     */
    async discoverDataStartDate(
        instrumentKey: string,
        unit: "minute" | "day",
        searchStart?: Date,
        searchEnd?: Date
    ): Promise<Date | null> {
        const minDate = unit === "minute" ? DATA_AVAILABILITY.MINUTE : DATA_AVAILABILITY.DAY;
        const start = searchStart && searchStart > minDate ? searchStart : minDate;
        const end = searchEnd || new Date();

        this.logger.log(`Discovering start date for ${instrumentKey} (${unit}) between ${start.toISOString().split("T")[0]} and ${end.toISOString().split("T")[0]}`);

        let left = start.getTime();
        let right = end.getTime();
        let earliestFound: Date | null = null;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const testDate = new Date(mid);

            // Try to fetch a small amount of data
            const testEnd = new Date(testDate);
            testEnd.setDate(testEnd.getDate() + 7);

            const hasData = await this.testDataAvailability(
                instrumentKey,
                unit === "minute" ? "minutes" : "days",
                testDate,
                testEnd > end ? end : testEnd
            );

            if (hasData) {
                earliestFound = testDate;
                right = mid - 1; // Search earlier
            } else {
                left = mid + 1; // Search later
            }

            // Prevent infinite loop - minimum 1 day granularity
            if (right - left < 86400000) break;
        }

        if (earliestFound) {
            this.logger.log(`Found earliest data for ${instrumentKey}: ${earliestFound.toISOString().split("T")[0]}`);
        } else {
            this.logger.warn(`No data found for ${instrumentKey}`);
        }

        return earliestFound;
    }

    /**
     * Test if data is available for a date range
     */
    private async testDataAvailability(
        instrumentKey: string,
        unit: "minutes" | "days",
        fromDate: Date,
        toDate: Date
    ): Promise<boolean> {
        try {
            const candles = await this.fetchCandles(
                instrumentKey,
                unit,
                1,
                fromDate,
                toDate,
                false // Don't store, just test
            );
            return candles.length > 0;
        } catch (error) {
            // Expected for invalid date ranges
            return false;
        }
    }

    // ==========================================================================
    // CANDLE FETCHING
    // ==========================================================================

    /**
     * Fetch historical candles with automatic batching and rate limiting
     */
    async fetchCandles(
        instrumentKey: string,
        unit: "minutes" | "hours" | "days" | "weeks" | "months",
        interval: number,
        startDate: Date,
        endDate: Date,
        store = true
    ): Promise<ParsedCandle[]> {
        // Clamp dates to API availability
        const minDate = unit === "minutes" || unit === "hours"
            ? DATA_AVAILABILITY.MINUTE
            : DATA_AVAILABILITY.DAY;

        if (startDate < minDate) {
            this.logger.debug(`Clamping start date to ${minDate.toISOString().split("T")[0]}`);
            startDate = new Date(minDate);
        }

        const today = new Date();
        if (endDate > today) {
            endDate = today;
        }

        const allCandles: ParsedCandle[] = [];
        const batches = this.calculateBatches(unit, interval, startDate, endDate);

        for (const batch of batches) {
            try {
                await this.rateLimiter.acquire();

                const candles = await this.withRetry(() =>
                    this.fetchCandleBatch(instrumentKey, unit, interval, batch.from, batch.to)
                );

                if (candles.length > 0) {
                    allCandles.push(...candles);

                    if (store) {
                        await this.storeCandles(instrumentKey, candles, unit, interval);
                    }
                }
            } catch (error) {
                const upstoxError = this.parseUpstoxError(error);
                if (upstoxError?.errorCode === UPSTOX_ERROR_CODES.NO_DATA_AVAILABLE) {
                    // No data for this range, continue
                    continue;
                }
                this.logger.error(`Failed to fetch batch for ${instrumentKey}`, error);
            }
        }

        this.logger.log(`Fetched ${allCandles.length} candles for ${instrumentKey}`);
        return allCandles;
    }

    /**
     * Fetch a single batch of candles
     */
    private async fetchCandleBatch(
        instrumentKey: string,
        unit: "minutes" | "hours" | "days" | "weeks" | "months",
        interval: number,
        fromDate: Date,
        toDate: Date
    ): Promise<ParsedCandle[]> {
        const encodedKey = encodeURIComponent(instrumentKey);
        const fromStr = fromDate.toISOString().split("T")[0];
        const toStr = toDate.toISOString().split("T")[0];

        const url = `/v3/historical-candle/${encodedKey}/${unit}/${interval}/${toStr}/${fromStr}`;

        const response = await firstValueFrom(
            this.http.get<UpstoxResponse<CandleData>>(url)
        );

        if (response.data.status !== "success" || !response.data.data?.candles) {
            return [];
        }

        return response.data.data.candles.map(candle => ({
            timestamp: candle[0],
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4],
            volume: candle[5],
            openInterest: candle[6] ?? null,
        }));
    }

    /**
     * Calculate date batches based on API constraints
     */
    private calculateBatches(
        unit: string,
        interval: number,
        startDate: Date,
        endDate: Date
    ): Array<{ from: Date; to: Date }> {
        const batches: Array<{ from: Date; to: Date }> = [];
        let current = new Date(startDate);

        while (current < endDate) {
            let batchEnd: Date;

            if (unit === "minutes" && interval <= 15) {
                // 1 month for 1-15 minute intervals
                batchEnd = new Date(current);
                batchEnd.setMonth(batchEnd.getMonth() + 1);
                batchEnd.setDate(batchEnd.getDate() - 1);
            } else if (unit === "minutes" || unit === "hours") {
                // 3 months for higher minute intervals or hours
                batchEnd = new Date(current);
                batchEnd.setMonth(batchEnd.getMonth() + 3);
                batchEnd.setDate(batchEnd.getDate() - 1);
            } else if (unit === "days") {
                // 10 years for days
                batchEnd = new Date(current);
                batchEnd.setFullYear(batchEnd.getFullYear() + 10);
                batchEnd.setDate(batchEnd.getDate() - 1);
            } else {
                // No limit for weeks/months
                batchEnd = new Date(endDate);
            }

            if (batchEnd > endDate) {
                batchEnd = new Date(endDate);
            }

            batches.push({ from: new Date(current), to: batchEnd });

            current = new Date(batchEnd);
            current.setDate(current.getDate() + 1);
        }

        return batches;
    }

    /**
     * Store candles to QuestDB
     */
    private async storeCandles(
        instrumentKey: string,
        candles: ParsedCandle[],
        unit: string,
        interval: number
    ): Promise<void> {
        const CHUNK_SIZE = 5000;

        const inserts = candles.map(c => ({
            timestamp: new Date(c.timestamp),
            instrumentKey,
            intervalValue: interval,
            intervalUnit: unit === "minutes" ? "minute" as const
                : unit === "hours" ? "hour" as const
                    : unit === "days" ? "day" as const
                        : "minute" as const,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
            openInterest: c.openInterest,
        }));

        for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
            const chunk = inserts.slice(i, i + CHUNK_SIZE);
            await this.candlesRepository.insertBatch(chunk);
        }

        this.logger.debug(`Stored ${inserts.length} candles for ${instrumentKey}`);
    }

    // ==========================================================================
    // OPTIONS & FUTURES
    // ==========================================================================

    /**
     * Get all expiries for an underlying instrument
     */
    async getExpiries(instrumentKey: string): Promise<string[]> {
        await this.rateLimiter.acquire();

        const encodedKey = encodeURIComponent(instrumentKey);
        const response = await firstValueFrom(
            this.http.get<UpstoxResponse<string[]>>(
                `/v2/expired-instruments/expiries?instrument_key=${encodedKey}`
            )
        );

        if (response.data.status !== "success" || !response.data.data) {
            return [];
        }

        this.logger.log(`Found ${response.data.data.length} expiries for ${instrumentKey}`);
        return response.data.data;
    }

    /**
     * Get all expired option contracts for an expiry
     */
    async getExpiredOptionContracts(
        instrumentKey: string,
        expiryDate: string
    ): Promise<OptionContract[]> {
        await this.rateLimiter.acquire();

        const encodedKey = encodeURIComponent(instrumentKey);
        const response = await firstValueFrom(
            this.http.get<UpstoxResponse<OptionContract[]>>(
                `/v2/expired-instruments/option/contract?instrument_key=${encodedKey}&expiry_date=${expiryDate}`
            )
        );

        if (response.data.status !== "success" || !response.data.data) {
            return [];
        }

        this.logger.log(`Found ${response.data.data.length} option contracts for ${instrumentKey} expiry ${expiryDate}`);
        return response.data.data;
    }

    /**
     * Get expired future contracts for an expiry
     */
    async getExpiredFutureContracts(
        instrumentKey: string,
        expiryDate: string
    ): Promise<FutureContract[]> {
        await this.rateLimiter.acquire();

        const encodedKey = encodeURIComponent(instrumentKey);
        const response = await firstValueFrom(
            this.http.get<UpstoxResponse<FutureContract[]>>(
                `/v2/expired-instruments/future/contract?instrument_key=${encodedKey}&expiry_date=${expiryDate}`
            )
        );

        if (response.data.status !== "success" || !response.data.data) {
            return [];
        }

        return response.data.data;
    }

    /**
     * Fetch historical candles for expired instruments
     */
    async fetchExpiredCandles(
        expiredInstrumentKey: string,
        interval: "1minute" | "30minute" | "day",
        startDate: Date,
        endDate: Date,
        store = true
    ): Promise<ParsedCandle[]> {
        const allCandles: ParsedCandle[] = [];
        let current = new Date(startDate);

        while (current < endDate) {
            // Batch by month for expired API
            const batchEnd = new Date(current);
            batchEnd.setMonth(batchEnd.getMonth() + 1);
            batchEnd.setDate(batchEnd.getDate() - 1);

            const actualEnd = batchEnd > endDate ? endDate : batchEnd;

            try {
                await this.rateLimiter.acquire();

                const candles = await this.withRetry(() =>
                    this.fetchExpiredCandleBatch(expiredInstrumentKey, interval, current, actualEnd)
                );

                if (candles.length > 0) {
                    allCandles.push(...candles);

                    if (store) {
                        const unit = interval === "day" ? "days" : "minutes";
                        const intervalValue = interval === "1minute" ? 1 : interval === "30minute" ? 30 : 1;
                        await this.storeCandles(expiredInstrumentKey, candles, unit, intervalValue);
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to fetch expired candles for ${expiredInstrumentKey}`, error);
            }

            current = new Date(actualEnd);
            current.setDate(current.getDate() + 1);
        }

        return allCandles;
    }

    private async fetchExpiredCandleBatch(
        expiredInstrumentKey: string,
        interval: "1minute" | "30minute" | "day",
        fromDate: Date,
        toDate: Date
    ): Promise<ParsedCandle[]> {
        const encodedKey = encodeURIComponent(expiredInstrumentKey);
        const fromStr = fromDate.toISOString().split("T")[0];
        const toStr = toDate.toISOString().split("T")[0];

        const url = `/v2/expired-instruments/historical-candle/${encodedKey}/${interval}/${toStr}/${fromStr}`;

        const response = await firstValueFrom(
            this.http.get<UpstoxResponse<CandleData>>(url)
        );

        if (response.data.status !== "success" || !response.data.data?.candles) {
            return [];
        }

        return response.data.data.candles.map(candle => ({
            timestamp: candle[0],
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4],
            volume: candle[5],
            openInterest: candle[6] ?? null,
        }));
    }

    // ==========================================================================
    // ERROR HANDLING & RETRY
    // ==========================================================================

    /**
     * Execute with retry and exponential backoff
     */
    private async withRetry<T>(
        fn: () => Promise<T>,
        retries = this.maxRetries
    ): Promise<T> {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                const upstoxError = this.parseUpstoxError(error);

                // Don't retry on validation errors
                if (upstoxError?.errorCode === UPSTOX_ERROR_CODES.INSTRUMENT_KEY_REQUIRED ||
                    upstoxError?.errorCode === UPSTOX_ERROR_CODES.INVALID_ORDER_TYPE) {
                    throw error;
                }

                if (attempt === retries) {
                    throw error;
                }

                const backoff = this.baseBackoffMs * Math.pow(2, attempt);
                this.logger.warn(`Retry ${attempt + 1}/${retries} after ${backoff}ms`);
                await new Promise(resolve => setTimeout(resolve, backoff));
            }
        }
        throw new Error("Retry exhausted");
    }

    /**
     * Parse Upstox error from Axios error
     */
    private parseUpstoxError(error: unknown): UpstoxApiError | null {
        if (!isAxiosError(error)) return null;

        const data = error.response?.data as UpstoxErrorResponse | undefined;
        return data?.errors?.[0] ?? null;
    }
}
