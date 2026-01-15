INSERT INTO market_state_1m (
  timestamp,
  instrument_key,
  pct_stocks_above_vwap, pct_stocks_above_ema20, weighted_return_top10,
  advance_decline_ratio, breadth_momentum_5m, breadth_volatility,
  fut_price_vs_vwap, fut_range_position, fut_return_1m, fut_return_5m,
  fut_atr_percent, fut_volume_zscore, fut_oi_change, fut_rsi_14, fut_macd,
  atm_iv, atm_iv_change, iv_skew, gamma_atm, vega_atm, theta_atm,
  pcr_oi, pcr_volume, max_pain_distance, charm_atm, vanna_atm,
  india_vix, realized_vol_5m, realized_vol_15m, vol_expansion_ratio,
  minutes_from_open, minutes_to_close, day_of_week
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
  $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35
)
