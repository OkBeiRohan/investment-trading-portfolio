//! Feature computation trait and shared dependencies
//! All feature implementations must implement the Feature trait

use crate::types::{FeatureInput, FeatureTimingLog};
use std::time::Instant;

// ============================================
// SHARED COMPUTED DEPENDENCIES
// ============================================

/// Computed dependencies shared across features
/// These are calculated ONCE in Phase 2, then passed to all features
#[derive(Debug, Clone)]
pub struct ComputedDependencies {
  // VWAP calculations (computed from historical cache)
  pub nifty_future_vwap: f64,
  pub constituent_vwaps: Vec<f64>, // Indexed same as input.constituents

  // Moving averages
  pub nifty_future_ema20: f64,
  pub constituent_ema20s: Vec<f64>,

  // Volatility indicators
  pub nifty_future_atr: f64,
  pub nifty_future_rsi_14: f64,

  // Options Greeks aggregates
  pub atm_call_greeks: OptionGreeks,
  pub atm_put_greeks: OptionGreeks,

  // Volatility metrics
  pub realized_vol_5m: f64,
  pub realized_vol_15m: f64,
}

#[derive(Debug, Clone)]
pub struct OptionGreeks {
  pub delta: f64,
  pub gamma: f64,
  pub vega: f64,
  pub theta: f64,
  pub charm: f64, // Second-order Greek
  pub vanna: f64, // Second-order Greek
}

// ============================================
// FEATURE TRAIT
// ============================================

/// Trait that all feature implementations must implement
/// Allows modular addition of new features
pub trait Feature: Send + Sync {
  /// Unique identifier for this feature
  fn name(&self) -> &'static str;

  /// Category for organization (index_breadth, nifty_future, options, volatility, time_context)
  fn category(&self) -> &'static str;

  /// Compute the feature value
  /// Returns f64 for scalar features, Vec<f64> for multi-value features
  fn compute(&self, input: &FeatureInput, deps: &ComputedDependencies) -> FeatureValue;

  /// Compute with timing (default implementation)
  fn compute_timed(
    &self,
    input: &FeatureInput,
    deps: &ComputedDependencies,
  ) -> (FeatureValue, FeatureTimingLog) {
    let start = Instant::now();
    let value = self.compute(input, deps);
    let duration = start.elapsed();

    let log = FeatureTimingLog {
      feature_name: self.name().to_string(),
      duration_micros: duration.as_micros() as i64,
    };

    (value, log)
  }
}

/// Feature computation result (supports scalar and vector features)
#[derive(Debug, Clone)]
pub enum FeatureValue {
  Scalar(f64),
  Vector(Vec<f64>),
  Integer(i32),
}

impl FeatureValue {
  pub fn as_scalar(&self) -> f64 {
    match self {
      FeatureValue::Scalar(v) => *v,
      _ => panic!("Expected scalar feature value"),
    }
  }

  pub fn as_integer(&self) -> i32 {
    match self {
      FeatureValue::Integer(v) => *v,
      _ => panic!("Expected integer feature value"),
    }
  }
}

// ============================================
// FEATURE REGISTRY
// ============================================

/// Registry of all available features
pub struct FeatureRegistry {
  features: Vec<Box<dyn Feature>>,
}

impl FeatureRegistry {
  pub fn new() -> Self {
    Self {
      features: Vec::new(),
    }
  }

  /// Register a new feature
  pub fn register<F: Feature + 'static>(&mut self, feature: F) {
    self.features.push(Box::new(feature));
  }

  /// Get all registered features
  pub fn features(&self) -> &[Box<dyn Feature>] {
    &self.features
  }

  /// Get feature by name
  pub fn get_feature(&self, name: &str) -> Option<&Box<dyn Feature>> {
    self.features.iter().find(|f| f.name() == name)
  }

  /// Get features by category
  pub fn get_features_by_category(&self, category: &str) -> Vec<&Box<dyn Feature>> {
    self
      .features
      .iter()
      .filter(|f| f.category() == category)
      .collect()
  }
}

// ============================================
// MODULE EXPORTS
// ============================================

pub mod index_breadth;
pub mod nifty_future;
pub mod options;
pub mod time_context;
pub mod volatility;

// ============================================
// TESTS
// ============================================

#[cfg(test)]
mod tests {
  use super::*;
  use crate::types::{FeatureInput, FutureTick};

  struct DummyFeature;

  impl Feature for DummyFeature {
    fn name(&self) -> &'static str {
      "dummy_feature"
    }

    fn category(&self) -> &'static str {
      "test"
    }

    fn compute(&self, _input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
      FeatureValue::Scalar(42.0)
    }
  }

  #[test]
  fn test_feature_registry() {
    let mut registry = FeatureRegistry::new();
    registry.register(DummyFeature);

    assert_eq!(registry.features().len(), 1);

    let feature = registry.get_feature("dummy_feature").unwrap();
    assert_eq!(feature.name(), "dummy_feature");
    assert_eq!(feature.category(), "test");
  }

  #[test]
  fn test_feature_compute_timed() {
    let feature = DummyFeature;
    let input = FeatureInput {
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
    };

    let deps = ComputedDependencies {
      nifty_future_vwap: 19480.0,
      constituent_vwaps: vec![],
      nifty_future_ema20: 19470.0,
      constituent_ema20s: vec![],
      nifty_future_atr: 150.0,
      nifty_future_rsi_14: 55.0,
      atm_call_greeks: OptionGreeks {
        delta: 0.5,
        gamma: 0.001,
        vega: 50.0,
        theta: -10.0,
        charm: -0.0001,
        vanna: 0.002,
      },
      atm_put_greeks: OptionGreeks {
        delta: -0.5,
        gamma: 0.001,
        vega: 50.0,
        theta: -10.0,
        charm: -0.0001,
        vanna: 0.002,
      },
      realized_vol_5m: 0.012,
      realized_vol_15m: 0.015,
    };

    let (value, log) = feature.compute_timed(&input, &deps);

    assert_eq!(value.as_scalar(), 42.0);
    assert_eq!(log.feature_name, "dummy_feature");
    // Duration may be 0 for very fast operations
    assert!(log.duration_micros >= 0);
  }
}
