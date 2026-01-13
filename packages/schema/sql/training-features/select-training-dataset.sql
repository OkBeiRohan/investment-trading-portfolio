-- Get joined training data (features + labels) for supervised learning
-- Used by: training-pipeline for model training with labels
-- Returns: Clean, aligned feature-label pairs
SELECT 
  f.*,
  l.target_return_1m,
  l.target_return_5m,
  l.target_return_15m,
  l.target_return_eod,
  l.target_direction_5m,
  l.target_volatility_regime_5m,
  l.regime_label,
  l.regime_confidence,
  l.max_drawdown_5m,
  l.max_runup_5m,
  l.realized_volatility_5m,
  l.had_regime_change,
  l.had_spike_event,
  l.label_quality
FROM training_features_lightgbm f
INNER JOIN training_labels l
  ON f.timestamp = l.timestamp
  AND f.reference_instrument = l.reference_instrument
WHERE f.timestamp BETWEEN $1 AND $2
  AND f.index_name = $3
  AND l.label_quality = 'CLEAN'
ORDER BY f.timestamp ASC;
