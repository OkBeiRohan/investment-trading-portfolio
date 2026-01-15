//! Index breadth features (6 features)
//! Measures NIFTY 50 constituent behavior

use crate::features::{ComputedDependencies, Feature, FeatureValue};
use crate::types::FeatureInput;

// ============================================
// FEATURE: PCT_STOCKS_ABOVE_VWAP
// ============================================

pub struct PctStocksAboveVwap;

impl Feature for PctStocksAboveVwap {
  fn name(&self) -> &'static str {
    "pct_stocks_above_vwap"
  }

  fn category(&self) -> &'static str {
    "index_breadth"
  }

  fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    // Handle edge case: no constituents
    if input.constituents.is_empty() {
      return FeatureValue::Scalar(0.0);
    }

    let count_above = input
      .constituents
      .iter()
      .zip(&deps.constituent_vwaps)
      .filter(|(stock, vwap)| stock.ltp > **vwap)
      .count();

    let pct = count_above as f64 / input.constituents.len() as f64;
    FeatureValue::Scalar(pct)
  }
}

// ============================================
// FEATURE: PCT_STOCKS_ABOVE_EMA20
// ============================================

pub struct PctStocksAboveEma20;

impl Feature for PctStocksAboveEma20 {
  fn name(&self) -> &'static str {
    "pct_stocks_above_ema20"
  }

  fn category(&self) -> &'static str {
    "index_breadth"
  }

  fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    // Handle edge case: no constituents
    if input.constituents.is_empty() {
      return FeatureValue::Scalar(0.0);
    }

    let count_above = input
      .constituents
      .iter()
      .zip(&deps.constituent_ema20s)
      .filter(|(stock, ema)| stock.ltp > **ema)
      .count();

    let pct = count_above as f64 / input.constituents.len() as f64;
    FeatureValue::Scalar(pct)
  }
}

// ============================================
// FEATURE: WEIGHTED_RETURN_TOP10
// ============================================

pub struct WeightedReturnTop10;

impl Feature for WeightedReturnTop10 {
  fn name(&self) -> &'static str {
    "weighted_return_top10"
  }

  fn category(&self) -> &'static str {
    "index_breadth"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    // TODO: Implement weighted return calculation
    // Requires market cap weights (not available in current input)
    // For now, return equal-weighted average of top 10 by volume

    let mut stocks: Vec<_> = input.constituents.iter().collect();
    stocks.sort_by(|a, b| b.volume.partial_cmp(&a.volume).unwrap());

    let top10_return: f64 = stocks
      .iter()
      .take(10)
      .map(|s| (s.ltp - s.open) / s.open)
      .sum::<f64>()
      / 10.0;

    FeatureValue::Scalar(top10_return)
  }
}

// ============================================
// FEATURE: ADVANCE_DECLINE_RATIO
// ============================================

pub struct AdvanceDeclineRatio;

impl Feature for AdvanceDeclineRatio {
  fn name(&self) -> &'static str {
    "advance_decline_ratio"
  }

  fn category(&self) -> &'static str {
    "index_breadth"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    let advances = input.constituents.iter().filter(|s| s.ltp > s.open).count();

    let declines = input.constituents.iter().filter(|s| s.ltp < s.open).count();

    if declines == 0 {
      return FeatureValue::Scalar(advances as f64); // Avoid division by zero
    }

    let ratio = advances as f64 / declines as f64;
    FeatureValue::Scalar(ratio)
  }
}

// ============================================
// FEATURE: BREADTH_MOMENTUM_5M
// ============================================

pub struct BreadthMomentum5m;

impl Feature for BreadthMomentum5m {
  fn name(&self) -> &'static str {
    "breadth_momentum_5m"
  }

  fn category(&self) -> &'static str {
    "index_breadth"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    // Calculate mean intraday return across all constituents
    // Return = (current - open) / open
    if input.constituents.is_empty() {
      return FeatureValue::Scalar(0.0);
    }

    let total_return: f64 = input
      .constituents
      .iter()
      .map(|s| (s.ltp - s.open) / s.open)
      .sum();

    let mean_return = total_return / input.constituents.len() as f64;
    FeatureValue::Scalar(mean_return)
  }
}

// ============================================
// FEATURE: BREADTH_VOLATILITY
// ============================================

pub struct BreadthVolatility;

impl Feature for BreadthVolatility {
  fn name(&self) -> &'static str {
    "breadth_volatility"
  }

  fn category(&self) -> &'static str {
    "index_breadth"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    // Calculate standard deviation of intraday returns across constituents
    if input.constituents.len() < 2 {
      return FeatureValue::Scalar(0.0);
    }

    let returns: Vec<f64> = input
      .constituents
      .iter()
      .map(|s| (s.ltp - s.open) / s.open)
      .collect();

    let mean = returns.iter().sum::<f64>() / returns.len() as f64;
    let variance = returns.iter().map(|r| (r - mean).powi(2)).sum::<f64>() / returns.len() as f64;

    FeatureValue::Scalar(variance.sqrt())
  }
}

// ============================================
// TESTS
// ============================================

#[cfg(test)]
mod tests {
  use super::*;
  use crate::types::{ConstituentTick, FeatureInput, FutureTick};

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
      constituents: vec![
        ConstituentTick {
          symbol: "RELIANCE".to_string(),
          ltp: 2500.0,
          open: 2480.0,
          volume: 500000.0,
        },
        ConstituentTick {
          symbol: "TCS".to_string(),
          ltp: 3200.0,
          open: 3220.0,
          volume: 300000.0,
        },
        ConstituentTick {
          symbol: "INFY".to_string(),
          ltp: 1500.0,
          open: 1500.0,
          volume: 400000.0,
        },
      ],
      options: vec![],
      india_vix: Some(15.5),
    }
  }

  #[test]
  fn test_breadth_momentum_5m() {
    let input = create_test_input();
    let deps = ComputedDependencies::default();
    let feature = BreadthMomentum5m;

    let result = feature.compute(&input, &deps);

    // Expected: (2500-2480)/2480 + (3200-3220)/3220 + (1500-1500)/1500 = 0.008 - 0.006 + 0.0 = 0.002
    // Mean: 0.002 / 3 ≈ 0.00067
    if let FeatureValue::Scalar(val) = result {
      assert!(val > -0.01 && val < 0.01); // Reasonable range check
    }
  }

  #[test]
  fn test_breadth_volatility() {
    let input = create_test_input();
    let deps = ComputedDependencies::default();
    let feature = BreadthVolatility;

    let result = feature.compute(&input, &deps);

    if let FeatureValue::Scalar(val) = result {
      assert!(val >= 0.0); // Volatility must be non-negative
      assert!(val < 0.1); // Reasonable upper bound
    }
  }
}
