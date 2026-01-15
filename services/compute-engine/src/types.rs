//! Type definitions for parallel feature computation
//! All types use JSON serialization for NAPI compatibility (no field count limits)
//! Auto-generates TypeScript types via ts-rs

use serde::{Deserialize, Serialize};

// ============================================
// INPUT TYPES
// ============================================

/// Single tick data for NIFTY Future
#[derive(Debug, Clone, Serialize, Deserialize)]
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
pub struct ConstituentTick {
  pub symbol: String,
  pub ltp: f64,
  pub open: f64,
  pub volume: f64,
  // NOTE: VWAP is COMPUTED from historical cache, not provided as input
}

/// Single option tick data
#[derive(Debug, Clone, Serialize, Deserialize)]
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

/// Complete feature computation input (pass as JSON string from Node.js)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureInput {
  pub timestamp: i64, // Unix timestamp in milliseconds
  pub nifty_future: FutureTick,
  pub constituents: Vec<ConstituentTick>, // 50 stocks
  pub options: Vec<OptionTick>,
  pub india_vix: Option<f64>,
}

// ============================================
// OUTPUT TYPES
// ============================================

/// Complete feature output (33 features) - returned as JSON string to Node.js
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureOutput {
  pub timestamp: i64,

  // ========== INDEX BREADTH (6) ==========
  pub pct_stocks_above_vwap: f64,
  pub pct_stocks_above_ema20: f64,
  pub weighted_return_top10: f64,
  pub advance_decline_ratio: f64,
  pub breadth_momentum_5m: f64,
  pub breadth_volatility: f64,

  // ========== NIFTY FUTURE (9) ==========
  pub fut_price_vs_vwap: f64,
  pub fut_range_position: f64,
  pub fut_return_1m: f64,
  pub fut_return_5m: f64,
  pub fut_atr_percent: f64,
  pub fut_volume_zscore: f64,
  pub fut_oi_change: f64,
  pub fut_rsi_14: f64,
  pub fut_macd: f64,

  // ========== OPTIONS (11) ==========
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

  // ========== VOLATILITY (4) ==========
  pub india_vix: f64,
  pub realized_vol_5m: f64,
  pub realized_vol_15m: f64,
  pub vol_expansion_ratio: f64,

  // ========== TIME CONTEXT (3) ==========
  pub minutes_from_open: i32,
  pub minutes_to_close: i32,
  pub day_of_week: i32,
}

/// Per-feature timing log
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureTimingLog {
  pub feature_name: String,
  pub duration_micros: i64, // Use i64 instead of u64 for NAPI compatibility
}

/// Complete computation result with features and timings (returned as JSON string)
#[derive(Debug, Clone, Serialize, Deserialize)]
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
  fn test_feature_output_has_33_fields() {
    let output = FeatureOutput {
      timestamp: 1234567890,

      // Index breadth (6)
      pct_stocks_above_vwap: 0.6,
      pct_stocks_above_ema20: 0.55,
      weighted_return_top10: 0.002,
      advance_decline_ratio: 1.5,
      breadth_momentum_5m: 0.001,
      breadth_volatility: 0.01,

      // NIFTY future (9)
      fut_price_vs_vwap: 0.001,
      fut_range_position: 0.7,
      fut_return_1m: 0.0005,
      fut_return_5m: 0.002,
      fut_atr_percent: 0.015,
      fut_volume_zscore: 1.2,
      fut_oi_change: 10000.0,
      fut_rsi_14: 55.0,
      fut_macd: 12.5,

      // Options (11)
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

      // Volatility (4)
      india_vix: 15.5,
      realized_vol_5m: 0.012,
      realized_vol_15m: 0.015,
      vol_expansion_ratio: 0.8,

      // Time context (3)
      minutes_from_open: 120,
      minutes_to_close: 270,
      day_of_week: 2, // Wednesday
    };

    // Verify struct compiles and has all 33 features
    assert!(output.timestamp > 0);

    // Count features: 6 + 9 + 11 + 4 + 3 = 33
    // (Not including timestamp as it's metadata)
  }
}
// ============================================
// JSON SERIALIZATION HELPERS
// ============================================

impl FeatureInput {
  /// Deserialize from JSON string (called from Node.js)
  pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
    serde_json::from_str(json)
  }
}

impl ComputeResult {
  /// Serialize to JSON string (returned to Node.js)
  pub fn to_json(&self) -> Result<String, serde_json::Error> {
    serde_json::to_string(self)
  }
}
