/**
 * Daily Features Repository
 * Repository for instrument_features_1d table (48 features for regime model)
 * Uses SQL queries from @repo/schema/sql/daily-features/
 */

import { Injectable, Logger } from "@nestjs/common";
import { Pool, QueryResultRow } from "pg";
import { loadSqlQueryCached } from "../utils/sql-loader";

export interface InstrumentFeatures1d {
    timestamp: Date;
    instrumentKey: string;

    // Price Structure (8)
    close: number;
    return1d: number;
    return5d: number;
    return20d: number;
    rangeHl: number;
    gapOpen: number;
    closeVsHigh20d: number;
    closeVsLow20d: number;

    // Momentum (8)
    rsi14: number;
    rsi5: number;
    macd: number;
    macdSignal: number;
    macdHist: number;
    adx14: number;
    plusDi: number;
    minusDi: number;

    // Moving Averages (6)
    sma10: number;
    sma20: number;
    sma50: number;
    sma200: number;
    ema12: number;
    ema26: number;

    // MA Signals (4)
    priceVsSma20: number;
    priceVsSma50: number;
    priceVsSma200: number;
    goldenCross: number;

    // Volatility (6)
    atr14: number;
    atrPercent: number;
    realizedVol20d: number;
    realizedVol60d: number;
    bollingerWidth: number;
    bollingerPosition: number;

    // VIX (4)
    vixClose: number;
    vixPercentile30d: number;
    vixPercentile1yr: number;
    vixSma10: number;

    // Volume (4)
    volumeSma20Ratio: number;
    volumeTrend: number;
    obvChange: number;
    accumulationDist: number;

    // Regime (4)
    trendStrength: number;
    meanReversionSignal: number;
    momentumRegime: number;
    volatilityRegime: number;

    // Time (4)
    dayOfWeek: number;
    monthOfYear: number;
    isMonthEnd: boolean;
    isQuarterEnd: boolean;

    // Validity
    isValid: boolean;
    invalidReason?: string;
}

@Injectable()
export class DailyFeaturesRepository {
    private readonly logger = new Logger(DailyFeaturesRepository.name);

    constructor(private readonly pool: Pool) { }

    /**
     * Insert daily features batch
     */
    async insertBatch(features: InstrumentFeatures1d[]): Promise<void> {
        if (features.length === 0) return;

        const sqlPrefix = loadSqlQueryCached("daily-features/insert-batch-prefix");
        const values = features.map((f) => {
            return `('${f.timestamp.toISOString()}', '${f.instrumentKey}', 
        ${f.close}, ${f.return1d}, ${f.return5d}, ${f.return20d}, ${f.rangeHl}, ${f.gapOpen}, ${f.closeVsHigh20d}, ${f.closeVsLow20d},
        ${f.rsi14}, ${f.rsi5}, ${f.macd}, ${f.macdSignal}, ${f.macdHist}, ${f.adx14}, ${f.plusDi}, ${f.minusDi},
        ${f.sma10}, ${f.sma20}, ${f.sma50}, ${f.sma200}, ${f.ema12}, ${f.ema26},
        ${f.priceVsSma20}, ${f.priceVsSma50}, ${f.priceVsSma200}, ${f.goldenCross},
        ${f.atr14}, ${f.atrPercent}, ${f.realizedVol20d}, ${f.realizedVol60d}, ${f.bollingerWidth}, ${f.bollingerPosition},
        ${f.vixClose}, ${f.vixPercentile30d}, ${f.vixPercentile1yr}, ${f.vixSma10},
        ${f.volumeSma20Ratio}, ${f.volumeTrend}, ${f.obvChange}, ${f.accumulationDist},
        ${f.trendStrength}, ${f.meanReversionSignal}, ${f.momentumRegime}, ${f.volatilityRegime},
        ${f.dayOfWeek}, ${f.monthOfYear}, ${f.isMonthEnd}, ${f.isQuarterEnd},
        ${f.isValid}, ${f.invalidReason ? `'${f.invalidReason}'` : "NULL"}, 'v1')`;
        }).join(",");

        const query = `${sqlPrefix}${values}`;
        await this.pool.query(query);
        this.logger.log(`Inserted ${features.length} daily features`);
    }

    /**
     * Get features for time range
     */
    async findByTimeRange(
        instrumentKey: string,
        startTime: Date,
        endTime: Date,
        limit = 10000
    ): Promise<InstrumentFeatures1d[]> {
        const sql = loadSqlQueryCached("daily-features/get-by-time-range");
        const result = await this.pool.query(sql, [
            instrumentKey,
            startTime.toISOString(),
            endTime.toISOString(),
            limit
        ]);

        return result.rows.map((row: QueryResultRow) => this.mapRow(row));
    }

    /**
     * Get latest features
     */
    async findLatest(instrumentKey: string): Promise<InstrumentFeatures1d | null> {
        const sql = loadSqlQueryCached("daily-features/get-latest");
        const result = await this.pool.query(sql, [instrumentKey]);

        if (result.rows.length === 0) return null;
        return this.mapRow(result.rows[0]);
    }

    /**
     * Get for training (with regime data)
     */
    async getForTraining(
        instrumentKey: string,
        startYear: number,
        endYear: number
    ): Promise<InstrumentFeatures1d[]> {
        const sql = loadSqlQueryCached("daily-features/get-for-training");
        const result = await this.pool.query(sql, [
            instrumentKey,
            `${startYear}-01-01T00:00:00Z`,
            `${endYear}-12-31T23:59:59Z`
        ]);

        return result.rows.map((row: QueryResultRow) => this.mapRow(row));
    }

    private mapRow(row: QueryResultRow): InstrumentFeatures1d {
        return {
            timestamp: new Date(row.timestamp as string),
            instrumentKey: row.instrument_key as string,
            close: parseFloat(row.close as string),
            return1d: parseFloat(row.return_1d as string),
            return5d: parseFloat(row.return_5d as string),
            return20d: parseFloat(row.return_20d as string),
            rangeHl: parseFloat(row.range_hl as string),
            gapOpen: parseFloat(row.gap_open as string),
            closeVsHigh20d: parseFloat(row.close_vs_high_20d as string),
            closeVsLow20d: parseFloat(row.close_vs_low_20d as string),
            rsi14: parseFloat(row.rsi_14 as string),
            rsi5: parseFloat(row.rsi_5 as string),
            macd: parseFloat(row.macd as string),
            macdSignal: parseFloat(row.macd_signal as string),
            macdHist: parseFloat(row.macd_hist as string),
            adx14: parseFloat(row.adx_14 as string),
            plusDi: parseFloat(row.plus_di as string),
            minusDi: parseFloat(row.minus_di as string),
            sma10: parseFloat(row.sma_10 as string),
            sma20: parseFloat(row.sma_20 as string),
            sma50: parseFloat(row.sma_50 as string),
            sma200: parseFloat(row.sma_200 as string),
            ema12: parseFloat(row.ema_12 as string),
            ema26: parseFloat(row.ema_26 as string),
            priceVsSma20: parseFloat(row.price_vs_sma_20 as string),
            priceVsSma50: parseFloat(row.price_vs_sma_50 as string),
            priceVsSma200: parseFloat(row.price_vs_sma_200 as string),
            goldenCross: parseInt(row.golden_cross as string),
            atr14: parseFloat(row.atr_14 as string),
            atrPercent: parseFloat(row.atr_percent as string),
            realizedVol20d: parseFloat(row.realized_vol_20d as string),
            realizedVol60d: parseFloat(row.realized_vol_60d as string),
            bollingerWidth: parseFloat(row.bollinger_width as string),
            bollingerPosition: parseFloat(row.bollinger_position as string),
            vixClose: parseFloat(row.vix_close as string),
            vixPercentile30d: parseFloat(row.vix_percentile_30d as string),
            vixPercentile1yr: parseFloat(row.vix_percentile_1yr as string),
            vixSma10: parseFloat(row.vix_sma_10 as string),
            volumeSma20Ratio: parseFloat(row.volume_sma_20_ratio as string),
            volumeTrend: parseFloat(row.volume_trend as string),
            obvChange: parseFloat(row.obv_change as string),
            accumulationDist: parseFloat(row.accumulation_dist as string),
            trendStrength: parseFloat(row.trend_strength as string),
            meanReversionSignal: parseFloat(row.mean_reversion_signal as string),
            momentumRegime: parseInt(row.momentum_regime as string),
            volatilityRegime: parseInt(row.volatility_regime as string),
            dayOfWeek: parseInt(row.day_of_week as string),
            monthOfYear: parseInt(row.month_of_year as string),
            isMonthEnd: row.is_month_end as boolean,
            isQuarterEnd: row.is_quarter_end as boolean,
            isValid: row.is_valid as boolean,
            invalidReason: (row.invalid_reason as string) || undefined,
        };
    }
}
