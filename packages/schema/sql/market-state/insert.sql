INSERT INTO market_state_1m (
  timestamp, price_vs_vwap, price_vs_day_high, price_vs_day_low, range_position,
  prev_day_high_dist, prev_day_low_dist, weekly_high_dist, weekly_low_dist,
  rsi_5, rsi_14, rsi_21, macd_hist, ema_9_slope, ema_21_slope, adx, roc_5,
  atr_percent, realized_vol_5m, realized_vol_15m, vol_expansion_ratio, india_vix,
  atm_iv, atm_iv_change, delta_atm, gamma_atm, vega_atm, theta_atm,
  pcr_oi, pcr_volume, max_pain_dist,
  minutes_from_open, minutes_to_close, day_of_week
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
  $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
)
