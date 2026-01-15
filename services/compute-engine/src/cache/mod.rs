//! Historical cache for price/volume data
//! Used to compute VWAP, EMA, ATR, RSI without external input

mod rolling_window;

pub use rolling_window::RollingWindow;

use std::collections::HashMap;

/// Single price/volume data point
#[derive(Debug, Clone, Copy)]
pub struct PriceVolumeTick {
  pub timestamp: i64,
  pub price: f64,
  pub volume: f64,
}

/// Single OHLC data point for ATR calculation
#[derive(Debug, Clone, Copy)]
pub struct OhlcTick {
  pub timestamp: i64,
  pub open: f64,
  pub high: f64,
  pub low: f64,
  pub close: f64,
}

/// Historical cache for NIFTY Future and constituents
/// Stores last N ticks (default: 390 = 1 trading day at 1-minute intervals)
pub struct HistoricalCache {
  // NIFTY Future historical data
  nifty_future_pv: RollingWindow<PriceVolumeTick>,
  nifty_future_ohlc: RollingWindow<OhlcTick>,

  // Constituent historical data (keyed by symbol)
  constituent_pv: HashMap<String, RollingWindow<PriceVolumeTick>>,

  capacity: usize,
}

impl HistoricalCache {
  /// Create new cache with specified capacity (default: 390 ticks = 1 trading day)
  pub fn new(capacity: usize) -> Self {
    Self {
      nifty_future_pv: RollingWindow::new(capacity),
      nifty_future_ohlc: RollingWindow::new(capacity),
      constituent_pv: HashMap::new(),
      capacity,
    }
  }

  /// Default cache (390 ticks = 6.5 hours at 1-minute intervals)
  pub fn default() -> Self {
    Self::new(390)
  }

  /// Add NIFTY Future tick data
  pub fn add_nifty_future_tick(&mut self, tick: PriceVolumeTick, ohlc: OhlcTick) {
    self.nifty_future_pv.push(tick);
    self.nifty_future_ohlc.push(ohlc);
  }

  /// Add constituent tick data
  pub fn add_constituent_tick(&mut self, symbol: String, tick: PriceVolumeTick) {
    self
      .constituent_pv
      .entry(symbol)
      .or_insert_with(|| RollingWindow::new(self.capacity))
      .push(tick);
  }

  /// Get NIFTY Future price/volume history
  pub fn get_nifty_future_pv(&self) -> &RollingWindow<PriceVolumeTick> {
    &self.nifty_future_pv
  }

  /// Get NIFTY Future OHLC history
  pub fn get_nifty_future_ohlc(&self) -> &RollingWindow<OhlcTick> {
    &self.nifty_future_ohlc
  }

  /// Get constituent price/volume history by symbol
  pub fn get_constituent_pv(&self, symbol: &str) -> Option<&RollingWindow<PriceVolumeTick>> {
    self.constituent_pv.get(symbol)
  }

  /// Get all constituent symbols
  pub fn get_constituent_symbols(&self) -> Vec<String> {
    self.constituent_pv.keys().cloned().collect()
  }

  /// Clear all cached data
  pub fn clear(&mut self) {
    self.nifty_future_pv.clear();
    self.nifty_future_ohlc.clear();
    self.constituent_pv.clear();
  }
}

// ============================================
// TESTS
// ============================================

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_historical_cache_creation() {
    let cache = HistoricalCache::new(100);
    assert_eq!(cache.capacity, 100);
    assert_eq!(cache.nifty_future_pv.len(), 0);
  }

  #[test]
  fn test_add_nifty_future_tick() {
    let mut cache = HistoricalCache::new(10);

    let pv_tick = PriceVolumeTick {
      timestamp: 1234567890,
      price: 19500.0,
      volume: 1000.0,
    };

    let ohlc_tick = OhlcTick {
      timestamp: 1234567890,
      open: 19450.0,
      high: 19550.0,
      low: 19400.0,
      close: 19500.0,
    };

    cache.add_nifty_future_tick(pv_tick, ohlc_tick);

    assert_eq!(cache.get_nifty_future_pv().len(), 1);
    assert_eq!(cache.get_nifty_future_ohlc().len(), 1);
  }

  #[test]
  fn test_add_constituent_tick() {
    let mut cache = HistoricalCache::new(10);

    let tick = PriceVolumeTick {
      timestamp: 1234567890,
      price: 2500.0,
      volume: 500.0,
    };

    cache.add_constituent_tick("RELIANCE".to_string(), tick);
    cache.add_constituent_tick("TCS".to_string(), tick);

    assert!(cache.get_constituent_pv("RELIANCE").is_some());
    assert!(cache.get_constituent_pv("TCS").is_some());
    assert!(cache.get_constituent_pv("INFY").is_none());

    let symbols = cache.get_constituent_symbols();
    assert_eq!(symbols.len(), 2);
  }

  #[test]
  fn test_cache_eviction() {
    let mut cache = HistoricalCache::new(3);

    for i in 1..=5 {
      let tick = PriceVolumeTick {
        timestamp: i * 1000,
        price: 19500.0 + i as f64,
        volume: 1000.0,
      };

      let ohlc = OhlcTick {
        timestamp: i * 1000,
        open: 19500.0,
        high: 19550.0,
        low: 19450.0,
        close: 19500.0 + i as f64,
      };

      cache.add_nifty_future_tick(tick, ohlc);
    }

    // Should keep only last 3 ticks
    assert_eq!(cache.get_nifty_future_pv().len(), 3);

    let prices: Vec<_> = cache
      .get_nifty_future_pv()
      .iter()
      .map(|t| t.price)
      .collect();

    assert_eq!(prices, vec![19503.0, 19504.0, 19505.0]);
  }

  #[test]
  fn test_clear_cache() {
    let mut cache = HistoricalCache::new(10);

    let tick = PriceVolumeTick {
      timestamp: 1234567890,
      price: 19500.0,
      volume: 1000.0,
    };

    let ohlc = OhlcTick {
      timestamp: 1234567890,
      open: 19500.0,
      high: 19550.0,
      low: 19450.0,
      close: 19500.0,
    };

    cache.add_nifty_future_tick(tick, ohlc);
    cache.add_constituent_tick("RELIANCE".to_string(), tick);

    assert_eq!(cache.get_nifty_future_pv().len(), 1);
    assert!(cache.get_constituent_pv("RELIANCE").is_some());

    cache.clear();

    assert_eq!(cache.get_nifty_future_pv().len(), 0);
    assert_eq!(cache.get_constituent_symbols().len(), 0);
  }
}
