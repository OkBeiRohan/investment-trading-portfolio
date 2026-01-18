use rayon::prelude::*;

use crate::cache::HistoricalCache;
use crate::dependencies::*;
use crate::features::*;
use crate::types::{ComputeResult, FeatureInput, FeatureOutput, FeatureTimingLog};

/// Central feature processor that coordinates parallel computation of all 54 features
pub struct FeatureProcessor {
  features: Vec<Box<dyn Feature>>,
}

impl FeatureProcessor {
  /// Create new processor with all 54 features registered
  pub fn new() -> Self {
    let features: Vec<Box<dyn Feature>> = vec![
      // Index Breadth Features (8)
      Box::new(PctStocksAboveVwap),
      Box::new(PctStocksAboveEma20),
      Box::new(WeightedReturnTop10),
      Box::new(AdvanceDeclineRatio),
      Box::new(BreadthMomentum5m),
      Box::new(BreadthVolatility),
      Box::new(BreadthThrust),
      Box::new(NewHighsLowsRatio),
      // NIFTY Future Features (12)
      Box::new(FutPriceVsVwap),
      Box::new(FutRangePosition),
      Box::new(FutReturn1m),
      Box::new(FutReturn5m),
      Box::new(FutAtrPercent),
      Box::new(FutVolumeZscore),
      Box::new(FutOiChange),
      Box::new(FutRsi14),
      Box::new(FutMacd),
      Box::new(FutReturn15m),
      Box::new(FutOiChangePct),
      Box::new(FutMacdSignal),
      // Options Features (14)
      Box::new(AtmIv),
      Box::new(AtmIvChange),
      Box::new(IvSkew),
      Box::new(GammaAtm),
      Box::new(VegaAtm),
      Box::new(ThetaAtm),
      Box::new(PcrOi),
      Box::new(PcrVolume),
      Box::new(MaxPainDistance),
      Box::new(CharmAtm),
      Box::new(VannaAtm),
      // TODO: Add these options features when implemented
      // Box::new(IvTermStructure),
      // Box::new(TotalGammaExposure),
      // Box::new(IvPercentile30d),
      // Volatility Features (6)
      Box::new(IndiaVix),
      Box::new(RealizedVol5m),
      Box::new(RealizedVol15m),
      Box::new(VolExpansionRatio),
      Box::new(IvRvRatio),
      Box::new(VixPercentile30d),
      // Order Flow Features (8) - returns 0 for Historical mode
      // Order flow computed inline since they rely on market depth
      // Time Context Features (6)
      Box::new(MinutesFromOpen),
      Box::new(MinutesToClose),
      Box::new(DayOfWeek),
      Box::new(IsExpiryDay),
      Box::new(DaysToExpiry),
      Box::new(SessionPhase),
    ];

    Self { features }
  }

  /// Compute all features in parallel
  ///
  /// # Performance
  /// - Phase 1 (dependencies): ~2ms sequential
  /// - Phase 2 (features): ~150µs parallel with Rayon
  /// - Total target: <5ms
  pub fn compute_all(&self, input: &FeatureInput, cache: &HistoricalCache) -> ComputeResult {
    let total_start = std::time::Instant::now();

    // Phase 1: Compute shared dependencies (sequential)
    let deps = compute_all_dependencies(input, cache);

    // Phase 2: Compute all features in parallel with timing
    let feature_results: Vec<(String, FeatureValue, i64)> = self
      .features
      .par_iter()
      .map(|feature| {
        let start = std::time::Instant::now();
        let name = feature.name().to_string();
        let value = feature.compute(input, &deps);
        let duration_micros = start.elapsed().as_micros() as i64;
        (name, value, duration_micros)
      })
      .collect();

    // Build FeatureOutput with default values
    let mut output = FeatureOutput {
      timestamp: input.timestamp,
      // Index breadth (8)
      pct_stocks_above_vwap: 0.0,
      pct_stocks_above_ema20: 0.0,
      weighted_return_top10: 0.0,
      advance_decline_ratio: 0.0,
      breadth_momentum_5m: 0.0,
      breadth_volatility: 0.0,
      breadth_thrust: 0.0,
      new_highs_lows_ratio: 0.0,
      // NIFTY future (12)
      fut_price_vs_vwap: 0.0,
      fut_range_position: 0.0,
      fut_return_1m: 0.0,
      fut_return_5m: 0.0,
      fut_atr_percent: 0.0,
      fut_volume_zscore: 0.0,
      fut_oi_change: 0.0,
      fut_rsi_14: 0.0,
      fut_macd: 0.0,
      fut_return_15m: 0.0,
      fut_oi_change_pct: 0.0,
      fut_macd_signal: 0.0,
      // Options (14)
      atm_iv: 0.0,
      atm_iv_change: 0.0,
      iv_skew: 0.0,
      gamma_atm: 0.0,
      vega_atm: 0.0,
      theta_atm: 0.0,
      pcr_oi: 0.0,
      pcr_volume: 0.0,
      max_pain_distance: 0.0,
      charm_atm: 0.0,
      vanna_atm: 0.0,
      iv_term_structure: 0.0,
      total_gamma_exposure: 0.0,
      iv_percentile_30d: 0.0,
      // Volatility (6)
      india_vix: input.india_vix.unwrap_or(0.0),
      realized_vol_5m: 0.0,
      realized_vol_15m: 0.0,
      vol_expansion_ratio: 0.0,
      iv_rv_ratio: 0.0,
      vix_percentile_30d: 0.0,
      // Order flow (8) - live mode only, default to 0
      bid_ask_spread_bps: 0.0,
      depth_imbalance_5: 0.0,
      ofi_1s: 0.0,
      ofi_5s: 0.0,
      ofi_30s: 0.0,
      trade_imbalance: 0.0,
      bid_slope: 0.0,
      ask_slope: 0.0,
      // Time context (6)
      minutes_from_open: 0,
      minutes_to_close: 0,
      day_of_week: 0,
      is_expiry_day: input
        .is_expiry_day
        .map(|v| if v { 1 } else { 0 })
        .unwrap_or(0),
      days_to_expiry: input.days_to_expiry.unwrap_or(0),
      session_phase: 2,
    };

    let mut timings = Vec::new();

    // Populate output from feature results
    for (name, value, duration_micros) in feature_results {
      timings.push(FeatureTimingLog {
        feature_name: name.clone(),
        duration_micros,
      });

      match value {
        FeatureValue::Scalar(val) => match name.as_str() {
          // Index Breadth (8)
          "pct_stocks_above_vwap" => output.pct_stocks_above_vwap = val,
          "pct_stocks_above_ema20" => output.pct_stocks_above_ema20 = val,
          "weighted_return_top10" => output.weighted_return_top10 = val,
          "advance_decline_ratio" => output.advance_decline_ratio = val,
          "breadth_momentum_5m" => output.breadth_momentum_5m = val,
          "breadth_volatility" => output.breadth_volatility = val,
          "breadth_thrust" => output.breadth_thrust = val,
          "new_highs_lows_ratio" => output.new_highs_lows_ratio = val,
          // NIFTY Future (12)
          "fut_price_vs_vwap" => output.fut_price_vs_vwap = val,
          "fut_range_position" => output.fut_range_position = val,
          "fut_return_1m" => output.fut_return_1m = val,
          "fut_return_5m" => output.fut_return_5m = val,
          "fut_atr_percent" => output.fut_atr_percent = val,
          "fut_volume_zscore" => output.fut_volume_zscore = val,
          "fut_oi_change" => output.fut_oi_change = val,
          "fut_rsi_14" => output.fut_rsi_14 = val,
          "fut_macd" => output.fut_macd = val,
          "fut_return_15m" => output.fut_return_15m = val,
          "fut_oi_change_pct" => output.fut_oi_change_pct = val,
          "fut_macd_signal" => output.fut_macd_signal = val,
          // Options (14)
          "atm_iv" => output.atm_iv = val,
          "atm_iv_change" => output.atm_iv_change = val,
          "iv_skew" => output.iv_skew = val,
          "gamma_atm" => output.gamma_atm = val,
          "vega_atm" => output.vega_atm = val,
          "theta_atm" => output.theta_atm = val,
          "pcr_oi" => output.pcr_oi = val,
          "pcr_volume" => output.pcr_volume = val,
          "max_pain_distance" => output.max_pain_distance = val,
          "charm_atm" => output.charm_atm = val,
          "vanna_atm" => output.vanna_atm = val,
          "iv_term_structure" => output.iv_term_structure = val,
          "total_gamma_exposure" => output.total_gamma_exposure = val,
          "iv_percentile_30d" => output.iv_percentile_30d = val,
          // Volatility (6)
          "india_vix" => output.india_vix = val,
          "realized_vol_5m" => output.realized_vol_5m = val,
          "realized_vol_15m" => output.realized_vol_15m = val,
          "vol_expansion_ratio" => output.vol_expansion_ratio = val,
          "iv_rv_ratio" => output.iv_rv_ratio = val,
          "vix_percentile_30d" => output.vix_percentile_30d = val,
          // Order flow (8)
          "bid_ask_spread_bps" => output.bid_ask_spread_bps = val,
          "depth_imbalance_5" => output.depth_imbalance_5 = val,
          "ofi_1s" => output.ofi_1s = val,
          "ofi_5s" => output.ofi_5s = val,
          "ofi_30s" => output.ofi_30s = val,
          "trade_imbalance" => output.trade_imbalance = val,
          "bid_slope" => output.bid_slope = val,
          "ask_slope" => output.ask_slope = val,
          _ => {} // Unknown feature
        },
        FeatureValue::Integer(val) => match name.as_str() {
          "minutes_from_open" => output.minutes_from_open = val,
          "minutes_to_close" => output.minutes_to_close = val,
          "day_of_week" => output.day_of_week = val,
          "is_expiry_day" => output.is_expiry_day = val,
          "days_to_expiry" => output.days_to_expiry = val,
          "session_phase" => output.session_phase = val,
          _ => {} // Unknown feature
        },
        _ => {} // Vector features not used yet
      }
    }

    let total_duration_micros = total_start.elapsed().as_micros() as i64;

    ComputeResult {
      features: output,
      timings,
      total_duration_micros,
    }
  }
}

impl Default for FeatureProcessor {
  fn default() -> Self {
    Self::new()
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::types::*;

  fn create_test_input() -> FeatureInput {
    let nifty_future = FutureTick {
      ltp: 19500.0,
      open: 19450.0,
      high: 19550.0,
      low: 19400.0,
      close: 19500.0,
      volume: 10000.0,
      open_interest: 5000000.0,
    };

    // Create 50 constituents
    let mut constituents = Vec::new();
    for i in 0..50 {
      constituents.push(ConstituentTick {
        symbol: format!("STOCK{}", i),
        ltp: 1000.0 + (i as f64 * 10.0),
        open: 995.0 + (i as f64 * 10.0),
        volume: 50000.0 + (i as f64 * 1000.0),
      });
    }

    // Create options chain
    let mut options = Vec::new();
    for i in 0..10 {
      let strike = 19500.0 + (i as f64 * 100.0);
      options.push(OptionTick {
        strike,
        option_type: "CE".to_string(),
        ltp: 150.0 - (i as f64 * 10.0),
        iv: 0.15 + (i as f64 * 0.01),
        delta: 0.5 - (i as f64 * 0.05),
        gamma: 0.001,
        vega: 50.0,
        theta: -20.0,
        open_interest: 100000.0 + (i as f64 * 5000.0),
        volume: 5000.0 + (i as f64 * 200.0),
      });
      options.push(OptionTick {
        strike,
        option_type: "PE".to_string(),
        ltp: 120.0 + (i as f64 * 10.0),
        iv: 0.16 + (i as f64 * 0.01),
        delta: -0.5 + (i as f64 * 0.05),
        gamma: 0.001,
        vega: 50.0,
        theta: -20.0,
        open_interest: 90000.0 + (i as f64 * 4500.0),
        volume: 4500.0 + (i as f64 * 180.0),
      });
    }

    FeatureInput {
      timestamp: chrono::Utc::now().timestamp_millis(),
      nifty_future,
      constituents,
      options,
      india_vix: Some(15.5),
      is_expiry_day: Some(false),
      days_to_expiry: Some(3),
      current_expiry: None,
      market_depth: None,
      nifty_spot: Some(19480.0),
      risk_free_rate: Some(0.07),
    }
  }

  #[test]
  fn test_processor_creation() {
    let processor = FeatureProcessor::new();
    // 8 index_breadth + 12 nifty_future + 11 options + 6 volatility + 6 time_context
    // Note: 3 options features (IvTermStructure, TotalGammaExposure, IvPercentile30d) are TODO
    // Note: Order flow features handled separately
    assert_eq!(processor.features.len(), 43);
  }

  #[test]
  fn test_processor_compute_all() {
    let processor = FeatureProcessor::new();
    let input = create_test_input();
    let cache = HistoricalCache::new(26);

    let result = processor.compute_all(&input, &cache);

    // Verify timings are recorded
    assert_eq!(result.timings.len(), 43);
    assert!(result.total_duration_micros > 0);

    // Verify some features are computed
    assert!(result.features.timestamp > 0);
  }

  #[test]
  fn test_parallel_execution_deterministic() {
    let processor = FeatureProcessor::new();
    let input = create_test_input();
    let cache = HistoricalCache::new(26);

    // Run multiple times to ensure parallel execution is deterministic
    let result1 = processor.compute_all(&input, &cache);
    let result2 = processor.compute_all(&input, &cache);

    // Feature values should be identical (timings may vary slightly)
    assert_eq!(
      result1.features.pct_stocks_above_vwap,
      result2.features.pct_stocks_above_vwap
    );
    assert_eq!(
      result1.features.fut_price_vs_vwap,
      result2.features.fut_price_vs_vwap
    );
  }
}
