/**
 * Training Features Repository
 * Repository for accessing ML training features from QuestDB
 */

import { Injectable, Logger } from "@nestjs/common";
import { QuestDBService } from "../questdb.service";
import type {
  ITrainingFeaturesLightGBM,
  ITrainingFeaturesLightGBMInsert,
  ITrainingFeaturesQuery,
  ITrainingFeaturesTFT,
  ITrainingFeaturesTFTInsert,
  ITrainingLabel,
  ITrainingLabelInsert,
  ITrainingLabelsQuery,
} from "@repo/schema";

@Injectable()
export class TrainingFeaturesRepository {
  private readonly logger = new Logger(TrainingFeaturesRepository.name);

  constructor(private readonly questdb: QuestDBService) {}

  // ========== LIGHTGBM FEATURES ==========

  /**
   * Insert LightGBM features batch
   */
  async insertLightGBMBatch(
    features: ITrainingFeaturesLightGBMInsert[]
  ): Promise<void> {
    if (features.length === 0) return;

    const sender = this.questdb.getSender();
    if (!sender) {
      throw new Error("QuestDB ILP sender not initialized");
    }

    for (const feat of features) {
      sender
        .table("training_features_lightgbm")
        .timestampColumn(
          "timestamp",
          typeof feat.timestamp === "number"
            ? feat.timestamp
            : feat.timestamp.getTime() * 1000
        )
        .symbol("reference_instrument", feat.reference_instrument)
        .symbol("index_name", feat.index_name)
        .floatColumn("nifty_spot_price", feat.nifty_spot_price)
        .floatColumn("nifty_future_price", feat.nifty_future_price)
        .floatColumn("spot_future_basis", feat.spot_future_basis)
        .floatColumn("basis_pct", feat.basis_pct)
        .intColumn("nifty_future_volume", feat.nifty_future_volume)
        .intColumn("nifty_spot_volume", feat.nifty_spot_volume)
        .floatColumn("nifty_spot_volatility_5m", feat.nifty_spot_volatility_5m)
        .floatColumn(
          "nifty_spot_volatility_15m",
          feat.nifty_spot_volatility_15m
        )
        .floatColumn("nifty_spot_roc_5m", feat.nifty_spot_roc_5m)
        .floatColumn("nifty_spot_momentum_15m", feat.nifty_spot_momentum_15m)
        .floatColumn("future_sma_9", feat.future_sma_9)
        .floatColumn("future_sma_21", feat.future_sma_21)
        .floatColumn("future_ema_9", feat.future_ema_9)
        .floatColumn("future_rsi_14", feat.future_rsi_14)
        .floatColumn("future_atr_14", feat.future_atr_14)
        .floatColumn("future_macd", feat.future_macd)
        .floatColumn("future_macd_signal", feat.future_macd_signal)
        .floatColumn("future_macd_histogram", feat.future_macd_histogram)
        .floatColumn("atm_strike", feat.atm_strike)
        .floatColumn("atm_call_iv", feat.atm_call_iv)
        .floatColumn("atm_put_iv", feat.atm_put_iv)
        .floatColumn("atm_iv_skew", feat.atm_iv_skew)
        .floatColumn("pcr_oi", feat.pcr_oi)
        .floatColumn("pcr_volume", feat.pcr_volume)
        .intColumn("total_call_oi", feat.total_call_oi)
        .intColumn("total_put_oi", feat.total_put_oi)
        .floatColumn("max_pain_strike", feat.max_pain_strike)
        .floatColumn("iv_rank", feat.iv_rank)
        .intColumn("nifty50_advance_count", feat.nifty50_advance_count)
        .intColumn("nifty50_decline_count", feat.nifty50_decline_count)
        .intColumn("nifty50_unchanged_count", feat.nifty50_unchanged_count)
        .floatColumn(
          "nifty50_advance_decline_ratio",
          feat.nifty50_advance_decline_ratio
        )
        .floatColumn("nifty50_avg_return_1m", feat.nifty50_avg_return_1m)
        .floatColumn("ofi_1s", feat.ofi_1s)
        .floatColumn("ofi_5s", feat.ofi_5s)
        .floatColumn("ofi_30s", feat.ofi_30s)
        .floatColumn("bid_ask_spread_bps", feat.bid_ask_spread_bps)
        .floatColumn("depth_imbalance_top5", feat.depth_imbalance_top5)
        .intColumn("hour", feat.hour)
        .intColumn("minute", feat.minute)
        .intColumn("seconds_since_market_open", feat.seconds_since_market_open)
        .intColumn("seconds_to_market_close", feat.seconds_to_market_close)
        .boolColumn("is_first_hour", feat.is_first_hour)
        .stringColumn("feature_version", feat.feature_version)
        .intColumn("computation_latency_ms", feat.computation_latency_ms)
        .at(
          typeof feat.timestamp === "number"
            ? feat.timestamp * 1000
            : feat.timestamp.getTime() * 1000,
          "us"
        );
    }

    await sender.flush();
    this.logger.debug(`Inserted ${features.length} LightGBM features`);
  }

  /**
   * Query LightGBM features
   */
  async findLightGBMByTimeRange(
    query: ITrainingFeaturesQuery
  ): Promise<ITrainingFeaturesLightGBM[]> {
    let sql = `
      SELECT * FROM training_features_lightgbm
      WHERE timestamp BETWEEN $1 AND $2
    `;

    const params: any[] = [
      query.start_time.toISOString(),
      query.end_time.toISOString(),
    ];

    if (query.reference_instrument) {
      sql += ` AND reference_instrument = $${params.length + 1}`;
      params.push(query.reference_instrument);
    }

    if (query.index_name) {
      sql += ` AND index_name = $${params.length + 1}`;
      params.push(query.index_name);
    }

    if (query.feature_version) {
      sql += ` AND feature_version = $${params.length + 1}`;
      params.push(query.feature_version);
    }

    sql += ` ORDER BY timestamp ASC`;

    if (query.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(query.limit);
    }

    const result = await this.questdb.query<ITrainingFeaturesLightGBM>(
      sql,
      params
    );

    return result.rows.map((row) => ({
      ...row,
      timestamp: new Date(row.timestamp),
    }));
  }

  // ========== TFT FEATURES ==========

  /**
   * Insert TFT features batch
   */
  async insertTFTBatch(features: ITrainingFeaturesTFTInsert[]): Promise<void> {
    if (features.length === 0) return;

    const sender = this.questdb.getSender();
    if (!sender) {
      throw new Error("QuestDB ILP sender not initialized");
    }

    for (const feat of features) {
      sender
        .table("training_features_tft")
        .timestampColumn(
          "timestamp",
          typeof feat.timestamp === "number"
            ? feat.timestamp
            : feat.timestamp.getTime() * 1000
        )
        .symbol("reference_instrument", feat.reference_instrument)
        .symbol("index_name", feat.index_name)
        .stringColumn("returns_5m", feat.returns_5m)
        .stringColumn("returns_15m", feat.returns_15m)
        .stringColumn("returns_1h", feat.returns_1h)
        .stringColumn("volatility_5m", feat.volatility_5m)
        .stringColumn("volatility_15m", feat.volatility_15m)
        .stringColumn("volatility_1h", feat.volatility_1h)
        .stringColumn("volume_normalized", feat.volume_normalized)
        .stringColumn("advance_decline_ratio", feat.advance_decline_ratio)
        .stringColumn(
          "nifty50_momentum_distribution",
          feat.nifty50_momentum_distribution
        )
        .stringColumn("pcr_oi", feat.pcr_oi)
        .stringColumn("atm_iv", feat.atm_iv)
        .stringColumn("iv_term_structure", feat.iv_term_structure)
        .stringColumn("bid_ask_spread", feat.bid_ask_spread)
        .stringColumn("order_flow_imbalance", feat.order_flow_imbalance)
        .stringColumn("current_regime", feat.current_regime)
        .floatColumn("vix_level", feat.vix_level)
        .stringColumn("market_phase", feat.market_phase)
        .stringColumn("feature_version", feat.feature_version)
        .intColumn("lookback_window", feat.lookback_window)
        .at(
          typeof feat.timestamp === "number"
            ? feat.timestamp * 1000
            : feat.timestamp.getTime() * 1000,
          "us"
        );
    }

    await sender.flush();
    this.logger.debug(`Inserted ${features.length} TFT features`);
  }

  /**
   * Query TFT features
   */
  async findTFTByTimeRange(
    query: ITrainingFeaturesQuery
  ): Promise<ITrainingFeaturesTFT[]> {
    let sql = `
      SELECT * FROM training_features_tft
      WHERE timestamp BETWEEN $1 AND $2
    `;

    const params: any[] = [
      query.start_time.toISOString(),
      query.end_time.toISOString(),
    ];

    if (query.reference_instrument) {
      sql += ` AND reference_instrument = $${params.length + 1}`;
      params.push(query.reference_instrument);
    }

    if (query.index_name) {
      sql += ` AND index_name = $${params.length + 1}`;
      params.push(query.index_name);
    }

    sql += ` ORDER BY timestamp ASC`;

    if (query.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(query.limit);
    }

    const result = await this.questdb.query<ITrainingFeaturesTFT>(sql, params);

    return result.rows.map((row) => ({
      ...row,
      timestamp: new Date(row.timestamp),
    }));
  }

  // ========== LABELS ==========

  /**
   * Insert training labels batch
   */
  async insertLabelsBatch(labels: ITrainingLabelInsert[]): Promise<void> {
    if (labels.length === 0) return;

    const sender = this.questdb.getSender();
    if (!sender) {
      throw new Error("QuestDB ILP sender not initialized");
    }

    for (const label of labels) {
      sender
        .table("training_labels")
        .timestampColumn(
          "timestamp",
          typeof label.timestamp === "number"
            ? label.timestamp
            : label.timestamp.getTime() * 1000
        )
        .symbol("reference_instrument", label.reference_instrument)
        .symbol("index_name", label.index_name)
        .floatColumn("target_return_1m", label.target_return_1m)
        .floatColumn("target_return_5m", label.target_return_5m)
        .floatColumn("target_return_15m", label.target_return_15m)
        .floatColumn("target_return_eod", label.target_return_eod)
        .floatColumn("target_volatility_5m", label.target_volatility_5m)
        .floatColumn("target_volatility_15m", label.target_volatility_15m)
        .stringColumn("target_direction_5m", label.target_direction_5m)
        .stringColumn(
          "target_volatility_regime_5m",
          label.target_volatility_regime_5m
        )
        .stringColumn("regime_label", label.regime_label)
        .floatColumn("regime_confidence", label.regime_confidence)
        .floatColumn("max_drawdown_5m", label.max_drawdown_5m)
        .floatColumn("max_runup_5m", label.max_runup_5m)
        .floatColumn("realized_volatility_5m", label.realized_volatility_5m)
        .boolColumn("had_regime_change", label.had_regime_change)
        .boolColumn("had_spike_event", label.had_spike_event)
        .stringColumn("label_quality", label.label_quality)
        .stringColumn("label_version", label.label_version)
        .at(
          typeof label.timestamp === "number"
            ? label.timestamp * 1000
            : label.timestamp.getTime() * 1000,
          "us"
        );
    }

    await sender.flush();
    this.logger.debug(`Inserted ${labels.length} training labels`);
  }

  /**
   * Query training labels
   */
  async findLabelsByTimeRange(
    query: ITrainingLabelsQuery
  ): Promise<ITrainingLabel[]> {
    let sql = `
      SELECT * FROM training_labels
      WHERE timestamp BETWEEN $1 AND $2
    `;

    const params: any[] = [
      query.start_time.toISOString(),
      query.end_time.toISOString(),
    ];

    if (query.reference_instrument) {
      sql += ` AND reference_instrument = $${params.length + 1}`;
      params.push(query.reference_instrument);
    }

    if (query.index_name) {
      sql += ` AND index_name = $${params.length + 1}`;
      params.push(query.index_name);
    }

    if (query.label_quality) {
      sql += ` AND label_quality = $${params.length + 1}`;
      params.push(query.label_quality);
    }

    if (query.label_version) {
      sql += ` AND label_version = $${params.length + 1}`;
      params.push(query.label_version);
    }

    sql += ` ORDER BY timestamp ASC`;

    if (query.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(query.limit);
    }

    const result = await this.questdb.query<ITrainingLabel>(sql, params);

    return result.rows.map((row) => ({
      ...row,
      timestamp: new Date(row.timestamp),
    }));
  }

  /**
   * Get joined features + labels for training
   */
  async getTrainingDataset(
    indexName: "NIFTY50" | "BANKNIFTY",
    startTime: Date,
    endTime: Date,
    featureVersion?: string,
    labelVersion?: string
  ): Promise<
    Array<{ features: ITrainingFeaturesLightGBM; labels: ITrainingLabel }>
  > {
    let sql = `
      SELECT 
        f.*,
        l.target_return_1m,
        l.target_return_5m,
        l.target_return_15m,
        l.target_return_eod,
        l.target_direction_5m,
        l.regime_label,
        l.label_quality
      FROM training_features_lightgbm f
      INNER JOIN training_labels l
        ON f.timestamp = l.timestamp
        AND f.reference_instrument = l.reference_instrument
      WHERE f.timestamp BETWEEN $1 AND $2
        AND f.index_name = $3
    `;

    const params: any[] = [
      startTime.toISOString(),
      endTime.toISOString(),
      indexName,
    ];

    if (featureVersion) {
      sql += ` AND f.feature_version = $${params.length + 1}`;
      params.push(featureVersion);
    }

    if (labelVersion) {
      sql += ` AND l.label_version = $${params.length + 1}`;
      params.push(labelVersion);
    }

    sql += ` AND l.label_quality = 'CLEAN' ORDER BY f.timestamp ASC`;

    const result = await this.questdb.query<any>(sql, params);

    return result.rows.map((row) => ({
      features: {
        timestamp: new Date(row.timestamp),
        reference_instrument: row.reference_instrument,
        index_name: row.index_name,
        nifty_spot_price: row.nifty_spot_price,
        nifty_future_price: row.nifty_future_price,
        spot_future_basis: row.spot_future_basis,
        basis_pct: row.basis_pct,
        nifty_future_volume: row.nifty_future_volume,
        nifty_spot_volume: row.nifty_spot_volume,
        nifty_spot_volatility_5m: row.nifty_spot_volatility_5m,
        nifty_spot_volatility_15m: row.nifty_spot_volatility_15m,
        nifty_spot_roc_5m: row.nifty_spot_roc_5m,
        nifty_spot_momentum_15m: row.nifty_spot_momentum_15m,
        future_sma_9: row.future_sma_9,
        future_sma_21: row.future_sma_21,
        future_ema_9: row.future_ema_9,
        future_rsi_14: row.future_rsi_14,
        future_atr_14: row.future_atr_14,
        future_macd: row.future_macd,
        future_macd_signal: row.future_macd_signal,
        future_macd_histogram: row.future_macd_histogram,
        atm_strike: row.atm_strike,
        atm_call_iv: row.atm_call_iv,
        atm_put_iv: row.atm_put_iv,
        atm_iv_skew: row.atm_iv_skew,
        pcr_oi: row.pcr_oi,
        pcr_volume: row.pcr_volume,
        total_call_oi: row.total_call_oi,
        total_put_oi: row.total_put_oi,
        max_pain_strike: row.max_pain_strike,
        iv_rank: row.iv_rank,
        nifty50_advance_count: row.nifty50_advance_count,
        nifty50_decline_count: row.nifty50_decline_count,
        nifty50_unchanged_count: row.nifty50_unchanged_count,
        nifty50_advance_decline_ratio: row.nifty50_advance_decline_ratio,
        nifty50_avg_return_1m: row.nifty50_avg_return_1m,
        ofi_1s: row.ofi_1s,
        ofi_5s: row.ofi_5s,
        ofi_30s: row.ofi_30s,
        bid_ask_spread_bps: row.bid_ask_spread_bps,
        depth_imbalance_top5: row.depth_imbalance_top5,
        hour: row.hour,
        minute: row.minute,
        seconds_since_market_open: row.seconds_since_market_open,
        seconds_to_market_close: row.seconds_to_market_close,
        is_first_hour: row.is_first_hour,
        feature_version: row.feature_version,
        computation_latency_ms: row.computation_latency_ms,
      },
      labels: {
        timestamp: new Date(row.timestamp),
        reference_instrument: row.reference_instrument,
        index_name: row.index_name,
        target_return_1m: row.target_return_1m,
        target_return_5m: row.target_return_5m,
        target_return_15m: row.target_return_15m,
        target_return_eod: row.target_return_eod,
        target_volatility_5m: row.target_volatility_5m,
        target_volatility_15m: row.target_volatility_15m,
        target_direction_5m: row.target_direction_5m,
        target_volatility_regime_5m: row.target_volatility_regime_5m,
        regime_label: row.regime_label,
        regime_confidence: row.regime_confidence,
        max_drawdown_5m: row.max_drawdown_5m,
        max_runup_5m: row.max_runup_5m,
        realized_volatility_5m: row.realized_volatility_5m,
        had_regime_change: row.had_regime_change,
        had_spike_event: row.had_spike_event,
        label_quality: row.label_quality,
        label_version: row.label_version,
      },
    }));
  }
}
