-- Get label distribution statistics for each horizon
-- Useful for checking class balance before training

SELECT 
  horizon_minutes,
  COUNT(*) as total_labels,
  SUM(CASE WHEN label = 1 THEN 1 ELSE 0 END) as up_labels,
  SUM(CASE WHEN label = 0 THEN 1 ELSE 0 END) as neutral_labels,
  SUM(CASE WHEN label = -1 THEN 1 ELSE 0 END) as down_labels,
  AVG(future_return) as avg_return,
  AVG(atr_threshold) as avg_threshold
FROM training_labels_1m
WHERE timestamp >= $1 
AND timestamp < $2
GROUP BY horizon_minutes
ORDER BY horizon_minutes ASC
