use crate::MarketDataPoint;

/// Compute IV change rate
pub fn compute_iv_change(window: &[MarketDataPoint]) -> f64 {
    if window.len() < 2 {
        return 0.0;
    }

    let current_iv = window.last().unwrap().implied_volatility.unwrap_or(0.0);
    let prev_iv = window[window.len() - 2].implied_volatility.unwrap_or(0.0);

    if prev_iv > 0.0 {
        (current_iv - prev_iv) / prev_iv
    } else {
        0.0
    }
}

/// Compute Put-Call Ratio (Open Interest)
pub fn compute_pcr_oi(_window: &[MarketDataPoint]) -> f64 {
    // Requires option chain data - placeholder
    // In production, this would aggregate put/call OI from option chain
    0.0
}

/// Compute Put-Call Ratio (Volume)
pub fn compute_pcr_volume(_window: &[MarketDataPoint]) -> f64 {
    // Requires option chain data - placeholder
    // In production, this would aggregate put/call volume from option chain
    0.0
}

/// Compute distance to max pain point
pub fn compute_max_pain_distance(_window: &[MarketDataPoint]) -> f64 {
    // Requires option chain data - placeholder
    // In production, this would calculate max pain from option chain
    0.0
}
