/**
 * Pipeline Orchestrator Service
 * Coordinates the full historical data pipeline:
 * 
 * 1. Fetch candles from Upstox (via DataFetcherService)
 * 2. Process and store in QuestDB (via Processors)
 * 3. Compute features (via DailyFeatureService or ComputeEngineService)
 * 4. Generate labels (via DailyLabelService)
 * 
 * Supports:
 * - Full historical backfill (2000-2026)
 * - Incremental daily updates
 * - Batch processing for multiple instruments
 */

import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CandlesRepository } from "@repo/database";
import { DataFetcherService } from "./data-fetcher.service";
import { DailyCandleProcessor } from "./processors/daily-candle.processor";
import { DailyFeatureService } from "./features/daily-feature.service";
import { DailyLabelService } from "./labels/daily-label.service";

export interface PipelineConfig {
    instrumentKeys: string[];
    startDate: Date;
    endDate: Date;
    mode: "daily" | "minute" | "full";
    computeFeatures: boolean;
    generateLabels: boolean;
}

export interface PipelineProgress {
    stage: "fetching" | "processing" | "computing_features" | "generating_labels";
    instrumentKey: string;
    progress: number;
    message: string;
}

export interface PipelineResult {
    instrumentKey: string;
    candlesFetched: number;
    featuresComputed: number;
    labelsGenerated: number;
    durationMs: number;
    errors: string[];
}

@Injectable()
export class PipelineOrchestratorService {
    private readonly logger = new Logger(PipelineOrchestratorService.name);

    constructor(
        private readonly dataFetcher: DataFetcherService,
        private readonly dailyCandleProcessor: DailyCandleProcessor,
        private readonly candlesRepository: CandlesRepository,
        private readonly dailyFeatureService: DailyFeatureService,
        private readonly dailyLabelService: DailyLabelService,
        private readonly eventEmitter: EventEmitter2
    ) { }

    /**
     * Run full daily pipeline for an instrument
     * 1. Fetch daily candles
     * 2. Store in QuestDB
     * 3. Compute features
     * 4. Generate labels
     */
    async runDailyPipeline(
        instrumentKey: string,
        startDate: Date,
        endDate: Date,
        options: { computeFeatures?: boolean; generateLabels?: boolean } = {}
    ): Promise<PipelineResult> {
        const startTime = Date.now();
        const errors: string[] = [];
        let candlesFetched = 0;
        let featuresComputed = 0;
        let labelsGenerated = 0;

        const { computeFeatures = true, generateLabels = true } = options;

        try {
            // Step 1: Fetch daily candles
            this.emitProgress({
                stage: "fetching",
                instrumentKey,
                progress: 0,
                message: "Fetching daily candles from Upstox",
            });

            const fetchResult = await this.dataFetcher.fetchDailyCandles(
                instrumentKey,
                startDate,
                endDate
            );

            if (fetchResult.candles.length > 0) {
                // Step 2: Process and store
                this.emitProgress({
                    stage: "processing",
                    instrumentKey,
                    progress: 25,
                    message: `Processing ${fetchResult.candles.length} candles`,
                });

                const processedCandles = this.dailyCandleProcessor.process(
                    fetchResult.candles,
                    instrumentKey
                );

                await this.candlesRepository.insertBatch(processedCandles);
                candlesFetched = processedCandles.length;
                this.logger.log(`Stored ${candlesFetched} daily candles for ${instrumentKey}`);
            }

            // Step 3: Compute features
            if (computeFeatures) {
                this.emitProgress({
                    stage: "computing_features",
                    instrumentKey,
                    progress: 50,
                    message: "Computing daily features",
                });

                try {
                    featuresComputed = await this.dailyFeatureService.computeAndStoreDailyFeatures(
                        instrumentKey,
                        startDate,
                        endDate
                    );
                } catch (error) {
                    const msg = `Feature computation failed: ${error}`;
                    this.logger.error(msg);
                    errors.push(msg);
                }
            }

            // Step 4: Generate labels
            if (generateLabels) {
                this.emitProgress({
                    stage: "generating_labels",
                    instrumentKey,
                    progress: 75,
                    message: "Generating training labels",
                });

                try {
                    labelsGenerated = await this.dailyLabelService.generateAndStoreLabels(
                        instrumentKey,
                        startDate,
                        endDate
                    );
                } catch (error) {
                    const msg = `Label generation failed: ${error}`;
                    this.logger.error(msg);
                    errors.push(msg);
                }
            }
        } catch (error) {
            const msg = `Pipeline failed for ${instrumentKey}: ${error}`;
            this.logger.error(msg);
            errors.push(msg);
        }

        const result: PipelineResult = {
            instrumentKey,
            candlesFetched,
            featuresComputed,
            labelsGenerated,
            durationMs: Date.now() - startTime,
            errors,
        };

        this.emitProgress({
            stage: "generating_labels",
            instrumentKey,
            progress: 100,
            message: "Pipeline complete",
        });

        this.logger.log(
            `Pipeline complete for ${instrumentKey}: ${candlesFetched} candles, ${featuresComputed} features, ${labelsGenerated} labels in ${result.durationMs}ms`
        );

        return result;
    }

    /**
     * Run pipeline for multiple instruments
     */
    async runBatchPipeline(config: PipelineConfig): Promise<Map<string, PipelineResult>> {
        const results = new Map<string, PipelineResult>();

        this.logger.log(
            `Starting batch pipeline for ${config.instrumentKeys.length} instruments`
        );

        for (const instrumentKey of config.instrumentKeys) {
            const result = await this.runDailyPipeline(
                instrumentKey,
                config.startDate,
                config.endDate,
                {
                    computeFeatures: config.computeFeatures,
                    generateLabels: config.generateLabels,
                }
            );
            results.set(instrumentKey, result);
        }

        // Summary
        let totalCandles = 0;
        let totalFeatures = 0;
        let totalLabels = 0;
        let totalErrors = 0;

        for (const result of results.values()) {
            totalCandles += result.candlesFetched;
            totalFeatures += result.featuresComputed;
            totalLabels += result.labelsGenerated;
            totalErrors += result.errors.length;
        }

        this.logger.log(
            `Batch pipeline complete: ${totalCandles} candles, ${totalFeatures} features, ${totalLabels} labels, ${totalErrors} errors`
        );

        return results;
    }

    /**
     * Quick daily update (today's data only)
     */
    async runDailyUpdate(instrumentKeys: string[]): Promise<Map<string, PipelineResult>> {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        return this.runBatchPipeline({
            instrumentKeys,
            startDate: yesterday,
            endDate: today,
            mode: "daily",
            computeFeatures: true,
            generateLabels: false, // Labels need future data
        });
    }

    private emitProgress(progress: PipelineProgress): void {
        this.eventEmitter.emit("pipeline.progress", progress);
    }
}
