/**
 * Training Data Schema Types
 * TypeScript interfaces for ML training data stored in QuestDB
 */

// ========== RAW MARKET DATA ==========

/**
 * Unified tick data for all instrument types
 * (spot, futures, options, stocks)
 */
export interface IMarketTick {
  timestamp: Date;
  instrument_key: string;
  instrument_type: "SPOT" | "FUTURE" | "OPTION" | "STOCK";
  index_name?: "NIFTY50" | "BANKNIFTY" | "SENSEX" | null;

  // Option-specific fields
  strike_price?: number | null;
  option_type?: "CE" | "PE" | null;
  expiry_date?: Date | null;

  // Stock-specific fields
  stock_symbol?: string | null;
  is_nifty50_constituent?: boolean;

  // Price data
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  prev_close: number;

  // Volume data
  volume: number;
  open_interest?: number | null;

  // Bid/Ask
  bid: number;
  ask: number;
  bid_qty: number;
  ask_qty: number;

  // Circuit limits
  upper_circuit: number;
  lower_circuit: number;

  // Metadata
  exchange: "NSE" | "BSE";
  trade_time: Date;
}

export interface IMarketTickInsert extends Omit<
  IMarketTick,
  "timestamp" | "trade_time"
> {
  timestamp: number | Date;
  trade_time: number | Date;
}

/**
 * 20-level market depth
 */
export interface IMarketDepth20 {
  timestamp: Date;
  instrument_key: string;
  instrument_type: "SPOT" | "FUTURE" | "OPTION" | "STOCK";
  index_name?: "NIFTY50" | "BANKNIFTY" | "SENSEX" | null;
  side: "BUY" | "SELL";
  level: number; // 0-19
  price: number;
  quantity: number;
  orders: number;
  exchange: "NSE" | "BSE";
}

export interface IMarketDepth20Insert extends Omit<
  IMarketDepth20,
  "timestamp"
> {
  timestamp: number | Date;
}

// ========== COMPUTED FEATURES ==========

/**
 * LightGBM training features (43 features)
 */
export interface ITrainingFeaturesLightGBM {
  timestamp: Date;
  reference_instrument: string;
  index_name: "NIFTY50" | "BANKNIFTY";

  // Index features (10)
  nifty_spot_price: number;
  nifty_future_price: number;
  spot_future_basis: number;
  basis_pct: number;
  nifty_future_volume: number;
  nifty_spot_volume: number;
  nifty_spot_volatility_5m: number;
  nifty_spot_volatility_15m: number;
  nifty_spot_roc_5m: number;
  nifty_spot_momentum_15m: number;

  // Futures features (8)
  future_sma_9: number;
  future_sma_21: number;
  future_ema_9: number;
  future_rsi_14: number;
  future_atr_14: number;
  future_macd: number;
  future_macd_signal: number;
  future_macd_histogram: number;

  // Options features (10)
  atm_strike: number;
  atm_call_iv: number;
  atm_put_iv: number;
  atm_iv_skew: number;
  pcr_oi: number;
  pcr_volume: number;
  total_call_oi: number;
  total_put_oi: number;
  max_pain_strike: number;
  iv_rank: number;

  // Market breadth (5)
  nifty50_advance_count: number;
  nifty50_decline_count: number;
  nifty50_unchanged_count: number;
  nifty50_advance_decline_ratio: number;
  nifty50_avg_return_1m: number;

  // Microstructure (5)
  ofi_1s: number;
  ofi_5s: number;
  ofi_30s: number;
  bid_ask_spread_bps: number;
  depth_imbalance_top5: number;

  // Time features (5)
  hour: number;
  minute: number;
  seconds_since_market_open: number;
  seconds_to_market_close: number;
  is_first_hour: boolean;

  // Metadata
  feature_version: string;
  computation_latency_ms: number;
}

export interface ITrainingFeaturesLightGBMInsert extends Omit<
  ITrainingFeaturesLightGBM,
  "timestamp"
> {
  timestamp: number | Date;
}

/**
 * TFT (Temporal Fusion Transformer) time-series features
 */
export interface ITrainingFeaturesTFT {
  timestamp: Date;
  reference_instrument: string;
  index_name: "NIFTY50" | "BANKNIFTY";

  // Time-series arrays (stored as JSON strings)
  returns_5m: string; // JSON array of numbers
  returns_15m: string;
  returns_1h: string;
  volatility_5m: string;
  volatility_15m: string;
  volatility_1h: string;
  volume_normalized: string;
  advance_decline_ratio: string;
  nifty50_momentum_distribution: string;
  pcr_oi: string;
  atm_iv: string;
  iv_term_structure: string;
  bid_ask_spread: string;
  order_flow_imbalance: string;

  // Static features
  current_regime: "TRENDING" | "RANGING" | "VOLATILE";
  vix_level: number;
  market_phase: "OPENING" | "MID_DAY" | "CLOSING";

  // Metadata
  feature_version: string;
  lookback_window: number; // Typically 120 (10 hours of 5-min data)
}

export interface ITrainingFeaturesTFTInsert extends Omit<
  ITrainingFeaturesTFT,
  "timestamp"
> {
  timestamp: number | Date;
}

// ========== TRAINING LABELS ==========

/**
 * Supervised learning labels/targets
 */
export interface ITrainingLabel {
  timestamp: Date;
  reference_instrument: string;
  index_name: "NIFTY50" | "BANKNIFTY";

  // Regression targets
  target_return_1m: number;
  target_return_5m: number;
  target_return_15m: number;
  target_return_eod: number;
  target_volatility_5m: number;
  target_volatility_15m: number;

  // Classification targets
  target_direction_5m: "UP" | "DOWN" | "NEUTRAL";
  target_volatility_regime_5m: "HIGH" | "MEDIUM" | "LOW";
  regime_label: "TRENDING" | "RANGING" | "VOLATILE";
  regime_confidence: number;

  // Risk targets
  max_drawdown_5m: number;
  max_runup_5m: number;
  realized_volatility_5m: number;

  // Event labels
  had_regime_change: boolean;
  had_spike_event: boolean;

  // Metadata
  label_quality: "CLEAN" | "NOISY" | "OUTLIER";
  label_version: string;
}

export interface ITrainingLabelInsert extends Omit<
  ITrainingLabel,
  "timestamp"
> {
  timestamp: number | Date;
}

// ========== QUERY INTERFACES ==========

export interface IMarketTickQuery {
  instrument_key?: string;
  instrument_type?: "SPOT" | "FUTURE" | "OPTION" | "STOCK";
  index_name?: "NIFTY50" | "BANKNIFTY" | "SENSEX";
  start_time: Date;
  end_time: Date;
  limit?: number;
}

export interface IMarketDepth20Query {
  instrument_key: string;
  start_time: Date;
  end_time: Date;
  side?: "BUY" | "SELL";
  max_level?: number; // Default: 20
  limit?: number;
}

export interface ITrainingFeaturesQuery {
  reference_instrument?: string;
  index_name?: "NIFTY50" | "BANKNIFTY";
  start_time: Date;
  end_time: Date;
  feature_version?: string;
  limit?: number;
}

export interface ITrainingLabelsQuery {
  reference_instrument?: string;
  index_name?: "NIFTY50" | "BANKNIFTY";
  start_time: Date;
  end_time: Date;
  label_quality?: "CLEAN" | "NOISY" | "OUTLIER";
  label_version?: string;
  limit?: number;
}

/**
 * Joined training data (features + labels)
 */
export interface ITrainingDataset {
  features: ITrainingFeaturesLightGBM;
  labels: ITrainingLabel;
}
