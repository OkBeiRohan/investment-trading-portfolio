/**
 * Daily Label Service
 * Generates training labels for 26-year regime model (2000-2026)
 * 
 * Labels are forward-looking (require future data):
 * - Forward returns (1d, 5d, 20d)
 * - Forward volatility (5d, 20d)
 * - Direction classification
 * - Regime classification (BULL/BEAR/RANGING/VOLATILE)
 */

import { Injectable, Logger } from "@nestjs/common";
import { CandlesRepository, DailyLabelsRepository } from "@repo/database";
import type { TrainingLabels1d } from "@repo/database";

@Injectable()
export class DailyLabelService {
    private readonly logger = new Logger(DailyLabelService.name);

    constructor(
        private readonly candlesRepository: CandlesRepository,
        private readonly dailyLabelsRepository: DailyLabelsRepository
    ) { }

    /**
     * Generate and store daily labels for an instrument
     * Labels require 20 days of future data, so labels won't exist for last 20 days
     */
    async generateAndStoreLabels(
        instrumentKey: string,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        this.logger.log(
            `Generating daily labels for ${instrumentKey} from ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`
        );

        // Need extra 20 days for forward-looking labels
        const labelEndDate = new Date(endDate);
        labelEndDate.setDate(labelEndDate.getDate() - 20);

        // Also need lookback for regime classification
        const lookbackStart = new Date(startDate);
        lookbackStart.setDate(lookbackStart.getDate() - 50);

        const candles = await this.candlesRepository.findByTimeRange(
            instrumentKey,
            1,
            "day",
            lookbackStart,
            endDate,
            15000
        );

        if (candles.length < 70) {
            this.logger.warn(
                `Insufficient data for ${instrumentKey}: ${candles.length} candles (need 70+)`
            );
            return 0;
        }

        // Sort by timestamp
        candles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        const closes = candles.map((c) => c.close);
        const labels: TrainingLabels1d[] = [];

        // Generate labels (excluding last 20 days - no future data)
        for (let i = 50; i < candles.length - 20; i++) {
            const candle = candles[i];
            const timestamp = candle.timestamp;

            // Skip if before startDate
            if (timestamp < startDate) continue;

            try {
                const label = this.computeLabel(
                    candle,
                    instrumentKey,
                    candles,
                    closes,
                    i
                );
                labels.push(label);
            } catch (error) {
                this.logger.error(`Error generating label at ${timestamp}`, error);
            }
        }

        // Store to QuestDB
        if (labels.length > 0) {
            await this.dailyLabelsRepository.insertBatch(labels);
            this.logger.log(`Stored ${labels.length} daily labels for ${instrumentKey}`);
        }

        return labels.length;
    }

    private computeLabel(
        candle: { timestamp: Date; close: number },
        instrumentKey: string,
        candles: { timestamp: Date; high: number; low: number; close: number }[],
        closes: number[],
        index: number
    ): TrainingLabels1d {
        const current = candle.close;

        // Forward returns
        const close1d = closes[index + 1] || current;
        const close5d = closes[index + 5] || current;
        const close20d = closes[index + 20] || current;

        const return1d = (close1d - current) / current;
        const return5d = (close5d - current) / current;
        const return20d = (close20d - current) / current;

        // Forward volatility (using log returns)
        const futureCloses5d = closes.slice(index, index + 6);
        const futureCloses20d = closes.slice(index, index + 21);
        const vol5d = this.calculateVolatility(futureCloses5d);
        const vol20d = this.calculateVolatility(futureCloses20d);

        // Max drawdown in next 5 days
        const futureLows = candles.slice(index + 1, index + 6).map((c) => c.low);
        const maxDrawdown = futureLows.length > 0
            ? (current - Math.min(...futureLows)) / current
            : 0;

        // Direction classification (threshold: 0.5%)
        const threshold = 0.005;
        const direction1d = return1d > threshold ? 1 : return1d < -threshold ? -1 : 0;
        const direction5d = return5d > threshold * 2 ? 1 : return5d < -threshold * 2 ? -1 : 0;
        const direction20d = return20d > threshold * 4 ? 1 : return20d < -threshold * 4 ? -1 : 0;

        // Regime classification
        const { regimeLabel, regimeConfidence } = this.classifyRegime(
            closes.slice(0, index + 1),
            vol20d
        );

        // Regime change detection
        const prevRegime = index > 50
            ? this.classifyRegime(closes.slice(0, index), vol20d).regimeLabel
            : regimeLabel;
        const hadRegimeChange = prevRegime !== regimeLabel;

        // Event flags
        const hadCrash = return1d < -0.05;
        const hadRally = return1d > 0.05;

        return {
            timestamp: candle.timestamp,
            instrumentKey,
            targetReturn1d: return1d,
            targetReturn5d: return5d,
            targetReturn20d: return20d,
            targetVolatility5d: isNaN(vol5d) ? 0 : vol5d,
            targetVolatility20d: isNaN(vol20d) ? 0 : vol20d,
            targetMaxDrawdown5d: maxDrawdown,
            targetDirection1d: direction1d,
            targetDirection5d: direction5d,
            targetDirection20d: direction20d,
            regimeLabel,
            regimeConfidence,
            hadRegimeChange,
            hadCrash,
            hadRally,
            isValid: true,
            invalidReason: undefined,
        };
    }

    private classifyRegime(
        closes: number[],
        volatility: number
    ): { regimeLabel: "BULL" | "BEAR" | "RANGING" | "VOLATILE"; regimeConfidence: number } {
        if (closes.length < 50) {
            return { regimeLabel: "RANGING", regimeConfidence: 0.5 };
        }

        const sma20 = closes.slice(-20).reduce((s, v) => s + v, 0) / 20;
        const sma50 = closes.slice(-50).reduce((s, v) => s + v, 0) / 50;
        const current = closes[closes.length - 1];
        const trend = (current - sma50) / sma50;
        const smaRatio = sma20 / sma50;

        const highVolThreshold = 0.25;

        let regimeLabel: "BULL" | "BEAR" | "RANGING" | "VOLATILE";
        let regimeConfidence: number;

        if (!isNaN(volatility) && volatility > highVolThreshold) {
            regimeLabel = "VOLATILE";
            regimeConfidence = Math.min(volatility / highVolThreshold, 1);
        } else if (trend > 0.05 && smaRatio > 1.02) {
            regimeLabel = "BULL";
            regimeConfidence = Math.min(trend * 10, 1);
        } else if (trend < -0.05 && smaRatio < 0.98) {
            regimeLabel = "BEAR";
            regimeConfidence = Math.min(Math.abs(trend) * 10, 1);
        } else {
            regimeLabel = "RANGING";
            regimeConfidence = 1 - Math.abs(trend) * 5;
        }

        return { regimeLabel, regimeConfidence: Math.max(0, Math.min(1, regimeConfidence)) };
    }

    private calculateVolatility(closes: number[]): number {
        if (closes.length < 2) return 0;
        const returns: number[] = [];
        for (let i = 1; i < closes.length; i++) {
            if (closes[i - 1] > 0) {
                returns.push(Math.log(closes[i] / closes[i - 1]));
            }
        }
        if (returns.length === 0) return 0;
        const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
        const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
        return Math.sqrt(variance * 252);
    }
}
