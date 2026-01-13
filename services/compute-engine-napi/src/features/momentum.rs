use crate::MarketDataPoint;

/// Compute RSI (Relative Strength Index)
pub fn compute_rsi(window: &[MarketDataPoint], period: usize) -> f64 {
    if window.len() < period + 1 {
        return 50.0; // Neutral value
    }

    let prices: Vec<f64> = window.iter().map(|p| p.last_price).collect();
    
    let mut gains = 0.0;
    let mut losses = 0.0;

    for i in 1..=period.min(prices.len() - 1) {
        let change = prices[prices.len() - period + i - 1] - prices[prices.len() - period + i - 2];
        if change > 0.0 {
            gains += change;
        } else {
            losses += -change;
        }
    }

    let avg_gain = gains / period as f64;
    let avg_loss = losses / period as f64;

    if avg_loss == 0.0 {
        return 100.0;
    }

    let rs = avg_gain / avg_loss;
    100.0 - (100.0 / (1.0 + rs))
}

/// Compute MACD Histogram
pub fn compute_macd_histogram(window: &[MarketDataPoint]) -> f64 {
    if window.len() < 26 {
        return 0.0;
    }

    let prices: Vec<f64> = window.iter().map(|p| p.last_price).collect();

    let ema_12 = compute_ema(&prices, 12);
    let ema_26 = compute_ema(&prices, 26);
    let macd_line = ema_12 - ema_26;

    // MACD signal line (9-period EMA of MACD line)
    // Simplified: Just return MACD line for now
    macd_line
}

/// Compute EMA slope (rate of change)
pub fn compute_ema_slope(window: &[MarketDataPoint], period: usize) -> f64 {
    if window.len() < period + 1 {
        return 0.0;
    }

    let prices: Vec<f64> = window.iter().map(|p| p.last_price).collect();
    let current_ema = compute_ema(&prices, period);

    // Look back a few periods to compute slope
    if window.len() > period + 5 {
        let prev_prices: Vec<f64> = window[..window.len() - 5].iter().map(|p| p.last_price).collect();
        let prev_ema = compute_ema(&prev_prices, period);
        (current_ema - prev_ema) / prev_ema
    } else {
        0.0
    }
}

/// Compute ADX (Average Directional Index)
pub fn compute_adx(window: &[MarketDataPoint], period: usize) -> f64 {
    if window.len() < period + 1 {
        return 0.0;
    }

    // Simplified ADX calculation
    let mut plus_dm_sum = 0.0;
    let mut minus_dm_sum = 0.0;
    let mut tr_sum = 0.0;

    for i in 1..window.len().min(period + 1) {
        let high = window[i].high.unwrap_or(window[i].last_price);
        let low = window[i].low.unwrap_or(window[i].last_price);
        let prev_high = window[i - 1].high.unwrap_or(window[i - 1].last_price);
        let prev_low = window[i - 1].low.unwrap_or(window[i - 1].last_price);
        let prev_close = window[i - 1].close.unwrap_or(window[i - 1].last_price);

        let plus_dm = (high - prev_high).max(0.0);
        let minus_dm = (prev_low - low).max(0.0);

        let tr = (high - low)
            .max(high - prev_close)
            .max(prev_close - low)
            .abs();

        plus_dm_sum += plus_dm;
        minus_dm_sum += minus_dm;
        tr_sum += tr;
    }

    if tr_sum == 0.0 {
        return 0.0;
    }

    let plus_di = (plus_dm_sum / tr_sum) * 100.0;
    let minus_di = (minus_dm_sum / tr_sum) * 100.0;

    let dx = ((plus_di - minus_di).abs() / (plus_di + minus_di + 1e-10)) * 100.0;
    dx
}

/// Compute ROC (Rate of Change)
pub fn compute_roc(window: &[MarketDataPoint], period: usize) -> f64 {
    if window.len() < period + 1 {
        return 0.0;
    }

    let current_price = window.last().unwrap().last_price;
    let past_price = window[window.len() - period - 1].last_price;

    (current_price - past_price) / past_price
}

/// Helper: Compute Exponential Moving Average
fn compute_ema(prices: &[f64], period: usize) -> f64 {
    if prices.is_empty() {
        return 0.0;
    }

    if prices.len() < period {
        // Not enough data, return simple average
        return prices.iter().sum::<f64>() / prices.len() as f64;
    }

    let multiplier = 2.0 / (period as f64 + 1.0);
    
    // Start with SMA
    let sma: f64 = prices[..period].iter().sum::<f64>() / period as f64;
    let mut ema = sma;

    // Calculate EMA
    for price in &prices[period..] {
        ema = (price - ema) * multiplier + ema;
    }

    ema
}
