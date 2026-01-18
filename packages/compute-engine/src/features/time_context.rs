//! Time context features (3 features)
//! Intraday time-based features

use crate::features::{ComputedDependencies, Feature, FeatureValue};
use crate::types::FeatureInput;
use chrono::{DateTime, Datelike, FixedOffset, NaiveTime, Timelike};

// ============================================
// MARKET HOURS CONSTANTS
// ============================================

const MARKET_OPEN_HOUR: u32 = 9;
const MARKET_OPEN_MINUTE: u32 = 15;
const MARKET_CLOSE_HOUR: u32 = 15;
const MARKET_CLOSE_MINUTE: u32 = 30;

// ============================================
// FEATURE: MINUTES_FROM_OPEN
// ============================================

pub struct MinutesFromOpen;

impl Feature for MinutesFromOpen {
  fn name(&self) -> &'static str {
    "minutes_from_open"
  }

  fn category(&self) -> &'static str {
    "time_context"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    // IST is UTC+5:30
    let ist_offset = FixedOffset::east_opt(5 * 3600 + 30 * 60).unwrap();

    let timestamp = DateTime::from_timestamp_millis(input.timestamp)
      .map(|dt| dt.with_timezone(&ist_offset))
      .unwrap_or_else(|| chrono::Utc::now().with_timezone(&ist_offset));

    let market_open = NaiveTime::from_hms_opt(MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE, 0).unwrap();

    let current_time =
      NaiveTime::from_hms_opt(timestamp.hour(), timestamp.minute(), timestamp.second()).unwrap();

    let minutes_from_open = if current_time >= market_open {
      let duration = current_time.signed_duration_since(market_open);
      duration.num_minutes() as i32
    } else {
      0
    };

    FeatureValue::Integer(minutes_from_open)
  }
}

// ============================================
// FEATURE: MINUTES_TO_CLOSE
// ============================================

pub struct MinutesToClose;

impl Feature for MinutesToClose {
  fn name(&self) -> &'static str {
    "minutes_to_close"
  }

  fn category(&self) -> &'static str {
    "time_context"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    // IST is UTC+5:30
    let ist_offset = FixedOffset::east_opt(5 * 3600 + 30 * 60).unwrap();

    let timestamp = DateTime::from_timestamp_millis(input.timestamp)
      .map(|dt| dt.with_timezone(&ist_offset))
      .unwrap_or_else(|| chrono::Utc::now().with_timezone(&ist_offset));

    let market_close = NaiveTime::from_hms_opt(MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE, 0).unwrap();

    let current_time =
      NaiveTime::from_hms_opt(timestamp.hour(), timestamp.minute(), timestamp.second()).unwrap();

    let minutes_to_close = if current_time <= market_close {
      let duration = market_close.signed_duration_since(current_time);
      duration.num_minutes() as i32
    } else {
      0
    };

    FeatureValue::Integer(minutes_to_close)
  }
}

// ============================================
// FEATURE: DAY_OF_WEEK
// ============================================

pub struct DayOfWeek;

impl Feature for DayOfWeek {
  fn name(&self) -> &'static str {
    "day_of_week"
  }

  fn category(&self) -> &'static str {
    "time_context"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    // IST is UTC+5:30
    let ist_offset = FixedOffset::east_opt(5 * 3600 + 30 * 60).unwrap();

    let timestamp = DateTime::from_timestamp_millis(input.timestamp)
      .map(|dt| dt.with_timezone(&ist_offset))
      .unwrap_or_else(|| chrono::Utc::now().with_timezone(&ist_offset));

    // Monday = 1, Sunday = 7
    let day = timestamp.weekday().number_from_monday() as i32;

    FeatureValue::Integer(day)
  }
}

// ============================================
// FEATURE: IS_EXPIRY_DAY
// ============================================

pub struct IsExpiryDay;

impl Feature for IsExpiryDay {
  fn name(&self) -> &'static str {
    "is_expiry_day"
  }

  fn category(&self) -> &'static str {
    "time_context"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    // Use pre-computed value from TypeScript if available
    let is_expiry = input.is_expiry_day.unwrap_or(false);
    FeatureValue::Integer(if is_expiry { 1 } else { 0 })
  }
}

// ============================================
// FEATURE: DAYS_TO_EXPIRY
// ============================================

pub struct DaysToExpiry;

impl Feature for DaysToExpiry {
  fn name(&self) -> &'static str {
    "days_to_expiry"
  }

  fn category(&self) -> &'static str {
    "time_context"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    // Use pre-computed value from TypeScript if available
    let days = input.days_to_expiry.unwrap_or(0);
    FeatureValue::Integer(days)
  }
}

// ============================================
// FEATURE: SESSION_PHASE
// ============================================

/// Session phases:
/// 1 = Opening (9:15-10:30)
/// 2 = Mid-session (10:30-14:30)
/// 3 = Closing (14:30-15:30)
pub struct SessionPhase;

impl Feature for SessionPhase {
  fn name(&self) -> &'static str {
    "session_phase"
  }

  fn category(&self) -> &'static str {
    "time_context"
  }

  fn compute(&self, input: &FeatureInput, _deps: &ComputedDependencies) -> FeatureValue {
    // IST is UTC+5:30
    let ist_offset = FixedOffset::east_opt(5 * 3600 + 30 * 60).unwrap();

    let timestamp = DateTime::from_timestamp_millis(input.timestamp)
      .map(|dt| dt.with_timezone(&ist_offset))
      .unwrap_or_else(|| chrono::Utc::now().with_timezone(&ist_offset));

    let hour = timestamp.hour();
    let minute = timestamp.minute();
    let time_in_minutes = hour * 60 + minute;

    // Opening: 9:15 (555) - 10:30 (630)
    // Mid: 10:30 (630) - 14:30 (870)
    // Closing: 14:30 (870) - 15:30 (930)
    let phase = if time_in_minutes < 630 {
      1 // Opening
    } else if time_in_minutes < 870 {
      2 // Mid-session
    } else {
      3 // Closing
    };

    FeatureValue::Integer(phase)
  }
}
