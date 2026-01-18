/**
 * Daily Candle Processor
 * Transforms raw Upstox candles to QuestDB format
 */

import { Injectable, Logger } from "@nestjs/common";
import { UpstoxCandleData } from "../simple-client";

export interface ProcessedDailyCandle {
    timestamp: Date;
    instrumentKey: string;
    intervalValue: number;
    intervalUnit: "day";
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    openInterest: number | null;
}

@Injectable()
export class DailyCandleProcessor {
    private readonly logger = new Logger(DailyCandleProcessor.name);

    /**
     * Process raw Upstox candles to QuestDB format
     */
    process(
        candles: UpstoxCandleData[],
        instrumentKey: string
    ): ProcessedDailyCandle[] {
        return candles.map((candle) => ({
            timestamp: new Date(candle.timestamp),
            instrumentKey,
            intervalValue: 1,
            intervalUnit: "day" as const,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
            openInterest: candle.open_interest || null,
        }));
    }

    /**
     * Validate candle data quality
     */
    validate(candle: ProcessedDailyCandle): { valid: boolean; reason?: string } {
        if (candle.close <= 0) {
            return { valid: false, reason: "Invalid close price" };
        }
        if (candle.high < candle.low) {
            return { valid: false, reason: "High < Low" };
        }
        if (candle.volume < 0) {
            return { valid: false, reason: "Negative volume" };
        }
        return { valid: true };
    }
}
