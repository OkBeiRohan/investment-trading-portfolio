/**
 * Daily Features Repository
 * Repository for instrument_features_1d table (48 features for regime model)
 * Used for 26-year historical data (2000-2026)
 */

import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";

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

        const columns = [
            "timestamp", "instrument_key",
            "close", "return_1d", "return_5d", "return_20d", "range_hl", "gap_open", "close_vs_high_20d", "close_vs_low_20d",
            "rsi_14", "rsi_5", "macd", "macd_signal", "macd_hist", "adx_14", "plus_di", "minus_di",
            "sma_10", "sma_20", "sma_50", "sma_200", "ema_12", "ema_26",
            "price_vs_sma_20", "price_vs_sma_50", "price_vs_sma_200", "golden_cross",
            "atr_14", "atr_percent", "realized_vol_20d", "realized_vol_60d", "bollinger_width", "bollinger_position",
            "vix_close", "vix_percentile_30d", "vix_percentile_1yr", "vix_sma_10",
            "volume_sma_20_ratio", "volume_trend", "obv_change", "accumulation_dist",
            "trend_strength", "mean_reversion_signal", "momentum_regime", "volatility_regime",
            "day_of_week", "month_of_year", "is_month_end", "is_quarter_end",
            "is_valid", "invalid_reason"
        ].join(", ");

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
        ${f.isValid}, ${f.invalidReason ? `'${f.invalidReason}'` : "NULL"})`;
        }).join(",");

        const query = `INSERT INTO instrument_features_1d (${columns}) VALUES ${values}`;
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
        const result = await this.pool.query(
            `SELECT * FROM instrument_features_1d 
       WHERE instrument_key = $1 
       AND timestamp >= $2 
       AND timestamp <= $3
       AND is_valid = true
       ORDER BY timestamp ASC 
       LIMIT $4`,
            [instrumentKey, startTime.toISOString(), endTime.toISOString(), limit]
        );

        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * Get latest features
     */
    async findLatest(instrumentKey: string): Promise<InstrumentFeatures1d | null> {
        const result = await this.pool.query(
            `SELECT * FROM instrument_features_1d 
       WHERE instrument_key = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
            [instrumentKey]
        );

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
        const result = await this.pool.query(
            `SELECT * FROM instrument_features_1d 
       WHERE instrument_key = $1 
       AND timestamp >= $2 
       AND timestamp <= $3
       AND is_valid = true
       ORDER BY timestamp ASC`,
            [
                instrumentKey,
                `${startYear}-01-01T00:00:00Z`,
                `${endYear}-12-31T23:59:59Z`
            ]
        );

        return result.rows.map((row) => this.mapRow(row));
    }

    private mapRow(row: any): InstrumentFeatures1d {
        return {
            timestamp: new Date(row.timestamp),
            instrumentKey: row.instrument_key,
            close: parseFloat(row.close),
            return1d: parseFloat(row.return_1d),
            return5d: parseFloat(row.return_5d),
            return20d: parseFloat(row.return_20d),
            rangeHl: parseFloat(row.range_hl),
            gapOpen: parseFloat(row.gap_open),
            closeVsHigh20d: parseFloat(row.close_vs_high_20d),
            closeVsLow20d: parseFloat(row.close_vs_low_20d),
            rsi14: parseFloat(row.rsi_14),
            rsi5: parseFloat(row.rsi_5),
            macd: parseFloat(row.macd),
            macdSignal: parseFloat(row.macd_signal),
            macdHist: parseFloat(row.macd_hist),
            adx14: parseFloat(row.adx_14),
            plusDi: parseFloat(row.plus_di),
            minusDi: parseFloat(row.minus_di),
            sma10: parseFloat(row.sma_10),
            sma20: parseFloat(row.sma_20),
            sma50: parseFloat(row.sma_50),
            sma200: parseFloat(row.sma_200),
            ema12: parseFloat(row.ema_12),
            ema26: parseFloat(row.ema_26),
            priceVsSma20: parseFloat(row.price_vs_sma_20),
            priceVsSma50: parseFloat(row.price_vs_sma_50),
            priceVsSma200: parseFloat(row.price_vs_sma_200),
            goldenCross: parseInt(row.golden_cross),
            atr14: parseFloat(row.atr_14),
            atrPercent: parseFloat(row.atr_percent),
            realizedVol20d: parseFloat(row.realized_vol_20d),
            realizedVol60d: parseFloat(row.realized_vol_60d),
            bollingerWidth: parseFloat(row.bollinger_width),
            bollingerPosition: parseFloat(row.bollinger_position),
            vixClose: parseFloat(row.vix_close),
            vixPercentile30d: parseFloat(row.vix_percentile_30d),
            vixPercentile1yr: parseFloat(row.vix_percentile_1yr),
            vixSma10: parseFloat(row.vix_sma_10),
            volumeSma20Ratio: parseFloat(row.volume_sma_20_ratio),
            volumeTrend: parseFloat(row.volume_trend),
            obvChange: parseFloat(row.obv_change),
            accumulationDist: parseFloat(row.accumulation_dist),
            trendStrength: parseFloat(row.trend_strength),
            meanReversionSignal: parseFloat(row.mean_reversion_signal),
            momentumRegime: parseInt(row.momentum_regime),
            volatilityRegime: parseInt(row.volatility_regime),
            dayOfWeek: parseInt(row.day_of_week),
            monthOfYear: parseInt(row.month_of_year),
            isMonthEnd: row.is_month_end,
            isQuarterEnd: row.is_quarter_end,
            isValid: row.is_valid,
            invalidReason: row.invalid_reason || undefined,
        };
    }
}
