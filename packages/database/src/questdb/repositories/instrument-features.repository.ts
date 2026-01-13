import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { InstrumentFeatures1m, InstrumentFeatures1mSchema } from "@repo/schema";

@Injectable()
export class InstrumentFeaturesRepository {
  private readonly logger = new Logger(InstrumentFeaturesRepository.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Insert instrument features (batch)
   */
  async insertBatch(features: InstrumentFeatures1m[]): Promise<void> {
    if (features.length === 0) return;

    const values = features
      .map((f) => {
        const v = InstrumentFeatures1mSchema.parse(f);
        return `('${v.timestamp.toISOString()}', '${v.instrumentKey}', ${v.lastPrice}, ${v.vwap}, ${v.priceVsVwap}, ${v.dayHigh}, ${v.dayLow}, ${v.priceVsDayHigh}, ${v.priceVsDayLow}, ${v.rangePosition}, ${v.prevDayHighDist}, ${v.prevDayLowDist}, ${v.weeklyHighDist}, ${v.weeklyLowDist}, ${v.rsi5}, ${v.rsi14}, ${v.rsi21}, ${v.macdHist}, ${v.ema9}, ${v.ema21}, ${v.ema9Slope}, ${v.ema21Slope}, ${v.adx}, ${v.roc5}, ${v.atr}, ${v.atrPercent}, ${v.realizedVol5m}, ${v.realizedVol15m}, ${v.volExpansionRatio}, ${v.minutesFromOpen}, ${v.minutesToClose}, ${v.dayOfWeek})`;
      })
      .join(",");

    const query = `
      INSERT INTO instrument_features_1m (
        timestamp, instrument_key, last_price, vwap, price_vs_vwap,
        day_high, day_low, price_vs_day_high, price_vs_day_low, range_position,
        prev_day_high_dist, prev_day_low_dist, weekly_high_dist, weekly_low_dist,
        rsi_5, rsi_14, rsi_21, macd_hist, ema_9, ema_21,
        ema_9_slope, ema_21_slope, adx, roc_5,
        atr, atr_percent, realized_vol_5m, realized_vol_15m, vol_expansion_ratio,
        minutes_from_open, minutes_to_close, day_of_week
      ) VALUES ${values}
    `;

    await this.pool.query(query);
    this.logger.log(`Inserted ${features.length} instrument features`);
  }

  /**
   * Get latest features for instrument
   */
  async getLatest(instrumentKey: string): Promise<InstrumentFeatures1m | null> {
    const result = await this.pool.query(
      `SELECT * FROM instrument_features_1m 
       WHERE instrument_key = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [instrumentKey]
    );

    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  /**
   * Get features for time range
   */
  async getByTimeRange(
    instrumentKey: string,
    startTime: Date,
    endTime: Date
  ): Promise<InstrumentFeatures1m[]> {
    const result = await this.pool.query(
      `SELECT * FROM instrument_features_1m 
       WHERE instrument_key = $1 
       AND timestamp >= $2 
       AND timestamp < $3 
       ORDER BY timestamp DESC`,
      [instrumentKey, startTime.toISOString(), endTime.toISOString()]
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: any): InstrumentFeatures1m {
    return {
      timestamp: new Date(row.timestamp),
      instrumentKey: row.instrument_key,
      lastPrice: parseFloat(row.last_price),
      vwap: parseFloat(row.vwap),
      priceVsVwap: parseFloat(row.price_vs_vwap),
      dayHigh: parseFloat(row.day_high),
      dayLow: parseFloat(row.day_low),
      priceVsDayHigh: parseFloat(row.price_vs_day_high),
      priceVsDayLow: parseFloat(row.price_vs_day_low),
      rangePosition: parseFloat(row.range_position),
      prevDayHighDist: parseFloat(row.prev_day_high_dist),
      prevDayLowDist: parseFloat(row.prev_day_low_dist),
      weeklyHighDist: parseFloat(row.weekly_high_dist),
      weeklyLowDist: parseFloat(row.weekly_low_dist),
      rsi5: parseFloat(row.rsi_5),
      rsi14: parseFloat(row.rsi_14),
      rsi21: parseFloat(row.rsi_21),
      macdHist: parseFloat(row.macd_hist),
      ema9: parseFloat(row.ema_9),
      ema21: parseFloat(row.ema_21),
      ema9Slope: parseFloat(row.ema_9_slope),
      ema21Slope: parseFloat(row.ema_21_slope),
      adx: parseFloat(row.adx),
      roc5: parseFloat(row.roc_5),
      atr: parseFloat(row.atr),
      atrPercent: parseFloat(row.atr_percent),
      realizedVol5m: parseFloat(row.realized_vol_5m),
      realizedVol15m: parseFloat(row.realized_vol_15m),
      volExpansionRatio: parseFloat(row.vol_expansion_ratio),
      minutesFromOpen: parseInt(row.minutes_from_open),
      minutesToClose: parseInt(row.minutes_to_close),
      dayOfWeek: parseInt(row.day_of_week),
    };
  }
}
