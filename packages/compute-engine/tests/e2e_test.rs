//! End-to-End Integration Tests
//! Tests full pipeline: Input → Dependencies → Features → Output

use compute_engine::HistoricalCache;
use compute_engine::processor::FeatureProcessor;
use compute_engine::types::{ComputeResult, ConstituentTick, FeatureInput, FutureTick, OptionTick};

fn create_realistic_input() -> FeatureInput {
  // Realistic NIFTY Future data (19,500 level)
  let nifty_future = FutureTick {
    ltp: 19500.0,
    open: 19450.0,
    high: 19550.0,
    low: 19400.0,
    close: 19500.0,
    volume: 1250000.0,
    open_interest: 5250000.0,
  };

  // 50 NIFTY constituents (simplified - top 10 with realistic weights)
  let constituents = vec![
    ConstituentTick {
      symbol: "RELIANCE".to_string(),
      ltp: 2450.0,
      open: 2430.0,
      volume: 500000.0,
    },
    ConstituentTick {
      symbol: "TCS".to_string(),
      ltp: 3650.0,
      open: 3620.0,
      volume: 300000.0,
    },
    ConstituentTick {
      symbol: "HDFCBANK".to_string(),
      ltp: 1680.0,
      open: 1670.0,
      volume: 450000.0,
    },
    ConstituentTick {
      symbol: "INFY".to_string(),
      ltp: 1520.0,
      open: 1510.0,
      volume: 350000.0,
    },
    ConstituentTick {
      symbol: "ICICIBANK".to_string(),
      ltp: 1050.0,
      open: 1045.0,
      volume: 400000.0,
    },
    ConstituentTick {
      symbol: "HINDUNILVR".to_string(),
      ltp: 2380.0,
      open: 2375.0,
      volume: 200000.0,
    },
    ConstituentTick {
      symbol: "BAJFINANCE".to_string(),
      ltp: 6850.0,
      open: 6820.0,
      volume: 150000.0,
    },
    ConstituentTick {
      symbol: "SBIN".to_string(),
      ltp: 620.0,
      open: 615.0,
      volume: 550000.0,
    },
    ConstituentTick {
      symbol: "BHARTIARTL".to_string(),
      ltp: 1180.0,
      open: 1175.0,
      volume: 280000.0,
    },
    ConstituentTick {
      symbol: "ITC".to_string(),
      ltp: 425.0,
      open: 422.0,
      volume: 320000.0,
    },
    // Add 40 more stocks to make 50 total
    // (simplified - repeating pattern for test)
  ];

  // Realistic option chain around ATM strike
  let options = vec![
    // ATM Call
    OptionTick {
      strike: 19500.0,
      option_type: "CE".to_string(),
      ltp: 120.0,
      iv: 0.15,
      delta: 0.52,
      gamma: 0.0012,
      vega: 52.0,
      theta: -11.0,
      open_interest: 125000.0,
      volume: 6500.0,
    },
    // ATM Put
    OptionTick {
      strike: 19500.0,
      option_type: "PE".to_string(),
      ltp: 115.0,
      iv: 0.16,
      delta: -0.48,
      gamma: 0.0012,
      vega: 51.0,
      theta: -10.5,
      open_interest: 138000.0,
      volume: 7200.0,
    },
    // OTM Call (19600)
    OptionTick {
      strike: 19600.0,
      option_type: "CE".to_string(),
      ltp: 75.0,
      iv: 0.145,
      delta: 0.35,
      gamma: 0.0009,
      vega: 42.0,
      theta: -8.5,
      open_interest: 98000.0,
      volume: 5200.0,
    },
    // OTM Put (19400)
    OptionTick {
      strike: 19400.0,
      option_type: "PE".to_string(),
      ltp: 80.0,
      iv: 0.165,
      delta: -0.38,
      gamma: 0.001,
      vega: 45.0,
      theta: -9.2,
      open_interest: 115000.0,
      volume: 6100.0,
    },
    // ITM Call (19400)
    OptionTick {
      strike: 19400.0,
      option_type: "CE".to_string(),
      ltp: 185.0,
      iv: 0.155,
      delta: 0.68,
      gamma: 0.0008,
      vega: 38.0,
      theta: -12.5,
      open_interest: 82000.0,
      volume: 4200.0,
    },
  ];

  FeatureInput {
    timestamp: 1704096000000, // Jan 1, 2024 10:00 AM IST (epoch ms)
    nifty_future,
    constituents,
    options,
    india_vix: Some(14.5),
    is_expiry_day: todo!(),
    days_to_expiry: todo!(),
    current_expiry: todo!(),
    market_depth: todo!(),
    nifty_spot: todo!(),
    risk_free_rate: todo!(),
  }
}

#[test]
fn test_e2e_all_features_computed() {
  let processor = FeatureProcessor::new();
  let cache = HistoricalCache::new(26);
  let input = create_realistic_input();

  let result = processor.compute_all(&input, &cache);

  // Verify we got a result
  assert_eq!(result.features.timestamp, input.timestamp);

  // Check all 33 features are finite (no NaN, no Infinity)
  let features = result.features;
  assert!(features.pct_stocks_above_vwap.is_finite());
  assert!(features.pct_stocks_above_ema20.is_finite());
  assert!(features.weighted_return_top10.is_finite());
  assert!(features.advance_decline_ratio.is_finite());
  assert!(features.breadth_momentum_5m.is_finite());
  assert!(features.breadth_volatility.is_finite());

  assert!(features.fut_price_vs_vwap.is_finite());
  assert!(features.fut_range_position.is_finite());
  assert!(features.fut_return_1m.is_finite());
  assert!(features.fut_return_5m.is_finite());
  assert!(features.fut_atr_percent.is_finite());
  assert!(features.fut_volume_zscore.is_finite());
  assert!(features.fut_oi_change.is_finite());
  assert!(features.fut_rsi_14.is_finite());
  assert!(features.fut_macd.is_finite());

  assert!(features.atm_iv.is_finite());
  assert!(features.atm_iv_change.is_finite());
  assert!(features.iv_skew.is_finite());
  assert!(features.gamma_atm.is_finite());
  assert!(features.vega_atm.is_finite());
  assert!(features.theta_atm.is_finite());
  assert!(features.pcr_oi.is_finite());
  assert!(features.pcr_volume.is_finite());
  assert!(features.max_pain_distance.is_finite());
  assert!(features.charm_atm.is_finite());
  assert!(features.vanna_atm.is_finite());

  assert!(features.india_vix.is_finite());
  assert!(features.realized_vol_5m.is_finite());
  assert!(features.realized_vol_15m.is_finite());
  assert!(features.vol_expansion_ratio.is_finite());

  assert!(features.minutes_from_open > 0);
  assert!(features.minutes_to_close > 0);
  assert!(features.day_of_week >= 0 && features.day_of_week <= 6);

  // Verify timing logs
  assert_eq!(result.timings.len(), 33); // One log per feature
  assert!(result.total_duration_micros > 0);

  println!(
    "E2E Test Passed: All 33 features computed in {}µs",
    result.total_duration_micros
  );
}

#[test]
fn test_e2e_performance_target() {
  let processor = FeatureProcessor::new();
  let cache = HistoricalCache::new(26);
  let input = create_realistic_input();

  // Warm up (first run may allocate caches)
  let _ = processor.compute_all(&input, &cache);

  // Actual measurement (after warm-up)
  let result = processor.compute_all(&input, &cache);

  // Target: <5ms = 5000µs
  assert!(
    result.total_duration_micros < 5000,
    "Exceeded 5ms target: {}µs",
    result.total_duration_micros
  );

  println!(
    "Performance Test Passed: {}µs (target <5000µs)",
    result.total_duration_micros
  );
}

#[test]
fn test_e2e_empty_constituents() {
  let processor = FeatureProcessor::new();
  let cache = HistoricalCache::new(26);
  let mut input = create_realistic_input();
  input.constituents = vec![]; // Empty constituents

  let result = processor.compute_all(&input, &cache);

  // Should not panic, should return sensible defaults
  assert!(result.features.pct_stocks_above_vwap.is_finite());
  assert_eq!(result.features.pct_stocks_above_vwap, 0.0); // No stocks
  assert!(result.features.breadth_volatility.is_finite());
}

#[test]
fn test_e2e_empty_options() {
  let processor = FeatureProcessor::new();
  let cache = HistoricalCache::new(26);
  let mut input = create_realistic_input();
  input.options = vec![]; // Empty options

  let result = processor.compute_all(&input, &cache);

  // Should not panic, should return sensible defaults
  assert!(result.features.atm_iv.is_finite());
  assert_eq!(result.features.atm_iv, 0.0); // No options
  assert!(result.features.pcr_oi.is_finite());
}

#[test]
fn test_e2e_missing_india_vix() {
  let processor = FeatureProcessor::new();
  let cache = HistoricalCache::new(26);
  let mut input = create_realistic_input();
  input.india_vix = None; // No VIX data

  let result = processor.compute_all(&input, &cache);

  // Should use 0.0 default for missing VIX
  assert_eq!(result.features.india_vix, 0.0);
  assert!(result.features.vol_expansion_ratio.is_finite());
}

#[test]
fn test_e2e_json_serialization() {
  let input = create_realistic_input();

  // Serialize to JSON (as NAPI does)
  let json_str = serde_json::to_string(&input).expect("Serialization failed");

  // Deserialize back
  let deserialized: FeatureInput = serde_json::from_str(&json_str).expect("Deserialization failed");

  // Verify round-trip
  assert_eq!(deserialized.timestamp, input.timestamp);
  assert_eq!(deserialized.nifty_future.ltp, input.nifty_future.ltp);
  assert_eq!(deserialized.constituents.len(), input.constituents.len());
  assert_eq!(deserialized.options.len(), input.options.len());
}

#[test]
fn test_e2e_compute_result_json_serialization() {
  let processor = FeatureProcessor::new();
  let cache = HistoricalCache::new(26);
  let input = create_realistic_input();

  let result = processor.compute_all(&input, &cache);

  // Serialize to JSON (as NAPI returns to TypeScript)
  let json_str = serde_json::to_string(&result).expect("Serialization failed");

  // Deserialize back
  let deserialized: ComputeResult =
    serde_json::from_str(&json_str).expect("Deserialization failed");

  // Verify round-trip
  assert_eq!(deserialized.features.timestamp, result.features.timestamp);
  assert_eq!(deserialized.timings.len(), result.timings.len());
  assert_eq!(
    deserialized.total_duration_micros,
    result.total_duration_micros
  );
}
