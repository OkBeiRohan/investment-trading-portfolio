/**
 * Data Fetcher Service
 * Pure data fetching layer - uses @repo/market-sdk for Upstox API
 * 
 * Responsibilities:
 * - Fetch daily candles (2000-2026)
 * - Fetch minute candles (2022-2026)
 * - Handle rate limiting and chunking
 * - Return raw Upstox data without transformations
 */

import { Injectable, Logger } from "@nestjs/common";
import { SimpleUpstoxClient, UpstoxCandleData } from "./simple-client";

export interface FetchConfig {
    instrumentKey: string;
    startDate: Date;
    endDate: Date;
    unit: "minutes" | "hours" | "days" | "weeks" | "months";
    interval: number;
}

export interface FetchResult {
    instrumentKey: string;
    candles: UpstoxCandleData[];
    fetchedAt: Date;
    duration: number;
}

@Injectable()
export class DataFetcherService {
    private readonly logger = new Logger(DataFetcherService.name);

    constructor(private readonly upstoxClient: SimpleUpstoxClient) { }

    /**
     * Fetch daily candles for an instrument
     * @param instrumentKey Instrument key (e.g., 'NSE_INDEX|Nifty 50')
     * @param startDate Start date (2000-01-01 for indices)
     * @param endDate End date
     */
    async fetchDailyCandles(
        instrumentKey: string,
        startDate: Date,
        endDate: Date
    ): Promise<FetchResult> {
        const start = Date.now();

        this.logger.log(
            `Fetching daily candles for ${instrumentKey} from ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`
        );

        const candles = await this.upstoxClient.getHistoricalCandlesBatched(
            instrumentKey,
            "days",
            1,
            startDate,
            endDate
        );

        const duration = Date.now() - start;
        this.logger.log(`Fetched ${candles.length} daily candles for ${instrumentKey} in ${duration}ms`);

        return {
            instrumentKey,
            candles,
            fetchedAt: new Date(),
            duration,
        };
    }

    /**
     * Fetch minute candles for an instrument
     * @param instrumentKey Instrument key
     * @param startDate Start date (2022-01-01 minimum for Upstox V3)
     * @param endDate End date
     * @param interval Interval (1, 5, 15, 30, etc.)
     */
    async fetchMinuteCandles(
        instrumentKey: string,
        startDate: Date,
        endDate: Date,
        interval = 1
    ): Promise<FetchResult> {
        const start = Date.now();

        // Clamp to Upstox V3 minimum date
        const minDate = new Date("2022-01-01");
        if (startDate < minDate) {
            this.logger.warn(`Clamping start date to 2022-01-01 for minute candles`);
            startDate = minDate;
        }

        this.logger.log(
            `Fetching ${interval}m candles for ${instrumentKey} from ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`
        );

        const candles = await this.upstoxClient.getHistoricalCandlesBatched(
            instrumentKey,
            "minutes",
            interval,
            startDate,
            endDate
        );

        const duration = Date.now() - start;
        this.logger.log(`Fetched ${candles.length} minute candles for ${instrumentKey} in ${duration}ms`);

        return {
            instrumentKey,
            candles,
            fetchedAt: new Date(),
            duration,
        };
    }

    /**
     * Batch fetch for multiple instruments
     * @param configs Array of fetch configurations
     * @param concurrency Max parallel requests
     */
    async batchFetch(
        configs: FetchConfig[],
        concurrency = 5
    ): Promise<Map<string, FetchResult>> {
        const results = new Map<string, FetchResult>();

        for (let i = 0; i < configs.length; i += concurrency) {
            const batch = configs.slice(i, i + concurrency);

            const batchResults = await Promise.all(
                batch.map(async (config) => {
                    try {
                        if (config.unit === "days") {
                            return this.fetchDailyCandles(
                                config.instrumentKey,
                                config.startDate,
                                config.endDate
                            );
                        } else {
                            return this.fetchMinuteCandles(
                                config.instrumentKey,
                                config.startDate,
                                config.endDate,
                                config.interval
                            );
                        }
                    } catch (error) {
                        this.logger.error(`Failed to fetch ${config.instrumentKey}`, error);
                        return {
                            instrumentKey: config.instrumentKey,
                            candles: [],
                            fetchedAt: new Date(),
                            duration: 0,
                        };
                    }
                })
            );

            batchResults.forEach((result) => {
                results.set(result.instrumentKey, result);
            });

            this.logger.log(
                `Batch progress: ${Math.min(i + concurrency, configs.length)}/${configs.length}`
            );
        }

        return results;
    }
}
