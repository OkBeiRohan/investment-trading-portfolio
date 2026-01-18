INSERT INTO training_labels_1d (
  timestamp, instrument_key,
  target_return_1d, target_return_5d, target_return_20d,
  target_volatility_5d, target_volatility_20d, target_max_drawdown_5d,
  target_direction_1d, target_direction_5d, target_direction_20d,
  regime_label, regime_confidence,
  had_regime_change, had_crash, had_rally,
  is_valid, invalid_reason
) VALUES
