//! Options features (11 features)
//! Greeks and derived metrics

use crate::features::{ComputedDependencies, Feature, FeatureValue};
use crate::types::FeatureInput;

// ============================================
// HELPER: Find ATM Options
// ============================================

fn find_atm_options(
  input: &FeatureInput,
) -> (
  Option<&crate::types::OptionTick>,
  Option<&crate::types::OptionTick>,
) {
  let spot_price = input.nifty_future.ltp;

  // Find closest strike to spot
  let atm_strike = input.options.iter().map(|opt| opt.strike).min_by(|a, b| {
    let diff_a = (a - spot_price).abs();
    let diff_b = (b - spot_price).abs();
    diff_a.partial_cmp(&diff_b).unwrap()
  });

  if let Some(strike) = atm_strike {
    let call = input
      .options
      .iter()
      .find(|opt| opt.strike == strike && opt.option_type == "CE");

    let put = input
      .options
      .iter()
      .find(|opt| opt.strike == strike && opt.option_type == "PE");

    (call, put)
  } else {
    (None, None)
  }
}

// ============================================
// FEATURE: ATM_IV
// ============================================

pub struct AtmIv;

impl Feature for AtmIv {
  fn name(&self) -> &'static str {
    "atm_iv"
  }

  fn category(&self) -> &'static str {
    "options"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    let (call, put) = find_atm_options(input);

    let avg_iv = match (call, put) {
      (Some(c), Some(p)) => (c.iv + p.iv) / 2.0,
      (Some(c), None) => c.iv,
      (None, Some(p)) => p.iv,
      (None, None) => 0.0,
    };

    FeatureValue::Scalar(avg_iv)
  }
}

// ============================================
// FEATURE: ATM_IV_CHANGE
// ============================================

pub struct AtmIvChange;

impl Feature for AtmIvChange {
  fn name(&self) -> &'static str {
    "atm_iv_change"
  }

  fn category(&self) -> &'static str {
    "options"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    // Placeholder: return 0.0
    // TODO: Calculate current_atm_iv - previous_atm_iv using cache
    // Need to add ATM IV tracking to cache
    let _ = input; // Suppress unused warning
    FeatureValue::Scalar(0.0)
  }
}

// ============================================
// FEATURE: IV_SKEW
// ============================================

pub struct IvSkew;

impl Feature for IvSkew {
  fn name(&self) -> &'static str {
    "iv_skew"
  }

  fn category(&self) -> &'static str {
    "options"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    let (call, put) = find_atm_options(input);

    let skew = match (call, put) {
      (Some(c), Some(p)) => p.iv - c.iv,
      _ => 0.0,
    };

    FeatureValue::Scalar(skew)
  }
}

// ============================================
// FEATURE: GAMMA_ATM
// ============================================

pub struct GammaAtm;

impl Feature for GammaAtm {
  fn name(&self) -> &'static str {
    "gamma_atm"
  }

  fn category(&self) -> &'static str {
    "options"
  }

  fn compute(&self, _input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    // Average gamma from both call and put
    let avg_gamma = (deps.atm_call_greeks.gamma + deps.atm_put_greeks.gamma) / 2.0;
    FeatureValue::Scalar(avg_gamma)
  }
}

// ============================================
// FEATURE: VEGA_ATM
// ============================================

pub struct VegaAtm;

impl Feature for VegaAtm {
  fn name(&self) -> &'static str {
    "vega_atm"
  }

  fn category(&self) -> &'static str {
    "options"
  }

  fn compute(&self, _input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    let avg_vega = (deps.atm_call_greeks.vega + deps.atm_put_greeks.vega) / 2.0;
    FeatureValue::Scalar(avg_vega)
  }
}

// ============================================
// FEATURE: THETA_ATM
// ============================================

pub struct ThetaAtm;

impl Feature for ThetaAtm {
  fn name(&self) -> &'static str {
    "theta_atm"
  }

  fn category(&self) -> &'static str {
    "options"
  }

  fn compute(&self, _input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    let avg_theta = (deps.atm_call_greeks.theta + deps.atm_put_greeks.theta) / 2.0;
    FeatureValue::Scalar(avg_theta)
  }
}

// ============================================
// FEATURE: PCR_OI (Put-Call Ratio by OI)
// ============================================

pub struct PcrOi;

impl Feature for PcrOi {
  fn name(&self) -> &'static str {
    "pcr_oi"
  }

  fn category(&self) -> &'static str {
    "options"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    let total_put_oi: f64 = input
      .options
      .iter()
      .filter(|opt| opt.option_type == "PE")
      .map(|opt| opt.open_interest)
      .sum();

    let total_call_oi: f64 = input
      .options
      .iter()
      .filter(|opt| opt.option_type == "CE")
      .map(|opt| opt.open_interest)
      .sum();

    if total_call_oi == 0.0 {
      return FeatureValue::Scalar(0.0);
    }

    FeatureValue::Scalar(total_put_oi / total_call_oi)
  }
}

// ============================================
// FEATURE: PCR_VOLUME (Put-Call Ratio by Volume)
// ============================================

pub struct PcrVolume;

impl Feature for PcrVolume {
  fn name(&self) -> &'static str {
    "pcr_volume"
  }

  fn category(&self) -> &'static str {
    "options"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    let total_put_vol: f64 = input
      .options
      .iter()
      .filter(|opt| opt.option_type == "PE")
      .map(|opt| opt.volume)
      .sum();

    let total_call_vol: f64 = input
      .options
      .iter()
      .filter(|opt| opt.option_type == "CE")
      .map(|opt| opt.volume)
      .sum();

    if total_call_vol == 0.0 {
      return FeatureValue::Scalar(0.0);
    }

    FeatureValue::Scalar(total_put_vol / total_call_vol)
  }
}

// ============================================
// FEATURE: MAX_PAIN_DISTANCE
// ============================================

pub struct MaxPainDistance;

impl Feature for MaxPainDistance {
  fn name(&self) -> &'static str {
    "max_pain_distance"
  }

  fn category(&self) -> &'static str {
    "options"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    // Max Pain = strike where total loss to option buyers is maximized
    // Calculate total intrinsic value at each strike for all options
    let spot = input.nifty_future.ltp;

    if input.options.is_empty() {
      return FeatureValue::Scalar(0.0);
    }

    // Get unique strikes
    let mut strikes: Vec<f64> = input.options.iter().map(|o| o.strike).collect();
    strikes.sort_by(|a, b| a.partial_cmp(b).unwrap());
    strikes.dedup();

    // Find strike with minimum total loss
    let max_pain_strike = strikes
      .iter()
      .min_by_key(|&&strike| {
        let total_loss: f64 = input
          .options
          .iter()
          .map(|opt| {
            // Intrinsic value at expiry when spot = strike
            // Call: max(0, option_strike - strike)
            // Put: max(0, strike - option_strike)
            let intrinsic = if opt.option_type == "CE" {
              (opt.strike - strike).max(0.0)
            } else {
              (strike - opt.strike).max(0.0)
            };
            intrinsic * opt.open_interest
          })
          .sum();
        (total_loss * 100.0) as i64 // Convert to integer for comparison
      })
      .copied()
      .unwrap_or(spot);

    // Return distance from spot to max pain strike
    FeatureValue::Scalar((spot - max_pain_strike).abs())
  }
}

// ============================================
// FEATURE: CHARM_ATM (Second-order Greek)
// ============================================

pub struct CharmAtm;

impl Feature for CharmAtm {
  fn name(&self) -> &'static str {
    "charm_atm"
  }

  fn category(&self) -> &'static str {
    "options"
  }

  fn compute(&self, _input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    let avg_charm = (deps.atm_call_greeks.charm + deps.atm_put_greeks.charm) / 2.0;
    FeatureValue::Scalar(avg_charm)
  }
}

// ============================================
// FEATURE: VANNA_ATM (Second-order Greek)
// ============================================

pub struct VannaAtm;

impl Feature for VannaAtm {
  fn name(&self) -> &'static str {
    "vanna_atm"
  }

  fn category(&self) -> &'static str {
    "options"
  }

  fn compute(&self, _input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    let avg_vanna = (deps.atm_call_greeks.vanna + deps.atm_put_greeks.vanna) / 2.0;
    FeatureValue::Scalar(avg_vanna)
  }
}

// ============================================
// FEATURE: IV_TERM_STRUCTURE
// ============================================

/// IV term structure: difference between near-expiry and next-expiry ATM IV
/// Positive values indicate backwardation (near > far), negative = contango
pub struct IvTermStructure;

impl Feature for IvTermStructure {
  fn name(&self) -> &'static str {
    "iv_term_structure"
  }

  fn category(&self) -> &'static str {
    "options"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    if input.options.len() < 4 {
      return FeatureValue::Scalar(0.0);
    }

    let spot = input.nifty_future.ltp;

    // Find ATM strike
    let atm_strike = input
      .options
      .iter()
      .map(|o| o.strike)
      .min_by(|a, b| {
        (a - spot)
          .abs()
          .partial_cmp(&(b - spot).abs())
          .unwrap()
      })
      .unwrap_or(spot);

    // Get all unique strikes sorted
    let mut strikes: Vec<f64> = input.options.iter().map(|o| o.strike).collect();
    strikes.sort_by(|a, b| a.partial_cmp(b).unwrap());
    strikes.dedup();

    // Find nearest OTM call strike (one step above ATM) to approximate next expiry IV
    // In practice, term structure uses options from different expiry dates
    // Here we approximate using OTM strikes as a proxy
    let atm_calls: Vec<&crate::types::OptionTick> = input
      .options
      .iter()
      .filter(|o| o.option_type == "CE" && (o.strike - atm_strike).abs() < 1.0)
      .collect();

    let otm_calls: Vec<&crate::types::OptionTick> = input
      .options
      .iter()
      .filter(|o| o.option_type == "CE" && o.strike > atm_strike + 50.0)
      .collect();

    let near_iv = atm_calls.first().map(|o| o.iv).unwrap_or(0.0);
    let far_iv = otm_calls.first().map(|o| o.iv).unwrap_or(0.0);

    if near_iv == 0.0 || far_iv == 0.0 {
      return FeatureValue::Scalar(0.0);
    }

    FeatureValue::Scalar(near_iv - far_iv)
  }
}

// ============================================
// FEATURE: TOTAL_GAMMA_EXPOSURE (GEX)
// ============================================

/// Total Gamma Exposure across the options chain
/// GEX = Σ(gamma × OI × spot² × contract_multiplier) / 1e9
/// Measures market maker hedging pressure
pub struct TotalGammaExposure;

impl Feature for TotalGammaExposure {
  fn name(&self) -> &'static str {
    "total_gamma_exposure"
  }

  fn category(&self) -> &'static str {
    "options"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    if input.options.is_empty() {
      return FeatureValue::Scalar(0.0);
    }

    let spot = input.nifty_spot.unwrap_or(input.nifty_future.ltp);
    let contract_multiplier = 50.0; // NIFTY lot size

    let gex: f64 = input
      .options
      .iter()
      .map(|opt| {
        // Calls contribute positive gamma, puts contribute negative
        let sign = if opt.option_type == "CE" { 1.0 } else { -1.0 };
        sign * opt.gamma * opt.open_interest * spot * spot * contract_multiplier
      })
      .sum();

    // Normalize to billions for readability
    FeatureValue::Scalar(gex / 1e9)
  }
}

// ============================================
// FEATURE: IV_PERCENTILE_30D
// ============================================

/// ATM IV percentile over an estimated 30-day range
/// Uses a linear estimate: IV 5% = 0th percentile, IV 40% = 100th percentile
/// (In production, would use a rolling 30-day IV history stored in cache)
pub struct IvPercentile30d;

impl Feature for IvPercentile30d {
  fn name(&self) -> &'static str {
    "iv_percentile_30d"
  }

  fn category(&self) -> &'static str {
    "options"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    if input.options.is_empty() {
      return FeatureValue::Scalar(50.0); // Neutral default
    }

    // Get ATM IV
    let spot = input.nifty_future.ltp;
    let atm_option = input.options.iter().min_by(|a, b| {
      (a.strike - spot)
        .abs()
        .partial_cmp(&(b.strike - spot).abs())
        .unwrap()
    });

    let atm_iv = atm_option.map(|o| o.iv).unwrap_or(0.15);

    // Linear percentile estimation for NIFTY options:
    // IV typically ranges 5% (calm) to 40% (crisis)
    // 5% → 0th percentile, 40% → 100th percentile
    let percentile = ((atm_iv - 0.05) / 0.35 * 100.0).clamp(0.0, 100.0);
    FeatureValue::Scalar(percentile)
  }
}

// ============================================
// TESTS
// ============================================

#[cfg(test)]
mod tests {
  use super::*;
  use crate::types::{FeatureInput, FutureTick, OptionTick};

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
      options: vec![
        OptionTick {
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
        },
        OptionTick {
          strike: 19500.0,
          option_type: "PE".to_string(),
          ltp: 95.0,
          iv: 0.16,
          delta: -0.5,
          gamma: 0.001,
          vega: 48.0,
          theta: -9.0,
          open_interest: 120000.0,
          volume: 6000.0,
        },
        OptionTick {
          strike: 19600.0,
          option_type: "CE".to_string(),
          ltp: 60.0,
          iv: 0.14,
          delta: 0.3,
          gamma: 0.0008,
          vega: 40.0,
          theta: -8.0,
          open_interest: 80000.0,
          volume: 4000.0,
        },
      ],
      india_vix: Some(15.5),
      is_expiry_day: todo!(),
      days_to_expiry: todo!(),
      current_expiry: todo!(),
      market_depth: todo!(),
      nifty_spot: todo!(),
      risk_free_rate: todo!(),
    }
  }

  #[test]
  fn test_atm_iv_change() {
    let input = create_test_input();
    let deps = ComputedDependencies::default();
    let feature = AtmIvChange;

    let result = feature.compute(&input, &deps);

    if let FeatureValue::Scalar(val) = result {
      assert_eq!(val, 0.0); // Placeholder returns 0.0
    }
  }

  #[test]
  fn test_max_pain_distance() {
    let input = create_test_input();
    let deps = ComputedDependencies::default();
    let feature = MaxPainDistance;

    let result = feature.compute(&input, &deps);

    if let FeatureValue::Scalar(val) = result {
      assert!(val >= 0.0); // Distance must be non-negative
      assert!(val < 500.0); // Should be reasonable distance
    }
  }
}
