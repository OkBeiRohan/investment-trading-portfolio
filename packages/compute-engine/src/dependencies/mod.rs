//! Shared dependency calculations
//! Computed ONCE before parallel feature execution
//! Functions in this module calculate VWAP, EMA, ATR, RSI, Greeks, etc.

use crate::cache::{HistoricalCache, OhlcTick, PriceVolumeTick};
use crate::features::{ComputedDependencies, OptionGreeks};
use crate::types::{FeatureInput, OptionTick};

// ============================================
// VWAP CALCULATIONS
// ============================================

/// Compute VWAP from historical price/volume data
/// VWAP = Σ(price × volume) / Σ(volume)
pub fn compute_vwap(ticks: &[PriceVolumeTick]) -> f64 {
  if ticks.is_empty() {
    return 0.0;
  }

  let sum_pv: f64 = ticks.iter().map(|t| t.price * t.volume).sum();
  let sum_v: f64 = ticks.iter().map(|t| t.volume).sum();

  if sum_v > 0.0 {
    sum_pv / sum_v
  } else {
    0.0
  }
}

/// Compute VWAP for NIFTY Future from cache
pub fn compute_nifty_future_vwap(cache: &HistoricalCache) -> f64 {
  let history = cache.get_nifty_future_pv();
  let ticks: Vec<&PriceVolumeTick> = history.iter().collect();

  if ticks.is_empty() {
    return 0.0;
  }

  let sum_pv: f64 = ticks.iter().map(|t| t.price * t.volume).sum();
  let sum_v: f64 = ticks.iter().map(|t| t.volume).sum();

  if sum_v > 0.0 {
    sum_pv / sum_v
  } else {
    0.0
  }
}

/// Compute VWAP for all constituents from cache
pub fn compute_constituent_vwaps(cache: &HistoricalCache, symbols: &[String]) -> Vec<f64> {
  symbols
    .iter()
    .map(|symbol| {
      if let Some(history) = cache.get_constituent_pv(symbol) {
        let ticks: Vec<&PriceVolumeTick> = history.iter().collect();
        compute_vwap(&ticks.iter().copied().copied().collect::<Vec<_>>())
      } else {
        0.0
      }
    })
    .collect()
}

// ============================================
// EMA (Exponential Moving Average)
// ============================================

/// Compute EMA from price history
/// EMA(t) = α × Price(t) + (1-α) × EMA(t-1)
/// α = 2 / (period + 1)
pub fn compute_ema(prices: &[f64], period: usize) -> f64 {
  if prices.is_empty() || period == 0 {
    return 0.0;
  }

  if prices.len() < period {
    // Not enough data, return simple average
    return prices.iter().sum::<f64>() / prices.len() as f64;
  }

  let alpha = 2.0 / (period as f64 + 1.0);
  let mut ema = prices.iter().take(period).sum::<f64>() / period as f64;

  for &price in prices.iter().skip(period) {
    ema = alpha * price + (1.0 - alpha) * ema;
  }

  ema
}

/// Compute EMA20 for NIFTY Future from cache
pub fn compute_nifty_future_ema20(cache: &HistoricalCache) -> f64 {
  let history = cache.get_nifty_future_pv();
  let prices: Vec<f64> = history.iter().map(|t| t.price).collect();
  compute_ema(&prices, 20)
}

/// Compute EMA20 for all constituents from cache
pub fn compute_constituent_ema20s(cache: &HistoricalCache, symbols: &[String]) -> Vec<f64> {
  symbols
    .iter()
    .map(|symbol| {
      if let Some(history) = cache.get_constituent_pv(symbol) {
        let prices: Vec<f64> = history.iter().map(|t| t.price).collect();
        compute_ema(&prices, 20)
      } else {
        0.0
      }
    })
    .collect()
}

/// Compute EMA12 for NIFTY Future from cache (for MACD)
pub fn compute_nifty_future_ema12(cache: &HistoricalCache) -> f64 {
  let history = cache.get_nifty_future_pv();
  let prices: Vec<f64> = history.iter().map(|t| t.price).collect();
  compute_ema(&prices, 12)
}

/// Compute EMA26 for NIFTY Future from cache (for MACD)
pub fn compute_nifty_future_ema26(cache: &HistoricalCache) -> f64 {
  let history = cache.get_nifty_future_pv();
  let prices: Vec<f64> = history.iter().map(|t| t.price).collect();
  compute_ema(&prices, 26)
}

// ============================================
// ATR (Average True Range)
// ============================================

/// Compute True Range for a single candle
fn compute_true_range(current: &OhlcTick, previous_close: f64) -> f64 {
  let high_low = current.high - current.low;
  let high_close = (current.high - previous_close).abs();
  let low_close = (current.low - previous_close).abs();

  high_low.max(high_close).max(low_close)
}

/// Compute ATR from OHLC history
/// ATR = Average of True Range over N periods
pub fn compute_atr(ohlc: &[OhlcTick], period: usize) -> f64 {
  if ohlc.len() < 2 || period == 0 {
    return 0.0;
  }

  let mut true_ranges = Vec::new();
  for i in 1..ohlc.len() {
    let tr = compute_true_range(&ohlc[i], ohlc[i - 1].close);
    true_ranges.push(tr);
  }

  if true_ranges.is_empty() {
    return 0.0;
  }

  // Use EMA for ATR calculation (standard approach)
  compute_ema(&true_ranges, period.min(true_ranges.len()))
}

/// Compute ATR for NIFTY Future from cache (14-period default)
pub fn compute_nifty_future_atr(cache: &HistoricalCache) -> f64 {
  let history = cache.get_nifty_future_ohlc();
  let ohlc: Vec<&OhlcTick> = history.iter().collect();

  if ohlc.len() < 2 {
    return 0.0;
  }

  let ohlc_owned: Vec<OhlcTick> = ohlc.iter().copied().copied().collect();
  compute_atr(&ohlc_owned, 14)
}

// ============================================
// RSI (Relative Strength Index)
// ============================================

/// Compute RSI from price history
/// RSI = 100 - (100 / (1 + RS))
/// RS = Average Gain / Average Loss
pub fn compute_rsi(prices: &[f64], period: usize) -> f64 {
  if prices.len() < period + 1 {
    return 50.0; // Neutral if not enough data
  }

  let mut gains = Vec::new();
  let mut losses = Vec::new();

  for i in 1..prices.len() {
    let change = prices[i] - prices[i - 1];
    if change > 0.0 {
      gains.push(change);
      losses.push(0.0);
    } else {
      gains.push(0.0);
      losses.push(-change);
    }
  }

  let avg_gain = compute_ema(&gains, period);
  let avg_loss = compute_ema(&losses, period);

  if avg_loss == 0.0 {
    return 100.0; // All gains
  }

  let rs = avg_gain / avg_loss;
  100.0 - (100.0 / (1.0 + rs))
}

/// Compute RSI14 for NIFTY Future from cache
pub fn compute_nifty_future_rsi_14(cache: &HistoricalCache) -> f64 {
  let history = cache.get_nifty_future_pv();
  let prices: Vec<f64> = history.iter().map(|t| t.price).collect();
  compute_rsi(&prices, 14)
}

// ============================================
// OPTIONS GREEKS AGGREGATION
// ============================================

/// Find ATM (At-The-Money) options based on spot price
fn find_atm_strike(options: &[OptionTick], spot_price: f64) -> f64 {
  if options.is_empty() {
    return spot_price;
  }

  options
    .iter()
    .map(|opt| opt.strike)
    .min_by(|a, b| {
      let diff_a = (a - spot_price).abs();
      let diff_b = (b - spot_price).abs();
      diff_a.partial_cmp(&diff_b).unwrap()
    })
    .unwrap_or(spot_price)
}

/// Aggregate ATM Call Greeks
pub fn aggregate_atm_call_greeks(input: &FeatureInput) -> OptionGreeks {
  let spot_price = input.nifty_future.ltp;
  let atm_strike = find_atm_strike(&input.options, spot_price);

  let atm_calls: Vec<_> = input
    .options
    .iter()
    .filter(|opt| opt.option_type == "CE" && (opt.strike - atm_strike).abs() < 1.0)
    .collect();

  if atm_calls.is_empty() {
    return OptionGreeks::default();
  }

  let count = atm_calls.len() as f64;

  OptionGreeks {
    delta: atm_calls.iter().map(|opt| opt.delta).sum::<f64>() / count,
    gamma: atm_calls.iter().map(|opt| opt.gamma).sum::<f64>() / count,
    vega: atm_calls.iter().map(|opt| opt.vega).sum::<f64>() / count,
    theta: atm_calls.iter().map(|opt| opt.theta).sum::<f64>() / count,
    charm: 0.0, // Will be computed in Phase 3 if broker provides
    vanna: 0.0, // Will be computed in Phase 3 if broker provides
  }
}

/// Aggregate ATM Put Greeks
pub fn aggregate_atm_put_greeks(input: &FeatureInput) -> OptionGreeks {
  let spot_price = input.nifty_future.ltp;
  let atm_strike = find_atm_strike(&input.options, spot_price);

  let atm_puts: Vec<_> = input
    .options
    .iter()
    .filter(|opt| opt.option_type == "PE" && (opt.strike - atm_strike).abs() < 1.0)
    .collect();

  if atm_puts.is_empty() {
    return OptionGreeks::default();
  }

  let count = atm_puts.len() as f64;

  OptionGreeks {
    delta: atm_puts.iter().map(|opt| opt.delta).sum::<f64>() / count,
    gamma: atm_puts.iter().map(|opt| opt.gamma).sum::<f64>() / count,
    vega: atm_puts.iter().map(|opt| opt.vega).sum::<f64>() / count,
    theta: atm_puts.iter().map(|opt| opt.theta).sum::<f64>() / count,
    charm: 0.0,
    vanna: 0.0,
  }
}

// ============================================
// REALIZED VOLATILITY
// ============================================

/// Compute realized volatility from price returns
/// Annualized volatility = StdDev(returns) × √(252 trading days × periods per day)
pub fn compute_realized_volatility(prices: &[f64], periods_per_day: f64) -> f64 {
  if prices.len() < 2 {
    return 0.0;
  }

  // Calculate log returns
  let mut returns = Vec::new();
  for i in 1..prices.len() {
    let log_return = (prices[i] / prices[i - 1]).ln();
    returns.push(log_return);
  }

  if returns.is_empty() {
    return 0.0;
  }

  // Calculate mean return
  let mean = returns.iter().sum::<f64>() / returns.len() as f64;

  // Calculate variance
  let variance = returns.iter().map(|r| (r - mean).powi(2)).sum::<f64>() / returns.len() as f64;

  // Annualize: StdDev × √(252 × periods_per_day)
  let std_dev = variance.sqrt();
  std_dev * (252.0 * periods_per_day).sqrt()
}

/// Compute 5-minute realized volatility
pub fn compute_realized_vol_5m(cache: &HistoricalCache) -> f64 {
  let history = cache.get_nifty_future_pv();
  let recent_ticks = history.last_n(5);
  let prices: Vec<f64> = recent_ticks.iter().map(|t| t.price).collect();

  if prices.len() < 2 {
    return 0.0;
  }

  // 1-minute intervals, so 390 periods per day (6.5 hours)
  compute_realized_volatility(&prices, 390.0)
}

/// Compute 15-minute realized volatility
pub fn compute_realized_vol_15m(cache: &HistoricalCache) -> f64 {
  let history = cache.get_nifty_future_pv();
  let recent_ticks = history.last_n(15);
  let prices: Vec<f64> = recent_ticks.iter().map(|t| t.price).collect();

  if prices.len() < 2 {
    return 0.0;
  }

  compute_realized_volatility(&prices, 390.0)
}

// ============================================
// CACHE-BASED LOOKBACK METRICS
// ============================================

/// Compute 1-minute return from cache
pub fn compute_nifty_future_return_1m(cache: &HistoricalCache, current_price: f64) -> f64 {
  if let Some(price_1m_ago) = cache.get_nifty_future_price_n_ago(1) {
    (current_price - price_1m_ago) / price_1m_ago
  } else {
    0.0
  }
}

/// Compute 5-minute return from cache
pub fn compute_nifty_future_return_5m(cache: &HistoricalCache, current_price: f64) -> f64 {
  if let Some(price_5m_ago) = cache.get_nifty_future_price_n_ago(5) {
    (current_price - price_5m_ago) / price_5m_ago
  } else {
    0.0
  }
}

/// Compute volume z-score from cache statistics
pub fn compute_nifty_future_volume_zscore(cache: &HistoricalCache, current_volume: f64) -> f64 {
  let (mean, std) = cache.get_nifty_future_volume_stats();
  if std > 0.0 {
    (current_volume - mean) / std
  } else {
    0.0
  }
}

/// Compute OI change from 1 period ago
pub fn compute_nifty_future_oi_change(cache: &HistoricalCache, current_oi: f64) -> f64 {
  if let Some(oi_1m_ago) = cache.get_nifty_future_oi_n_ago(1) {
    current_oi - oi_1m_ago
  } else {
    0.0
  }
}

/// Compute 15-minute return from cache (proper 15-period lookback)
pub fn compute_nifty_future_return_15m(cache: &HistoricalCache, current_price: f64) -> f64 {
  if let Some(price_15m_ago) = cache.get_nifty_future_price_n_ago(15) {
    (current_price - price_15m_ago) / price_15m_ago
  } else {
    0.0
  }
}

/// Compute MACD signal line = EMA(9) of MACD values
/// MACD = EMA(12) - EMA(26) computed at each historical point
pub fn compute_nifty_future_macd_signal(cache: &HistoricalCache) -> f64 {
  let history = cache.get_nifty_future_pv();
  let prices: Vec<f64> = history.iter().map(|t| t.price).collect();

  if prices.len() < 26 {
    return 0.0; // Not enough data for MACD
  }

  // Compute MACD line at each point where we have enough data
  let mut macd_values = Vec::new();
  for end in 26..=prices.len() {
    let slice = &prices[..end];
    let ema12 = compute_ema(slice, 12);
    let ema26 = compute_ema(slice, 26);
    macd_values.push(ema12 - ema26);
  }

  if macd_values.is_empty() {
    return 0.0;
  }

  // Signal line = EMA(9) of MACD values
  compute_ema(&macd_values, 9)
}

// ============================================
// DEFAULT IMPLEMENTATION FOR OPTION GREEKS
// ============================================

impl Default for OptionGreeks {
  fn default() -> Self {
    Self {
      delta: 0.0,
      gamma: 0.0,
      vega: 0.0,
      theta: 0.0,
      charm: 0.0,
      vanna: 0.0,
    }
  }
}

// ============================================
// COMPUTE ALL DEPENDENCIES
// ============================================

/// Compute all shared dependencies from input and cache
/// This is called ONCE before parallel feature execution
pub fn compute_all_dependencies(
  input: &FeatureInput,
  cache: &HistoricalCache,
) -> ComputedDependencies {
  let constituent_symbols: Vec<String> = input
    .constituents
    .iter()
    .map(|c| c.symbol.clone())
    .collect();

  ComputedDependencies {
    nifty_future_vwap: compute_nifty_future_vwap(cache),
    constituent_vwaps: compute_constituent_vwaps(cache, &constituent_symbols),
    nifty_future_ema20: compute_nifty_future_ema20(cache),
    nifty_future_ema12: compute_nifty_future_ema12(cache),
    nifty_future_ema26: compute_nifty_future_ema26(cache),
    constituent_ema20s: compute_constituent_ema20s(cache, &constituent_symbols),
    nifty_future_atr: compute_nifty_future_atr(cache),
    nifty_future_rsi_14: compute_nifty_future_rsi_14(cache),
    atm_call_greeks: aggregate_atm_call_greeks(input),
    atm_put_greeks: aggregate_atm_put_greeks(input),
    realized_vol_5m: compute_realized_vol_5m(cache),
    realized_vol_15m: compute_realized_vol_15m(cache),
    nifty_future_return_1m: compute_nifty_future_return_1m(cache, input.nifty_future.ltp),
    nifty_future_return_5m: compute_nifty_future_return_5m(cache, input.nifty_future.ltp),
    nifty_future_return_15m: compute_nifty_future_return_15m(cache, input.nifty_future.ltp),
    nifty_future_volume_zscore: compute_nifty_future_volume_zscore(
      cache,
      input.nifty_future.volume,
    ),
    nifty_future_oi_change: compute_nifty_future_oi_change(cache, input.nifty_future.open_interest),
    nifty_future_macd_signal: compute_nifty_future_macd_signal(cache),
  }
}

// ============================================
// TESTS
// ============================================

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_compute_vwap() {
    let ticks = vec![
      PriceVolumeTick {
        timestamp: 1000,
        price: 100.0,
        volume: 10.0,
      },
      PriceVolumeTick {
        timestamp: 2000,
        price: 110.0,
        volume: 20.0,
      },
      PriceVolumeTick {
        timestamp: 3000,
        price: 105.0,
        volume: 15.0,
      },
    ];

    // VWAP = (100×10 + 110×20 + 105×15) / (10+20+15)
    //      = (1000 + 2200 + 1575) / 45
    //      = 4775 / 45
    //      = 106.11...
    let vwap = compute_vwap(&ticks);
    assert!((vwap - 106.11).abs() < 0.01);
  }

  #[test]
  fn test_compute_ema() {
    let prices = vec![100.0, 102.0, 101.0, 103.0, 105.0, 104.0, 106.0];
    let ema = compute_ema(&prices, 3);

    // EMA should be between min and max
    assert!(ema > 100.0 && ema < 110.0);
  }

  #[test]
  fn test_compute_rsi() {
    // Rising prices should give RSI > 50
    let rising = vec![100.0, 101.0, 102.0, 103.0, 104.0, 105.0];
    let rsi_rising = compute_rsi(&rising, 3);
    assert!(rsi_rising > 50.0);

    // Falling prices should give RSI < 50
    let falling = vec![105.0, 104.0, 103.0, 102.0, 101.0, 100.0];
    let rsi_falling = compute_rsi(&falling, 3);
    assert!(rsi_falling < 50.0);
  }

  #[test]
  fn test_compute_atr() {
    let ohlc = vec![
      OhlcTick {
        timestamp: 1000,
        open: 100.0,
        high: 105.0,
        low: 99.0,
        close: 103.0,
      },
      OhlcTick {
        timestamp: 2000,
        open: 103.0,
        high: 108.0,
        low: 102.0,
        close: 106.0,
      },
      OhlcTick {
        timestamp: 3000,
        open: 106.0,
        high: 110.0,
        low: 105.0,
        close: 108.0,
      },
    ];

    let atr = compute_atr(&ohlc, 2);
    assert!(atr > 0.0);
    assert!(atr < 10.0); // Reasonable range
  }

  #[test]
  fn test_realized_volatility() {
    let prices = vec![100.0, 101.0, 99.0, 102.0, 98.0, 103.0];
    let vol = compute_realized_volatility(&prices, 390.0);

    // Should return positive volatility
    // High frequency data (390 periods/day) amplifies volatility significantly
    assert!(vol > 0.0);
    assert!(vol.is_finite()); // Ensure it's a valid number
  }
}
