//! Market State Encoder (MSE)
//!
//! Compresses multi-instrument market data into a unified state representation.
//! This is the CORE of the feature engineering pipeline.
//!
//! Flow: Raw Market Snapshot (50 constituents + futures + options)
//!       → MSE → Compressed Market State (33 features)
//!       → Model Inputs

use crate::types::*;
use std::collections::HashMap;

const MARKET_OPEN_HOUR: i32 = 9;
const MARKET_OPEN_MINUTE: i32 = 15;
const MARKET_CLOSE_HOUR: i32 = 15;
const MARKET_CLOSE_MINUTE: i32 = 30;

/// Compute Market State from raw market snapshot
pub fn compute_market_state(
    snapshot: &MarketSnapshot,
    historical_data: &HistoricalDataCache,
    portfolio: Option<&PortfolioState>,
) -> MarketState {
    let macro_state = compute_macro_state(&snapshot.constituents, historical_data);
    let micro_state = compute_micro_state(&snapshot.nifty_future, historical_data);
    let volatility_state = compute_volatility_state(&snapshot.options, snapshot.india_vix, historical_data);
    let execution_state = compute_execution_state(&snapshot.nifty_future, &snapshot.options);
    let portfolio_state = portfolio.cloned().unwrap_or_default();

    let (minutes_from_open, minutes_to_close, day_of_week) = compute_time_context(snapshot.timestamp);

    MarketState {
        timestamp: snapshot.timestamp,
        macro_state,
        micro_state,
        volatility_state,
        execution_state,
        portfolio_state,
        minutes_from_open,
        minutes_to_close,
        day_of_week,
    }
}

/// Compute Macro State (breadth indicators from 50 constituents)
fn compute_macro_state(
    constituents: &[ConstituentTick],
    historical: &HistoricalDataCache,
) -> MacroState {
    let total_stocks = constituents.len() as f64;

    // A. Stocks above VWAP
    let above_vwap = constituents.iter()
        .filter(|c| c.ltp > c.vwap)
        .count() as f64;
    let pct_stocks_above_vwap = above_vwap / total_stocks;

    // B. Stocks above EMA20 (requires historical data)
    let above_ema20 = constituents.iter()
        .filter(|c| {
            if let Some(ema20) = historical.get_ema20(&c.symbol) {
                c.ltp > ema20
            } else {
                false
            }
        })
        .count() as f64;
    let pct_stocks_above_ema20 = above_ema20 / total_stocks;

    // C. Weighted return of top 10 (by market cap weight)
    let top10_weights = historical.get_top10_weights();
    let weighted_return_top10 = constituents.iter()
        .take(10) // Assume sorted by weight
        .enumerate()
        .map(|(i, c)| {
            let ret = (c.ltp - c.open) / c.open;
            ret * top10_weights.get(i).copied().unwrap_or(0.0)
        })
        .sum::<f64>();

    // D. Advance-Decline Ratio
    let advancing = constituents.iter().filter(|c| c.ltp > c.open).count() as f64;
    let declining = constituents.iter().filter(|c| c.ltp < c.open).count() as f64;
    let advance_decline_ratio = if declining > 0.0 {
        advancing / declining
    } else {
        advancing
    };

    // E. Breadth Momentum (5-minute change in breadth)
    let breadth_momentum_5m = if let Some(prev_breadth) = historical.get_breadth_5m_ago() {
        pct_stocks_above_vwap - prev_breadth
    } else {
        0.0
    };

    // F. Breadth Volatility (std dev of constituent returns)
    let returns: Vec<f64> = constituents.iter()
        .map(|c| (c.ltp - c.open) / c.open)
        .collect();
    let breadth_volatility = std_dev(&returns);

    MacroState {
        pct_stocks_above_vwap,
        pct_stocks_above_ema20,
        weighted_return_top10,
        advance_decline_ratio,
        breadth_momentum_5m,
        breadth_volatility,
    }
}

/// Compute Micro State (NIFTY Future microstructure)
fn compute_micro_state(
    future: &NiftyFutureTick,
    historical: &HistoricalDataCache,
) -> MicroState {
    // A. Price vs VWAP (calculate VWAP from historical data)
    let vwap = historical.get_vwap(&future.symbol).unwrap_or(future.ltp);
    let fut_price_vs_vwap = (future.ltp - vwap) / vwap;

    // B. Range position
    let range = future.high - future.low;
    let fut_range_position = if range > 0.0 {
        (future.close - future.low) / range
    } else {
        0.5
    };

    // C. Returns (requires historical prices)
    let fut_return_1m = historical.get_return(&future.symbol, 1).unwrap_or(0.0);
    let fut_return_5m = historical.get_return(&future.symbol, 5).unwrap_or(0.0);

    // D. ATR Percent
    let atr = historical.get_atr(&future.symbol, 14).unwrap_or(0.0);
    let fut_atr_percent = atr / future.ltp;

    // E. Volume Z-score
    let avg_volume = historical.get_avg_volume(&future.symbol, 20).unwrap_or(future.volume);
    let vol_std = historical.get_volume_std(&future.symbol, 20).unwrap_or(1.0);
    let fut_volume_zscore = (future.volume - avg_volume) / vol_std;

    // F. OI Change
    let fut_oi_change = future.oi_change;

    MicroState {
        fut_price_vs_vwap,
        fut_range_position,
        fut_return_1m,
        fut_return_5m,
        fut_atr_percent,
        fut_volume_zscore,
        fut_oi_change,
    }
}

/// Compute Volatility State (options + VIX)
fn compute_volatility_state(
    options: &[OptionTick],
    india_vix: f64,
    historical: &HistoricalDataCache,
) -> VolatilityState {
    // Separate CE and PE
    let calls: Vec<&OptionTick> = options.iter().filter(|o| o.option_type == "CE").collect();
    let puts: Vec<&OptionTick> = options.iter().filter(|o| o.option_type == "PE").collect();

    // A. ATM IV (find closest to ATM)
    let atm_call = calls.iter().min_by(|a, b| {
        a.strike_price.partial_cmp(&b.strike_price).unwrap()
    });
    let atm_put = puts.iter().min_by(|a, b| {
        a.strike_price.partial_cmp(&b.strike_price).unwrap()
    });

    let atm_iv = if let (Some(call), Some(put)) = (atm_call, atm_put) {
        (call.iv + put.iv) / 2.0
    } else {
        0.0
    };

    let atm_iv_change = if let Some(prev_iv) = historical.get_atm_iv_5m_ago() {
        atm_iv - prev_iv
    } else {
        0.0
    };

    // B. IV Skew (OTM call IV - OTM put IV)
    let otm_call_iv = calls.iter()
        .filter(|c| c.strike_price > atm_call.map(|x| x.strike_price).unwrap_or(0.0))
        .map(|c| c.iv)
        .next()
        .unwrap_or(0.0);

    let otm_put_iv = puts.iter()
        .filter(|p| p.strike_price < atm_put.map(|x| x.strike_price).unwrap_or(f64::MAX))
        .map(|p| p.iv)
        .next()
        .unwrap_or(0.0);

    let iv_skew = otm_call_iv - otm_put_iv;

    // C. Greeks (ATM weighted average)
    let gamma_atm = if let (Some(call), Some(put)) = (atm_call, atm_put) {
        (call.gamma + put.gamma) / 2.0
    } else {
        0.0
    };

    let vega_atm = if let (Some(call), Some(put)) = (atm_call, atm_put) {
        (call.vega + put.vega) / 2.0
    } else {
        0.0
    };

    let theta_atm = if let (Some(call), Some(put)) = (atm_call, atm_put) {
        (call.theta + put.theta) / 2.0
    } else {
        0.0
    };

    // D. Put-Call Ratios
    let total_call_oi: f64 = calls.iter().map(|c| c.open_interest).sum();
    let total_put_oi: f64 = puts.iter().map(|p| p.open_interest).sum();
    let pcr_oi = if total_call_oi > 0.0 {
        total_put_oi / total_call_oi
    } else {
        0.0
    };

    let total_call_vol: f64 = calls.iter().map(|c| c.volume).sum();
    let total_put_vol: f64 = puts.iter().map(|p| p.volume).sum();
    let pcr_volume = if total_call_vol > 0.0 {
        total_put_vol / total_call_vol
    } else {
        0.0
    };

    // E. Max Pain Distance (requires calculation - simplified for now)
    let max_pain_distance = 0.0; // TODO: Implement max pain calculation

    // F. Realized Vol (from historical future returns)
    let realized_vol_5m = historical.get_realized_vol(5).unwrap_or(0.0);

    // G. Vol Expansion Ratio
    let vol_expansion_ratio = if realized_vol_5m > 0.0 {
        atm_iv / realized_vol_5m
    } else {
        1.0
    };

    VolatilityState {
        atm_iv,
        atm_iv_change,
        iv_skew,
        gamma_atm,
        vega_atm,
        theta_atm,
        pcr_oi,
        pcr_volume,
        max_pain_distance,
        india_vix,
        realized_vol_5m,
        vol_expansion_ratio,
    }
}

/// Compute Execution State (LOB quality)
fn compute_execution_state(
    future: &NiftyFutureTick,
    _options: &[OptionTick],
) -> ExecutionState {
    // A. Future LOB
    let best_bid = future.bids.first().map(|b| b.price).unwrap_or(0.0);
    let best_ask = future.asks.first().map(|a| a.price).unwrap_or(0.0);
    let fut_bid_ask_spread = best_ask - best_bid;
    let fut_bid_ask_spread_bps = (fut_bid_ask_spread / future.ltp) * 10000.0;

    let total_bid_qty: f64 = future.bids.iter().map(|b| b.quantity).sum();
    let total_ask_qty: f64 = future.asks.iter().map(|a| a.quantity).sum();
    let fut_lob_imbalance = (total_bid_qty - total_ask_qty) / (total_bid_qty + total_ask_qty);

    let fut_lob_depth = future.bids.iter()
        .take(5)
        .map(|b| b.quantity * b.price)
        .sum::<f64>()
        + future.asks.iter()
        .take(5)
        .map(|a| a.quantity * a.price)
        .sum::<f64>();

    ExecutionState {
        fut_bid_ask_spread,
        fut_bid_ask_spread_bps,
        fut_lob_imbalance,
        fut_lob_depth,
        option_bid_ask_spread: None,
        option_bid_ask_spread_pct: None,
        option_lob_imbalance: None,
    }
}

/// Compute time context
fn compute_time_context(timestamp_ms: i64) -> (i32, i32, i32) {
    use chrono::{DateTime, Datelike, Timelike, Utc};

    let dt = DateTime::<Utc>::from_timestamp_millis(timestamp_ms).unwrap();

    let hour = dt.hour() as i32;
    let minute = dt.minute() as i32;

    let market_open_mins = MARKET_OPEN_HOUR * 60 + MARKET_OPEN_MINUTE;
    let market_close_mins = MARKET_CLOSE_HOUR * 60 + MARKET_CLOSE_MINUTE;
    let current_mins = hour * 60 + minute;

    let minutes_from_open = current_mins - market_open_mins;
    let minutes_to_close = market_close_mins - current_mins;

    let day_of_week = dt.weekday().num_days_from_monday() as i32;

    (minutes_from_open, minutes_to_close, day_of_week)
}

/// Helper: Standard deviation
fn std_dev(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }

    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let variance = values.iter()
        .map(|&x| (x - mean).powi(2))
        .sum::<f64>() / values.len() as f64;

    variance.sqrt()
}

/// Historical data cache (for stateful calculations)
/// This should be maintained by market-feeder and passed to MSE
pub struct HistoricalDataCache {
    // EMA20 for each stock
    ema20: HashMap<String, f64>,

    // Top 10 weights (by market cap)
    top10_weights: Vec<f64>,

    // Previous breadth (5 min ago)
    breadth_5m_ago: Option<f64>,

    // VWAP cache
    vwap_cache: HashMap<String, f64>,

    // Historical returns
    returns_cache: HashMap<String, Vec<f64>>,

    // ATR cache
    atr_cache: HashMap<String, f64>,

    // Volume stats
    avg_volume_cache: HashMap<String, f64>,
    volume_std_cache: HashMap<String, f64>,

    // ATM IV history
    atm_iv_5m_ago: Option<f64>,

    // Realized volatility
    realized_vol_cache: HashMap<usize, f64>,
}

impl HistoricalDataCache {
    pub fn new() -> Self {
        Self {
            ema20: HashMap::new(),
            top10_weights: vec![0.1; 10], // Default equal weights
            breadth_5m_ago: None,
            vwap_cache: HashMap::new(),
            returns_cache: HashMap::new(),
            atr_cache: HashMap::new(),
            avg_volume_cache: HashMap::new(),
            volume_std_cache: HashMap::new(),
            atm_iv_5m_ago: None,
            realized_vol_cache: HashMap::new(),
        }
    }

    pub fn get_ema20(&self, symbol: &str) -> Option<f64> {
        self.ema20.get(symbol).copied()
    }

    pub fn get_top10_weights(&self) -> &Vec<f64> {
        &self.top10_weights
    }

    pub fn get_breadth_5m_ago(&self) -> Option<f64> {
        self.breadth_5m_ago
    }

    pub fn get_vwap(&self, symbol: &str) -> Option<f64> {
        self.vwap_cache.get(symbol).copied()
    }

    pub fn get_return(&self, symbol: &str, minutes: usize) -> Option<f64> {
        self.returns_cache.get(symbol)
            .and_then(|returns| returns.get(minutes).copied())
    }

    pub fn get_atr(&self, symbol: &str, _period: usize) -> Option<f64> {
        self.atr_cache.get(symbol).copied()
    }

    pub fn get_avg_volume(&self, symbol: &str, _period: usize) -> Option<f64> {
        self.avg_volume_cache.get(symbol).copied()
    }

    pub fn get_volume_std(&self, symbol: &str, _period: usize) -> Option<f64> {
        self.volume_std_cache.get(symbol).copied()
    }

    pub fn get_atm_iv_5m_ago(&self) -> Option<f64> {
        self.atm_iv_5m_ago
    }

    pub fn get_realized_vol(&self, minutes: usize) -> Option<f64> {
        self.realized_vol_cache.get(&minutes).copied()
    }
}

impl Default for PortfolioState {
    fn default() -> Self {
        Self {
            has_position: false,
            position_type: "none".to_string(),
            unrealized_pnl: 0.0,
            unrealized_pnl_pct: 0.0,
            position_duration: 0.0,
            net_delta: None,
            net_gamma: None,
            net_theta: None,
        }
    }
}
