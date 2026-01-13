import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { MarketState1m, MarketState1mSchema } from "@repo/schema";
import { loadSqlQueryCached } from "../utils/sql-loader";
@Injectable()
export class MarketStateRepository {
  private readonly logger = new Logger(MarketStateRepository.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Insert market state (single row per minute)
   */
  async insert(state: MarketState1m): Promise<void> {
    const v = MarketState1mSchema.parse(state);
    const sql = loadSqlQueryCached("market-state/insert");

    await this.pool.query(sql, [
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
    const sql = loadSqlQueryCached("market-state/get-latest");
    const result = await this.pool.query(sql);

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
    const sql = loadSqlQueryCached("market-state/get-by-time-range");
    const result = await this.pool.query(sql, [
      startTime.toISOString(),
      endTime.toISOString(),
    ]);

    return result.rows.map((row: any) => this.mapRow(row));
  }

  /**
   * Get last N market states
   */
  async getLastN(count: number): Promise<MarketState1m[]> {
    const sql = loadSqlQueryCached("market-state/get-last-n");
    const result = await this.pool.query(sql, [count]);

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
