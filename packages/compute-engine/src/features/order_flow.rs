//! Order Flow Features (8 total)
//! Computed from market depth (bid/ask levels) - Live mode only
//! Returns default values in Historical mode

use crate::types::{DepthLevel, FeatureMode, MarketDepth};

/// Order flow feature configuration
#[derive(Debug, Clone)]
pub struct OrderFlowConfig {
  pub mode: FeatureMode,
  pub ofi_window_1s: usize,   // samples in 1 second window
  pub ofi_window_5s: usize,   // samples in 5 second window
  pub ofi_window_30s: usize,  // samples in 30 second window
  pub depth_levels: usize,    // levels to use for imbalance (default: 5)
}

impl Default for OrderFlowConfig {
  fn default() -> Self {
    Self {
      mode: FeatureMode::Historical,
      ofi_window_1s: 10,   // assuming ~10 ticks/second
      ofi_window_5s: 50,
      ofi_window_30s: 300,
      depth_levels: 5,
    }
  }
}

/// Order flow features output (8 features)
#[derive(Debug, Clone, Default)]
pub struct OrderFlowFeatures {
  /// Order Flow Imbalance (1-second window) [-1, 1]
  pub ofi_1s: f64,
  /// Order Flow Imbalance (5-second window) [-1, 1]
  pub ofi_5s: f64,
  /// Order Flow Imbalance (30-second window) [-1, 1]
  pub ofi_30s: f64,
  /// Trade imbalance (buy vs sell pressure) [-1, 1]
  pub trade_imbalance: f64,
  /// Depth imbalance at top 5 levels [-1, 1]
  pub depth_imbalance_5: f64,
  /// Depth imbalance at top 10 levels [-1, 1]
  pub depth_imbalance_10: f64,
  /// Bid-ask spread in basis points [1, 50]
  pub bid_ask_spread_bps: f64,
  /// Volume-weighted depth slope (bid side)
  pub bid_slope: f64,
  /// Volume-weighted depth slope (ask side)
  pub ask_slope: f64,
}

/// Compute order flow features from market depth
/// Returns zeros for Historical mode (no depth available)
pub fn compute_order_flow(
  depth: &Option<MarketDepth>,
  _ofi_history: &[f64],  // Historical OFI values for windowed average
  config: &OrderFlowConfig,
) -> OrderFlowFeatures {
  // In Historical mode, return default (zeros)
  if config.mode == FeatureMode::Historical || depth.is_none() {
    return OrderFlowFeatures::default();
  }

  let depth = depth.as_ref().unwrap();

  OrderFlowFeatures {
    ofi_1s: 0.0, // Would require tick history for proper calculation
    ofi_5s: 0.0,
    ofi_30s: 0.0,
    trade_imbalance: compute_trade_imbalance(depth),
    depth_imbalance_5: compute_depth_imbalance(&depth.bids, &depth.asks, 5),
    depth_imbalance_10: compute_depth_imbalance(&depth.bids, &depth.asks, 10),
    bid_ask_spread_bps: compute_spread_bps(depth),
    bid_slope: compute_depth_slope(&depth.bids),
    ask_slope: compute_depth_slope(&depth.asks),
  }
}

/// Compute trade imbalance from total bid/ask quantities
fn compute_trade_imbalance(depth: &MarketDepth) -> f64 {
  let total = depth.total_bid_qty + depth.total_ask_qty;
  if total == 0 {
    return 0.0;
  }
  (depth.total_bid_qty - depth.total_ask_qty) as f64 / total as f64
}

/// Compute depth imbalance at top N levels
/// Returns (bid_qty - ask_qty) / (bid_qty + ask_qty)
fn compute_depth_imbalance(bids: &[DepthLevel], asks: &[DepthLevel], levels: usize) -> f64 {
  let bid_qty: i64 = bids.iter().take(levels).map(|l| l.quantity).sum();
  let ask_qty: i64 = asks.iter().take(levels).map(|l| l.quantity).sum();

  let total = bid_qty + ask_qty;
  if total == 0 {
    return 0.0;
  }

  (bid_qty - ask_qty) as f64 / total as f64
}

/// Compute bid-ask spread in basis points
fn compute_spread_bps(depth: &MarketDepth) -> f64 {
  if depth.bids.is_empty() || depth.asks.is_empty() {
    return 50.0; // Max spread on error
  }

  let best_bid = depth.bids[0].price;
  let best_ask = depth.asks[0].price;

  if best_bid <= 0.0 {
    return 50.0;
  }

  ((best_ask - best_bid) / best_bid) * 10000.0
}

/// Compute volume-weighted depth slope
/// Higher values indicate steeper depth (more liquidity at better prices)
fn compute_depth_slope(levels: &[DepthLevel]) -> f64 {
  if levels.len() < 2 {
    return 0.0;
  }

  let best_price = levels[0].price;
  if best_price <= 0.0 {
    return 0.0;
  }

  // Calculate cumulative quantity at each price level
  let mut cumulative_qty: i64 = 0;
  let mut weighted_sum: f64 = 0.0;

  for (i, level) in levels.iter().enumerate().take(10) {
    cumulative_qty += level.quantity;
    let price_distance = ((level.price - best_price) / best_price).abs();
    weighted_sum += cumulative_qty as f64 * (i + 1) as f64 * price_distance;
  }

  // Normalize
  if cumulative_qty > 0 {
    weighted_sum / cumulative_qty as f64
  } else {
    0.0
  }
}

/// Compute Order Flow Imbalance (OFI) from depth changes
/// OFI = delta(bid_qty * bid_price) - delta(ask_qty * ask_price)
#[allow(dead_code)]
pub fn compute_ofi(
  current_depth: &MarketDepth,
  previous_depth: &MarketDepth,
) -> f64 {
  let current_bid_value = bid_value(current_depth);
  let current_ask_value = ask_value(current_depth);
  let prev_bid_value = bid_value(previous_depth);
  let prev_ask_value = ask_value(previous_depth);

  let delta_bid = current_bid_value - prev_bid_value;
  let delta_ask = current_ask_value - prev_ask_value;

  // Normalize to [-1, 1]
  let max_change = (delta_bid.abs() + delta_ask.abs()).max(1.0);
  (delta_bid - delta_ask) / max_change
}

fn bid_value(depth: &MarketDepth) -> f64 {
  depth.bids.iter().take(5).map(|l| l.price * l.quantity as f64).sum()
}

fn ask_value(depth: &MarketDepth) -> f64 {
  depth.asks.iter().take(5).map(|l| l.price * l.quantity as f64).sum()
}

#[cfg(test)]
mod tests {
  use super::*;

  fn create_test_depth() -> MarketDepth {
    MarketDepth {
      bids: vec![
        DepthLevel { price: 100.0, quantity: 1000, orders: Some(10) },
        DepthLevel { price: 99.95, quantity: 2000, orders: Some(15) },
        DepthLevel { price: 99.90, quantity: 3000, orders: Some(20) },
      ],
      asks: vec![
        DepthLevel { price: 100.05, quantity: 800, orders: Some(8) },
        DepthLevel { price: 100.10, quantity: 1500, orders: Some(12) },
        DepthLevel { price: 100.15, quantity: 2500, orders: Some(18) },
      ],
      total_bid_qty: 6000,
      total_ask_qty: 4800,
    }
  }

  #[test]
  fn test_depth_imbalance() {
    let depth = create_test_depth();
    let imbalance = compute_depth_imbalance(&depth.bids, &depth.asks, 3);
    
    // (1000+2000+3000 - 800+1500+2500) / (6000 + 4800) = 1200 / 10800 ≈ 0.11
    assert!(imbalance > 0.0);
    assert!(imbalance < 0.2);
  }

  #[test]
  fn test_spread_bps() {
    let depth = create_test_depth();
    let spread = compute_spread_bps(&depth);
    
    // (100.05 - 100.0) / 100.0 * 10000 = 5 bps
    assert!((spread - 5.0).abs() < 0.1);
  }

  #[test]
  fn test_historical_mode_returns_zeros() {
    let config = OrderFlowConfig {
      mode: FeatureMode::Historical,
      ..Default::default()
    };
    
    let features = compute_order_flow(&Some(create_test_depth()), &[], &config);
    
    assert_eq!(features.ofi_1s, 0.0);
    assert_eq!(features.depth_imbalance_5, 0.0);
  }

  #[test]
  fn test_live_mode_computes_features() {
    let config = OrderFlowConfig {
      mode: FeatureMode::Live,
      ..Default::default()
    };
    
    let features = compute_order_flow(&Some(create_test_depth()), &[], &config);
    
    assert!(features.depth_imbalance_5 != 0.0);
    assert!(features.bid_ask_spread_bps > 0.0);
  }
}
