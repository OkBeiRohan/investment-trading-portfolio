#![deny(clippy::all)]

// Parallel feature computation system
// Phase 1: Core infrastructure (types, trait, cache) - IN PROGRESS
// Phase 2: Shared dependencies (VWAP, EMA, ATR, RSI, Greeks)
// Phase 3: 33 feature implementations
// Phase 4: Parallel execution with Rayon

// New parallel feature system (Phase 1)
mod cache;
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
/// Phase 1: Placeholder (will implement in Phase 4)
#[napi]
pub fn compute_features(input: String) -> String {
  format!(
    "Phase 1 complete. Feature computation pending Phase 4. Input: {} bytes",
    input.len()
  )
}
