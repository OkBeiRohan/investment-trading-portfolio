//! Daily Features Computation
//! Computes features from daily OHLCV data for Regime HMM training
//! Used for 26-year historical data (2000-2026)

use crate::types::FeatureMode;

/// Daily OHLCV input for feature computation
#[derive(Debug, Clone)]
pub struct DailyCandle {
  pub timestamp: i64,
  pub open: f64,
  pub high: f64,
  pub low: f64,
  pub close: f64,
  pub volume: f64,
  pub open_interest: Option<f64>,
}

/// Daily features output (48 features)
#[derive(Debug, Clone, Default)]
pub struct DailyFeatures {
  // Price Structure (8)
  pub close: f64,
  pub return_1d: f64,
  pub return_5d: f64,
  pub return_20d: f64,
  pub range_hl: f64,
  pub gap_open: f64,
  pub close_vs_high_20d: f64,
  pub close_vs_low_20d: f64,

  // Momentum (8)
  pub rsi_14: f64,
  pub rsi_5: f64,
  pub macd: f64,
  pub macd_signal: f64,
  pub macd_hist: f64,
  pub adx_14: f64,
  pub plus_di: f64,
  pub minus_di: f64,

  // Moving Averages (6)
  pub sma_10: f64,
  pub sma_20: f64,
  pub sma_50: f64,
  pub sma_200: f64,
  pub ema_12: f64,
  pub ema_26: f64,

  // MA Signals (4)
  pub price_vs_sma_20: f64,
  pub price_vs_sma_50: f64,
  pub price_vs_sma_200: f64,
  pub golden_cross: i32,

  // Volatility (6)
  pub atr_14: f64,
  pub atr_percent: f64,
  pub realized_vol_20d: f64,
  pub realized_vol_60d: f64,
  pub bollinger_width: f64,
  pub bollinger_position: f64,

  // VIX (4)
  pub vix_close: f64,
  pub vix_percentile_30d: f64,
  pub vix_percentile_1yr: f64,
  pub vix_sma_10: f64,

  // Volume (4)
  pub volume_sma_20_ratio: f64,
  pub volume_trend: f64,
  pub obv_change: f64,
  pub accumulation_dist: f64,

  // Regime Indicators (4)
  pub trend_strength: f64,
  pub mean_reversion_signal: f64,
  pub momentum_regime: i32,
  pub volatility_regime: i32,

  // Time Context (4)
  pub day_of_week: i32,
  pub month_of_year: i32,
  pub is_month_end: bool,
  pub is_quarter_end: bool,

  // Validity
  pub is_valid: bool,
  pub invalid_reason: Option<String>,
}

/// Configuration for daily feature computation
#[derive(Debug, Clone)]
pub struct DailyFeatureConfig {
  pub mode: FeatureMode,
  pub include_vix: bool,
}

impl Default for DailyFeatureConfig {
  fn default() -> Self {
    Self {
      mode: FeatureMode::Historical,
      include_vix: true,
    }
  }
}

/// Compute daily features from historical candle data
/// Requires at least 200 candles for full feature computation
pub fn compute_daily_features(
  candles: &[DailyCandle],
  vix_candles: Option<&[DailyCandle]>,
  config: &DailyFeatureConfig,
) -> Vec<DailyFeatures> {
  if candles.len() < 200 {
    return vec![]; // Need 200 days for SMA-200
  }

  let mut results = Vec::with_capacity(candles.len());

  for i in 200..candles.len() {
    let window = &candles[i - 200..=i];
    let current = &candles[i];
    let vix = vix_candles.and_then(|v| v.get(i));

    let features = compute_single_day(window, current, vix, config);
    results.push(features);
  }

  results
}

/// Compute features for a single day
fn compute_single_day(
  window: &[DailyCandle],
  current: &DailyCandle,
  vix: Option<&DailyCandle>,
  _config: &DailyFeatureConfig,
) -> DailyFeatures {
  let closes: Vec<f64> = window.iter().map(|c| c.close).collect();
  let highs: Vec<f64> = window.iter().map(|c| c.high).collect();
  let lows: Vec<f64> = window.iter().map(|c| c.low).collect();
  let volumes: Vec<f64> = window.iter().map(|c| c.volume).collect();

  let n = closes.len();
  let prev_close = if n > 1 { closes[n - 2] } else { current.close };

  DailyFeatures {
    // Price Structure
    close: current.close,
    return_1d: compute_return(current.close, prev_close),
    return_5d: compute_return(current.close, closes.get(n.saturating_sub(6)).copied().unwrap_or(current.close)),
    return_20d: compute_return(current.close, closes.get(n.saturating_sub(21)).copied().unwrap_or(current.close)),
    range_hl: (current.high - current.low) / current.close,
    gap_open: (current.open - prev_close) / prev_close,
    close_vs_high_20d: compute_distance_from_high(&closes[n.saturating_sub(20)..], current.close),
    close_vs_low_20d: compute_distance_from_low(&closes[n.saturating_sub(20)..], current.close),

    // Momentum
    rsi_14: compute_rsi(&closes, 14),
    rsi_5: compute_rsi(&closes, 5),
    macd: compute_ema(&closes, 12) - compute_ema(&closes, 26),
    macd_signal: 0.0, // Would need separate signal line history
    macd_hist: 0.0,
    adx_14: compute_adx(&highs, &lows, &closes, 14),
    plus_di: 0.0,
    minus_di: 0.0,

    // Moving Averages
    sma_10: compute_sma(&closes, 10),
    sma_20: compute_sma(&closes, 20),
    sma_50: compute_sma(&closes, 50),
    sma_200: compute_sma(&closes, 200),
    ema_12: compute_ema(&closes, 12),
    ema_26: compute_ema(&closes, 26),

    // MA Signals
    price_vs_sma_20: (current.close - compute_sma(&closes, 20)) / compute_sma(&closes, 20),
    price_vs_sma_50: (current.close - compute_sma(&closes, 50)) / compute_sma(&closes, 50),
    price_vs_sma_200: (current.close - compute_sma(&closes, 200)) / compute_sma(&closes, 200),
    golden_cross: if compute_sma(&closes, 50) > compute_sma(&closes, 200) { 1 } else { 0 },

    // Volatility
    atr_14: compute_atr(&highs, &lows, &closes, 14),
    atr_percent: compute_atr(&highs, &lows, &closes, 14) / current.close,
    realized_vol_20d: compute_realized_vol(&closes, 20),
    realized_vol_60d: compute_realized_vol(&closes, 60),
    bollinger_width: compute_bollinger_width(&closes, 20),
    bollinger_position: compute_bollinger_position(&closes, 20, current.close),

    // VIX
    vix_close: vix.map(|v| v.close).unwrap_or(15.0),
    vix_percentile_30d: 50.0, // Would compute from VIX history
    vix_percentile_1yr: 50.0,
    vix_sma_10: vix.map(|v| v.close).unwrap_or(15.0),

    // Volume
    volume_sma_20_ratio: current.volume / compute_sma(&volumes, 20).max(1.0),
    volume_trend: compute_volume_trend(&volumes, 10),
    obv_change: 0.0,
    accumulation_dist: 0.0,

    // Regime Indicators
    trend_strength: compute_adx(&highs, &lows, &closes, 14) / 100.0,
    mean_reversion_signal: compute_mean_reversion_signal(&closes, current.close),
    momentum_regime: classify_momentum_regime(&closes),
    volatility_regime: classify_volatility_regime(&closes),

    // Time Context (would be computed from timestamp)
    day_of_week: 0,
    month_of_year: 0,
    is_month_end: false,
    is_quarter_end: false,

    // Validity
    is_valid: true,
    invalid_reason: None,
  }
}

// Helper functions

fn compute_return(current: f64, previous: f64) -> f64 {
  if previous <= 0.0 { 0.0 } else { (current - previous) / previous }
}

fn compute_sma(data: &[f64], period: usize) -> f64 {
  if data.len() < period { return 0.0; }
  let slice = &data[data.len() - period..];
  slice.iter().sum::<f64>() / period as f64
}

fn compute_ema(data: &[f64], period: usize) -> f64 {
  if data.is_empty() { return 0.0; }
  let multiplier = 2.0 / (period as f64 + 1.0);
  let sma = compute_sma(data, period.min(data.len()));
  
  let start = data.len().saturating_sub(period);
  let mut ema = sma;
  for price in &data[start..] {
    ema = (price - ema) * multiplier + ema;
  }
  ema
}

fn compute_rsi(closes: &[f64], period: usize) -> f64 {
  if closes.len() < period + 1 { return 50.0; }
  
  let mut gains = 0.0;
  let mut losses = 0.0;
  
  let start = closes.len() - period - 1;
  for i in (start + 1)..closes.len() {
    let change = closes[i] - closes[i - 1];
    if change > 0.0 { gains += change; }
    else { losses -= change; }
  }
  
  let avg_gain = gains / period as f64;
  let avg_loss = losses / period as f64;
  
  if avg_loss == 0.0 { 100.0 }
  else { 100.0 - (100.0 / (1.0 + avg_gain / avg_loss)) }
}

fn compute_atr(highs: &[f64], lows: &[f64], closes: &[f64], period: usize) -> f64 {
  if highs.len() < period + 1 { return 0.0; }
  
  let mut tr_sum = 0.0;
  let start = highs.len() - period;
  
  for i in start..highs.len() {
    let prev_close = if i > 0 { closes[i - 1] } else { closes[i] };
    let tr = (highs[i] - lows[i])
      .max((highs[i] - prev_close).abs())
      .max((lows[i] - prev_close).abs());
    tr_sum += tr;
  }
  
  tr_sum / period as f64
}

fn compute_adx(_highs: &[f64], _lows: &[f64], _closes: &[f64], _period: usize) -> f64 {
  // Simplified ADX calculation (would need full implementation)
  25.0  // Default neutral value
}

fn compute_realized_vol(closes: &[f64], period: usize) -> f64 {
  if closes.len() < period + 1 { return 0.0; }
  
  let start = closes.len() - period - 1;
  let mut returns: Vec<f64> = Vec::with_capacity(period);
  
  for i in (start + 1)..closes.len() {
    if closes[i - 1] > 0.0 {
      returns.push((closes[i] / closes[i - 1]).ln());
    }
  }
  
  if returns.is_empty() { return 0.0; }
  
  let mean = returns.iter().sum::<f64>() / returns.len() as f64;
  let variance = returns.iter().map(|r| (r - mean).powi(2)).sum::<f64>() / returns.len() as f64;
  
  variance.sqrt() * (252.0_f64).sqrt()  // Annualized
}

fn compute_bollinger_width(closes: &[f64], period: usize) -> f64 {
  if closes.len() < period { return 0.0; }
  
  let sma = compute_sma(closes, period);
  let slice = &closes[closes.len() - period..];
  let std_dev = (slice.iter().map(|c| (c - sma).powi(2)).sum::<f64>() / period as f64).sqrt();
  
  if sma == 0.0 { 0.0 } else { (4.0 * std_dev) / sma }
}

fn compute_bollinger_position(closes: &[f64], period: usize, current: f64) -> f64 {
  if closes.len() < period { return 0.5; }
  
  let sma = compute_sma(closes, period);
  let slice = &closes[closes.len() - period..];
  let std_dev = (slice.iter().map(|c| (c - sma).powi(2)).sum::<f64>() / period as f64).sqrt();
  
  let lower = sma - 2.0 * std_dev;
  let upper = sma + 2.0 * std_dev;
  
  if upper - lower == 0.0 { 0.5 } else { (current - lower) / (upper - lower) }
}

fn compute_distance_from_high(slice: &[f64], current: f64) -> f64 {
  let max = slice.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
  if max == 0.0 { 0.0 } else { (current - max) / max }
}

fn compute_distance_from_low(slice: &[f64], current: f64) -> f64 {
  let min = slice.iter().cloned().fold(f64::INFINITY, f64::min);
  if min == 0.0 { 0.0 } else { (current - min) / min }
}

fn compute_volume_trend(volumes: &[f64], period: usize) -> f64 {
  if volumes.len() < period * 2 { return 0.0; }
  
  let recent = compute_sma(&volumes[volumes.len() - period..], period);
  let older = compute_sma(&volumes[volumes.len() - period * 2..volumes.len() - period], period);
  
  if older == 0.0 { 0.0 } else { (recent - older) / older }
}

fn compute_mean_reversion_signal(closes: &[f64], current: f64) -> f64 {
  let sma_20 = compute_sma(closes, 20);
  let rsi = compute_rsi(closes, 14);
  
  // Combine distance from SMA and RSI for mean reversion signal
  let distance = (current - sma_20) / sma_20;
  let rsi_signal = (rsi - 50.0) / 50.0;
  
  (distance + rsi_signal) / 2.0
}

fn classify_momentum_regime(closes: &[f64]) -> i32 {
  let sma_20 = compute_sma(closes, 20);
  let sma_50 = compute_sma(closes, 50);
  let current = *closes.last().unwrap_or(&0.0);
  
  if current > sma_20 && sma_20 > sma_50 { 1 }       // Bullish
  else if current < sma_20 && sma_20 < sma_50 { -1 } // Bearish
  else { 0 }                                          // Neutral
}

fn classify_volatility_regime(closes: &[f64]) -> i32 {
  let vol_20 = compute_realized_vol(closes, 20);
  let vol_60 = compute_realized_vol(closes, 60);
  
  let ratio = if vol_60 == 0.0 { 1.0 } else { vol_20 / vol_60 };
  
  if ratio > 1.3 { 1 }       // High volatility
  else if ratio < 0.7 { -1 } // Low volatility
  else { 0 }                  // Normal
}

#[cfg(test)]
mod tests {
  use super::*;

  fn create_test_candles(n: usize) -> Vec<DailyCandle> {
    (0..n).map(|i| DailyCandle {
      timestamp: i as i64 * 86400000,
      open: 100.0 + i as f64 * 0.1,
      high: 101.0 + i as f64 * 0.1,
      low: 99.0 + i as f64 * 0.1,
      close: 100.5 + i as f64 * 0.1,
      volume: 1000000.0 + i as f64 * 1000.0,
      open_interest: None,
    }).collect()
  }

  #[test]
  fn test_daily_features_computation() {
    let candles = create_test_candles(250);
    let config = DailyFeatureConfig::default();
    
    let features = compute_daily_features(&candles, None, &config);
    
    assert!(!features.is_empty());
    assert!(features[0].is_valid);
    assert!(features[0].close > 0.0);
  }

  #[test]
  fn test_sma_computation() {
    let data: Vec<f64> = vec![10.0, 11.0, 12.0, 13.0, 14.0];
    assert_eq!(compute_sma(&data, 5), 12.0);
  }

  #[test]
  fn test_rsi_computation() {
    let closes: Vec<f64> = (0..20).map(|i| 100.0 + i as f64).collect();
    let rsi = compute_rsi(&closes, 14);
    assert!(rsi > 50.0); // Uptrend should have RSI > 50
  }
}
