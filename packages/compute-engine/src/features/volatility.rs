//! Volatility features (4 features)
//! Realized and implied volatility metrics

use crate::features::{ComputedDependencies, Feature, FeatureValue};
use crate::types::FeatureInput;

// ============================================
// FEATURE: INDIA_VIX
// ============================================

pub struct IndiaVix;

impl Feature for IndiaVix {
  fn name(&self) -> &'static str {
    "india_vix"
  }

  fn category(&self) -> &'static str {
    "volatility"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    FeatureValue::Scalar(input.india_vix.unwrap_or(0.0))
  }
}

// ============================================
// FEATURE: REALIZED_VOL_5M
// ============================================

pub struct RealizedVol5m;

impl Feature for RealizedVol5m {
  fn name(&self) -> &'static str {
    "realized_vol_5m"
  }

  fn category(&self) -> &'static str {
    "volatility"
  }

  fn compute(&self, _input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    FeatureValue::Scalar(deps.realized_vol_5m)
  }
}

// ============================================
// FEATURE: REALIZED_VOL_15M
// ============================================

pub struct RealizedVol15m;

impl Feature for RealizedVol15m {
  fn name(&self) -> &'static str {
    "realized_vol_15m"
  }

  fn category(&self) -> &'static str {
    "volatility"
  }

  fn compute(&self, _input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    FeatureValue::Scalar(deps.realized_vol_15m)
  }
}

// ============================================
// FEATURE: VOL_EXPANSION_RATIO
// ============================================

pub struct VolExpansionRatio;

impl Feature for VolExpansionRatio {
  fn name(&self) -> &'static str {
    "vol_expansion_ratio"
  }

  fn category(&self) -> &'static str {
    "volatility"
  }

  fn compute(&self, _input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    if deps.realized_vol_15m == 0.0 {
      return FeatureValue::Scalar(1.0);
    }

    let ratio = deps.realized_vol_5m / deps.realized_vol_15m;
    FeatureValue::Scalar(ratio)
  }
}

// ============================================
// FEATURE: IV_RV_RATIO
// ============================================

/// Implied Volatility to Realized Volatility ratio
/// Values > 1 indicate IV premium, < 1 indicate discount
pub struct IvRvRatio;

impl Feature for IvRvRatio {
  fn name(&self) -> &'static str {
    "iv_rv_ratio"
  }

  fn category(&self) -> &'static str {
    "volatility"
  }

  fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue {
    // Get ATM IV from options if available
    let atm_iv = if !input.options.is_empty() {
      let spot = input.nifty_future.ltp;
      let atm_option = input.options.iter().min_by(|a, b| {
        (a.strike - spot)
          .abs()
          .partial_cmp(&(b.strike - spot).abs())
          .unwrap()
      });
      atm_option.map(|o| o.iv).unwrap_or(0.15)
    } else {
      0.15
    };

    if deps.realized_vol_15m <= 0.0 {
      return FeatureValue::Scalar(1.0);
    }

    let ratio = atm_iv / deps.realized_vol_15m;
    FeatureValue::Scalar(ratio)
  }
}

// ============================================
// FEATURE: VIX_PERCENTILE_30D
// ============================================

/// VIX percentile over 30-day window
pub struct VixPercentile30d;

impl Feature for VixPercentile30d {
  fn name(&self) -> &'static str {
    "vix_percentile_30d"
  }

  fn category(&self) -> &'static str {
    "volatility"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    let vix = input.india_vix.unwrap_or(15.0);
    // Simple percentile estimation: VIX 10 = 0%, VIX 35 = 100%
    let percentile = ((vix - 10.0) / 25.0 * 100.0).clamp(0.0, 100.0);
    FeatureValue::Scalar(percentile)
  }
}
