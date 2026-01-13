use crate::MarketDataPoint;

/// Compute price relative to VWAP (Volume Weighted Average Price)
pub fn compute_price_vs_vwap(window: &[MarketDataPoint]) -> f64 {
    if window.is_empty() {
        return 0.0;
    }

    let mut sum_pv = 0.0;
    let mut sum_v = 0.0;

    for point in window {
        let price = point.last_price;
        let volume = point.volume;
        sum_pv += price * volume;
        sum_v += volume;
    }

    let vwap = if sum_v > 0.0 { sum_pv / sum_v } else { window.last().unwrap().last_price };
    let current_price = window.last().unwrap().last_price;

    (current_price - vwap) / vwap
}

/// Compute price distance from day high
pub fn compute_price_vs_day_high(window: &[MarketDataPoint]) -> f64 {
    if window.is_empty() {
        return 0.0;
    }

    let day_high = window
        .iter()
        .map(|p| p.high.unwrap_or(p.last_price))
        .fold(f64::MIN, f64::max);

    let current_price = window.last().unwrap().last_price;
    (current_price - day_high) / day_high
}

/// Compute price distance from day low
pub fn compute_price_vs_day_low(window: &[MarketDataPoint]) -> f64 {
    if window.is_empty() {
        return 0.0;
    }

    let day_low = window
        .iter()
        .map(|p| p.low.unwrap_or(p.last_price))
        .fold(f64::MAX, f64::min);

    let current_price = window.last().unwrap().last_price;
    (current_price - day_low) / day_low
}

/// Compute position within day's range (0 = low, 1 = high)
pub fn compute_range_position(window: &[MarketDataPoint]) -> f64 {
    if window.is_empty() {
        return 0.5;
    }

    let day_high = window
        .iter()
        .map(|p| p.high.unwrap_or(p.last_price))
        .fold(f64::MIN, f64::max);

    let day_low = window
        .iter()
        .map(|p| p.low.unwrap_or(p.last_price))
        .fold(f64::MAX, f64::min);

    let current_price = window.last().unwrap().last_price;
    let range = day_high - day_low;

    if range > 0.0 {
        (current_price - day_low) / range
    } else {
        0.5
    }
}

/// Compute distance from previous day's high
pub fn compute_prev_day_high_dist(window: &[MarketDataPoint]) -> f64 {
    // Simplified: Use window high as proxy for prev day high
    if window.len() < 2 {
        return 0.0;
    }

    let prev_window = &window[..window.len() - 1];
    let prev_high = prev_window
        .iter()
        .map(|p| p.high.unwrap_or(p.last_price))
        .fold(f64::MIN, f64::max);

    let current_price = window.last().unwrap().last_price;
    (current_price - prev_high) / prev_high
}

/// Compute distance from previous day's low
pub fn compute_prev_day_low_dist(window: &[MarketDataPoint]) -> f64 {
    if window.len() < 2 {
        return 0.0;
    }

    let prev_window = &window[..window.len() - 1];
    let prev_low = prev_window
        .iter()
        .map(|p| p.low.unwrap_or(p.last_price))
        .fold(f64::MAX, f64::min);

    let current_price = window.last().unwrap().last_price;
    (current_price - prev_low) / prev_low
}

/// Compute distance from weekly high
pub fn compute_weekly_high_dist(window: &[MarketDataPoint]) -> f64 {
    compute_price_vs_day_high(window) // Simplified: Use day high as proxy
}

/// Compute distance from weekly low
pub fn compute_weekly_low_dist(window: &[MarketDataPoint]) -> f64 {
    compute_price_vs_day_low(window) // Simplified: Use day low as proxy
}
