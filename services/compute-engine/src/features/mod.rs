use crate::{ComputeError, MarketDataPoint, FeatureVector, Result};
use chrono::{Datelike, Timelike};

pub mod market_structure;
pub mod momentum;
pub mod volatility;
pub mod options;
pub mod time_context;

use market_structure::*;
use momentum::*;
use volatility::*;
use options::*;
use time_context::*;

/// Main feature computation function
/// 
/// Takes a time-series of market data points and returns computed features for each point.
/// Requires sufficient historical data for windowed calculations (minimum 21 periods).
pub fn compute_features(data: &[MarketDataPoint]) -> Result<Vec<FeatureVector>> {
    if data.len() < 21 {
        return Err(ComputeError::InsufficientData {
            required: 21,
            actual: data.len(),
        });
    }

    let mut features = Vec::with_capacity(data.len());

    // Process each data point
    for (i, point) in data.iter().enumerate() {
        // Get historical window for this point
        let start_idx = i.saturating_sub(20); // Need at least 21 points for RSI_21
        let window = &data[start_idx..=i];

        let feature = FeatureVector {
            timestamp: point.timestamp,
            
            // Market Structure
            price_vs_vwap: compute_price_vs_vwap(window),
            price_vs_day_high: compute_price_vs_day_high(window),
            price_vs_day_low: compute_price_vs_day_low(window),
            range_position: compute_range_position(window),
            prev_day_high_dist: compute_prev_day_high_dist(window),
            prev_day_low_dist: compute_prev_day_low_dist(window),
            weekly_high_dist: compute_weekly_high_dist(window),
            weekly_low_dist: compute_weekly_low_dist(window),
            
            // Momentum & Trend
            rsi_5: compute_rsi(window, 5),
            rsi_14: compute_rsi(window, 14),
            rsi_21: compute_rsi(window, 21),
            macd_hist: compute_macd_histogram(window),
            ema_9_slope: compute_ema_slope(window, 9),
            ema_21_slope: compute_ema_slope(window, 21),
            adx: compute_adx(window, 14),
            roc_5: compute_roc(window, 5),
            
            // Volatility
            atr_percent: compute_atr_percent(window, 14),
            realized_vol_5m: compute_realized_volatility(window, 5),
            realized_vol_15m: compute_realized_volatility(window, 15),
            vol_expansion_ratio: compute_vol_expansion_ratio(window),
            india_vix: point.implied_volatility.unwrap_or(0.0), // From market data
            
            // Options
            atm_iv: point.implied_volatility.unwrap_or(0.0),
            atm_iv_change: compute_iv_change(window),
            delta_atm: point.delta.unwrap_or(0.0),
            gamma_atm: point.gamma.unwrap_or(0.0),
            vega_atm: point.vega.unwrap_or(0.0),
            theta_atm: point.theta.unwrap_or(0.0),
            pcr_oi: compute_pcr_oi(window),
            pcr_volume: compute_pcr_volume(window),
            max_pain_dist: compute_max_pain_distance(window),
            
            // Time Context
            minutes_from_open: compute_minutes_from_open(&point.timestamp),
            minutes_to_close: compute_minutes_to_close(&point.timestamp),
            day_of_week: point.timestamp.weekday().num_days_from_monday() as f64,
        };

        features.push(feature);
    }

    Ok(features)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn create_sample_data(n: usize) -> Vec<MarketDataPoint> {
        (0..n)
            .map(|i| MarketDataPoint {
                timestamp: Utc::now(),
                last_price: 19500.0 + (i as f64) * 10.0,
                volume: 1000.0,
                open_interest: Some(10000.0),
                open: Some(19500.0),
                high: Some(19600.0),
                low: Some(19400.0),
                close: Some(19500.0 + (i as f64) * 10.0),
                bid_price: Some(19499.0),
                ask_price: Some(19501.0),
                bid_quantity: Some(100.0),
                ask_quantity: Some(100.0),
                delta: Some(0.5),
                gamma: Some(0.01),
                vega: Some(50.0),
                theta: Some(-10.0),
                implied_volatility: Some(0.15),
            })
            .collect()
    }

    #[test]
    fn test_compute_features() {
        let data = create_sample_data(50);
        let features = compute_features(&data).unwrap();

        assert_eq!(features.len(), 50);
        
        // Check feature bounds
        for feature in &features {
            assert!(feature.rsi_5 >= 0.0 && feature.rsi_5 <= 100.0);
            assert!(feature.rsi_14 >= 0.0 && feature.rsi_14 <= 100.0);
            assert!(feature.rsi_21 >= 0.0 && feature.rsi_21 <= 100.0);
        }
    }

    #[test]
    fn test_insufficient_data() {
        let data = create_sample_data(10);
        let result = compute_features(&data);
        assert!(result.is_err());
    }
}
