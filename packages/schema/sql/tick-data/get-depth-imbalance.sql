SELECT 
  AVG((tbq - tsq) / NULLIF(tbq + tsq, 0)) as avg_imbalance,
  COUNT(*) as count
FROM tick_data 
WHERE instrument_key = $1 
AND timestamp >= $2 
AND timestamp <= $3
