//! Options features (11 features)
//! Greeks and derived metrics

use crate::features::{ComputedDependencies, Feature, FeatureValue};
use crate::types::FeatureInput;

// ============================================
// HELPER: Find ATM Options
// ============================================

fn find_atm_options(input: &FeatureInput) -> (Option<&crate::types::OptionTick>, Option<&crate::types::OptionTick>) {
    let spot_price = input.nifty_future.ltp;

    // Find closest strike to spot
    let atm_strike = input.options
        .iter()
        .map(|opt| opt.strike)
        .min_by(|a, b| {
            let diff_a = (a - spot_price).abs();
            let diff_b = (b - spot_price).abs();
            diff_a.partial_cmp(&diff_b).unwrap()
        });

    if let Some(strike) = atm_strike {
        let call = input.options
            .iter()
            .find(|opt| opt.strike == strike && opt.option_type == "CE");

        let put = input.options
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
// FEATURE: ATM_IV_CHANGE (STUB)
// ============================================

pub struct AtmIvChange;

impl Feature for AtmIvChange {
    fn name(&self) -> &'static str {
        "atm_iv_change"
    }

    fn category(&self) -> &'static str {
        "options"
    }

    fn compute(&self, _input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
        // TODO: Requires previous ATM IV value
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
        let total_put_oi: f64 = input.options
            .iter()
            .filter(|opt| opt.option_type == "PE")
            .map(|opt| opt.open_interest)
            .sum();

        let total_call_oi: f64 = input.options
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
        let total_put_vol: f64 = input.options
            .iter()
            .filter(|opt| opt.option_type == "PE")
            .map(|opt| opt.volume)
            .sum();

        let total_call_vol: f64 = input.options
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
// FEATURE: MAX_PAIN_DISTANCE (STUB)
// ============================================

pub struct MaxPainDistance;

impl Feature for MaxPainDistance {
    fn name(&self) -> &'static str {
        "max_pain_distance"
    }

    fn category(&self) -> &'static str {
        "options"
    }

    fn compute(&self, _input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
        // TODO: Requires max pain calculation (complex OI-weighted calculation)
        FeatureValue::Scalar(0.0)
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
