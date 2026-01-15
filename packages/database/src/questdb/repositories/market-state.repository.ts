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
      v.instrumentKey,
      // Index Breadth (6)
      v.pctStocksAboveVwap,
      v.pctStocksAboveEma20,
      v.weightedReturnTop10,
      v.advanceDeclineRatio,
      v.breadthMomentum5M,
      v.breadthVolatility,
      // NIFTY Future (9)
      v.futPriceVsVwap,
      v.futRangePosition,
      v.futReturn1M,
      v.futReturn5M,
      v.futAtrPercent,
      v.futVolumeZscore,
      v.futOiChange,
      v.futRsi14,
      v.futMacd,
      // Options (11)
      v.atmIv,
      v.atmIvChange,
      v.ivSkew,
      v.gammaAtm,
      v.vegaAtm,
      v.thetaAtm,
      v.pcrOi,
      v.pcrVolume,
      v.maxPainDistance,
      v.charmAtm,
      v.vannaAtm,
      // Volatility (4)
      v.indiaVix,
      v.realizedVol5M,
      v.realizedVol15M,
      v.volExpansionRatio,
      // Time Context (3)
      v.minutesFromOpen,
      v.minutesToClose,
      v.dayOfWeek,
    ]);
  }

  /**
   * Insert market states in batch (optimized for QuestDB)
   */
  async insertBatch(states: MarketState1m[]): Promise<void> {
    if (states.length === 0) return;

    const sqlPrefix = loadSqlQueryCached("market-state/insert-batch-prefix");

    const values = states
      .map((state) => {
        const v = MarketState1mSchema.parse(state);
        return `('${v.timestamp.toISOString()}', '${v.instrumentKey}', ${v.pctStocksAboveVwap}, ${v.pctStocksAboveEma20}, ${v.weightedReturnTop10}, ${v.advanceDeclineRatio}, ${v.breadthMomentum5M}, ${v.breadthVolatility}, ${v.futPriceVsVwap}, ${v.futRangePosition}, ${v.futReturn1M}, ${v.futReturn5M}, ${v.futAtrPercent}, ${v.futVolumeZscore}, ${v.futOiChange}, ${v.futRsi14}, ${v.futMacd}, ${v.atmIv}, ${v.atmIvChange}, ${v.ivSkew}, ${v.gammaAtm}, ${v.vegaAtm}, ${v.thetaAtm}, ${v.pcrOi}, ${v.pcrVolume}, ${v.maxPainDistance}, ${v.charmAtm}, ${v.vannaAtm}, ${v.indiaVix}, ${v.realizedVol5M}, ${v.realizedVol15M}, ${v.volExpansionRatio}, ${v.minutesFromOpen}, ${v.minutesToClose}, ${v.dayOfWeek})`;
      })
      .join(",");

    const query = `${sqlPrefix} ${values}`;
    await this.pool.query(query);
    this.logger.log(`Inserted ${states.length} market states`);
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
      instrumentKey: row.instrument_key,
      // Index Breadth (6)
      pctStocksAboveVwap: parseFloat(row.pct_stocks_above_vwap),
      pctStocksAboveEma20: parseFloat(row.pct_stocks_above_ema20),
      weightedReturnTop10: parseFloat(row.weighted_return_top10),
      advanceDeclineRatio: parseFloat(row.advance_decline_ratio),
      breadthMomentum5M: parseFloat(row.breadth_momentum_5m),
      breadthVolatility: parseFloat(row.breadth_volatility),
      // NIFTY Future (9)
      futPriceVsVwap: parseFloat(row.fut_price_vs_vwap),
      futRangePosition: parseFloat(row.fut_range_position),
      futReturn1M: parseFloat(row.fut_return_1m),
      futReturn5M: parseFloat(row.fut_return_5m),
      futAtrPercent: parseFloat(row.fut_atr_percent),
      futVolumeZscore: parseFloat(row.fut_volume_zscore),
      futOiChange: parseFloat(row.fut_oi_change),
      futRsi14: parseFloat(row.fut_rsi_14),
      futMacd: parseFloat(row.fut_macd),
      // Options (11)
      atmIv: parseFloat(row.atm_iv),
      atmIvChange: parseFloat(row.atm_iv_change),
      ivSkew: parseFloat(row.iv_skew),
      gammaAtm: parseFloat(row.gamma_atm),
      vegaAtm: parseFloat(row.vega_atm),
      thetaAtm: parseFloat(row.theta_atm),
      pcrOi: parseFloat(row.pcr_oi),
      pcrVolume: parseFloat(row.pcr_volume),
      maxPainDistance: parseFloat(row.max_pain_distance),
      charmAtm: parseFloat(row.charm_atm),
      vannaAtm: parseFloat(row.vanna_atm),
      // Volatility (4)
      indiaVix: parseFloat(row.india_vix),
      realizedVol5M: parseFloat(row.realized_vol_5m),
      realizedVol15M: parseFloat(row.realized_vol_15m),
      volExpansionRatio: parseFloat(row.vol_expansion_ratio),
      // Time Context (3)
      minutesFromOpen: parseInt(row.minutes_from_open),
      minutesToClose: parseInt(row.minutes_to_close),
      dayOfWeek: parseInt(row.day_of_week),
    };
  }
}
