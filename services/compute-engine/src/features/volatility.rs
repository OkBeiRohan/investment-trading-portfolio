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
