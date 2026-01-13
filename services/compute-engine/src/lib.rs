#![deny(clippy::all)]

mod types;
mod mse;
mod features;

use napi_derive::napi;
use types::*;
use mse::{compute_market_state as mse_compute, HistoricalDataCache};

/// Compute Market State from raw market snapshot
///
/// This is the MAIN entry point for feature computation.
/// Takes raw multi-instrument data and outputs compressed MarketState.
#[napi]
pub fn compute_market_state(snapshot: MarketSnapshot) -> MarketState {
  // TODO: Maintain HistoricalDataCache in TypeScript side
  let cache = HistoricalDataCache::new();
  mse_compute(&snapshot, &cache, None)
}

/// Extract LightGBM input features from MarketState
#[napi]
pub fn extract_lightgbm_input(state: MarketState) -> LightGBMInput {
  LightGBMInput {
    // Macro
    pct_stocks_above_vwap: state.macro_state.pct_stocks_above_vwap,
    pct_stocks_above_ema20: state.macro_state.pct_stocks_above_ema20,
    weighted_return_top10: state.macro_state.weighted_return_top10,
    advance_decline_ratio: state.macro_state.advance_decline_ratio,
    breadth_momentum_5m: state.macro_state.breadth_momentum_5m,
    breadth_volatility: state.macro_state.breadth_volatility,

    // Micro
    fut_price_vs_vwap: state.micro_state.fut_price_vs_vwap,
    fut_range_position: state.micro_state.fut_range_position,
    fut_return_1m: state.micro_state.fut_return_1m,
    fut_return_5m: state.micro_state.fut_return_5m,
    fut_atr_percent: state.micro_state.fut_atr_percent,
    fut_volume_zscore: state.micro_state.fut_volume_zscore,
    fut_oi_change: state.micro_state.fut_oi_change,

    // Volatility
    atm_iv: state.volatility_state.atm_iv,
    atm_iv_change: state.volatility_state.atm_iv_change,
    iv_skew: state.volatility_state.iv_skew,
    gamma_atm: state.volatility_state.gamma_atm,
    vega_atm: state.volatility_state.vega_atm,
    theta_atm: state.volatility_state.theta_atm,
    pcr_oi: state.volatility_state.pcr_oi,
    pcr_volume: state.volatility_state.pcr_volume,
    max_pain_distance: state.volatility_state.max_pain_distance,
    india_vix: state.volatility_state.india_vix,
    realized_vol_5m: state.volatility_state.realized_vol_5m,
    vol_expansion_ratio: state.volatility_state.vol_expansion_ratio,

    // Context
    minutes_from_open: state.minutes_from_open,
    minutes_to_close: state.minutes_to_close,
    day_of_week: state.day_of_week,
  }
}

/// Extract TFT input from sequence of market states
/// Note: In TypeScript, you'll need to call this with a pre-built sequence
#[napi]
pub fn build_tft_sequence_point(
  index_return: f64,
  index_realized_vol: f64,
  breadth_score: f64,
  fut_return: f64,
  fut_volume: f64,
  atm_iv: f64,
  iv_change: f64,
  timestamp: i64,
) -> TFTSequencePoint {
  TFTSequencePoint {
    timestamp,
    index_return,
    index_realized_vol,
    breadth_score,
    fut_return,
    fut_volume,
    atm_iv,
    iv_change,
  }
}

/// Extract LOB snapshot from market snapshot
#[napi]
pub fn extract_lob_snapshot(snapshot: MarketSnapshot) -> LOBSnapshot {
  LOBSnapshot {
    timestamp: snapshot.timestamp,
    bids: snapshot.nifty_future.bids,
    asks: snapshot.nifty_future.asks,
  }
}

/// Extract option chain entry from option tick
#[napi]
pub fn extract_option_chain_entry(option: OptionTick) -> OptionChainEntry {
  OptionChainEntry {
    strike_price: option.strike_price,
    option_type: option.option_type,
    ltp: option.ltp,
    delta: option.delta,
    gamma: option.gamma,
    iv: option.iv,
    bid: option.bid,
    ask: option.ask,
  }
}

/// Extract LOB state from option tick
#[napi]
pub fn extract_lob_state(option: OptionTick) -> LOBState {
  let spread = option.ask - option.bid;

  LOBState {
    bids: option.bids,
    asks: option.asks,
    ltp: option.ltp,
    spread,
  }
}

/// Extract future LOB context from NIFTY future tick
#[napi]
pub fn extract_future_lob_context(future: NiftyFutureTick) -> FutureLOBContext {
  let bid = future.bids.get(0).map(|b| b.price).unwrap_or(0.0);
  let ask = future.asks.get(0).map(|a| a.price).unwrap_or(0.0);
  let bid_ask_spread = ask - bid;

  let bid_qty: f64 = future.bids.iter().map(|b| b.quantity).sum();
  let ask_qty: f64 = future.asks.iter().map(|a| a.quantity).sum();
  let lob_imbalance = (bid_qty - ask_qty) / (bid_qty + ask_qty);

  FutureLOBContext {
    ltp: future.ltp,
    bid_ask_spread,
    lob_imbalance,
  }
}

/// Legacy function (for backward compatibility)
#[napi]
pub fn plus_100(input: u32) -> u32 {
  input + 100
}

