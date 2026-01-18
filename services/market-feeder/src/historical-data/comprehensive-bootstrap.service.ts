/**
 * Comprehensive Data Bootstrap Service
 * Fetches ALL available data from Upstox:
 * - Nifty 50 Index (daily + minute)
 * - India VIX (daily + minute)
 * - All Nifty 50 constituents (daily + minute)
 * - All Nifty futures (expired + active)
 * - All Nifty options (all strikes, all expiries - last 6 months)
 */

import { Injectable, Logger } from "@nestjs/common";
import { InstrumentMasterRepository } from "@repo/database";
import {
    ProductionUpstoxClient,
    DATA_AVAILABILITY,
    OptionContract,
    FutureContract,
} from "./production-upstox-client";
import {
    NIFTY50_INDEX,
    INDIA_VIX,
    NIFTY50_CONSTITUENTS,
    REMOVED_NIFTY50_CONSTITUENTS,
} from "./nifty50-instruments";

export interface BootstrapProgress {
    phase: string;
    currentInstrument: string;
    progress: number;
    totalInstruments: number;
    completedInstruments: number;
    totalCandles: number;
}

export interface BootstrapResult {
    phase: string;
    instrumentsProcessed: number;
    totalCandles: number;
    durationMs: number;
    errors: string[];
}

@Injectable()
export class ComprehensiveBootstrapService {
    private readonly logger = new Logger(ComprehensiveBootstrapService.name);

    constructor(
        private readonly client: ProductionUpstoxClient,
        private readonly instrumentMasterRepository: InstrumentMasterRepository
    ) { }

    /**
     * Run full bootstrap - fetches ALL available data
     */
    async runFullBootstrap(): Promise<Map<string, BootstrapResult>> {
        const results = new Map<string, BootstrapResult>();
        const startTime = Date.now();

        this.logger.log("=".repeat(60));
        this.logger.log("COMPREHENSIVE DATA BOOTSTRAP - ALL DATA");
        this.logger.log("=".repeat(60));

        // Phase 1: Indices (Nifty 50 + India VIX)
        results.set("indices", await this.bootstrapIndices());

        // Phase 2: All Nifty 50 constituents
        results.set("constituents", await this.bootstrapConstituents());

        // Phase 3: Nifty Futures (expired + active)
        results.set("futures", await this.bootstrapFutures());

        // Phase 4: Nifty Options (all strikes, all expiries)
        results.set("options", await this.bootstrapOptions());

        const totalDuration = Date.now() - startTime;
        this.logger.log("=".repeat(60));
        this.logger.log(`BOOTSTRAP COMPLETE in ${Math.round(totalDuration / 1000)}s`);
        this.logger.log("=".repeat(60));

        // Summary
        for (const [phase, result] of results) {
            this.logger.log(
                `${phase}: ${result.instrumentsProcessed} instruments, ${result.totalCandles} candles, ${result.errors.length} errors`
            );
        }

        return results;
    }

    /**
     * Phase 1: Bootstrap indices (Nifty 50 + India VIX)
     */
    private async bootstrapIndices(): Promise<BootstrapResult> {
        this.logger.log("\n--- Phase 1: Indices (Nifty 50 + India VIX) ---");
        const startTime = Date.now();
        const errors: string[] = [];
        let totalCandles = 0;

        const indices = [
            { key: NIFTY50_INDEX, dailyStart: DATA_AVAILABILITY.DAY },
            { key: INDIA_VIX, dailyStart: new Date("2014-02-26") }, // VIX launched
        ];

        for (const index of indices) {
            try {
                // Daily candles (2000+ for Nifty, 2014+ for VIX)
                this.logger.log(`Fetching DAILY candles for ${index.key}...`);
                const dailyCandles = await this.client.fetchCandles(
                    index.key,
                    "days",
                    1,
                    index.dailyStart,
                    new Date()
                );
                totalCandles += dailyCandles.length;
                this.logger.log(`✓ ${dailyCandles.length} daily candles for ${index.key}`);

                // Minute candles (2022+)
                this.logger.log(`Fetching MINUTE candles for ${index.key}...`);
                const minuteCandles = await this.client.fetchCandles(
                    index.key,
                    "minutes",
                    1,
                    DATA_AVAILABILITY.MINUTE,
                    new Date()
                );
                totalCandles += minuteCandles.length;
                this.logger.log(`✓ ${minuteCandles.length} minute candles for ${index.key}`);
            } catch (error) {
                const msg = `Failed to fetch ${index.key}: ${error}`;
                this.logger.error(msg);
                errors.push(msg);
            }
        }

        return {
            phase: "indices",
            instrumentsProcessed: indices.length,
            totalCandles,
            durationMs: Date.now() - startTime,
            errors,
        };
    }

    /**
     * Phase 2: Bootstrap all Nifty 50 constituents
     */
    private async bootstrapConstituents(): Promise<BootstrapResult> {
        this.logger.log("\n--- Phase 2: Nifty 50 Constituents ---");
        const startTime = Date.now();
        const errors: string[] = [];
        let totalCandles = 0;

        // All current + removed constituents
        const allConstituents = [
            ...NIFTY50_CONSTITUENTS,
            ...REMOVED_NIFTY50_CONSTITUENTS.map(c => c.instrumentKey),
        ];

        this.logger.log(`Processing ${allConstituents.length} constituents...`);

        for (let i = 0; i < allConstituents.length; i++) {
            const instrumentKey = allConstituents[i];

            try {
                this.logger.log(`[${i + 1}/${allConstituents.length}] ${instrumentKey}`);

                // Discover earliest available data
                const dailyStart = await this.client.discoverDataStartDate(
                    instrumentKey,
                    "day",
                    DATA_AVAILABILITY.DAY
                );

                if (dailyStart) {
                    // Daily candles
                    const dailyCandles = await this.client.fetchCandles(
                        instrumentKey,
                        "days",
                        1,
                        dailyStart,
                        new Date()
                    );
                    totalCandles += dailyCandles.length;
                }

                // Minute candles (2022+)
                const minuteCandles = await this.client.fetchCandles(
                    instrumentKey,
                    "minutes",
                    1,
                    DATA_AVAILABILITY.MINUTE,
                    new Date()
                );
                totalCandles += minuteCandles.length;
            } catch (error) {
                const msg = `Failed to fetch ${instrumentKey}: ${error}`;
                this.logger.error(msg);
                errors.push(msg);
            }
        }

        return {
            phase: "constituents",
            instrumentsProcessed: allConstituents.length,
            totalCandles,
            durationMs: Date.now() - startTime,
            errors,
        };
    }

    /**
     * Phase 3: Bootstrap all Nifty futures (expired + active)
     */
    private async bootstrapFutures(): Promise<BootstrapResult> {
        this.logger.log("\n--- Phase 3: Nifty Futures (all expiries) ---");
        const startTime = Date.now();
        const errors: string[] = [];
        let totalCandles = 0;
        let futuresProcessed = 0;

        try {
            // Get all expiries
            const expiries = await this.client.getExpiries(NIFTY50_INDEX);
            this.logger.log(`Found ${expiries.length} expiries for futures`);

            for (const expiry of expiries) {
                try {
                    const futures = await this.client.getExpiredFutureContracts(NIFTY50_INDEX, expiry);

                    for (const future of futures) {
                        try {
                            this.logger.log(`Fetching future ${future.instrument_key} (expiry: ${future.expiry})`);

                            // Calculate date range (futures active for ~3 months before expiry)
                            const expiryDate = new Date(future.expiry);
                            const startDate = new Date(expiryDate);
                            startDate.setMonth(startDate.getMonth() - 3);

                            // Minute candles
                            const minuteCandles = await this.client.fetchExpiredCandles(
                                future.instrument_key,
                                "1minute",
                                startDate,
                                expiryDate
                            );
                            totalCandles += minuteCandles.length;

                            // Daily candles
                            const dailyCandles = await this.client.fetchExpiredCandles(
                                future.instrument_key,
                                "day",
                                startDate,
                                expiryDate
                            );
                            totalCandles += dailyCandles.length;

                            futuresProcessed++;
                        } catch (error) {
                            errors.push(`Future ${future.instrument_key}: ${error}`);
                        }
                    }
                } catch (error) {
                    errors.push(`Expiry ${expiry}: ${error}`);
                }
            }
        } catch (error) {
            errors.push(`Failed to get expiries: ${error}`);
        }

        return {
            phase: "futures",
            instrumentsProcessed: futuresProcessed,
            totalCandles,
            durationMs: Date.now() - startTime,
            errors,
        };
    }

    /**
     * Phase 4: Bootstrap ALL Nifty options (all strikes, all expiries)
     */
    private async bootstrapOptions(): Promise<BootstrapResult> {
        this.logger.log("\n--- Phase 4: Nifty Options (ALL strikes, ALL expiries) ---");
        const startTime = Date.now();
        const errors: string[] = [];
        let totalCandles = 0;
        let optionsProcessed = 0;

        try {
            // Get all expiries
            const expiries = await this.client.getExpiries(NIFTY50_INDEX);
            this.logger.log(`Found ${expiries.length} expiries for options`);

            for (const expiry of expiries) {
                try {
                    const options = await this.client.getExpiredOptionContracts(NIFTY50_INDEX, expiry);
                    this.logger.log(`Found ${options.length} option contracts for expiry ${expiry}`);

                    // Process ALL options
                    for (const option of options) {
                        try {
                            // Calculate date range
                            const expiryDate = new Date(option.expiry);
                            const startDate = new Date(expiryDate);
                            startDate.setMonth(startDate.getMonth() - 1); // Options typically traded 1 month before

                            // Minute candles
                            const minuteCandles = await this.client.fetchExpiredCandles(
                                option.instrument_key,
                                "1minute",
                                startDate,
                                expiryDate
                            );
                            totalCandles += minuteCandles.length;

                            optionsProcessed++;

                            // Log progress every 100 options
                            if (optionsProcessed % 100 === 0) {
                                this.logger.log(`Processed ${optionsProcessed} options, ${totalCandles} candles so far`);
                            }
                        } catch (error) {
                            // Options may have no data, continue
                            errors.push(`Option ${option.instrument_key}: ${error}`);
                        }
                    }
                } catch (error) {
                    errors.push(`Expiry ${expiry}: ${error}`);
                }
            }
        } catch (error) {
            errors.push(`Failed to get expiries: ${error}`);
        }

        return {
            phase: "options",
            instrumentsProcessed: optionsProcessed,
            totalCandles,
            durationMs: Date.now() - startTime,
            errors,
        };
    }

    /**
     * Bootstrap only indices (quick test)
     */
    async bootstrapIndicesOnly(): Promise<BootstrapResult> {
        return this.bootstrapIndices();
    }

    /**
     * Bootstrap only a specific instrument
     */
    async bootstrapInstrument(
        instrumentKey: string,
        dailyStartDate?: Date
    ): Promise<BootstrapResult> {
        const startTime = Date.now();
        const errors: string[] = [];
        let totalCandles = 0;

        try {
            // Discover start date if not provided
            const dailyStart = dailyStartDate || await this.client.discoverDataStartDate(
                instrumentKey,
                "day"
            );

            if (dailyStart) {
                // Daily candles
                const dailyCandles = await this.client.fetchCandles(
                    instrumentKey,
                    "days",
                    1,
                    dailyStart,
                    new Date()
                );
                totalCandles += dailyCandles.length;
                this.logger.log(`✓ ${dailyCandles.length} daily candles`);
            }

            // Minute candles
            const minuteCandles = await this.client.fetchCandles(
                instrumentKey,
                "minutes",
                1,
                DATA_AVAILABILITY.MINUTE,
                new Date()
            );
            totalCandles += minuteCandles.length;
            this.logger.log(`✓ ${minuteCandles.length} minute candles`);
        } catch (error) {
            errors.push(String(error));
        }

        return {
            phase: "single",
            instrumentsProcessed: 1,
            totalCandles,
            durationMs: Date.now() - startTime,
            errors,
        };
    }
}
