//! Generic rolling window for fixed-size historical data
//! Used for VWAP, EMA, ATR, RSI calculations

use std::collections::VecDeque;

/// Generic fixed-size rolling window
/// Automatically evicts oldest data when capacity is reached
#[derive(Debug, Clone)]
pub struct RollingWindow<T> {
    data: VecDeque<T>,
    capacity: usize,
}

impl<T: Clone> RollingWindow<T> {
    /// Create new rolling window with fixed capacity
    pub fn new(capacity: usize) -> Self {
        Self {
            data: VecDeque::with_capacity(capacity),
            capacity,
        }
    }

    /// Add new data point (evicts oldest if at capacity)
    pub fn push(&mut self, value: T) {
        if self.data.len() >= self.capacity {
            self.data.pop_front(); // Evict oldest
        }
        self.data.push_back(value);
    }

    /// Get current number of data points
    pub fn len(&self) -> usize {
        self.data.len()
    }

    /// Check if window is empty
    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }

    /// Check if window is full
    pub fn is_full(&self) -> bool {
        self.data.len() >= self.capacity
    }

    /// Get all data as slice (oldest to newest)
    pub fn as_slice(&mut self) -> &[T] {
        self.data.make_contiguous()
    }

    /// Get iterator over data (oldest to newest)
    pub fn iter(&self) -> impl Iterator<Item = &T> {
        self.data.iter()
    }

    /// Get last N elements (most recent)
    pub fn last_n(&self, n: usize) -> Vec<&T> {
        self.data.iter().rev().take(n).rev().collect()
    }

    /// Clear all data
    pub fn clear(&mut self) {
        self.data.clear();
    }
}

// ============================================
// TESTS
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rolling_window_basic() {
        let mut window = RollingWindow::new(3);

        assert_eq!(window.len(), 0);
        assert!(window.is_empty());
        assert!(!window.is_full());

        window.push(10);
        assert_eq!(window.len(), 1);

        window.push(20);
        window.push(30);
        assert!(window.is_full());

        let data: Vec<_> = window.iter().copied().collect();
        assert_eq!(data, vec![10, 20, 30]);
    }

    #[test]
    fn test_rolling_window_eviction() {
        let mut window = RollingWindow::new(3);

        window.push(10);
        window.push(20);
        window.push(30);
        window.push(40); // Should evict 10

        let data: Vec<_> = window.iter().copied().collect();
        assert_eq!(data, vec![20, 30, 40]);

        window.push(50); // Should evict 20
        let data: Vec<_> = window.iter().copied().collect();
        assert_eq!(data, vec![30, 40, 50]);
    }

    #[test]
    fn test_rolling_window_last_n() {
        let mut window = RollingWindow::new(10);

        for i in 1..=10 {
            window.push(i);
        }

        let last_3: Vec<_> = window.last_n(3).into_iter().copied().collect();
        assert_eq!(last_3, vec![8, 9, 10]);

        let last_5: Vec<_> = window.last_n(5).into_iter().copied().collect();
        assert_eq!(last_5, vec![6, 7, 8, 9, 10]);
    }

    #[test]
    fn test_rolling_window_clear() {
        let mut window = RollingWindow::new(5);

        window.push(10);
        window.push(20);

        assert_eq!(window.len(), 2);

        window.clear();
        assert_eq!(window.len(), 0);
        assert!(window.is_empty());
    }
}
