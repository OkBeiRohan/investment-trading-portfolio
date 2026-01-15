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
        let count_above = input.constituents
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
        let count_above = input.constituents
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
            .sum::<f64>() / 10.0;

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
        let advances = input.constituents
            .iter()
            .filter(|s| s.ltp > s.open)
            .count();

        let declines = input.constituents
            .iter()
            .filter(|s| s.ltp < s.open)
            .count();

        if declines == 0 {
            return FeatureValue::Scalar(advances as f64); // Avoid division by zero
        }

        let ratio = advances as f64 / declines as f64;
        FeatureValue::Scalar(ratio)
    }
}

// ============================================
// FEATURE: BREADTH_MOMENTUM_5M (STUB)
// ============================================

pub struct BreadthMomentum5m;

impl Feature for BreadthMomentum5m {
    fn name(&self) -> &'static str {
        "breadth_momentum_5m"
    }

    fn category(&self) -> &'static str {
        "index_breadth"
    }

    fn compute(&self, _input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
        // TODO: Requires historical advance/decline data (5-minute lookback)
        FeatureValue::Scalar(0.0)
    }
}

// ============================================
// FEATURE: BREADTH_VOLATILITY (STUB)
// ============================================

pub struct BreadthVolatility;

impl Feature for BreadthVolatility {
    fn name(&self) -> &'static str {
        "breadth_volatility"
    }

    fn category(&self) -> &'static str {
        "index_breadth"
    }

    fn compute(&self, _input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
        // TODO: Requires historical breadth data (standard deviation of advance/decline ratio)
        FeatureValue::Scalar(0.0)
    }
}
