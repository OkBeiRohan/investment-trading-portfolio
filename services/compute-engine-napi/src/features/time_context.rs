use chrono::{DateTime, Datelike, Timelike, Utc};

/// Compute minutes from market open (9:15 AM IST)
pub fn compute_minutes_from_open(timestamp: &DateTime<Utc>) -> f64 {
    let market_open_hour = 9;
    let market_open_minute = 15;

    let current_hour = timestamp.hour();
    let current_minute = timestamp.minute();

    let minutes_since_midnight = current_hour * 60 + current_minute;
    let open_minutes_since_midnight = market_open_hour * 60 + market_open_minute;

    (minutes_since_midnight as i32 - open_minutes_since_midnight as i32) as f64
}

/// Compute minutes to market close (3:30 PM IST)
pub fn compute_minutes_to_close(timestamp: &DateTime<Utc>) -> f64 {
    let market_close_hour = 15;
    let market_close_minute = 30;

    let current_hour = timestamp.hour();
    let current_minute = timestamp.minute();

    let minutes_since_midnight = current_hour * 60 + current_minute;
    let close_minutes_since_midnight = market_close_hour * 60 + market_close_minute;

    (close_minutes_since_midnight as i32 - minutes_since_midnight as i32) as f64
}
