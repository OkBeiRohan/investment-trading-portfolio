#![deny(clippy::all)]

// Parallel feature computation system
// Phase 1: Core infrastructure (types, trait, cache) - COMPLETE
// Phase 2: Shared dependencies (VWAP, EMA, ATR, RSI, Greeks) - COMPLETE
// Phase 3: 33 feature implementations - COMPLETE
// Phase 4: Parallel execution with Rayon - IN PROGRESS

// Feature computation system
mod cache;
mod dependencies;
mod features;
pub mod processor; // Public for integration tests
mod types;

// Re-export public types
pub use cache::{HistoricalCache, OhlcTick, PriceVolumeTick};
pub use processor::FeatureProcessor;
pub use types::*;

use napi_derive::napi;
use once_cell::sync::Lazy;
use std::sync::Mutex;

// Global instances for processor and cache
static PROCESSOR: Lazy<FeatureProcessor> = Lazy::new(|| FeatureProcessor::new());
static CACHE: Lazy<Mutex<HistoricalCache>> = Lazy::new(|| Mutex::new(HistoricalCache::new(26)));

/// Compute all 33 features in parallel
///
/// # Performance
/// - Phase 1 (dependencies): ~2ms sequential
/// - Phase 2 (parallel features): ~150µs with Rayon
/// - Total target: <5ms
///
/// # Input
/// FeatureInput object (zero-copy from TypeScript)
///
/// # Output
/// ComputeResult object (zero-copy to TypeScript)
#[napi]
pub fn compute_features(input: FeatureInput) -> napi::Result<ComputeResult> {

  // Update cache (thread-safe)
  {
    let mut cache = CACHE
      .lock()
      .map_err(|e| napi::Error::from_reason(format!("Failed to acquire cache lock: {}", e)))?;

    // Convert FutureTick to cache types
    let pv_tick = cache::PriceVolumeTick {
      timestamp: input.timestamp,
      price: input.nifty_future.ltp,
      volume: input.nifty_future.volume,
    };

    let ohlc_tick = cache::OhlcTick {
      timestamp: input.timestamp,
      open: input.nifty_future.open,
      high: input.nifty_future.high,
      low: input.nifty_future.low,
      close: input.nifty_future.close,
    };

    cache.add_nifty_future_tick(pv_tick, ohlc_tick);

    // Convert ConstituentTick to cache types
    for constituent in &input.constituents {
      let pv_tick = cache::PriceVolumeTick {
        timestamp: input.timestamp,
        price: constituent.ltp,
        volume: constituent.volume,
      };
      cache.add_constituent_tick(constituent.symbol.clone(), pv_tick);
    }
  }

  // Compute all features in parallel
  let cache = CACHE
    .lock()
    .map_err(|e| napi::Error::from_reason(format!("Failed to acquire cache lock: {}", e)))?;

  let start = std::time::Instant::now();
  let result = PROCESSOR.compute_all(&input, &cache);
  let _duration = start.elapsed(); // Already measured in processor

  // Return result directly (zero-copy)
  Ok(result)
}
