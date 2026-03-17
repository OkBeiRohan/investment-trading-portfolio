INSERT INTO instrument_features (
  timestamp, instrument_key, last_price, vwap, price_vs_vwap,
  day_high, day_low, price_vs_day_high, price_vs_day_low, range_position,
  prev_day_high_dist, prev_day_low_dist, weekly_high_dist, weekly_low_dist,
  rsi_5, rsi_14, rsi_21, macd_hist, ema_9, ema_21,
  ema_9_slope, ema_21_slope, adx, roc_5,
  atr, atr_percent, realized_vol_5m, realized_vol_15m, vol_expansion_ratio,
  minutes_from_open, minutes_to_close, day_of_week
) VALUES
