INSERT INTO instrument_features_1d (
  timestamp, instrument_key,
  close, return_1d, return_5d, return_20d, range_hl, gap_open, close_vs_high_20d, close_vs_low_20d,
  rsi_14, rsi_5, macd, macd_signal, macd_hist, adx_14, plus_di, minus_di,
  sma_10, sma_20, sma_50, sma_200, ema_12, ema_26,
  price_vs_sma_20, price_vs_sma_50, price_vs_sma_200, golden_cross,
  atr_14, atr_percent, realized_vol_20d, realized_vol_60d, bollinger_width, bollinger_position,
  vix_close, vix_percentile_30d, vix_percentile_1yr, vix_sma_10,
  volume_sma_20_ratio, volume_trend, obv_change, accumulation_dist,
  trend_strength, mean_reversion_signal, momentum_regime, volatility_regime,
  day_of_week, month_of_year, is_month_end, is_quarter_end,
  is_valid, invalid_reason, feature_version
) VALUES
