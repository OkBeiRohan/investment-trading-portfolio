#![deny(clippy::all)]

// Parallel feature computation system
// Phase 1: Core infrastructure (types, trait, cache) - IN PROGRESS
// Phase 2: Shared dependencies (VWAP, EMA, ATR, RSI, Greeks)
// Phase 3: 33 feature implementations
// Phase 4: Parallel execution with Rayon

// New parallel feature system (Phase 1)
mod cache;
mod dependencies; // Phase 2: Shared dependency calculations
mod features;
mod types;

// Re-export new types for NAPI
pub use types::*;

use napi_derive::napi;

/// Initialize feature processor with historical cache
/// Phase 1: Returns initialization status
#[napi]
pub fn initialize_processor(lookback_periods: u32) -> String {
  format!(
    "Parallel feature processor initialized with {} lookback periods",
    lookback_periods
  )
}

/// Compute all features in parallel
/// Takes JSON string input, returns JSON string result
/// Phase 1: Placeholder (will implement in Phase 4)
#[napi]
pub fn compute_features(input_json: String) -> napi::Result<String> {
  // Phase 1: Just validate JSON can be parsed
  match types::FeatureInput::from_json(&input_json) {
    Ok(_input) => Ok(format!(
      "Phase 1 complete. Feature computation pending Phase 4. Input: {} bytes",
      input_json.len()
    )),
    Err(e) => Err(napi::Error::from_reason(format!(
      "Failed to parse input JSON: {}",
      e
    ))),
  }
}
