import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { MarketState1m, MarketState1mSchema } from "@repo/schema";

@Injectable()
export class MarketStateRepository {
  private readonly logger = new Logger(MarketStateRepository.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Insert market state (single row per minute)
   */
  async insert(state: MarketState1m): Promise<void> {
    const v = MarketState1mSchema.parse(state);

    const query = `
      INSERT INTO market_state_1m (
        timestamp, price_vs_vwap, price_vs_day_high, price_vs_day_low, range_position,
        prev_day_high_dist, prev_day_low_dist, weekly_high_dist, weekly_low_dist,
        rsi_5, rsi_14, rsi_21, macd_hist, ema_9_slope, ema_21_slope, adx, roc_5,
        atr_percent, realized_vol_5m, realized_vol_15m, vol_expansion_ratio, india_vix,
        atm_iv, atm_iv_change, delta_atm, gamma_atm, vega_atm, theta_atm,
        pcr_oi, pcr_volume, max_pain_dist,
        minutes_from_open, minutes_to_close, day_of_week
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
      )
    `;

    await this.pool.query(query, [
      v.timestamp,
      v.priceVsVwap,
      v.priceVsDayHigh,
      v.priceVsDayLow,
      v.rangePosition,
      v.prevDayHighDist,
      v.prevDayLowDist,
      v.weeklyHighDist,
      v.weeklyLowDist,
      v.rsi5,
      v.rsi14,
      v.rsi21,
      v.macdHist,
      v.ema9Slope,
      v.ema21Slope,
      v.adx,
      v.roc5,
      v.atrPercent,
      v.realizedVol5m,
      v.realizedVol15m,
      v.volExpansionRatio,
      v.indiaVix,
      v.atmIv,
      v.atmIvChange,
      v.deltaAtm,
      v.gammaAtm,
      v.vegaAtm,
      v.thetaAtm,
      v.pcrOi,
      v.pcrVolume,
      v.maxPainDist,
      v.minutesFromOpen,
      v.minutesToClose,
      v.dayOfWeek,
    ]);
  }

  /**
   * Get latest market state
   */
  async getLatest(): Promise<MarketState1m | null> {
    const result = await this.pool.query(
      "SELECT * FROM market_state_1m ORDER BY timestamp DESC LIMIT 1"
    );

    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  /**
   * Get market states for time range (for training)
   */
  async getByTimeRange(
    startTime: Date,
    endTime: Date
  ): Promise<MarketState1m[]> {
    const result = await this.pool.query(
      `SELECT * FROM market_state_1m 
       WHERE timestamp >= $1 AND timestamp < $2 
       ORDER BY timestamp ASC`,
      [startTime.toISOString(), endTime.toISOString()]
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Get last N market states
   */
  async getLastN(count: number): Promise<MarketState1m[]> {
    const result = await this.pool.query(
      `SELECT * FROM market_state_1m 
       ORDER BY timestamp DESC 
       LIMIT $1`,
      [count]
    );

    return result.rows.map((row) => this.mapRow(row)).reverse();
  }

  private mapRow(row: any): MarketState1m {
    return {
      timestamp: new Date(row.timestamp),
      priceVsVwap: parseFloat(row.price_vs_vwap),
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
      ema9Slope: parseFloat(row.ema_9_slope),
      ema21Slope: parseFloat(row.ema_21_slope),
      adx: parseFloat(row.adx),
      roc5: parseFloat(row.roc_5),
      atrPercent: parseFloat(row.atr_percent),
      realizedVol5m: parseFloat(row.realized_vol_5m),
      realizedVol15m: parseFloat(row.realized_vol_15m),
      volExpansionRatio: parseFloat(row.vol_expansion_ratio),
      indiaVix: row.india_vix ? parseFloat(row.india_vix) : null,
      atmIv: parseFloat(row.atm_iv),
      atmIvChange: parseFloat(row.atm_iv_change),
      deltaAtm: parseFloat(row.delta_atm),
      gammaAtm: parseFloat(row.gamma_atm),
      vegaAtm: parseFloat(row.vega_atm),
      thetaAtm: parseFloat(row.theta_atm),
      pcrOi: parseFloat(row.pcr_oi),
      pcrVolume: parseFloat(row.pcr_volume),
      maxPainDist: parseFloat(row.max_pain_dist),
      minutesFromOpen: parseInt(row.minutes_from_open),
      minutesToClose: parseInt(row.minutes_to_close),
      dayOfWeek: parseInt(row.day_of_week),
    };
  }
}
