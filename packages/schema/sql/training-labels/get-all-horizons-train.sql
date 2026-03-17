SELECT
  timestamp,
  instrument_key,
  interval_value,
  interval_unit,
  target_return_5m,
  target_return_15m,
  target_return_30m,
  target_return_1h,
  target_return_eod,
  target_return_1d,
  target_return_5d,
  target_return_20d,
  target_volatility_5m,
  target_volatility_15m,
  target_max_drawdown_5m,
  target_max_runup_5m,
  target_volatility_5d,
  target_volatility_20d,
  target_max_drawdown_5d,
  target_direction_5m,
  target_direction_15m,
  target_direction_30m,
  target_direction_1d,
  target_direction_5d,
  target_direction_20d,
  regime_label,
  regime_confidence,
  had_regime_change,
  had_spike_event,
  had_gap_event,
  had_crash,
  had_rally,
  label_quality
FROM training_labels
WHERE instrument_key = $1
  AND timestamp >= $2
  AND timestamp < $3
  AND is_valid = true
ORDER BY timestamp ASC
