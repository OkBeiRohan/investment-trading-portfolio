//! NIFTY Future features (9 features)
//! Technical indicators and price action

use crate::features::{ComputedDependencies, Feature, FeatureValue};
use crate::types::FeatureInput;

// ============================================
// FEATURE: FUT_PRICE_VS_VWAP
// ============================================

pub struct FutPriceVsVwap;

impl Feature for FutPriceVsVwap {
  fn name(&self) -> &'static str {
    "fut_price_vs_vwap"
  }

  fn category(&self) -> &'static str {
    "nifty_future"
  }

  fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    // Handle edge case: no VWAP data (cache empty)
    if deps.nifty_future_vwap == 0.0 || !deps.nifty_future_vwap.is_finite() {
      return FeatureValue::Scalar(0.0);
    }

    let deviation = (input.nifty_future.ltp - deps.nifty_future_vwap) / deps.nifty_future_vwap;
    FeatureValue::Scalar(deviation)
  }
}

// ============================================
// FEATURE: FUT_RANGE_POSITION
// ============================================

pub struct FutRangePosition;

impl Feature for FutRangePosition {
  fn name(&self) -> &'static str {
    "fut_range_position"
  }

  fn category(&self) -> &'static str {
    "nifty_future"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    let range = input.nifty_future.high - input.nifty_future.low;

    if range == 0.0 {
      return FeatureValue::Scalar(0.5); // Neutral if no range
    }

    let position = (input.nifty_future.ltp - input.nifty_future.low) / range;
    FeatureValue::Scalar(position)
  }
}

// ============================================
// FEATURE: FUT_RETURN_1M
// ============================================

pub struct FutReturn1m;

impl Feature for FutReturn1m {
  fn name(&self) -> &'static str {
    "fut_return_1m"
  }

  fn category(&self) -> &'static str {
    "nifty_future"
  }

  fn compute(&self, _input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    FeatureValue::Scalar(deps.nifty_future_return_1m)
  }
}

// ============================================
// FEATURE: FUT_RETURN_5M
// ============================================

pub struct FutReturn5m;

impl Feature for FutReturn5m {
  fn name(&self) -> &'static str {
    "fut_return_5m"
  }

  fn category(&self) -> &'static str {
    "nifty_future"
  }

  fn compute(&self, _input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    FeatureValue::Scalar(deps.nifty_future_return_5m)
  }
}

// ============================================
// FEATURE: FUT_ATR_PERCENT
// ============================================

pub struct FutAtrPercent;

impl Feature for FutAtrPercent {
  fn name(&self) -> &'static str {
    "fut_atr_percent"
  }

  fn category(&self) -> &'static str {
    "nifty_future"
  }

  fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    let atr_pct = deps.nifty_future_atr / input.nifty_future.ltp;
    FeatureValue::Scalar(atr_pct)
  }
}

// ============================================
// FEATURE: FUT_VOLUME_ZSCORE
// ============================================

pub struct FutVolumeZscore;

impl Feature for FutVolumeZscore {
  fn name(&self) -> &'static str {
    "fut_volume_zscore"
  }

  fn category(&self) -> &'static str {
    "nifty_future"
  }

  fn compute(&self, _input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    FeatureValue::Scalar(deps.nifty_future_volume_zscore)
  }
}

// ============================================
// FEATURE: FUT_OI_CHANGE
// ============================================

pub struct FutOiChange;

impl Feature for FutOiChange {
  fn name(&self) -> &'static str {
    "fut_oi_change"
  }

  fn category(&self) -> &'static str {
    "nifty_future"
  }

  fn compute(&self, _input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    FeatureValue::Scalar(deps.nifty_future_oi_change)
  }
}

// ============================================
// FEATURE: FUT_RSI_14
// ============================================

pub struct FutRsi14;

impl Feature for FutRsi14 {
  fn name(&self) -> &'static str {
    "fut_rsi_14"
  }

  fn category(&self) -> &'static str {
    "nifty_future"
  }

  fn compute(&self, _input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    FeatureValue::Scalar(deps.nifty_future_rsi_14)
  }
}

// ============================================
// FEATURE: FUT_MACD
// ============================================

pub struct FutMacd;

impl Feature for FutMacd {
  fn name(&self) -> &'static str {
    "fut_macd"
  }

  fn category(&self) -> &'static str {
    "nifty_future"
  }

  fn compute(&self, _input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    // MACD = EMA12 - EMA26
    let macd = deps.nifty_future_ema12 - deps.nifty_future_ema26;
    FeatureValue::Scalar(macd)
  }
}

// ============================================
// FEATURE: FUT_RETURN_15M
// ============================================

pub struct FutReturn15m;

impl Feature for FutReturn15m {
  fn name(&self) -> &'static str {
    "fut_return_15m"
  }

  fn category(&self) -> &'static str {
    "nifty_future"
  }

  fn compute(&self, _input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    // Proper 15-period lookback from cache
    FeatureValue::Scalar(deps.nifty_future_return_15m)
  }
}

// ============================================
// FEATURE: FUT_OI_CHANGE_PCT
// ============================================

pub struct FutOiChangePct;

impl Feature for FutOiChangePct {
  fn name(&self) -> &'static str {
    "fut_oi_change_pct"
  }

  fn category(&self) -> &'static str {
    "nifty_future"
  }

  fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    // OI change percentage = (current_oi - prev_oi) / prev_oi
    // prev_oi = current_oi - oi_change
    let prev_oi = input.nifty_future.open_interest - deps.nifty_future_oi_change;
    if prev_oi <= 0.0 {
      return FeatureValue::Scalar(0.0);
    }
    let pct_change = deps.nifty_future_oi_change / prev_oi;
    FeatureValue::Scalar(pct_change)
  }
}

// ============================================
// FEATURE: FUT_MACD_SIGNAL
// ============================================

pub struct FutMacdSignal;

impl Feature for FutMacdSignal {
  fn name(&self) -> &'static str {
    "fut_macd_signal"
  }

  fn category(&self) -> &'static str {
    "nifty_future"
  }

  fn compute(&self, _input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    // MACD Signal = EMA(9) of MACD line, computed from full price history in cache
    FeatureValue::Scalar(deps.nifty_future_macd_signal)
  }
}

// ============================================
// TESTS
// ============================================

#[cfg(test)]
mod tests {
  use super::*;
  use crate::types::{FeatureInput, FutureTick};

  fn create_test_input() -> FeatureInput {
    FeatureInput {
      timestamp: 1234567890,
      nifty_future: FutureTick {
        ltp: 19500.0,
        open: 19450.0,
        high: 19550.0,
        low: 19400.0,
        close: 19500.0,
        volume: 1000000.0,
        open_interest: 5000000.0,
      },
      constituents: vec![],
      options: vec![],
      india_vix: Some(15.5),
      is_expiry_day: Some(false),
      days_to_expiry: Some(3),
      current_expiry: None,
      market_depth: None,
      nifty_spot: Some(19480.0),
      risk_free_rate: Some(0.07),
    }
  }

  #[test]
  fn test_fut_return_1m() {
    let input = create_test_input();
    let mut deps = ComputedDependencies::default();
    deps.nifty_future_return_1m = 0.00257; // 1-minute return from cache
    let feature = FutReturn1m;

    let result = feature.compute(&input, &deps);

    if let FeatureValue::Scalar(val) = result {
      assert!((val - 0.00257).abs() < 0.0001);
    }
  }

  #[test]
  fn test_fut_return_5m() {
    let input = create_test_input();
    let mut deps = ComputedDependencies::default();
    deps.nifty_future_return_5m = 0.00512; // 5-minute return from cache
    let feature = FutReturn5m;

    let result = feature.compute(&input, &deps);

    if let FeatureValue::Scalar(val) = result {
      assert!((val - 0.00512).abs() < 0.0001);
    }
  }

  #[test]
  fn test_fut_volume_zscore() {
    let input = create_test_input();
    let deps = ComputedDependencies::default();
    let feature = FutVolumeZscore;

    let result = feature.compute(&input, &deps);

    if let FeatureValue::Scalar(val) = result {
      assert!(val.is_finite()); // Should not be NaN or infinity
    }
  }

  #[test]
  fn test_fut_oi_change() {
    let input = create_test_input();
    let mut deps = ComputedDependencies::default();
    deps.nifty_future_oi_change = 10000.0; // OI change from cache
    let feature = FutOiChange;

    let result = feature.compute(&input, &deps);

    if let FeatureValue::Scalar(val) = result {
      assert!((val - 10000.0).abs() < 0.01);
    }
  }
}
