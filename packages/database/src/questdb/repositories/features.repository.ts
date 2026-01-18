import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { InstrumentFeatures, InstrumentFeaturesSchema } from "@repo/schema";
import { loadSqlQueryCached } from "../utils/sql-loader";

/**
 * Repository for unified instrument_features table
 * Handles both 1m and 1d features with interval-based storage
 */
@Injectable()
export class FeaturesRepository {
  private readonly logger = new Logger(FeaturesRepository.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Bulk insert features
   */
  async bulkInsert(features: InstrumentFeatures[]): Promise<boolean> {
    if (features.length === 0) return true;

    try {
      const client = await this.pool.connect();
      try {
        // Use parameterized insert for safety
        const columns = [
          "timestamp",
          "instrument_key",
          "interval_value",
          "interval_unit",
          "pct_stocks_above_vwap",
          "pct_stocks_above_ema20",
          "weighted_return_top10",
          "advance_decline_ratio",
          "breadth_momentum_5m",
          "breadth_volatility",
          "fut_price_vs_vwap",
          "fut_range_position",
          "fut_return_1m",
          "fut_return_5m",
          "fut_atr_percent",
          "fut_volume_zscore",
          "fut_oi_change",
          "fut_rsi_14",
          "fut_macd",
          "atm_iv",
          "atm_iv_change",
          "iv_skew",
          "gamma_atm",
          "vega_atm",
          "theta_atm",
          "pcr_oi",
          "pcr_volume",
          "max_pain_distance",
          "charm_atm",
          "vanna_atm",
          "india_vix",
          "realized_vol_5m",
          "realized_vol_15m",
          "vol_expansion_ratio",
          "minutes_from_open",
          "minutes_to_close",
          "day_of_week",
          "is_valid",
          "invalid_reason",
          "feature_mode",
          "feature_version",
        ];

        for (const feature of features) {
          const v = InstrumentFeaturesSchema.parse(feature);
          const values = [
            v.timestamp.toISOString(),
            v.instrumentKey,
            v.intervalValue,
            v.intervalUnit,
            v.pctStocksAboveVwap ?? null,
            v.pctStocksAboveEma20 ?? null,
            v.weightedReturnTop10 ?? null,
            v.advanceDeclineRatio ?? null,
            v.breadthMomentum5m ?? null,
            v.breadthVolatility ?? null,
            v.futPriceVsVwap ?? null,
            v.futRangePosition ?? null,
            v.futReturn1m ?? null,
            v.futReturn5m ?? null,
            v.futAtrPercent ?? null,
            v.futVolumeZscore ?? null,
            v.futOiChange ?? null,
            v.futRsi14 ?? null,
            v.futMacd ?? null,
            v.atmIv ?? null,
            v.atmIvChange ?? null,
            v.ivSkew ?? null,
            v.gammaAtm ?? null,
            v.vegaAtm ?? null,
            v.thetaAtm ?? null,
            v.pcrOi ?? null,
            v.pcrVolume ?? null,
            v.maxPainDistance ?? null,
            v.charmAtm ?? null,
            v.vannaAtm ?? null,
            v.indiaVix ?? null,
            v.realizedVol5m ?? null,
            v.realizedVol15m ?? null,
            v.volExpansionRatio ?? null,
            v.minutesFromOpen ?? null,
            v.minutesToClose ?? null,
            v.dayOfWeek ?? null,
            v.isValid ?? null,
            v.invalidReason ?? null,
            v.featureMode ?? null,
            v.featureVersion ?? null,
          ];

          const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
          await client.query(
            `INSERT INTO instrument_features (${columns.join(", ")}) VALUES (${placeholders})`,
            values,
          );
        }

        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error("Error during bulk insert of features", error);
      return false;
    }
  }

  /**
   * Get features for a specific instrument and interval
   */
  async getFeatures(
    instrumentKey: string,
    intervalValue: number,
    intervalUnit: "minute" | "day",
    startTime: Date,
    endTime: Date,
  ): Promise<InstrumentFeatures[]> {
    const result = await this.pool.query(
      `SELECT * FROM instrument_features 
       WHERE instrument_key = $1 
       AND interval_value = $2 
       AND interval_unit = $3
       AND timestamp >= $4 
       AND timestamp <= $5
       ORDER BY timestamp ASC`,
      [instrumentKey, intervalValue, intervalUnit, startTime, endTime],
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Get the latest feature for an instrument
   */
  async getLatest(
    instrumentKey: string,
    intervalValue: number,
    intervalUnit: "minute" | "day",
  ): Promise<InstrumentFeatures | null> {
    const result = await this.pool.query(
      `SELECT * FROM instrument_features 
       WHERE instrument_key = $1 
       AND interval_value = $2 
       AND interval_unit = $3
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [instrumentKey, intervalValue, intervalUnit],
    );

    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: any): InstrumentFeatures {
    return {
      timestamp: new Date(row.timestamp),
      instrumentKey: row.instrument_key,
      intervalValue: row.interval_value,
      intervalUnit: row.interval_unit,
      pctStocksAboveVwap: row.pct_stocks_above_vwap,
      pctStocksAboveEma20: row.pct_stocks_above_ema20,
      weightedReturnTop10: row.weighted_return_top10,
      advanceDeclineRatio: row.advance_decline_ratio,
      breadthMomentum5m: row.breadth_momentum_5m,
      breadthVolatility: row.breadth_volatility,
      futPriceVsVwap: row.fut_price_vs_vwap,
      futRangePosition: row.fut_range_position,
      futReturn1m: row.fut_return_1m,
      futReturn5m: row.fut_return_5m,
      futAtrPercent: row.fut_atr_percent,
      futVolumeZscore: row.fut_volume_zscore,
      futOiChange: row.fut_oi_change,
      futRsi14: row.fut_rsi_14,
      futMacd: row.fut_macd,
      atmIv: row.atm_iv,
      atmIvChange: row.atm_iv_change,
      ivSkew: row.iv_skew,
      gammaAtm: row.gamma_atm,
      vegaAtm: row.vega_atm,
      thetaAtm: row.theta_atm,
      pcrOi: row.pcr_oi,
      pcrVolume: row.pcr_volume,
      maxPainDistance: row.max_pain_distance,
      charmAtm: row.charm_atm,
      vannaAtm: row.vanna_atm,
      indiaVix: row.india_vix,
      realizedVol5m: row.realized_vol_5m,
      realizedVol15m: row.realized_vol_15m,
      volExpansionRatio: row.vol_expansion_ratio,
      minutesFromOpen: row.minutes_from_open,
      minutesToClose: row.minutes_to_close,
      dayOfWeek: row.day_of_week,
      isValid: row.is_valid,
      invalidReason: row.invalid_reason,
      featureMode: row.feature_mode,
      featureVersion: row.feature_version,
    };
  }
}
