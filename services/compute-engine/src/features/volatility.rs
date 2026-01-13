use crate::MarketDataPoint;

/// Compute ATR as percentage of price
pub fn compute_atr_percent(window: &[MarketDataPoint], period: usize) -> f64 {
    if window.len() < period + 1 {
        return 0.0;
    }

    let mut tr_sum = 0.0;

    for i in 1..window.len().min(period + 1) {
        let high = window[i].high.unwrap_or(window[i].last_price);
        let low = window[i].low.unwrap_or(window[i].last_price);
        let prev_close = window[i - 1].close.unwrap_or(window[i - 1].last_price);

        let tr = (high - low)
            .max(high - prev_close)
            .max(prev_close - low)
            .abs();

        tr_sum += tr;
    }

    let atr = tr_sum / period.min(window.len() - 1) as f64;
    let current_price = window.last().unwrap().last_price;

    (atr / current_price) * 100.0
}

/// Compute realized volatility over N periods (annualized)
pub fn compute_realized_volatility(window: &[MarketDataPoint], period: usize) -> f64 {
    if window.len() < period + 1 {
        return 0.0;
    }

    let returns: Vec<f64> = window
        .windows(2)
        .map(|w| (w[1].last_price / w[0].last_price).ln())
        .collect();

    if returns.is_empty() {
        return 0.0;
    }

    // Take last N returns
    let recent_returns = &returns[returns.len().saturating_sub(period)..];
    
    let mean = recent_returns.iter().sum::<f64>() / recent_returns.len() as f64;
    let variance = recent_returns
        .iter()
        .map(|r| (r - mean).powi(2))
        .sum::<f64>()
        / recent_returns.len() as f64;

    let std_dev = variance.sqrt();

    // Annualize (assuming 252 trading days, 375 5-minute bars per day)
    std_dev * (252.0 * 375.0_f64).sqrt()
}

/// Compute volatility expansion ratio (current vol / historical vol)
pub fn compute_vol_expansion_ratio(window: &[MarketDataPoint]) -> f64 {
    if window.len() < 30 {
        return 1.0;
    }

    let short_vol = compute_realized_volatility(window, 5);
    let long_vol = compute_realized_volatility(window, 20);

    if long_vol > 0.0 {
        short_vol / long_vol
    } else {
        1.0
    }
}
