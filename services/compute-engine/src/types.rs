// Auto-generated TypeScript types via ts-rs
// Run: cargo test to regenerate *.ts files in ../../packages/schema/src/market-data/generated/

use napi_derive::napi;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

// ============================================
// Raw Market Data Structures
// ============================================

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/schema/src/market-data/generated/")]
pub struct BidAskLevel {
  pub price: f64,
  pub quantity: f64,
  pub orders: Option<i32>,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/schema/src/market-data/generated/")]
pub struct NiftyFutureTick {
  pub timestamp: i64,
  pub symbol: String,

  // Price data
  pub ltp: f64,
  pub open: f64,
  pub high: f64,
  pub low: f64,
  pub close: f64,
  pub volume: f64,

  // Market depth (20 levels)
  pub bids: Vec<BidAskLevel>,
  pub asks: Vec<BidAskLevel>,

  // Derivatives
  pub open_interest: f64,
  pub oi_change: f64,

  // Trades
  pub last_trade_price: Option<f64>,
  pub last_trade_qty: Option<f64>,
  pub last_trade_time: Option<i64>,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/schema/src/market-data/generated/")]
pub struct ConstituentTick {
  pub timestamp: i64,
  pub symbol: String,

  // OHLCV
  pub ltp: f64,
  pub open: f64,
  pub high: f64,
  pub low: f64,
  pub close: f64,
  pub volume: f64,

  // Market depth
  pub bids: Vec<BidAskLevel>,
  pub asks: Vec<BidAskLevel>,

  // Broker calculated
  pub vwap: f64,
  pub total_buy_qty: f64,
  pub total_sell_qty: f64,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/schema/src/market-data/generated/")]
pub struct OptionTick {
  pub timestamp: i64,
  pub symbol: String,
  pub strike_price: f64,
  pub option_type: String, // "CE" or "PE"
  pub expiry_date: String,

  // Price data
  pub ltp: f64,
  pub bid: f64,
  pub ask: f64,
  pub bid_qty: f64,
  pub ask_qty: f64,

  // Market depth
  pub bids: Vec<BidAskLevel>,
  pub asks: Vec<BidAskLevel>,

  // Greeks
  pub iv: f64,
  pub delta: f64,
  pub gamma: f64,
  pub vega: f64,
  pub theta: f64,

  // OI & Volume
  pub open_interest: f64,
  pub oi_change: f64,
  pub volume: f64,
  pub volume_change: Option<f64>,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/schema/src/market-data/generated/")]
pub struct MarketSnapshot {
  pub timestamp: i64,
  pub nifty_future: NiftyFutureTick,
  pub constituents: Vec<ConstituentTick>, // Length: 50
  pub options: Vec<OptionTick>,
  pub india_vix: f64,
}

// ============================================
// Market State (MSE Output)
// ============================================

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/schema/src/market-data/generated/")]
pub struct MacroState {
  pub pct_stocks_above_vwap: f64,
  pub pct_stocks_above_ema20: f64,
  pub weighted_return_top10: f64,
  pub advance_decline_ratio: f64,
  pub breadth_momentum_5m: f64,
  pub breadth_volatility: f64,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/schema/src/market-data/generated/")]
pub struct MicroState {
  pub fut_price_vs_vwap: f64,
  pub fut_range_position: f64,
  pub fut_return_1m: f64,
  pub fut_return_5m: f64,
  pub fut_atr_percent: f64,
  pub fut_volume_zscore: f64,
  pub fut_oi_change: f64,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/schema/src/market-data/generated/")]
pub struct VolatilityState {
  pub atm_iv: f64,
  pub atm_iv_change: f64,
  pub iv_skew: f64,
  pub gamma_atm: f64,
  pub vega_atm: f64,
  pub theta_atm: f64,
  pub pcr_oi: f64,
  pub pcr_volume: f64,
  pub max_pain_distance: f64,
  pub india_vix: f64,
  pub realized_vol_5m: f64,
  pub vol_expansion_ratio: f64,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/schema/src/market-data/generated/")]
pub struct ExecutionState {
  pub fut_bid_ask_spread: f64,
  pub fut_bid_ask_spread_bps: f64,
  pub fut_lob_imbalance: f64,
  pub fut_lob_depth: f64,
  pub option_bid_ask_spread: Option<f64>,
  pub option_bid_ask_spread_pct: Option<f64>,
  pub option_lob_imbalance: Option<f64>,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/schema/src/market-data/generated/")]
pub struct PortfolioState {
  pub has_position: bool,
  pub position_type: String, // "long", "short", "none"
  pub unrealized_pnl: f64,
  pub unrealized_pnl_pct: f64,
  pub position_duration: f64,
  pub net_delta: Option<f64>,
  pub net_gamma: Option<f64>,
  pub net_theta: Option<f64>,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/schema/src/market-data/generated/")]
pub struct MarketState {
  pub timestamp: i64,
  pub macro_state: MacroState,
  pub micro_state: MicroState,
  pub volatility_state: VolatilityState,
  pub execution_state: ExecutionState,
  pub portfolio_state: PortfolioState,
  pub minutes_from_open: i32,
  pub minutes_to_close: i32,
  pub day_of_week: i32,
}

// ============================================
// Model Inputs
// ============================================

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/schema/src/market-data/generated/")]
pub struct LightGBMInput {
  // Breadth (6)
  pub pct_stocks_above_vwap: f64,
  pub pct_stocks_above_ema20: f64,
  pub weighted_return_top10: f64,
  pub advance_decline_ratio: f64,
  pub breadth_momentum_5m: f64,
  pub breadth_volatility: f64,

  // Future State (7)
  pub fut_price_vs_vwap: f64,
  pub fut_range_position: f64,
  pub fut_return_1m: f64,
  pub fut_return_5m: f64,
  pub fut_atr_percent: f64,
  pub fut_volume_zscore: f64,
  pub fut_oi_change: f64,

  // Options (9)
  pub atm_iv: f64,
  pub atm_iv_change: f64,
  pub iv_skew: f64,
  pub gamma_atm: f64,
  pub vega_atm: f64,
  pub theta_atm: f64,
  pub pcr_oi: f64,
  pub pcr_volume: f64,
  pub max_pain_distance: f64,

  // Volatility & Context (6)
  pub india_vix: f64,
  pub realized_vol_5m: f64,
  pub vol_expansion_ratio: f64,
  pub minutes_from_open: i32,
  pub minutes_to_close: i32,
  pub day_of_week: i32,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/schema/src/market-data/generated/")]
pub struct LightGBMOutput {
  pub p_up: f64,
  pub p_neutral: f64,
  pub p_down: f64,
  pub inference_time_ms: f64,
  pub model_version: String,
}

#[cfg(test)]
mod tests;

