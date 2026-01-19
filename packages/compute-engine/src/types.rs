//! Type definitions for parallel feature computation
//! All types use NAPI objects for zero-copy FFI
//! TypeScript types are auto-generated via ts-rs to @repo/schema

use napi_derive::napi;
use serde::{Deserialize, Serialize};

// ============================================
// FEATURE MODE
// ============================================

/// Feature computation mode (Historical vs Live)
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[napi]
pub enum FeatureMode {
  /// Historical mode: No market depth, compute Greeks from IV
  /// Used for training on 2022-2026 1-minute data
  Historical,
  /// Live mode: Full depth-30, pre-computed Greeks from exchange
  /// Used for real-time inference
  Live,
}

impl Default for FeatureMode {
  fn default() -> Self {
    FeatureMode::Historical
  }
}

// ============================================
// MARKET DEPTH (for Live mode)
// ============================================

/// Single level of order book depth
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct DepthLevel {
  pub price: f64,
  pub quantity: i64,
  pub orders: Option<i32>,
}

/// Full market depth (30 levels bid/ask)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct MarketDepth {
  pub bids: Vec<DepthLevel>, // Up to 30 levels
  pub asks: Vec<DepthLevel>, // Up to 30 levels
  pub total_bid_qty: i64,
  pub total_ask_qty: i64,
}

// ============================================
// INPUT TYPES
// ============================================

/// Single tick data for NIFTY Future
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct FutureTick {
  pub ltp: f64,
  pub open: f64,
  pub high: f64,
  pub low: f64,
  pub close: f64,
  pub volume: f64,
  pub open_interest: f64,
  // NOTE: VWAP is COMPUTED from historical cache, not provided as input
}

/// Single tick data for NIFTY 50 constituent
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct ConstituentTick {
  pub symbol: String,
  pub ltp: f64,
  pub open: f64,
  pub volume: f64,
  // NOTE: VWAP is COMPUTED from historical cache, not provided as input
}

/// Single option tick data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct OptionTick {
  pub strike: f64,
  pub option_type: String, // "CE" or "PE"
  pub ltp: f64,
  pub iv: f64,
  pub delta: f64,
  pub gamma: f64,
  pub vega: f64,
  pub theta: f64,
  pub open_interest: f64,
  pub volume: f64,
}

/// Complete feature computation input (passed directly from Node.js)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct FeatureInput {
  pub timestamp: i64, // Unix timestamp in milliseconds
  pub nifty_future: FutureTick,
  pub constituents: Vec<ConstituentTick>, // 50 stocks
  pub options: Vec<OptionTick>,
  pub india_vix: Option<f64>,
  // Expiry-related fields (pre-computed in TypeScript)
  pub is_expiry_day: Option<bool>,
  pub days_to_expiry: Option<i32>,
  pub current_expiry: Option<String>, // YYYY-MM-DD format
  // Market depth (Live mode only)
  pub market_depth: Option<MarketDepth>,
  // Spot price for Greeks calculation
  pub nifty_spot: Option<f64>,
  // Risk-free rate for Black-Scholes (annualized, e.g., 0.07 for 7%)
  pub risk_free_rate: Option<f64>,
}

// ============================================
// OUTPUT TYPES
// ============================================

/// Complete feature output (54 features + timestamp = 55 fields) - returned directly to Node.js
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct FeatureOutput {
  pub timestamp: i64,

  // ========== INDEX BREADTH (8) ==========
  pub pct_stocks_above_vwap: f64,
  pub pct_stocks_above_ema20: f64,
  pub weighted_return_top10: f64,
  pub advance_decline_ratio: f64,
  pub breadth_momentum_5m: f64,
  pub breadth_volatility: f64,
  // NEW: 2 additional breadth features
  pub breadth_thrust: f64,       // advances / (advances + declines)
  pub new_highs_lows_ratio: f64, // (new_highs - new_lows) / 50

  // ========== NIFTY FUTURE (12) ==========
  pub fut_price_vs_vwap: f64,
  pub fut_range_position: f64,
  pub fut_return_1m: f64,
  pub fut_return_5m: f64,
  pub fut_atr_percent: f64,
  pub fut_volume_zscore: f64,
  pub fut_oi_change: f64,
  pub fut_rsi_14: f64,
  pub fut_macd: f64,
  // NEW: 3 additional future features
  pub fut_return_15m: f64,    // 15-minute return
  pub fut_oi_change_pct: f64, // OI change percentage
  pub fut_macd_signal: f64,   // EMA(9) of MACD

  // ========== OPTIONS (14) ==========
  pub atm_iv: f64,
  pub atm_iv_change: f64,
  pub iv_skew: f64,
  pub gamma_atm: f64,
  pub vega_atm: f64,
  pub theta_atm: f64,
  pub pcr_oi: f64,
  pub pcr_volume: f64,
  pub max_pain_distance: f64,
  pub charm_atm: f64,
  pub vanna_atm: f64,
  // NEW: 3 additional options features
  pub iv_term_structure: f64,    // near_iv - next_iv
  pub total_gamma_exposure: f64, // sum(gamma * oi * spot^2) / 1e9
  pub iv_percentile_30d: f64,    // IV rank over 30 days

  // ========== VOLATILITY (6) ==========
  pub india_vix: f64,
  pub realized_vol_5m: f64,
  pub realized_vol_15m: f64,
  pub vol_expansion_ratio: f64,
  // NEW: 2 additional volatility features
  pub iv_rv_ratio: f64,        // atm_iv / realized_vol_15m
  pub vix_percentile_30d: f64, // VIX rank over 30 days

  // ========== ORDER FLOW (8) - from order_flow.rs ==========
  pub bid_ask_spread_bps: f64, // spread in basis points
  pub depth_imbalance_5: f64,  // bid/ask imbalance at 5 levels
  pub ofi_1s: f64,             // Order Flow Imbalance (1s)
  pub ofi_5s: f64,             // Order Flow Imbalance (5s)
  pub ofi_30s: f64,            // Order Flow Imbalance (30s)
  pub trade_imbalance: f64,    // buy/sell pressure
  pub bid_slope: f64,          // depth slope bid side
  pub ask_slope: f64,          // depth slope ask side

  // ========== TIME CONTEXT (6) ==========
  pub minutes_from_open: i32,
  pub minutes_to_close: i32,
  pub day_of_week: i32,
  // NEW: 3 additional time features
  pub is_expiry_day: i32,  // 1 if expiry, 0 otherwise
  pub days_to_expiry: i32, // trading days until nearest expiry
  pub session_phase: i32,  // 1=opening, 2=mid, 3=closing
}

/// Per-feature timing log
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct FeatureTimingLog {
  pub feature_name: String,
  pub duration_micros: i64, // Use i64 instead of u64 for NAPI compatibility
}

/// Complete computation result with features and timings (returned directly to Node.js)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct ComputeResult {
  pub features: FeatureOutput,
  pub timings: Vec<FeatureTimingLog>,
  pub total_duration_micros: i64, // Use i64 instead of u64 for NAPI compatibility
}

// ============================================
// TESTS
// ============================================

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_future_tick_creation() {
    let tick = FutureTick {
      ltp: 19500.0,
      open: 19450.0,
      high: 19550.0,
      low: 19400.0,
      close: 19500.0,
      volume: 1000000.0,
      open_interest: 5000000.0,
    };

    assert_eq!(tick.ltp, 19500.0);
    assert_eq!(tick.volume, 1000000.0);
  }

  #[test]
  fn test_constituent_tick_creation() {
    let tick = ConstituentTick {
      symbol: "RELIANCE".to_string(),
      ltp: 2500.0,
      open: 2480.0,
      volume: 500000.0,
    };

    assert_eq!(tick.symbol, "RELIANCE");
    assert_eq!(tick.ltp, 2500.0);
  }

  #[test]
  fn test_option_tick_creation() {
    let tick = OptionTick {
      strike: 19500.0,
      option_type: "CE".to_string(),
      ltp: 100.0,
      iv: 0.15,
      delta: 0.5,
      gamma: 0.001,
      vega: 50.0,
      theta: -10.0,
      open_interest: 100000.0,
      volume: 5000.0,
    };

    assert_eq!(tick.strike, 19500.0);
    assert_eq!(tick.option_type, "CE");
  }

  #[test]
  fn test_feature_output_has_54_fields() {
    let output = FeatureOutput {
      timestamp: 1234567890,

      // Index breadth (8)
      pct_stocks_above_vwap: 0.6,
      pct_stocks_above_ema20: 0.55,
      weighted_return_top10: 0.002,
      advance_decline_ratio: 1.5,
      breadth_momentum_5m: 0.001,
      breadth_volatility: 0.01,
      breadth_thrust: 0.65,
      new_highs_lows_ratio: 0.1,

      // NIFTY future (12)
      fut_price_vs_vwap: 0.001,
      fut_range_position: 0.7,
      fut_return_1m: 0.0005,
      fut_return_5m: 0.002,
      fut_atr_percent: 0.015,
      fut_volume_zscore: 1.2,
      fut_oi_change: 10000.0,
      fut_rsi_14: 55.0,
      fut_macd: 12.5,
      fut_return_15m: 0.005,
      fut_oi_change_pct: 0.02,
      fut_macd_signal: 10.0,

      // Options (14)
      atm_iv: 0.15,
      atm_iv_change: 0.01,
      iv_skew: -0.02,
      gamma_atm: 0.001,
      vega_atm: 50.0,
      theta_atm: -10.0,
      pcr_oi: 1.1,
      pcr_volume: 0.9,
      max_pain_distance: 50.0,
      charm_atm: -0.0001,
      vanna_atm: 0.002,
      iv_term_structure: 0.01,
      total_gamma_exposure: 50.0,
      iv_percentile_30d: 45.0,

      // Volatility (6)
      india_vix: 15.5,
      realized_vol_5m: 0.012,
      realized_vol_15m: 0.015,
      vol_expansion_ratio: 0.8,
      iv_rv_ratio: 1.2,
      vix_percentile_30d: 40.0,

      // Order flow (8)
      bid_ask_spread_bps: 5.0,
      depth_imbalance_5: 0.1,
      ofi_1s: 0.05,
      ofi_5s: 0.03,
      ofi_30s: 0.02,
      trade_imbalance: 0.1,
      bid_slope: 100.0,
      ask_slope: 95.0,

      // Time context (6)
      minutes_from_open: 120,
      minutes_to_close: 270,
      day_of_week: 2, // Wednesday
      is_expiry_day: 0,
      days_to_expiry: 3,
      session_phase: 2, // mid-session
    };

    // Verify struct compiles and has all 54 features
    assert!(output.timestamp > 0);

    // Count features: 8 + 12 + 14 + 6 + 8 + 6 = 54
    // (Not including timestamp as it's metadata)
  }
}
// ============================================
// JSON HELPERS (for testing/debugging only)
// ============================================
