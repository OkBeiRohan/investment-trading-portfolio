use chrono::{DateTime, Utc};
use napi_derive::napi;
use serde::{Deserialize, Serialize};

/// Input: Raw market data point (matches @repo/schema MarketDataPoint)
#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketDataPoint {
    pub timestamp: String, // ISO 8601 datetime string
    #[napi(js_name = "lastPrice")]
    pub last_price: f64,
    pub volume: f64,
    #[napi(js_name = "openInterest")]
    pub open_interest: Option<f64>,
    pub open: Option<f64>,
    pub high: Option<f64>,
    pub low: Option<f64>,
    pub close: Option<f64>,
    #[napi(js_name = "bidPrice")]
    pub bid_price: Option<f64>,
    #[napi(js_name = "askPrice")]
    pub ask_price: Option<f64>,
    #[napi(js_name = "bidQuantity")]
    pub bid_quantity: Option<f64>,
    #[napi(js_name = "askQuantity")]
    pub ask_quantity: Option<f64>,
    pub delta: Option<f64>,
    pub gamma: Option<f64>,
    pub vega: Option<f64>,
    pub theta: Option<f64>,
    #[napi(js_name = "impliedVolatility")]
    pub implied_volatility: Option<f64>,
}

impl MarketDataPoint {
    /// Parse timestamp to DateTime (internal use)
    pub fn parsed_timestamp(&self) -> Result<DateTime<Utc>, chrono::ParseError> {
        self.timestamp.parse::<DateTime<Utc>>()
    }
}

/// Output: Computed features (matches @repo/schema FeatureVector)
#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureVector {
    pub timestamp: String,
    
    // Market Structure (8 features)
    #[napi(js_name = "priceVsVwap")]
    pub price_vs_vwap: f64,
    #[napi(js_name = "priceVsDayHigh")]
    pub price_vs_day_high: f64,
    #[napi(js_name = "priceVsDayLow")]
    pub price_vs_day_low: f64,
    #[napi(js_name = "rangePosition")]
    pub range_position: f64,
    #[napi(js_name = "prevDayHighDist")]
    pub prev_day_high_dist: f64,
    #[napi(js_name = "prevDayLowDist")]
    pub prev_day_low_dist: f64,
    #[napi(js_name = "weeklyHighDist")]
    pub weekly_high_dist: f64,
    #[napi(js_name = "weeklyLowDist")]
    pub weekly_low_dist: f64,
    
    // Momentum & Trend (8 features)
    pub rsi5: f64,
    pub rsi14: f64,
    pub rsi21: f64,
    #[napi(js_name = "macdHist")]
    pub macd_hist: f64,
    #[napi(js_name = "ema9Slope")]
    pub ema_9_slope: f64,
    #[napi(js_name = "ema21Slope")]
    pub ema_21_slope: f64,
    pub adx: f64,
    pub roc5: f64,
    
    // Volatility (5 features)
    #[napi(js_name = "atrPercent")]
    pub atr_percent: f64,
    #[napi(js_name = "realizedVol5m")]
    pub realized_vol_5m: f64,
    #[napi(js_name = "realizedVol15m")]
    pub realized_vol_15m: f64,
    #[napi(js_name = "volExpansionRatio")]
    pub vol_expansion_ratio: f64,
    #[napi(js_name = "indiaVix")]
    pub india_vix: f64,
    
    // Options (9 features)
    #[napi(js_name = "atmIv")]
    pub atm_iv: f64,
    #[napi(js_name = "atmIvChange")]
    pub atm_iv_change: f64,
    #[napi(js_name = "deltaAtm")]
    pub delta_atm: f64,
    #[napi(js_name = "gammaAtm")]
    pub gamma_atm: f64,
    #[napi(js_name = "vegaAtm")]
    pub vega_atm: f64,
    #[napi(js_name = "thetaAtm")]
    pub theta_atm: f64,
    #[napi(js_name = "pcrOi")]
    pub pcr_oi: f64,
    #[napi(js_name = "pcrVolume")]
    pub pcr_volume: f64,
    #[napi(js_name = "maxPainDist")]
    pub max_pain_dist: f64,
    
    // Time Context (3 features)
    #[napi(js_name = "minutesFromOpen")]
    pub minutes_from_open: f64,
    #[napi(js_name = "minutesToClose")]
    pub minutes_to_close: f64,
    #[napi(js_name = "dayOfWeek")]
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
            self.rsi5,
            self.rsi14,
            self.rsi21,
            self.macd_hist,
            self.ema_9_slope,
            self.ema_21_slope,
            self.adx,
            self.roc5,
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
