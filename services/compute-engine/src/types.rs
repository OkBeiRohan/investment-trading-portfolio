use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Input: Raw market data point
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketDataPoint {
    pub timestamp: DateTime<Utc>,
    pub last_price: f64,
    pub volume: f64,
    pub open_interest: Option<f64>,
    pub open: Option<f64>,
    pub high: Option<f64>,
    pub low: Option<f64>,
    pub close: Option<f64>,
    pub bid_price: Option<f64>,
    pub ask_price: Option<f64>,
    pub bid_quantity: Option<f64>,
    pub ask_quantity: Option<f64>,
    pub delta: Option<f64>,
    pub gamma: Option<f64>,
    pub vega: Option<f64>,
    pub theta: Option<f64>,
    pub implied_volatility: Option<f64>,
}

/// Output: Computed features (33 features)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureVector {
    pub timestamp: DateTime<Utc>,
    
    // Market Structure (8 features)
    pub price_vs_vwap: f64,
    pub price_vs_day_high: f64,
    pub price_vs_day_low: f64,
    pub range_position: f64,
    pub prev_day_high_dist: f64,
    pub prev_day_low_dist: f64,
    pub weekly_high_dist: f64,
    pub weekly_low_dist: f64,
    
    // Momentum & Trend (8 features)
    pub rsi_5: f64,
    pub rsi_14: f64,
    pub rsi_21: f64,
    pub macd_hist: f64,
    pub ema_9_slope: f64,
    pub ema_21_slope: f64,
    pub adx: f64,
    pub roc_5: f64,
    
    // Volatility (5 features)
    pub atr_percent: f64,
    pub realized_vol_5m: f64,
    pub realized_vol_15m: f64,
    pub vol_expansion_ratio: f64,
    pub india_vix: f64,
    
    // Options (9 features)
    pub atm_iv: f64,
    pub atm_iv_change: f64,
    pub delta_atm: f64,
    pub gamma_atm: f64,
    pub vega_atm: f64,
    pub theta_atm: f64,
    pub pcr_oi: f64,
    pub pcr_volume: f64,
    pub max_pain_dist: f64,
    
    // Time Context (3 features)
    pub minutes_from_open: f64,
    pub minutes_to_close: f64,
    pub day_of_week: f64,
}

impl FeatureVector {
    /// Convert to array of 33 features (for ML model input)
    pub fn to_array(&self) -> [f64; 33] {
        [
            // Market Structure (8)
            self.price_vs_vwap,
            self.price_vs_day_high,
            self.price_vs_day_low,
            self.range_position,
            self.prev_day_high_dist,
            self.prev_day_low_dist,
            self.weekly_high_dist,
            self.weekly_low_dist,
            // Momentum & Trend (8)
            self.rsi_5,
            self.rsi_14,
            self.rsi_21,
            self.macd_hist,
            self.ema_9_slope,
            self.ema_21_slope,
            self.adx,
            self.roc_5,
            // Volatility (5)
            self.atr_percent,
            self.realized_vol_5m,
            self.realized_vol_15m,
            self.vol_expansion_ratio,
            self.india_vix,
            // Options (9)
            self.atm_iv,
            self.atm_iv_change,
            self.delta_atm,
            self.gamma_atm,
            self.vega_atm,
            self.theta_atm,
            self.pcr_oi,
            self.pcr_volume,
            self.max_pain_dist,
            // Time Context (3)
            self.minutes_from_open,
            self.minutes_to_close,
            self.day_of_week,
        ]
    }
}
